using System.Text.Json;
using Dapper;
using KitPlatform.Application.CustomerApp;
using KitPlatform.Application.Core.Engines;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Infrastructure.Core.Engines;

internal sealed class AiConversationRepository : IAiConversationRepository
{
    private const string HealthCopilotAgentCode = "novixa_health_copilot";

    private readonly IDbConnectionFactory _db;

    public AiConversationRepository(IDbConnectionFactory db) => _db = db;

    public async Task<Guid> GetOrCreateConversationAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);

        const string existingSql = """
            SELECT c.id
            FROM kit_ai.ai_conversation c
            INNER JOIN kit_ai.ai_agent a ON a.id = c.agent_id
            WHERE c.tenant_id = @TenantId
              AND c.customer_id = @CustomerId
              AND c.conversation_status = 'active'
              AND c.deleted_at IS NULL
              AND a.agent_code = @AgentCode
            ORDER BY c.started_at DESC
            LIMIT 1
            """;

        var existingId = await conn.QuerySingleOrDefaultAsync<Guid?>(
            existingSql,
            new { TenantId = tenantId, CustomerId = customerId, AgentCode = HealthCopilotAgentCode });

        if (existingId.HasValue)
            return existingId.Value;

        const string agentSql = """
            SELECT id FROM kit_ai.ai_agent
            WHERE agent_code = @AgentCode AND tenant_id IS NULL AND deleted_at IS NULL
            LIMIT 1
            """;

        var agentId = await conn.QuerySingleOrDefaultAsync<Guid?>(
            agentSql,
            new { AgentCode = HealthCopilotAgentCode });

        if (agentId is null)
            throw new InvalidOperationException("AI agent novixa_health_copilot chưa được cấu hình.");

        var conversationId = Guid.NewGuid();
        const string insertSql = """
            INSERT INTO kit_ai.ai_conversation (
                id, tenant_id, agent_id, customer_id, channel, title, conversation_status
            )
            VALUES (
                @Id, @TenantId, @AgentId, @CustomerId, 'customer_app', @Title, 'active'
            )
            """;

        await conn.ExecuteAsync(insertSql, new
        {
            Id = conversationId,
            TenantId = tenantId,
            AgentId = agentId.Value,
            CustomerId = customerId,
            Title = "Health copilot",
        });

        return conversationId;
    }

    public async Task PersistExchangeAsync(
        Guid tenantId,
        Guid conversationId,
        Guid? agentId,
        AiHealthAskRequest request,
        AiHealthAskResponse response,
        CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);

        const string sql = """
            INSERT INTO kit_ai.ai_memory (
                tenant_id, agent_id, conversation_id, memory_type, memory_key, memory_value
            )
            VALUES (
                @TenantId, @AgentId, @ConversationId, @MemoryType, @MemoryKey, @MemoryValue::jsonb
            )
            """;

        var questionPayload = JsonSerializer.Serialize(new
        {
            role = "user",
            question = request.Question,
            productId = request.ProductId,
        });

        var answerPayload = JsonSerializer.Serialize(new
        {
            role = "assistant",
            answer = response.Answer,
            confidence = response.Confidence,
            suggestChat = response.SuggestChat,
            disclaimer = response.Disclaimer,
        });

        var stamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        await conn.ExecuteAsync(sql, new
        {
            TenantId = tenantId,
            AgentId = agentId,
            ConversationId = conversationId,
            MemoryType = "context",
            MemoryKey = $"turn:{stamp}:question",
            MemoryValue = questionPayload,
        });

        await conn.ExecuteAsync(sql, new
        {
            TenantId = tenantId,
            AgentId = agentId,
            ConversationId = conversationId,
            MemoryType = "context",
            MemoryKey = $"turn:{stamp}:answer",
            MemoryValue = answerPayload,
        });
    }

    public async Task<Guid?> GetAgentIdAsync(CancellationToken cancellationToken)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<Guid?>(
            """
            SELECT id FROM kit_ai.ai_agent
            WHERE agent_code = @AgentCode AND tenant_id IS NULL AND deleted_at IS NULL
            LIMIT 1
            """,
            new { AgentCode = HealthCopilotAgentCode });
    }
}
