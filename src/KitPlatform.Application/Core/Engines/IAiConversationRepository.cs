using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Application.Core.Engines;

public interface IAiConversationRepository
{
    Task<Guid> GetOrCreateConversationAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default);

    Task<Guid?> GetAgentIdAsync(CancellationToken cancellationToken = default);

    Task PersistExchangeAsync(
        Guid tenantId,
        Guid conversationId,
        Guid? agentId,
        AiHealthAskRequest request,
        AiHealthAskResponse response,
        CancellationToken cancellationToken = default);
}
