namespace PharmaCore.Application.CustomerApp;

public sealed record AiHealthAskRequest(
    string Question,
    Guid? ProductId = null);

public sealed record AiHealthAskResponse(
    string Answer,
    string Confidence,
    bool SuggestChat,
    string Disclaimer);

public interface ICustomerAiHealthService
{
    Task<AiHealthAskResponse> AskAsync(
        Guid tenantId,
        Guid customerId,
        AiHealthAskRequest request,
        CancellationToken cancellationToken = default);
}
