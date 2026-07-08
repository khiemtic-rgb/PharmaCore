using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Application.Core.Engines;

/// <summary>
/// AI entry point (NSF-AI). Pilot: delegates to rule-based <see cref="ICustomerAiHealthService"/>.
/// Future: Knowledge → Rules → Care/Medication contracts (no direct SQL in AI layer).
/// </summary>
public interface IAiOrchestrator
{
    Task<AiHealthAskResponse> AskAsync(
        Guid tenantId,
        Guid customerId,
        AiHealthAskRequest request,
        CancellationToken cancellationToken = default);
}
