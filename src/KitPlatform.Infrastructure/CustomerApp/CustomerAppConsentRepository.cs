using System.Data;
using Dapper;
using KitPlatform.Application.Customers;
using KitPlatform.Application.Integration;
using KitPlatform.Application.Platform.Events;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class CustomerAppConsentRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly IIntegrationOutboxWriter _outbox;
    private readonly IPlatformEventWriter _platformEvents;

    public CustomerAppConsentRepository(
        IDbConnectionFactory db,
        IIntegrationOutboxWriter outbox,
        IPlatformEventWriter platformEvents)
    {
        _db = db;
        _outbox = outbox;
        _platformEvents = platformEvents;
    }

    public async Task<IReadOnlyList<CustomerConsentDto>> GetConsentsAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id, customer_id AS CustomerId, channel AS Channel, purpose AS Purpose,
                granted AS Granted, granted_at AS GrantedAt, revoked_at AS RevokedAt,
                source AS Source, notes AS Notes
            FROM customer_consents
            WHERE tenant_id = @TenantId AND customer_id = @CustomerId
            ORDER BY purpose, channel
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<CustomerConsentDto>(sql, new { TenantId = tenantId, CustomerId = customerId }))
            .ToList();
    }

    public async Task<bool> HasGrantedConsentAsync(
        Guid tenantId,
        Guid customerId,
        short channel,
        short purpose,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT COALESCE(
                (
                    SELECT granted FROM customer_consents
                    WHERE tenant_id = @TenantId
                      AND customer_id = @CustomerId
                      AND channel = @Channel
                      AND purpose = @Purpose
                ),
                FALSE
            )
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<bool>(sql, new
        {
            TenantId = tenantId,
            CustomerId = customerId,
            Channel = channel,
            Purpose = purpose,
        });
    }

    public async Task<IReadOnlyList<CustomerConsentDto>> UpsertConsentsAsync(
        Guid tenantId,
        Guid customerId,
        UpsertCustomerConsentsRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Items.Count == 0)
            throw new InvalidOperationException("Thêm ít nhất một dòng đồng ý.");

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        var exists = await conn.QuerySingleAsync<bool>(
            """
            SELECT EXISTS(
                SELECT 1 FROM customers
                WHERE id = @CustomerId AND tenant_id = @TenantId AND deleted_at IS NULL
            )
            """,
            new { CustomerId = customerId, TenantId = tenantId }, tx);
        if (!exists)
            throw new InvalidOperationException("Khách hàng không tồn tại.");

        foreach (var item in request.Items)
        {
            var now = DateTime.UtcNow;
            const string upsertSql = """
                INSERT INTO customer_consents (
                    tenant_id, customer_id, channel, purpose, granted, granted_at, revoked_at,
                    source, captured_by, notes
                )
                VALUES (
                    @TenantId, @CustomerId, @Channel, @Purpose, @Granted,
                    @GrantedAt, @RevokedAt, @Source, NULL, @Notes
                )
                ON CONFLICT (tenant_id, customer_id, channel, purpose) DO UPDATE SET
                    granted = EXCLUDED.granted,
                    granted_at = EXCLUDED.granted_at,
                    revoked_at = EXCLUDED.revoked_at,
                    source = EXCLUDED.source,
                    captured_by = NULL,
                    notes = EXCLUDED.notes,
                    updated_at = NOW()
                RETURNING id
                """;
            var consentId = await conn.QuerySingleAsync<Guid>(upsertSql, new
            {
                TenantId = tenantId,
                CustomerId = customerId,
                item.Channel,
                item.Purpose,
                item.Granted,
                GrantedAt = item.Granted ? now : (DateTime?)null,
                RevokedAt = item.Granted ? (DateTime?)null : now,
                Source = CustomerConsentSources.App,
                item.Notes,
            }, tx);

            await _outbox.WriteAsync(
                conn, tx,
                IntegrationOutboxEventTypes.CustomerConsentUpdated,
                IntegrationOutboxAggregateTypes.CustomerConsent,
                consentId,
                new
                {
                    consentId,
                    customerId,
                    item.Channel,
                    item.Purpose,
                    item.Granted,
                    Source = CustomerConsentSources.App,
                },
                null,
                cancellationToken);

            await _platformEvents.WriteAsync(
                conn,
                tx,
                PlatformEventTypes.CustomerConsentUpdated,
                PlatformEventAggregateTypes.CustomerConsent,
                consentId,
                new
                {
                    consentId,
                    customerId,
                    item.Channel,
                    item.Purpose,
                    item.Granted,
                    Source = CustomerConsentSources.App,
                },
                cancellationToken: cancellationToken);
        }

        await tx.CommitAsync(cancellationToken);
        return await GetConsentsAsync(tenantId, customerId, cancellationToken);
    }
}
