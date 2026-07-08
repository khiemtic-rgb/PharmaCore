namespace KitPlatform.Application.Core.Engines;

public sealed record WorkflowTaskListItemDto(
    Guid TaskId,
    Guid InstanceId,
    string TaskStatus,
    string? Decision,
    DateTime CreatedAt,
    string? Summary);

public sealed record WorkflowTaskDecisionDto(
    Guid TaskId,
    string TaskStatus,
    string Decision,
    DateTime? CompletedAt);
