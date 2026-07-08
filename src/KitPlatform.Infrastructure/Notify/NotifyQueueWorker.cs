using Dapper;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using KitPlatform.Application.Notify;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Infrastructure.Notify;

/// <summary>
/// Processes <c>kit_notify.notify_queue</c> — in_app marks sent; push dispatches via Web Push.
/// </summary>
internal sealed class NotifyQueueWorker : BackgroundService
{
    private readonly NpgsqlConnectionFactory _db;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly NotifyQueueOptions _options;
    private readonly ILogger<NotifyQueueWorker> _logger;

    public NotifyQueueWorker(
        NpgsqlConnectionFactory db,
        IServiceScopeFactory scopeFactory,
        IOptions<NotifyQueueOptions> options,
        ILogger<NotifyQueueWorker> logger)
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
            _logger.LogInformation("Notify queue worker is disabled.");
            return;
        }

        var delay = TimeSpan.FromSeconds(Math.Max(5, _options.PollIntervalSeconds));
        _logger.LogInformation(
            "Notify queue worker started (batch={Batch}, interval={Interval}s).",
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
                _logger.LogError(ex, "Notify queue worker batch failed.");
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
        var maxAttempts = Math.Max(1, _options.MaxAttempts);

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);

        const string listSql = """
            SELECT id
            FROM kit_notify.notify_queue
            WHERE status = 1
              AND processed_at IS NULL
              AND scheduled_at <= NOW()
              AND attempt_count < @MaxAttempts
              AND deleted_at IS NULL
            ORDER BY scheduled_at
            LIMIT @BatchSize
            FOR UPDATE SKIP LOCKED
            """;

        await using var tx = await conn.BeginTransactionAsync(cancellationToken);
        var ids = (await conn.QueryAsync<Guid>(listSql, new { BatchSize = batchSize, MaxAttempts = maxAttempts }, tx))
            .ToList();

        if (ids.Count == 0)
        {
            await tx.CommitAsync(cancellationToken);
            return;
        }

        const string detailSql = """
            SELECT
                q.id AS QueueId,
                q.tenant_id AS TenantId,
                q.channel AS Channel,
                q.attempt_count AS AttemptCount,
                n.title AS Title,
                n.body AS Body,
                n.payload::text AS PayloadJson,
                r.customer_id AS CustomerId
            FROM kit_notify.notify_queue q
            INNER JOIN kit_notify.notify_notification n ON n.id = q.notification_id
            LEFT JOIN kit_notify.notify_recipient r ON r.id = q.recipient_id
            WHERE q.id = ANY(@Ids)
            """;

        var items = (await conn.QueryAsync<NotifyQueueDispatchItem>(detailSql, new { Ids = ids.ToArray() }, tx))
            .ToList();

        await using var scope = _scopeFactory.CreateAsyncScope();
        var dispatcher = scope.ServiceProvider.GetRequiredService<INotifyQueueDispatcher>();

        var sentCount = 0;
        var failedCount = 0;

        foreach (var item in items)
        {
            var result = await dispatcher.DispatchAsync(item, cancellationToken);
            var shouldMarkSent = ShouldMarkSent(result.Outcome);

            if (shouldMarkSent)
            {
                await MarkSentAsync(conn, tx, item.QueueId, cancellationToken);
                sentCount++;
            }
            else if (result.Outcome == NotifyDispatchOutcome.Failed)
            {
                await MarkFailedAttemptAsync(
                    conn, tx, item.QueueId, item.AttemptCount + 1, maxAttempts, result.Error, cancellationToken);
                failedCount++;
            }
            else
            {
                await MarkSkippedAsync(conn, tx, item.QueueId, result.Outcome, cancellationToken);
                sentCount++;
            }
        }

        await tx.CommitAsync(cancellationToken);

        if (sentCount > 0 || failedCount > 0)
        {
            _logger.LogInformation(
                "Notify queue processed batch: sent/skipped={Sent}, failed_retry={Failed}.",
                sentCount,
                failedCount);
        }
    }

    private static bool ShouldMarkSent(NotifyDispatchOutcome outcome) =>
        outcome is NotifyDispatchOutcome.Sent
            or NotifyDispatchOutcome.SkippedInApp
            or NotifyDispatchOutcome.SkippedNoDevice
            or NotifyDispatchOutcome.SkippedNoConsent
            or NotifyDispatchOutcome.SkippedPushDisabled
            or NotifyDispatchOutcome.SkippedNoRecipient
            or NotifyDispatchOutcome.ChannelNotSupported;

    private static Task MarkSentAsync(
        System.Data.IDbConnection conn,
        System.Data.IDbTransaction tx,
        Guid queueId,
        CancellationToken cancellationToken) =>
        conn.ExecuteAsync("""
            UPDATE kit_notify.notify_queue
            SET status = 3,
                processed_at = NOW(),
                attempt_count = attempt_count + 1,
                last_error = NULL,
                updated_at = NOW()
            WHERE id = @Id;

            UPDATE kit_notify.notify_notification n
            SET sent_at = COALESCE(n.sent_at, NOW()), updated_at = NOW()
            FROM kit_notify.notify_queue q
            WHERE q.id = @Id AND n.id = q.notification_id;

            UPDATE kit_notify.notify_recipient r
            SET delivered_at = COALESCE(r.delivered_at, NOW()), updated_at = NOW()
            FROM kit_notify.notify_queue q
            WHERE q.id = @Id AND r.id = q.recipient_id;
            """, new { Id = queueId }, tx);

    private static Task MarkSkippedAsync(
        System.Data.IDbConnection conn,
        System.Data.IDbTransaction tx,
        Guid queueId,
        NotifyDispatchOutcome outcome,
        CancellationToken cancellationToken) =>
        conn.ExecuteAsync("""
            UPDATE kit_notify.notify_queue
            SET status = 3,
                processed_at = NOW(),
                attempt_count = attempt_count + 1,
                last_error = @Reason,
                updated_at = NOW()
            WHERE id = @Id
            """, new { Id = queueId, Reason = outcome.ToString() }, tx);

    private static Task MarkFailedAttemptAsync(
        System.Data.IDbConnection conn,
        System.Data.IDbTransaction tx,
        Guid queueId,
        int nextAttempt,
        int maxAttempts,
        string? error,
        CancellationToken cancellationToken)
    {
        var failed = nextAttempt >= maxAttempts;
        return conn.ExecuteAsync("""
            UPDATE kit_notify.notify_queue
            SET status = @Status,
                processed_at = CASE WHEN @Failed THEN NOW() ELSE processed_at END,
                attempt_count = @NextAttempt,
                last_error = @Error,
                updated_at = NOW()
            WHERE id = @Id
            """, new
        {
            Id = queueId,
            Status = failed ? 4 : 1,
            Failed = failed,
            NextAttempt = nextAttempt,
            Error = error,
        }, tx);
    }
}

