namespace PharmaCore.Application.CustomerApp;

public interface ICustomerPushService
{
    string? GetPublicKey();

    Task<PushSubscriptionStatusDto> GetStatusAsync(
        Guid tenantId,
        Guid customerAccountId,
        CancellationToken cancellationToken = default);

    Task RegisterSubscriptionAsync(
        Guid tenantId,
        Guid customerAccountId,
        RegisterPushSubscriptionRequest request,
        CancellationToken cancellationToken = default);

    Task UnregisterSubscriptionAsync(
        Guid tenantId,
        Guid customerAccountId,
        string endpoint,
        CancellationToken cancellationToken = default);

    Task<int> DispatchDueRemindersAsync(CancellationToken cancellationToken = default);

    Task<int> DispatchEngagementNotificationsAsync(CancellationToken cancellationToken = default);

    Task SendStaffChatReplyPushAsync(
        Guid tenantId,
        Guid customerId,
        string? staffName,
        string messageBody,
        CancellationToken cancellationToken = default);

    Task SendDraftOrderPushAsync(
        Guid tenantId,
        Guid customerId,
        string draftNumber,
        decimal totalAmount,
        CancellationToken cancellationToken = default);
}
