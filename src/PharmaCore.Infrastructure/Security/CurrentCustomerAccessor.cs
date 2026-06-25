using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using PharmaCore.Application.Abstractions;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Infrastructure.Security;

public sealed class CurrentCustomerAccessor : ICurrentCustomerAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentCustomerAccessor(IHttpContextAccessor httpContextAccessor) =>
        _httpContextAccessor = httpContextAccessor;

    public bool IsCustomer =>
        string.Equals(
            GetClaim(CustomerAppAuthConstants.TokenTypeClaim),
            CustomerAppAuthConstants.TokenTypeValue,
            StringComparison.Ordinal);

    public Guid CustomerAccountId => RequireCustomerGuid(
        GetClaim(ClaimTypes.NameIdentifier) ?? GetClaim("sub"),
        "Customer account id claim missing.");

    public Guid CustomerId => RequireCustomerGuid(
        GetClaim(CustomerAppAuthConstants.CustomerIdClaim),
        "Customer id claim missing.");

    public Guid TenantId => RequireCustomerGuid(GetClaim("tenant_id"), "Tenant id claim missing.");

    private string? GetClaim(string type) =>
        _httpContextAccessor.HttpContext?.User.FindFirst(type)?.Value;

    private Guid RequireCustomerGuid(string? value, string error)
    {
        if (!IsCustomer)
            throw new UnauthorizedAccessException("Not a customer app token.");

        return Guid.TryParse(value, out var id) ? id : throw new UnauthorizedAccessException(error);
    }
}
