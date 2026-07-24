using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Caching.Memory;
using KitPlatform.Application.Auth;

namespace KitPlatform.Api.Authorization;

/// <summary>
/// Làm mới role/permission từ DB cho JWT admin ERP trên mỗi request (cache 30s).
/// Đảm bảo thay đổi phân quyền có hiệu lực gần như ngay, không cần đăng nhập lại.
/// </summary>
public sealed class DbPermissionsClaimsTransformation : IClaimsTransformation
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(30);

    private readonly IAuthService _auth;
    private readonly IMemoryCache _cache;

    public DbPermissionsClaimsTransformation(IAuthService auth, IMemoryCache cache)
    {
        _auth = auth;
        _cache = cache;
    }

    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (!AdminTokenRules.IsAdminPrincipal(principal))
            return principal;

        var userIdClaim = principal.FindFirst("sub")?.Value
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return principal;

        var user = await _cache.GetOrCreateAsync($"auth-user-claims:{userId}", entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheTtl;
            return _auth.GetUserAsync(userId);
        });

        var identity = (ClaimsIdentity)principal.Identity!;
        var refreshed = identity.Clone();
        var roleClaimType = refreshed.RoleClaimType;

        foreach (var stale in refreshed.Claims.Where(c => c.Type == "permission" || c.Type == roleClaimType).ToList())
            refreshed.RemoveClaim(stale);

        // User bị xóa/vô hiệu hóa: bỏ hết role/permission → các policy sẽ từ chối.
        if (user is not null)
        {
            foreach (var role in user.Roles)
                refreshed.AddClaim(new Claim(roleClaimType, role));
            foreach (var permission in user.Permissions)
                refreshed.AddClaim(new Claim("permission", permission));
        }

        return new ClaimsPrincipal(refreshed);
    }
}
