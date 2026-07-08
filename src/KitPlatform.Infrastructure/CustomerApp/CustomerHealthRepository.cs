using Dapper;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class CustomerHealthRepository
{
    private readonly IDbConnectionFactory _db;

    public CustomerHealthRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IReadOnlyList<CustomerHealthRecordRow>> ListAsync(
        Guid tenantId,
        Guid accountId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                family_member_id AS FamilyMemberId,
                record_type AS RecordType,
                title AS Title,
                summary AS Summary,
                provider_name AS ProviderName,
                recorded_at AS RecordedAt,
                attachments::text AS AttachmentsJson,
                metadata::text AS MetadataJson,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM health_records
            WHERE tenant_id = @TenantId
              AND account_id = @AccountId
            ORDER BY recorded_at DESC, created_at DESC
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<CustomerHealthRecordRow>(sql, new
        {
            TenantId = tenantId,
            AccountId = accountId,
        })).ToList();
    }

    public async Task<CustomerHealthRecordRow?> GetAsync(
        Guid tenantId,
        Guid accountId,
        Guid healthRecordId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                family_member_id AS FamilyMemberId,
                record_type AS RecordType,
                title AS Title,
                summary AS Summary,
                provider_name AS ProviderName,
                recorded_at AS RecordedAt,
                attachments::text AS AttachmentsJson,
                metadata::text AS MetadataJson,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM health_records
            WHERE id = @HealthRecordId
              AND tenant_id = @TenantId
              AND account_id = @AccountId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<CustomerHealthRecordRow>(sql, new
        {
            HealthRecordId = healthRecordId,
            TenantId = tenantId,
            AccountId = accountId,
        });
    }

    public async Task<Guid> CreateAsync(
        Guid tenantId,
        Guid accountId,
        Guid? familyMemberId,
        string recordType,
        string title,
        string? summary,
        string? providerName,
        DateTimeOffset recordedAt,
        string attachmentsJson,
        string metadataJson,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO health_records (
                tenant_id,
                account_id,
                family_member_id,
                record_type,
                title,
                summary,
                provider_name,
                recorded_at,
                attachments,
                metadata
            )
            VALUES (
                @TenantId,
                @AccountId,
                @FamilyMemberId,
                @RecordType,
                @Title,
                @Summary,
                @ProviderName,
                @RecordedAt,
                @AttachmentsJson::jsonb,
                @MetadataJson::jsonb
            )
            RETURNING id
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<Guid>(sql, new
        {
            TenantId = tenantId,
            AccountId = accountId,
            FamilyMemberId = familyMemberId,
            RecordType = recordType,
            Title = title,
            Summary = summary,
            ProviderName = providerName,
            RecordedAt = recordedAt.UtcDateTime,
            AttachmentsJson = attachmentsJson,
            MetadataJson = metadataJson,
        });
    }

    public async Task<bool> UpdateAsync(
        Guid tenantId,
        Guid accountId,
        Guid healthRecordId,
        Guid? familyMemberId,
        string recordType,
        string title,
        string? summary,
        string? providerName,
        DateTimeOffset recordedAt,
        string attachmentsJson,
        string metadataJson,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE health_records
            SET family_member_id = @FamilyMemberId,
                record_type = @RecordType,
                title = @Title,
                summary = @Summary,
                provider_name = @ProviderName,
                recorded_at = @RecordedAt,
                attachments = @AttachmentsJson::jsonb,
                metadata = @MetadataJson::jsonb,
                updated_at = NOW()
            WHERE id = @HealthRecordId
              AND tenant_id = @TenantId
              AND account_id = @AccountId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.ExecuteAsync(sql, new
        {
            HealthRecordId = healthRecordId,
            TenantId = tenantId,
            AccountId = accountId,
            FamilyMemberId = familyMemberId,
            RecordType = recordType,
            Title = title,
            Summary = summary,
            ProviderName = providerName,
            RecordedAt = recordedAt.UtcDateTime,
            AttachmentsJson = attachmentsJson,
            MetadataJson = metadataJson,
        });
        return rows > 0;
    }

    public async Task<bool> DeleteAsync(
        Guid tenantId,
        Guid accountId,
        Guid healthRecordId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            DELETE FROM health_records
            WHERE id = @HealthRecordId
              AND tenant_id = @TenantId
              AND account_id = @AccountId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.ExecuteAsync(sql, new
        {
            HealthRecordId = healthRecordId,
            TenantId = tenantId,
            AccountId = accountId,
        });
        return rows > 0;
    }
}

internal sealed class CustomerHealthRecordRow
{
    public Guid Id { get; set; }
    public Guid? FamilyMemberId { get; set; }
    public string RecordType { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Summary { get; set; }
    public string? ProviderName { get; set; }
    public DateTime RecordedAt { get; set; }
    public string AttachmentsJson { get; set; } = "[]";
    public string MetadataJson { get; set; } = "{}";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
