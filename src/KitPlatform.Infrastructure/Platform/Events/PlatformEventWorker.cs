using System.Text.Json;
using Dapper;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using KitPlatform.Application.Platform.Events;
using KitPlatform.Infrastructure.Data;
using KitPlatform.Infrastructure.Kernel.Event;

namespace KitPlatform.Infrastructure.Platform.Events;

/// <summary>
/// P1.1: Polls <c>kit_event.event_outbox</c> (platform bus) with legacy <c>platform_events</c> fallback.
/// </summary>
internal sealed class PlatformEventWorker : BackgroundService
{
    private readonly NpgsqlConnectionFactory _db;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly PlatformEventOptions _options;
    private readonly ILogger<PlatformEventWorker> _logger;

    public PlatformEventWorker(
        NpgsqlConnectionFactory db,
        IServiceScopeFactory scopeFactory,
        IOptions<PlatformEventOptions> options,
        ILogger<PlatformEventWorker> logger)
    {
        _db = db;
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Platform event worker is disabled.");
            return;
        }

        var delay = TimeSpan.FromSeconds(Math.Max(3, _options.PollIntervalSeconds));
        _logger.LogInformation(
            "Platform event worker started (kernel outbox + legacy fallback, batch={BatchSize}, interval={IntervalSeconds}s).",
            Math.Max(1, _options.BatchSize),
            delay.TotalSeconds);

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
                _logger.LogError(ex, "Platform event worker batch failed.");
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
        var maxAttempts = Math.Max(1, _options.MaxDispatchAttempts);

        List<PendingPlatformEvent> pending;
        await using (var conn = await _db.CreateOpenConnectionAsync(cancellationToken))
        {
            const string outboxSql = """
                SELECT
                    eo.id AS OutboxId,
                    eo.legacy_platform_event_id AS LegacyPlatformEventId,
                    eo.payload::text AS Payload,
                    TRUE AS FromOutbox
                FROM kit_event.event_outbox eo
                WHERE eo.event_bus = 'platform'
                  AND eo.dispatched_at IS NULL
                  AND eo.dispatch_attempts < @MaxAttempts
                  AND eo.deleted_at IS NULL
                ORDER BY eo.occurred_at
                LIMIT @BatchSize
                """;

            pending = (await conn.QueryAsync<PendingPlatformEvent>(outboxSql, new
            {
                BatchSize = batchSize,
                MaxAttempts = maxAttempts,
            })).ToList();

            if (pending.Count < batchSize)
            {
                const string legacySql = """
                    SELECT
                        NULL::uuid AS OutboxId,
                        pe.id AS LegacyPlatformEventId,
                        pe.payload::text AS Payload,
                        FALSE AS FromOutbox
                    FROM public.platform_events pe
                    WHERE pe.dispatched_at IS NULL
                      AND pe.dispatch_attempts < @MaxAttempts
                      AND NOT EXISTS (
                          SELECT 1 FROM kit_event.event_outbox eo
                          WHERE eo.legacy_platform_event_id = pe.id
                      )
                    ORDER BY pe.occurred_at
                    LIMIT @Remaining
                    """;

                var legacy = await conn.QueryAsync<PendingPlatformEvent>(legacySql, new
                {
                    Remaining = batchSize - pending.Count,
                    MaxAttempts = maxAttempts,
                });
                pending.AddRange(legacy);
            }
        }

        if (pending.Count == 0)
            return;

        var dispatched = 0;
        foreach (var item in pending)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            if (await TryDispatchOneAsync(item, cancellationToken))
                dispatched++;
        }

        if (dispatched > 0)
            _logger.LogInformation("Platform events dispatched {Count} event(s).", dispatched);
    }

    private async Task<bool> TryDispatchOneAsync(
        PendingPlatformEvent item,
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
                FROM platform_events
                WHERE id = @Id AND dispatched_at IS NULL
                FOR UPDATE
                """,
                new { Id = item.LegacyPlatformEventId },
                tx);
        }

        if (payload is null)
        {
            await tx.CommitAsync(cancellationToken);
            return false;
        }

        var legacyId = item.LegacyPlatformEventId ?? item.OutboxId;

        try
        {
            var envelope = ParseEnvelope(payload);
            await using var scope = _scopeFactory.CreateAsyncScope();
            var dispatcher = scope.ServiceProvider.GetRequiredService<IPlatformEventDispatcher>();
            await dispatcher.DispatchAsync(envelope, cancellationToken);

            if (item.LegacyPlatformEventId.HasValue)
            {
                await conn.ExecuteAsync("""
                    UPDATE platform_events
                    SET dispatched_at = NOW(),
                        dispatch_attempts = dispatch_attempts + 1,
                        last_error = NULL
                    WHERE id = @Id
                    """, new { Id = item.LegacyPlatformEventId.Value }, tx);
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
            else if (item.LegacyPlatformEventId.HasValue)
            {
                await KernelEventOutboxDualWriter.MarkPlatformEventDispatchedAsync(
                    conn, tx, item.LegacyPlatformEventId.Value, lastError: null, success: true, cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            if (item.LegacyPlatformEventId.HasValue)
            {
                await conn.ExecuteAsync("""
                    UPDATE platform_events
                    SET dispatch_attempts = dispatch_attempts + 1, last_error = @Error
                    WHERE id = @Id
                    """, new { Id = item.LegacyPlatformEventId.Value, Error = ex.Message }, tx);
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
            else if (item.LegacyPlatformEventId is Guid legacyPlatformId)
            {
                await KernelEventOutboxDualWriter.MarkPlatformEventDispatchedAsync(
                    conn, tx, legacyPlatformId, lastError: ex.Message, success: false, cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);
            _logger.LogWarning(ex, "Platform event dispatch failed for event {EventId}", legacyId);
            return false;
        }
    }

    private static PlatformEventEnvelope ParseEnvelope(string payloadJson)
    {
        using var doc = JsonDocument.Parse(payloadJson);
        var root = doc.RootElement;

        return new PlatformEventEnvelope(
            EventId: root.GetProperty("eventId").GetGuid(),
            EventType: root.GetProperty("eventType").GetString() ?? "",
            EventVersion: root.TryGetProperty("eventVersion", out var versionEl) && versionEl.TryGetInt32(out var version)
                ? version
                : 1,
            TenantId: root.GetProperty("tenantId").GetGuid(),
            OccurredAt: root.TryGetProperty("occurredAt", out var occurredEl)
                && occurredEl.TryGetDateTimeOffset(out var occurred)
                ? occurred
                : DateTimeOffset.UtcNow,
            Source: root.TryGetProperty("source", out var sourceEl)
                ? sourceEl.GetString() ?? PlatformEventSources.PharmacyPack
                : PlatformEventSources.PharmacyPack,
            AggregateType: root.GetProperty("aggregateType").GetString() ?? "",
            AggregateId: root.GetProperty("aggregateId").GetGuid(),
            ActorUserId: root.TryGetProperty("actorUserId", out var actorEl)
                && actorEl.ValueKind != JsonValueKind.Null
                && actorEl.TryGetGuid(out var actorId)
                ? actorId
                : null,
            CorrelationId: root.TryGetProperty("correlationId", out var corrEl)
                && corrEl.ValueKind != JsonValueKind.Null
                && corrEl.TryGetGuid(out var corrId)
                ? corrId
                : null,
            Data: root.TryGetProperty("data", out var dataEl) ? dataEl.Clone() : null);
    }

    private sealed class PendingPlatformEvent
    {
        public Guid? OutboxId { get; set; }
        public Guid? LegacyPlatformEventId { get; set; }
        public string Payload { get; set; } = "";
        public bool FromOutbox { get; set; }
    }
}
