using Dapper;
using KitPlatform.Infrastructure.CustomerApp;
using KitPlatform.Infrastructure.Data;
using KitPlatform.Packs.Pharmacy.Rx;

namespace KitPlatform.Packs.Pharmacy.Infrastructure;

internal sealed class PrescriberPortalRepository
{
    private readonly IDbConnectionFactory _db;

    public PrescriberPortalRepository(IDbConnectionFactory db) => _db = db;

    public static string NormalizePhone(string phone) => CustomerAppAuthRepository.NormalizePhone(phone);

    public async Task<PrescriberProfileRow?> FindPrescriberByPhoneAsync(
        string phone,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                full_name AS FullName,
                license_number AS LicenseNumber,
                phone AS Phone,
                specialty AS Specialty,
                status AS Status
            FROM pack_pharmacy.prescribers
            WHERE phone = @Phone
              AND deleted_at IS NULL
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<PrescriberProfileRow>(sql, new { Phone = phone });
    }

    public async Task<PrescriberProfileRow?> FindPrescriberByIdAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                full_name AS FullName,
                license_number AS LicenseNumber,
                phone AS Phone,
                specialty AS Specialty,
                status AS Status
            FROM pack_pharmacy.prescribers
            WHERE id = @Id
              AND deleted_at IS NULL
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<PrescriberProfileRow>(sql, new { Id = id });
    }

    public async Task<DateTime?> GetLatestOtpCreatedAtAsync(string phone, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT created_at
            FROM pack_pharmacy.prescriber_otp_challenges
            WHERE phone = @Phone
            ORDER BY created_at DESC
            LIMIT 1
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<DateTime?>(sql, new { Phone = phone });
    }

    public async Task InsertOtpChallengeAsync(
        string phone,
        string codeHash,
        DateTime expiresAt,
        string? pilotCode,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO pack_pharmacy.prescriber_otp_challenges (
                phone, code_hash, expires_at, pilot_code
            )
            VALUES (@Phone, @CodeHash, @ExpiresAt, @PilotCode)
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await conn.ExecuteAsync(sql, new
        {
            Phone = phone,
            CodeHash = codeHash,
            ExpiresAt = expiresAt,
            PilotCode = pilotCode,
        });
    }

    public async Task<OtpChallengeRow?> GetActiveOtpChallengeAsync(
        string phone,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                code_hash AS CodeHash,
                expires_at AS ExpiresAt,
                attempt_count AS AttemptCount
            FROM pack_pharmacy.prescriber_otp_challenges
            WHERE phone = @Phone
              AND consumed_at IS NULL
              AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<OtpChallengeRow>(sql, new { Phone = phone });
    }

    public async Task IncrementOtpAttemptAsync(Guid id, CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE pack_pharmacy.prescriber_otp_challenges
            SET attempt_count = attempt_count + 1
            WHERE id = @Id
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await conn.ExecuteAsync(sql, new { Id = id });
    }

    public async Task ConsumeOtpChallengeAsync(Guid id, CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE pack_pharmacy.prescriber_otp_challenges
            SET consumed_at = NOW()
            WHERE id = @Id
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await conn.ExecuteAsync(sql, new { Id = id });
    }

    public async Task<IReadOnlyList<PrescriberTenantLinkDto>> ListLinksForTenantAsync(
        Guid tenantId,
        string? status,
        CancellationToken cancellationToken) =>
        await QueryLinksAsync(
            "l.tenant_id = @TenantId",
            new { TenantId = tenantId, Status = status },
            status,
            cancellationToken);

    public async Task<IReadOnlyList<PrescriberTenantLinkDto>> ListLinksForPrescriberAsync(
        Guid prescriberId,
        string? status,
        CancellationToken cancellationToken) =>
        await QueryLinksAsync(
            "l.prescriber_id = @PrescriberId",
            new { PrescriberId = prescriberId, Status = status },
            status,
            cancellationToken);

    public async Task<PrescriberTenantLinkDto?> GetLinkAsync(
        Guid linkId,
        CancellationToken cancellationToken)
    {
        var items = await QueryLinksAsync("l.id = @LinkId", new { LinkId = linkId }, null, cancellationToken);
        return items.FirstOrDefault();
    }

    public async Task<PrescriberTenantLinkDto?> GetLinkForTenantAsync(
        Guid tenantId,
        Guid linkId,
        CancellationToken cancellationToken)
    {
        var items = await QueryLinksAsync(
            "l.id = @LinkId AND l.tenant_id = @TenantId",
            new { LinkId = linkId, TenantId = tenantId },
            null,
            cancellationToken);
        return items.FirstOrDefault();
    }

    public async Task<PrescriberTenantLinkDto?> GetLinkForPrescriberAsync(
        Guid prescriberId,
        Guid linkId,
        CancellationToken cancellationToken)
    {
        var items = await QueryLinksAsync(
            "l.id = @LinkId AND l.prescriber_id = @PrescriberId",
            new { LinkId = linkId, PrescriberId = prescriberId },
            null,
            cancellationToken);
        return items.FirstOrDefault();
    }

    public async Task<TenantRow?> ResolveTenantByCodeAsync(string tenantCode, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id AS Id, tenant_code AS TenantCode, tenant_name AS TenantName
            FROM tenants
            WHERE tenant_code = @TenantCode
              AND deleted_at IS NULL
              AND status = 1
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<TenantRow>(sql, new { TenantCode = tenantCode });
    }

    public async Task<IReadOnlyList<PharmacyDirectoryItemDto>> SearchDirectoryAsync(
        string? query,
        CancellationToken cancellationToken)
    {
        var conditions = new List<string>
        {
            "t.deleted_at IS NULL",
            "t.status = 1",
            "t.rx_directory_discoverable = TRUE",
        };
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query))
        {
            conditions.Add("""
                (
                    t.tenant_code ILIKE @Query
                    OR t.tenant_name ILIKE @Query
                    OR COALESCE(b.address, '') ILIKE @Query
                )
                """);
            parameters.Add("Query", $"%{query.Trim()}%");
        }

        var sql = $"""
            SELECT
                t.id AS TenantId,
                t.tenant_code AS TenantCode,
                t.tenant_name AS TenantName,
                b.address AS Address,
                b.phone AS Phone
            FROM tenants t
            LEFT JOIN LATERAL (
                SELECT address, phone
                FROM branches
                WHERE tenant_id = t.id
                  AND status = 1
                ORDER BY is_head_office DESC, created_at ASC
                LIMIT 1
            ) b ON TRUE
            WHERE {string.Join(" AND ", conditions)}
            ORDER BY t.tenant_name
            LIMIT 50
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<PharmacyDirectoryItemDto>(sql, parameters)).ToList();
    }

    public async Task<Guid> EnsurePrescriberAsync(
        string phone,
        string fullName,
        string? licenseNumber,
        string? specialty,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var existing = await conn.QuerySingleOrDefaultAsync<Guid?>(
            """
            SELECT id FROM pack_pharmacy.prescribers
            WHERE phone = @Phone AND deleted_at IS NULL
            """,
            new { Phone = phone });

        if (existing is Guid id)
        {
            await conn.ExecuteAsync(
                """
                UPDATE pack_pharmacy.prescribers
                SET
                    full_name = COALESCE(NULLIF(@FullName, ''), full_name),
                    license_number = COALESCE(NULLIF(@LicenseNumber, ''), license_number),
                    specialty = COALESCE(NULLIF(@Specialty, ''), specialty),
                    updated_at = NOW()
                WHERE id = @Id
                """,
                new
                {
                    Id = id,
                    FullName = fullName.Trim(),
                    LicenseNumber = licenseNumber?.Trim(),
                    Specialty = specialty?.Trim(),
                });
            return id;
        }

        return await conn.QuerySingleAsync<Guid>(
            """
            INSERT INTO pack_pharmacy.prescribers (
                full_name, license_number, phone, specialty, status
            )
            VALUES (
                @FullName, @LicenseNumber, @Phone, @Specialty, 'pending_verification'
            )
            RETURNING id
            """,
            new
            {
                FullName = fullName.Trim(),
                LicenseNumber = licenseNumber?.Trim(),
                Phone = phone,
                Specialty = specialty?.Trim(),
            });
    }

    public async Task<Guid> UpsertTenantInviteLinkAsync(
        Guid tenantId,
        Guid prescriberId,
        Guid? respondedBy,
        string? notes,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        var existing = await conn.QuerySingleOrDefaultAsync<(Guid Id, string Status)?>(
            """
            SELECT id AS Id, link_status AS Status
            FROM pack_pharmacy.prescriber_tenant_links
            WHERE tenant_id = @TenantId AND prescriber_id = @PrescriberId
            """,
            new { TenantId = tenantId, PrescriberId = prescriberId },
            tx);

        Guid linkId;
        if (existing is { } row)
        {
            if (row.Status is PrescriberLinkStatuses.Active or PrescriberLinkStatuses.PendingNtInvite)
                throw new InvalidOperationException(
                    row.Status == PrescriberLinkStatuses.Active
                        ? "Bác sĩ đã liên kết với nhà thuốc."
                        : "Đã gửi lời mời — đang chờ bác sĩ xác nhận.");

            linkId = row.Id;
            await conn.ExecuteAsync(
                """
                UPDATE pack_pharmacy.prescriber_tenant_links
                SET
                    link_status = @Status,
                    initiated_by = 'tenant',
                    invited_at = NOW(),
                    responded_at = NULL,
                    responded_by = NULL,
                    revoked_at = NULL,
                    revoked_by = NULL,
                    notes = @Notes,
                    updated_at = NOW()
                WHERE id = @Id
                """,
                new
                {
                    Id = linkId,
                    Status = PrescriberLinkStatuses.PendingNtInvite,
                    Notes = notes?.Trim(),
                },
                tx);
        }
        else
        {
            linkId = await conn.QuerySingleAsync<Guid>(
                """
                INSERT INTO pack_pharmacy.prescriber_tenant_links (
                    prescriber_id, tenant_id, link_status, initiated_by, notes
                )
                VALUES (
                    @PrescriberId, @TenantId, @Status, 'tenant', @Notes
                )
                RETURNING id
                """,
                new
                {
                    PrescriberId = prescriberId,
                    TenantId = tenantId,
                    Status = PrescriberLinkStatuses.PendingNtInvite,
                    Notes = notes?.Trim(),
                },
                tx);
        }

        var linkedPrescriberId = await UpsertLinkedPrescriberAsync(
            conn, tx, tenantId, prescriberId, linkId, cancellationToken);

        await conn.ExecuteAsync(
            """
            UPDATE pack_pharmacy.prescriber_tenant_links
            SET linked_prescriber_id = @LinkedPrescriberId, updated_at = NOW()
            WHERE id = @LinkId
            """,
            new { LinkId = linkId, LinkedPrescriberId = linkedPrescriberId },
            tx);

        await tx.CommitAsync(cancellationToken);
        return linkId;
    }

    public async Task<Guid> UpsertPrescriberRequestLinkAsync(
        Guid tenantId,
        Guid prescriberId,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        var existing = await conn.QuerySingleOrDefaultAsync<(Guid Id, string Status)?>(
            """
            SELECT id AS Id, link_status AS Status
            FROM pack_pharmacy.prescriber_tenant_links
            WHERE tenant_id = @TenantId AND prescriber_id = @PrescriberId
            """,
            new { TenantId = tenantId, PrescriberId = prescriberId },
            tx);

        Guid linkId;
        if (existing is { } row)
        {
            if (row.Status is PrescriberLinkStatuses.Active or PrescriberLinkStatuses.PendingNtApproval)
                throw new InvalidOperationException(
                    row.Status == PrescriberLinkStatuses.Active
                        ? "Đã liên kết với nhà thuốc này."
                        : "Đã gửi yêu cầu — đang chờ nhà thuốc duyệt.");

            linkId = row.Id;
            await conn.ExecuteAsync(
                """
                UPDATE pack_pharmacy.prescriber_tenant_links
                SET
                    link_status = @Status,
                    initiated_by = 'prescriber',
                    invited_at = NOW(),
                    responded_at = NULL,
                    responded_by = NULL,
                    revoked_at = NULL,
                    revoked_by = NULL,
                    updated_at = NOW()
                WHERE id = @Id
                """,
                new { Id = linkId, Status = PrescriberLinkStatuses.PendingNtApproval },
                tx);
        }
        else
        {
            linkId = await conn.QuerySingleAsync<Guid>(
                """
                INSERT INTO pack_pharmacy.prescriber_tenant_links (
                    prescriber_id, tenant_id, link_status, initiated_by
                )
                VALUES (@PrescriberId, @TenantId, @Status, 'prescriber')
                RETURNING id
                """,
                new
                {
                    PrescriberId = prescriberId,
                    TenantId = tenantId,
                    Status = PrescriberLinkStatuses.PendingNtApproval,
                },
                tx);
        }

        await tx.CommitAsync(cancellationToken);
        return linkId;
    }

    public async Task<bool> UpdateLinkStatusAsync(
        Guid linkId,
        string expectedCurrentStatus,
        string newStatus,
        Guid? respondedBy,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        var current = await conn.QuerySingleOrDefaultAsync<(Guid PrescriberId, Guid TenantId, string Status)?>(
            """
            SELECT prescriber_id AS PrescriberId, tenant_id AS TenantId, link_status AS Status
            FROM pack_pharmacy.prescriber_tenant_links
            WHERE id = @LinkId
            FOR UPDATE
            """,
            new { LinkId = linkId },
            tx);

        if (current is null || current.Value.Status != expectedCurrentStatus)
            return false;

        await conn.ExecuteAsync(
            """
            UPDATE pack_pharmacy.prescriber_tenant_links
            SET
                link_status = @NewStatus,
                responded_at = NOW(),
                responded_by = @RespondedBy,
                updated_at = NOW()
            WHERE id = @LinkId
            """,
            new { LinkId = linkId, NewStatus = newStatus, RespondedBy = respondedBy },
            tx);

        if (newStatus == PrescriberLinkStatuses.Active)
        {
            var linkedPrescriberId = await UpsertLinkedPrescriberAsync(
                conn,
                tx,
                current.Value.TenantId,
                current.Value.PrescriberId,
                linkId,
                cancellationToken);

            await conn.ExecuteAsync(
                """
                UPDATE pack_pharmacy.prescriber_tenant_links
                SET linked_prescriber_id = @LinkedPrescriberId, updated_at = NOW()
                WHERE id = @LinkId
                """,
                new { LinkId = linkId, LinkedPrescriberId = linkedPrescriberId },
                tx);
        }

        await tx.CommitAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RevokeLinkAsync(
        Guid linkId,
        Guid? revokedBy,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.ExecuteAsync(
            """
            UPDATE pack_pharmacy.prescriber_tenant_links
            SET
                link_status = @Revoked,
                revoked_at = NOW(),
                revoked_by = @RevokedBy,
                updated_at = NOW()
            WHERE id = @LinkId
              AND link_status = @Active
            """,
            new
            {
                LinkId = linkId,
                Active = PrescriberLinkStatuses.Active,
                Revoked = PrescriberLinkStatuses.Revoked,
                RevokedBy = revokedBy,
            });
        return rows > 0;
    }

    private async Task<Guid> UpsertLinkedPrescriberAsync(
        System.Data.Common.DbConnection conn,
        System.Data.Common.DbTransaction tx,
        Guid tenantId,
        Guid prescriberId,
        Guid linkId,
        CancellationToken cancellationToken)
    {
        var prescriber = await conn.QuerySingleAsync<PrescriberProfileRow>(
            """
            SELECT
                id AS Id,
                full_name AS FullName,
                license_number AS LicenseNumber,
                phone AS Phone,
                specialty AS Specialty,
                status AS Status
            FROM pack_pharmacy.prescribers
            WHERE id = @Id AND deleted_at IS NULL
            """,
            new { Id = prescriberId },
            tx);

        var existingId = await conn.QuerySingleOrDefaultAsync<Guid?>(
            """
            SELECT id FROM pack_pharmacy.linked_prescribers
            WHERE tenant_id = @TenantId
              AND prescriber_id = @PrescriberId
              AND deleted_at IS NULL
            """,
            new { TenantId = tenantId, PrescriberId = prescriberId },
            tx);

        if (existingId is Guid id)
        {
            await conn.ExecuteAsync(
                """
                UPDATE pack_pharmacy.linked_prescribers
                SET
                    full_name = @FullName,
                    license_number = @LicenseNumber,
                    phone = @Phone,
                    specialty = @Specialty,
                    status = 1,
                    prescriber_id = @PrescriberId,
                    link_id = @LinkId,
                    updated_at = NOW()
                WHERE id = @Id
                """,
                new
                {
                    Id = id,
                    prescriber.FullName,
                    prescriber.LicenseNumber,
                    prescriber.Phone,
                    prescriber.Specialty,
                    PrescriberId = prescriberId,
                    LinkId = linkId,
                },
                tx);
            return id;
        }

        return await conn.QuerySingleAsync<Guid>(
            """
            INSERT INTO pack_pharmacy.linked_prescribers (
                tenant_id, full_name, license_number, phone, specialty,
                status, prescriber_id, link_id
            )
            VALUES (
                @TenantId, @FullName, @LicenseNumber, @Phone, @Specialty,
                1, @PrescriberId, @LinkId
            )
            RETURNING id
            """,
            new
            {
                TenantId = tenantId,
                prescriber.FullName,
                prescriber.LicenseNumber,
                prescriber.Phone,
                prescriber.Specialty,
                PrescriberId = prescriberId,
                LinkId = linkId,
            },
            tx);
    }

    private async Task<IReadOnlyList<PrescriberTenantLinkDto>> QueryLinksAsync(
        string whereClause,
        object parameters,
        string? statusFilter,
        CancellationToken cancellationToken)
    {
        var conditions = new List<string> { whereClause };
        if (!string.IsNullOrWhiteSpace(statusFilter))
            conditions.Add("l.link_status = @Status");

        var sql = $"""
            SELECT
                l.id AS Id,
                l.prescriber_id AS PrescriberId,
                l.tenant_id AS TenantId,
                t.tenant_code AS TenantCode,
                t.tenant_name AS TenantName,
                l.linked_prescriber_id AS LinkedPrescriberId,
                l.link_status AS LinkStatus,
                l.initiated_by AS InitiatedBy,
                l.invited_at AS InvitedAt,
                l.responded_at AS RespondedAt,
                p.full_name AS PrescriberName,
                p.phone AS PrescriberPhone,
                p.license_number AS PrescriberLicenseNumber
            FROM pack_pharmacy.prescriber_tenant_links l
            INNER JOIN tenants t ON t.id = l.tenant_id
            INNER JOIN pack_pharmacy.prescribers p ON p.id = l.prescriber_id
            WHERE {string.Join(" AND ", conditions)}
            ORDER BY l.updated_at DESC
            LIMIT 200
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<PrescriberTenantLinkDto>(sql, parameters)).ToList();
    }

    internal sealed record PrescriberProfileRow(
        Guid Id,
        string FullName,
        string? LicenseNumber,
        string Phone,
        string? Specialty,
        string Status)
    {
        public PrescriberProfileDto ToDto() => new(
            Id, FullName, LicenseNumber, Phone, Specialty, Status);
    }

    internal sealed record OtpChallengeRow(
        Guid Id,
        string CodeHash,
        DateTime ExpiresAt,
        int AttemptCount);

    internal sealed record TenantRow(Guid Id, string TenantCode, string TenantName);
}
