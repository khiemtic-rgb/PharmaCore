using Dapper;
using PharmaCore.Application.CustomerApp;
using PharmaCore.Infrastructure.Data;

namespace PharmaCore.Infrastructure.CustomerApp;

internal sealed class CustomerChatRepository
{
    private readonly IDbConnectionFactory _db;

    public CustomerChatRepository(IDbConnectionFactory db) => _db = db;

    public async Task<ChatThreadRow?> GetThreadAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id AS Id,
                customer_unread_count AS CustomerUnreadCount,
                staff_unread_count AS StaffUnreadCount,
                last_message_at AS LastMessageAt,
                last_message_preview AS LastMessagePreview
            FROM customer_chat_threads
            WHERE tenant_id = @TenantId AND customer_id = @CustomerId
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<ChatThreadRow>(sql, new { TenantId = tenantId, CustomerId = customerId });
    }

    public async Task<Guid> EnsureThreadAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO customer_chat_threads (tenant_id, customer_id)
            VALUES (@TenantId, @CustomerId)
            ON CONFLICT (tenant_id, customer_id) DO UPDATE SET updated_at = NOW()
            RETURNING id
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<Guid>(sql, new { TenantId = tenantId, CustomerId = customerId });
    }

    public async Task<IReadOnlyList<ChatMessageRow>> ListMessagesAsync(
        Guid threadId,
        Guid? beforeId,
        int limit,
        CancellationToken cancellationToken)
    {
        limit = Math.Clamp(limit, 1, 100);
        const string sql = """
            SELECT
                m.id AS Id,
                m.sender_type AS SenderType,
                m.body AS Body,
                m.created_at AS CreatedAt,
                m.read_at AS ReadAt,
                CASE
                    WHEN m.sender_type = 1 THEN c.full_name
                    WHEN m.sender_type = 2 THEN COALESCE(e.full_name, u.username)
                END AS SenderName
            FROM customer_chat_messages m
            LEFT JOIN customers c ON c.id = m.sender_id AND m.sender_type = 1
            LEFT JOIN users u ON u.id = m.sender_id AND m.sender_type = 2
            LEFT JOIN employees e ON e.id = u.employee_id
            WHERE m.thread_id = @ThreadId
              AND (@BeforeId IS NULL OR m.created_at < (
                  SELECT created_at FROM customer_chat_messages WHERE id = @BeforeId AND thread_id = @ThreadId
              ))
            ORDER BY m.created_at DESC
            LIMIT @Limit
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<ChatMessageRow>(sql, new { ThreadId = threadId, BeforeId = beforeId, Limit = limit + 1 }))
            .ToList();
    }

    public async Task<ChatMessageRow> InsertMessageAsync(
        Guid tenantId,
        Guid threadId,
        short senderType,
        Guid? senderId,
        string body,
        CancellationToken cancellationToken)
    {
        const string insertSql = """
            INSERT INTO customer_chat_messages (thread_id, tenant_id, sender_type, sender_id, body)
            VALUES (@ThreadId, @TenantId, @SenderType, @SenderId, @Body)
            RETURNING
                id AS Id,
                sender_type AS SenderType,
                body AS Body,
                created_at AS CreatedAt,
                read_at AS ReadAt,
                NULL::text AS SenderName
            """;
        const string updateThreadSql = """
            UPDATE customer_chat_threads
            SET
                last_message_at = @CreatedAt,
                last_message_preview = LEFT(@Body, 200),
                customer_unread_count = customer_unread_count + @CustomerUnreadDelta,
                staff_unread_count = staff_unread_count + @StaffUnreadDelta,
                updated_at = NOW()
            WHERE id = @ThreadId
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        var inserted = await conn.QuerySingleAsync<ChatMessageRow>(insertSql, new
        {
            ThreadId = threadId,
            TenantId = tenantId,
            SenderType = senderType,
            SenderId = senderId,
            Body = body,
        }, tx);

        await conn.ExecuteAsync(updateThreadSql, new
        {
            ThreadId = threadId,
            inserted.CreatedAt,
            Body = body,
            CustomerUnreadDelta = senderType == CustomerChatSenderTypes.Staff ? 1 : 0,
            StaffUnreadDelta = senderType == CustomerChatSenderTypes.Customer ? 1 : 0,
        }, tx);

        await tx.CommitAsync(cancellationToken);
        return inserted with { SenderName = null };
    }

    public async Task MarkReadAsync(
        Guid threadId,
        short readerType,
        CancellationToken cancellationToken)
    {
        var senderToMark = readerType == CustomerChatSenderTypes.Customer
            ? CustomerChatSenderTypes.Staff
            : CustomerChatSenderTypes.Customer;

        const string markSql = """
            UPDATE customer_chat_messages
            SET read_at = NOW()
            WHERE thread_id = @ThreadId
              AND sender_type = @SenderType
              AND read_at IS NULL
            """;
        var resetSql = readerType == CustomerChatSenderTypes.Customer
            ? """
              UPDATE customer_chat_threads
              SET customer_unread_count = 0, updated_at = NOW()
              WHERE id = @ThreadId
              """
            : """
              UPDATE customer_chat_threads
              SET staff_unread_count = 0, updated_at = NOW()
              WHERE id = @ThreadId
              """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);
        await conn.ExecuteAsync(markSql, new { ThreadId = threadId, SenderType = senderToMark }, tx);
        await conn.ExecuteAsync(resetSql, new { ThreadId = threadId }, tx);
        await tx.CommitAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AdminChatThreadRow>> ListThreadsAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                t.id AS ThreadId,
                c.id AS CustomerId,
                c.customer_code AS CustomerCode,
                c.full_name AS CustomerName,
                c.phone AS CustomerPhone,
                t.staff_unread_count AS StaffUnreadCount,
                t.last_message_at AS LastMessageAt,
                t.last_message_preview AS LastMessagePreview
            FROM customer_chat_threads t
            INNER JOIN customers c ON c.id = t.customer_id AND c.deleted_at IS NULL
            WHERE t.tenant_id = @TenantId
            ORDER BY t.staff_unread_count DESC, t.last_message_at DESC NULLS LAST, t.created_at DESC
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return (await conn.QueryAsync<AdminChatThreadRow>(sql, new { TenantId = tenantId })).ToList();
    }

    public async Task<string?> GetCustomerNameAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT full_name FROM customers
            WHERE id = @CustomerId AND tenant_id = @TenantId AND deleted_at IS NULL
            """;
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<string?>(sql, new { CustomerId = customerId, TenantId = tenantId });
    }
}

internal sealed record ChatThreadRow(
    Guid Id,
    int CustomerUnreadCount,
    int StaffUnreadCount,
    DateTime? LastMessageAt,
    string? LastMessagePreview);

internal sealed record ChatMessageRow(
    Guid Id,
    short SenderType,
    string Body,
    DateTime CreatedAt,
    DateTime? ReadAt,
    string? SenderName);

internal sealed record AdminChatThreadRow(
    Guid ThreadId,
    Guid CustomerId,
    string CustomerCode,
    string CustomerName,
    string? CustomerPhone,
    int StaffUnreadCount,
    DateTime? LastMessageAt,
    string? LastMessagePreview);
