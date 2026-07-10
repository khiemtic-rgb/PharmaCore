using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using KitPlatform.Application.Configuration;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal sealed class PartnerPortalJwtTokenService
{
    private readonly JwtSettings _jwt;
    private readonly PartnerPortalAuthSettings _settings;

    public PartnerPortalJwtTokenService(
        IOptions<JwtSettings> jwt,
        IOptions<PartnerPortalAuthSettings> settings)
    {
        _jwt = jwt.Value;
        _settings = settings.Value;
    }

    public (string Token, DateTimeOffset ExpiresAt) CreateAccessToken(AssessmentPartnerRepository.PartnerRow partner)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_settings.AccessTokenExpireMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, partner.Id.ToString()),
            new(PartnerPortalAuthConstants.PartnerIdClaim, partner.Id.ToString()),
            new(PartnerPortalAuthConstants.PartnerCodeClaim, partner.Code),
            new(PartnerPortalAuthConstants.TokenTypeClaim, PartnerPortalAuthConstants.TokenTypeValue),
            new(ClaimTypes.Name, partner.Name),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
