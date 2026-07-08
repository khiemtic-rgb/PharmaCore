namespace KitPlatform.Application.Abstractions;

public interface ITenantContext
{
    Guid TenantId { get; }
    Guid UserId { get; }
    bool IsAuthenticated { get; }
    /// <summary>Current workspace (default or <c>X-Workspace-Id</c> header). Null for background jobs.</summary>
    Guid? WorkspaceId { get; }
}
