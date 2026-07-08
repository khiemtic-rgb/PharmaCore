using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Security;

namespace KitPlatform.Api.Controllers.IdentityAdmin;

[ApiController]
[Authorize]
[Route("api/system/audit-log")]
public sealed class AuditLogController : ControllerBase
{
    private readonly IAuditLogQuery _query;

    public AuditLogController(IAuditLogQuery query) => _query = query;

    [HttpGet]
    [Authorize(Policy = SystemPolicies.AuditRead)]
    public async Task<ActionResult<PagedAuditLogsResult>> List(
        [FromQuery] string? entityType,
        [FromQuery] string? action,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default) =>
        Ok(await _query.ListAsync(entityType, action, from, to, page, pageSize, cancellationToken));
}
