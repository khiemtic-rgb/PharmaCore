using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using KitPlatform.Infrastructure.Kernel.Workspace;

namespace KitPlatform.Infrastructure.Security;

/// <summary>Resolves workspace from <c>X-Workspace-Id</c> header or tenant default (P1.2).</summary>
public sealed class WorkspaceResolutionMiddleware
{
    public const string WorkspaceIdItemKey = "kit.workspace_id";
    public const string WorkspaceIdHeader = "X-Workspace-Id";

    private readonly RequestDelegate _next;

    public WorkspaceResolutionMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, IWorkspaceResolver workspaceResolver)
    {
        if (context.User.Identity?.IsAuthenticated == true
            && Guid.TryParse(context.User.FindFirst("tenant_id")?.Value, out var tenantId))
        {
            Guid? requested = null;
            if (context.Request.Headers.TryGetValue(WorkspaceIdHeader, out var headerValue)
                && Guid.TryParse(headerValue.ToString(), out var headerId))
            {
                requested = headerId;
            }

            var workspaceId = await workspaceResolver.ResolveWorkspaceIdAsync(
                tenantId,
                requested,
                cancellationToken: context.RequestAborted);

            if (workspaceId.HasValue)
                context.Items[WorkspaceIdItemKey] = workspaceId.Value;
        }

        await _next(context);
    }
}
