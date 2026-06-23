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
    private readonly IntegrationOutboxOptions _options;
    private readonly ILogger<IntegrationOutboxWorker> _logger;

    public IntegrationOutboxWorker(
        IDbConnectionFactory db,
        IOptions<IntegrationOutboxOptions> options,
        ILogger<IntegrationOutboxWorker> logger)
    {
        _db = db;
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
        _logger.LogInformation(
            "Integration outbox worker started (batch={BatchSize}, interval={IntervalSeconds}s).",
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
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        const string fetchSql = """
            SELECT id AS Id, tenant_id AS TenantId, event_type AS EventType,
                   aggregate_type AS AggregateType, aggregate_id AS AggregateId
            FROM integration_outbox
            WHERE published_at IS NULL
            ORDER BY occurred_at
            LIMIT @BatchSize
            FOR UPDATE SKIP LOCKED
            """;

        var rows = (await conn.QueryAsync<OutboxRow>(fetchSql, new { BatchSize = batchSize }, tx)).ToList();
        if (rows.Count == 0)
        {
            await tx.CommitAsync(cancellationToken);
            return;
        }

        const string publishSql = """
            UPDATE integration_outbox
            SET published_at = NOW(),
                publish_attempts = publish_attempts + 1,
                last_error = NULL
            WHERE id = @Id
            """;

        foreach (var row in rows)
        {
            _logger.LogInformation(
                "Outbox publish stub: {EventType} {AggregateType}/{AggregateId} tenant={TenantId}",
                row.EventType,
                row.AggregateType,
                row.AggregateId,
                row.TenantId);

            await conn.ExecuteAsync(publishSql, new { row.Id }, tx);
        }

        await tx.CommitAsync(cancellationToken);
        _logger.LogInformation("Integration outbox published {Count} event(s).", rows.Count);
    }

    private sealed record OutboxRow(
        Guid Id,
        Guid TenantId,
        string EventType,
        string AggregateType,
        Guid AggregateId);
}
