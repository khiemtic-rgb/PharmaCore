namespace PharmaCore.Application.CustomerApp;

public interface ICustomerChatService
{
    Task<CustomerChatThreadDto> GetThreadAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default);

    Task<CustomerChatMessageListResult> ListMessagesAsync(
        Guid tenantId,
        Guid customerId,
        Guid? beforeId,
        int limit,
        CancellationToken cancellationToken = default);

    Task<CustomerChatMessageDto> SendCustomerMessageAsync(
        Guid tenantId,
        Guid customerId,
        SendCustomerChatMessageRequest request,
        CancellationToken cancellationToken = default);

    Task MarkCustomerReadAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default);

    Task<AdminChatThreadListResult> ListThreadsForStaffAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<AdminChatMessageListResult> ListMessagesForStaffAsync(
        Guid tenantId,
        Guid customerId,
        Guid? beforeId,
        int limit,
        CancellationToken cancellationToken = default);

    Task<CustomerChatMessageDto> SendStaffMessageAsync(
        Guid tenantId,
        Guid customerId,
        Guid staffUserId,
        string? staffName,
        SendStaffChatMessageRequest request,
        CancellationToken cancellationToken = default);

    Task MarkStaffReadAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default);

    Task SyncThreadWarehouseAsync(
        Guid tenantId,
        Guid customerId,
        Guid warehouseId,
        CancellationToken cancellationToken = default);
}
