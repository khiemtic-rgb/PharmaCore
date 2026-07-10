using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using KitPlatform.Application.Abstractions;
using KitPlatform.Packs.Pharmacy.Rx;

namespace KitPlatform.Infrastructure.Security;

public sealed class CurrentPrescriberAccessor : ICurrentPrescriberAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentPrescriberAccessor(IHttpContextAccessor httpContextAccessor) =>
        _httpContextAccessor = httpContextAccessor;

    public bool IsPrescriber =>
        string.Equals(
            GetClaim(PrescriberPortalAuthConstants.TokenTypeClaim),
            PrescriberPortalAuthConstants.TokenTypeValue,
            StringComparison.Ordinal);

    public Guid PrescriberId => RequirePrescriberGuid(
        GetClaim(PrescriberPortalAuthConstants.PrescriberIdClaim)
            ?? GetClaim(ClaimTypes.NameIdentifier)
            ?? GetClaim("sub"),
        "Prescriber id claim missing.");

    private string? GetClaim(string type) =>
        _httpContextAccessor.HttpContext?.User.FindFirst(type)?.Value;

    private Guid RequirePrescriberGuid(string? value, string error)
    {
        if (!IsPrescriber)
            throw new UnauthorizedAccessException("Not a prescriber portal token.");

        return Guid.TryParse(value, out var id) ? id : throw new UnauthorizedAccessException(error);
    }
}
