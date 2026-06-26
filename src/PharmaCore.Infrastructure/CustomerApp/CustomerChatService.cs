using PharmaCore.Application.CustomerApp;
using PharmaCore.Application.Customers;

namespace PharmaCore.Infrastructure.CustomerApp;

internal sealed class CustomerChatService : ICustomerChatService
{
    private readonly CustomerChatRepository _repo;
    private readonly CustomerAppConsentRepository _consents;
    private readonly ICustomerPushService _push;
    private readonly IChatEventHub _events;

    public CustomerChatService(
        CustomerChatRepository repo,
        CustomerAppConsentRepository consents,
        ICustomerPushService push,
        IChatEventHub events)
    {
        _repo = repo;
        _consents = consents;
        _push = push;
        _events = events;
    }

    public async Task<CustomerChatThreadDto> GetThreadAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        var thread = await _repo.GetThreadAsync(tenantId, customerId, cancellationToken);
        if (thread is null)
        {
            return new CustomerChatThreadDto(Guid.Empty, 0, null, null);
        }

        return new CustomerChatThreadDto(
            thread.Id,
            thread.CustomerUnreadCount,
            thread.LastMessageAt.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(thread.LastMessageAt.Value, DateTimeKind.Utc))
                : null,
            thread.LastMessagePreview);
    }

    public async Task<CustomerChatMessageListResult> ListMessagesAsync(
        Guid tenantId,
        Guid customerId,
        Guid? beforeId,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var thread = await EnsureThreadRowAsync(tenantId, customerId, cancellationToken);
        return await ListMessagesForThreadAsync(thread.Id, beforeId, limit, cancellationToken);
    }

    public async Task<CustomerChatMessageDto> SendCustomerMessageAsync(
        Guid tenantId,
        Guid customerId,
        SendCustomerChatMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        var body = NormalizeBody(request.Body);
        if (!await _consents.HasGrantedConsentAsync(
                tenantId,
                customerId,
                CustomerConsentChannels.InApp,
                CustomerConsentPurposes.AiAssist,
                cancellationToken))
        {
            throw new InvalidOperationException(
                "Cần đồng ý chat dược sĩ trong app (mục Tài khoản) trước khi gửi tin nhắn.");
        }

        var threadId = await _repo.EnsureThreadAsync(tenantId, customerId, cancellationToken);
        var customerName = await _repo.GetCustomerNameAsync(tenantId, customerId, cancellationToken);
        var row = await _repo.InsertMessageAsync(
            tenantId,
            threadId,
            CustomerChatSenderTypes.Customer,
            customerId,
            body,
            cancellationToken);

        _events.NotifyMessageSent(tenantId, customerId, row.Id, CustomerChatSenderTypes.Customer);
        return MapMessage(row with { SenderName = customerName });
    }

    public async Task MarkCustomerReadAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        var thread = await _repo.GetThreadAsync(tenantId, customerId, cancellationToken);
        if (thread is null) return;
        await _repo.MarkReadAsync(thread.Id, CustomerChatSenderTypes.Customer, cancellationToken);
        _events.NotifyRead(tenantId, customerId, CustomerChatSenderTypes.Customer);
    }

    public async Task<AdminChatThreadListResult> ListThreadsForStaffAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _repo.ListThreadsAsync(tenantId, cancellationToken);
        var items = rows.Select(row => new AdminChatThreadListItemDto(
            row.ThreadId,
            row.CustomerId,
            row.CustomerCode,
            row.CustomerName,
            row.CustomerPhone,
            row.StaffUnreadCount,
            row.LastMessageAt.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(row.LastMessageAt.Value, DateTimeKind.Utc))
                : null,
            row.LastMessagePreview)).ToList();
        return new AdminChatThreadListResult(items);
    }

    public async Task<AdminChatMessageListResult> ListMessagesForStaffAsync(
        Guid tenantId,
        Guid customerId,
        Guid? beforeId,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var thread = await _repo.GetThreadAsync(tenantId, customerId, cancellationToken);
        if (thread is null)
            return new AdminChatMessageListResult([], false);

        var result = await ListMessagesForThreadAsync(thread.Id, beforeId, limit, cancellationToken);
        return new AdminChatMessageListResult(result.Items, result.HasMore);
    }

    public async Task<CustomerChatMessageDto> SendStaffMessageAsync(
        Guid tenantId,
        Guid customerId,
        Guid staffUserId,
        string? staffName,
        SendStaffChatMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        var body = NormalizeBody(request.Body);
        var threadId = await _repo.EnsureThreadAsync(tenantId, customerId, cancellationToken);
        var row = await _repo.InsertMessageAsync(
            tenantId,
            threadId,
            CustomerChatSenderTypes.Staff,
            staffUserId,
            body,
            cancellationToken);

        var message = MapMessage(row with { SenderName = staffName });
        await _push.SendStaffChatReplyPushAsync(
            tenantId,
            customerId,
            staffName,
            body,
            cancellationToken);
        _events.NotifyMessageSent(tenantId, customerId, row.Id, CustomerChatSenderTypes.Staff);
        return message;
    }

    public async Task MarkStaffReadAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        var thread = await _repo.GetThreadAsync(tenantId, customerId, cancellationToken);
        if (thread is null) return;
        await _repo.MarkReadAsync(thread.Id, CustomerChatSenderTypes.Staff, cancellationToken);
        _events.NotifyRead(tenantId, customerId, CustomerChatSenderTypes.Staff);
    }

    private async Task<ChatThreadRow> EnsureThreadRowAsync(
        Guid tenantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        var thread = await _repo.GetThreadAsync(tenantId, customerId, cancellationToken);
        if (thread is not null)
            return thread;

        var id = await _repo.EnsureThreadAsync(tenantId, customerId, cancellationToken);
        return new ChatThreadRow(id, 0, 0, null, null);
    }

    private async Task<CustomerChatMessageListResult> ListMessagesForThreadAsync(
        Guid threadId,
        Guid? beforeId,
        int limit,
        CancellationToken cancellationToken)
    {
        var rows = await _repo.ListMessagesAsync(threadId, beforeId, limit, cancellationToken);
        var hasMore = rows.Count > limit;
        var page = rows.Take(limit).ToList();
        page.Reverse();
        return new CustomerChatMessageListResult(page.Select(MapMessage).ToList(), hasMore);
    }

    private static CustomerChatMessageDto MapMessage(ChatMessageRow row) =>
        new(
            row.Id,
            row.SenderType,
            row.SenderName,
            row.Body,
            new DateTimeOffset(DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc)),
            row.ReadAt.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(row.ReadAt.Value, DateTimeKind.Utc))
                : null);

    private static string NormalizeBody(string? value)
    {
        var body = value?.Trim() ?? "";
        if (body.Length == 0)
            throw new InvalidOperationException("Nội dung tin nhắn không được để trống.");
        if (body.Length > 2000)
            throw new InvalidOperationException("Tin nhắn tối đa 2000 ký tự.");
        return body;
    }
}
