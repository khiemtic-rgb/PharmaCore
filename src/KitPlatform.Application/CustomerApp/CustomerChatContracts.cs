namespace KitPlatform.Application.CustomerApp;

public static class CustomerChatSenderTypes
{
    public const short Customer = 1;
    public const short Staff = 2;
}

public sealed record CustomerChatMessageDto(
    Guid Id,
    short SenderType,
    string? SenderName,
    string Body,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReadAt);

public sealed record CustomerChatThreadDto(
    Guid ThreadId,
    int UnreadCount,
    DateTimeOffset? LastMessageAt,
    string? LastMessagePreview);

public sealed record CustomerChatMessageListResult(
    IReadOnlyList<CustomerChatMessageDto> Items,
    bool HasMore);

public sealed record SendCustomerChatMessageRequest(string Body);

public sealed record AdminChatThreadListItemDto(
    Guid ThreadId,
    Guid CustomerId,
    string CustomerCode,
    string CustomerName,
    string? CustomerPhone,
    int StaffUnreadCount,
    DateTimeOffset? LastMessageAt,
    string? LastMessagePreview);

public sealed record AdminChatThreadListResult(IReadOnlyList<AdminChatThreadListItemDto> Items);

public sealed record AdminChatMessageListResult(
    IReadOnlyList<CustomerChatMessageDto> Items,
    bool HasMore);

public sealed record SendStaffChatMessageRequest(string Body);
