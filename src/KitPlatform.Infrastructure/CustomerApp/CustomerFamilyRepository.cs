using Dapper;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class CustomerFamilyRepository
{
    private readonly IDbConnectionFactory _db;

    public CustomerFamilyRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IReadOnlyList<CustomerFamilyMemberRow>> ListAsync(
        Guid tenantId,
        Guid accountId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                linked_customer_id AS LinkedCustomerId,
                full_name AS FullName,
                phone AS Phone,
                date_of_birth AS DateOfBirth,
                gender AS Gender,
                relationship AS Relationship,
                notes AS Notes,
                status AS Status,
                notify_caregiver AS NotifyCaregiver,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM family_members
            WHERE tenant_id = @TenantId
              AND account_id = @AccountId
            ORDER BY created_at DESC, id DESC
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<CustomerFamilyMemberRow>(
            sql,
            new { TenantId = tenantId, AccountId = accountId })).ToList();
    }

    public async Task<CustomerFamilyMemberRow?> GetAsync(
        Guid tenantId,
        Guid accountId,
        Guid familyMemberId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                linked_customer_id AS LinkedCustomerId,
                full_name AS FullName,
                phone AS Phone,
                date_of_birth AS DateOfBirth,
                gender AS Gender,
                relationship AS Relationship,
                notes AS Notes,
                status AS Status,
                notify_caregiver AS NotifyCaregiver,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM family_members
            WHERE id = @FamilyMemberId
              AND tenant_id = @TenantId
              AND account_id = @AccountId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<CustomerFamilyMemberRow>(sql, new
        {
            FamilyMemberId = familyMemberId,
            TenantId = tenantId,
            AccountId = accountId,
        });
    }

    public async Task<Guid> CreateAsync(
        Guid tenantId,
        Guid accountId,
        Guid? linkedCustomerId,
        string fullName,
        string? phone,
        DateOnly? dateOfBirth,
        short? gender,
        string relationship,
        string? notes,
        bool notifyCaregiver,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO family_members (
                tenant_id,
                account_id,
                linked_customer_id,
                full_name,
                phone,
                date_of_birth,
                gender,
                relationship,
                notes,
                notify_caregiver,
                status
            )
            VALUES (
                @TenantId,
                @AccountId,
                @LinkedCustomerId,
                @FullName,
                @Phone,
                @DateOfBirth,
                @Gender,
                @Relationship,
                @Notes,
                @NotifyCaregiver,
                1
            )
            RETURNING id
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<Guid>(sql, new
        {
            TenantId = tenantId,
            AccountId = accountId,
            LinkedCustomerId = linkedCustomerId,
            FullName = fullName,
            Phone = phone,
            DateOfBirth = dateOfBirth,
            Gender = gender,
            Relationship = relationship,
            Notes = notes,
            NotifyCaregiver = notifyCaregiver,
        });
    }

    public async Task<bool> UpdateAsync(
        Guid tenantId,
        Guid accountId,
        Guid familyMemberId,
        Guid? linkedCustomerId,
        string fullName,
        string? phone,
        DateOnly? dateOfBirth,
        short? gender,
        string relationship,
        string? notes,
        short status,
        bool notifyCaregiver,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE family_members
            SET linked_customer_id = @LinkedCustomerId,
                full_name = @FullName,
                phone = @Phone,
                date_of_birth = @DateOfBirth,
                gender = @Gender,
                relationship = @Relationship,
                notes = @Notes,
                status = @Status,
                notify_caregiver = @NotifyCaregiver,
                updated_at = NOW()
            WHERE id = @FamilyMemberId
              AND tenant_id = @TenantId
              AND account_id = @AccountId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.ExecuteAsync(sql, new
        {
            FamilyMemberId = familyMemberId,
            TenantId = tenantId,
            AccountId = accountId,
            LinkedCustomerId = linkedCustomerId,
            FullName = fullName,
            Phone = phone,
            DateOfBirth = dateOfBirth,
            Gender = gender,
            Relationship = relationship,
            Notes = notes,
            Status = status,
            NotifyCaregiver = notifyCaregiver,
        });
        return rows > 0;
    }

    public async Task<bool> SetNotifyCaregiverAsync(
        Guid tenantId,
        Guid accountId,
        Guid familyMemberId,
        bool notifyCaregiver,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE family_members
            SET notify_caregiver = @NotifyCaregiver,
                updated_at = NOW()
            WHERE id = @FamilyMemberId
              AND tenant_id = @TenantId
              AND account_id = @AccountId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.ExecuteAsync(sql, new
        {
            FamilyMemberId = familyMemberId,
            TenantId = tenantId,
            AccountId = accountId,
            NotifyCaregiver = notifyCaregiver,
        });
        return rows > 0;
    }

    public async Task<bool> DeleteAsync(
        Guid tenantId,
        Guid accountId,
        Guid familyMemberId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            DELETE FROM family_members
            WHERE id = @FamilyMemberId
              AND tenant_id = @TenantId
              AND account_id = @AccountId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.ExecuteAsync(sql, new
        {
            FamilyMemberId = familyMemberId,
            TenantId = tenantId,
            AccountId = accountId,
        });
        return rows > 0;
    }
}

internal sealed class CustomerFamilyMemberRow
{
    public Guid Id { get; set; }
    public Guid? LinkedCustomerId { get; set; }
    public string FullName { get; set; } = "";
    public string? Phone { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public short? Gender { get; set; }
    public string Relationship { get; set; } = "";
    public string? Notes { get; set; }
    public short Status { get; set; }
    public bool NotifyCaregiver { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
