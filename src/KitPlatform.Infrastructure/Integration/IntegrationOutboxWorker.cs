using Dapper;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using KitPlatform.Application.Integration;
using KitPlatform.Infrastructure.Data;
using KitPlatform.Infrastructure.Kernel.Event;

namespace KitPlatform.Infrastructure.Integration;

/// <summary>
/// P1.1b: Polls <c>kit_event.event_outbox</c> (integration bus) with legacy fallback.
/// </summary>
internal sealed class IntegrationOutboxWorker : BackgroundService
{
    private readonly NpgsqlConnectionFactory _db;
    private readonly IIntegrationOutboxPublisher _publisher;
    private readonly IntegrationOutboxOptions _options;
    private readonly ILogger<IntegrationOutboxWorker> _logger;

    public IntegrationOutboxWorker(
        NpgsqlConnectionFactory db,
        IIntegrationOutboxPublisher publisher,
        IOptions<IntegrationOutboxOptions> options,
        ILogger<IntegrationOutboxWorker> logger)
    {
        _db = db;
        _publisher = publisher;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Integration outbox worker is disabled.");
            return;
        }

        var delay = TimeSpan.FromSeconds(Math.Max(5, _options.PollIntervalSeconds));
        var mode = string.IsNullOrWhiteSpace(_options.WebhookUrl) ? "log-only" : "webhook";
        _logger.LogInformation(
            "Integration outbox worker started (kernel outbox + legacy fallback, mode={Mode}, batch={BatchSize}).",
            mode,
            Math.Max(1, _options.BatchSize));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Integration outbox worker batch failed.");
            }

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    private async Task ProcessBatchAsync(CancellationToken cancellationToken)
    {
        var batchSize = Math.Max(1, _options.BatchSize);
        var maxAttempts = Math.Max(1, _options.MaxPublishAttempts);

        List<PendingIntegrationEvent> pending;
        await using (var conn = await _db.CreateOpenConnectionAsync(cancellationToken))
        {
            const string outboxSql = """
                SELECT
                    eo.id AS OutboxId,
                    eo.legacy_outbox_id AS LegacyOutboxId,
                    eo.payload::text AS Payload,
                    TRUE AS FromOutbox
                FROM kit_event.event_outbox eo
                WHERE eo.event_bus = 'integration'
                  AND eo.dispatched_at IS NULL
                  AND eo.dispatch_attempts < @MaxAttempts
                  AND eo.deleted_at IS NULL
                ORDER BY eo.occurred_at
                LIMIT @BatchSize
                """;

            pending = (await conn.QueryAsync<PendingIntegrationEvent>(outboxSql, new
            {
                BatchSize = batchSize,
                MaxAttempts = maxAttempts,
            })).ToList();

            if (pending.Count < batchSize)
            {
                const string legacySql = """
                    SELECT
                        NULL::uuid AS OutboxId,
                        io.id AS LegacyOutboxId,
                        io.payload::text AS Payload,
                        FALSE AS FromOutbox
                    FROM public.integration_outbox io
                    WHERE io.published_at IS NULL
                      AND io.publish_attempts < @MaxAttempts
                      AND NOT EXISTS (
                          SELECT 1 FROM kit_event.event_outbox eo
                          WHERE eo.legacy_outbox_id = io.id
                      )
                    ORDER BY io.occurred_at
                    LIMIT @Remaining
                    """;

                var legacy = await conn.QueryAsync<PendingIntegrationEvent>(legacySql, new
                {
                    Remaining = batchSize - pending.Count,
                    MaxAttempts = maxAttempts,
                });
                pending.AddRange(legacy);
            }
        }

        if (pending.Count == 0)
            return;

        var published = 0;
        foreach (var item in pending)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            if (await TryPublishOneAsync(item, cancellationToken))
                published++;
        }

        if (published > 0)
            _logger.LogInformation("Integration outbox published {Count} event(s).", published);
    }

    private async Task<bool> TryPublishOneAsync(
        PendingIntegrationEvent item,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        string? payload;
        if (item.FromOutbox)
        {
            payload = await conn.QuerySingleOrDefaultAsync<string?>(
                """
                SELECT payload::text
                FROM kit_event.event_outbox
                WHERE id = @OutboxId AND dispatched_at IS NULL
                FOR UPDATE
                """,
                new { item.OutboxId },
                tx);
        }
        else
        {
            payload = await conn.QuerySingleOrDefaultAsync<string?>(
                """
                SELECT payload::text
                FROM integration_outbox
                WHERE id = @Id AND published_at IS NULL
                FOR UPDATE
                """,
                new { Id = item.LegacyOutboxId },
                tx);
        }

        if (payload is null)
        {
            await tx.CommitAsync(cancellationToken);
            return false;
        }

        try
        {
            await _publisher.PublishAsync(payload, cancellationToken);

            if (item.LegacyOutboxId.HasValue)
            {
                await conn.ExecuteAsync("""
                    UPDATE integration_outbox
                    SET published_at = NOW(),
                        publish_attempts = publish_attempts + 1,
                        last_error = NULL
                    WHERE id = @Id
                    """, new { Id = item.LegacyOutboxId.Value }, tx);
            }

            if (item.FromOutbox && item.OutboxId.HasValue)
            {
                await conn.ExecuteAsync("""
                    UPDATE kit_event.event_outbox
                    SET dispatched_at = NOW(),
                        dispatch_attempts = dispatch_attempts + 1,
                        last_error = NULL,
                        updated_at = NOW()
                    WHERE id = @Id
                    """, new { Id = item.OutboxId.Value }, tx);
            }
            else if (item.LegacyOutboxId.HasValue)
            {
                await KernelEventOutboxDualWriter.MarkIntegrationEventDispatchedAsync(
                    conn, tx, item.LegacyOutboxId.Value, lastError: null, success: true, cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            if (item.LegacyOutboxId.HasValue)
            {
                await conn.ExecuteAsync("""
                    UPDATE integration_outbox
                    SET publish_attempts = publish_attempts + 1, last_error = @Error
                    WHERE id = @Id
                    """, new { Id = item.LegacyOutboxId.Value, Error = ex.Message }, tx);
            }

            if (item.FromOutbox && item.OutboxId.HasValue)
            {
                await conn.ExecuteAsync("""
                    UPDATE kit_event.event_outbox
                    SET dispatch_attempts = dispatch_attempts + 1,
                        last_error = @Error,
                        updated_at = NOW()
                    WHERE id = @Id
                    """, new { Id = item.OutboxId.Value, Error = ex.Message }, tx);
            }
            else if (item.LegacyOutboxId.HasValue)
            {
                await KernelEventOutboxDualWriter.MarkIntegrationEventDispatchedAsync(
                    conn, tx, item.LegacyOutboxId.Value, lastError: ex.Message, success: false, cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);
            _logger.LogWarning(ex, "Integration outbox publish failed for id {Id}", item.LegacyOutboxId);
            return false;
        }
    }

    private sealed class PendingIntegrationEvent
    {
        public Guid? OutboxId { get; set; }
        public Guid? LegacyOutboxId { get; set; }
        public string Payload { get; set; } = "";
        public bool FromOutbox { get; set; }
    }
}
