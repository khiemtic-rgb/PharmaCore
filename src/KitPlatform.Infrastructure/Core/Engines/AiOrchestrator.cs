using KitPlatform.Application.Core.Engines;
using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Infrastructure.Core.Engines;

/// <summary>
/// AI entry (NSF-AI, POL-AI): validates BR-AI-001, delegates to copilot, persists conversation/memory.
/// </summary>
internal sealed class AiOrchestrator : IAiOrchestrator
{
    private readonly ICustomerAiHealthService _copilot;
    private readonly IAiConversationRepository _conversations;

    public AiOrchestrator(
        ICustomerAiHealthService copilot,
        IAiConversationRepository conversations)
    {
        _copilot = copilot;
        _conversations = conversations;
    }

    public async Task<AiHealthAskResponse> AskAsync(
        Guid tenantId,
        Guid customerId,
        AiHealthAskRequest request,
        CancellationToken cancellationToken = default)
    {
        var question = request.Question?.Trim() ?? "";
        if (question.Length < 3)
            throw new InvalidOperationException("Câu hỏi quá ngắn.");

        if (question.Length > 500)
            question = question[..500];

        var normalized = new AiHealthAskRequest(question, request.ProductId);
        var response = await _copilot.AskAsync(tenantId, customerId, normalized, cancellationToken);

        var conversationId = await _conversations.GetOrCreateConversationAsync(
            tenantId,
            customerId,
            cancellationToken);
        var agentId = await _conversations.GetAgentIdAsync(cancellationToken);

        await _conversations.PersistExchangeAsync(
            tenantId,
            conversationId,
            agentId,
            normalized,
            response,
            cancellationToken);

        return response;
    }
}
