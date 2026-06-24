using Dapper;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PharmaCore.Application.Integration;
using PharmaCore.Infrastructure.Data;

namespace PharmaCore.Infrastructure.Integration;

internal sealed class IntegrationOutboxWorker : BackgroundService
{
    private readonly IDbConnectionFactory _db;
    private readonly IIntegrationOutboxPublisher _publisher;
    private readonly IntegrationOutboxOptions _options;
    private readonly ILogger<IntegrationOutboxWorker> _logger;

    public IntegrationOutboxWorker(
        IDbConnectionFactory db,
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
            "Integration outbox worker started (mode={Mode}, batch={BatchSize}, interval={IntervalSeconds}s).",
            mode,
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

        List<Guid> pendingIds;
        await using (var conn = await _db.CreateOpenConnectionAsync(cancellationToken))
        {
            const string listSql = """
                SELECT id
                FROM integration_outbox
                WHERE published_at IS NULL
                  AND publish_attempts < @MaxAttempts
                ORDER BY occurred_at
                LIMIT @BatchSize
                """;
            pendingIds = (await conn.QueryAsync<Guid>(listSql, new { BatchSize = batchSize, MaxAttempts = maxAttempts }))
                .ToList();
        }

        if (pendingIds.Count == 0)
            return;

        var published = 0;
        foreach (var id in pendingIds)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            if (await TryPublishOneAsync(id, cancellationToken))
                published++;
        }

        if (published > 0)
            _logger.LogInformation("Integration outbox published {Count} event(s).", published);
    }

    private async Task<bool> TryPublishOneAsync(Guid id, CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        const string lockSql = """
            SELECT
                id AS Id,
                tenant_id AS TenantId,
                event_type AS EventType,
                aggregate_type AS AggregateType,
                aggregate_id AS AggregateId,
                payload::text AS Payload
            FROM integration_outbox
            WHERE id = @Id
              AND published_at IS NULL
            FOR UPDATE
            """;

        var row = await conn.QuerySingleOrDefaultAsync<OutboxRow>(lockSql, new { Id = id }, tx);
        if (row is null)
        {
            await tx.CommitAsync(cancellationToken);
            return false;
        }

        try
        {
            await _publisher.PublishAsync(row.Payload, cancellationToken);

            const string publishSql = """
                UPDATE integration_outbox
                SET published_at = NOW(),
                    publish_attempts = publish_attempts + 1,
                    last_error = NULL
                WHERE id = @Id
                """;
            await conn.ExecuteAsync(publishSql, new { row.Id }, tx);
            await tx.CommitAsync(cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            const string failSql = """
                UPDATE integration_outbox
                SET publish_attempts = publish_attempts + 1,
                    last_error = @Error
                WHERE id = @Id
                """;
            await conn.ExecuteAsync(failSql, new { row.Id, Error = ex.Message }, tx);
            await tx.CommitAsync(cancellationToken);
            _logger.LogWarning(
                ex,
                "Outbox publish failed for {EventType} {AggregateType}/{AggregateId}",
                row.EventType,
                row.AggregateType,
                row.AggregateId);
            return false;
        }
    }

    private sealed record OutboxRow(
        Guid Id,
        Guid TenantId,
        string EventType,
        string AggregateType,
        Guid AggregateId,
        string Payload);
}
