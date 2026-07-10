using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using KitPlatform.Application.Configuration;
using KitPlatform.Packs.Pharmacy.Rx;

namespace KitPlatform.Packs.Pharmacy.Infrastructure;

internal sealed class PrescriberPortalJwtTokenService
{
    private readonly JwtSettings _jwt;
    private readonly PrescriberPortalAuthSettings _settings;

    public PrescriberPortalJwtTokenService(
        IOptions<JwtSettings> jwt,
        IOptions<PrescriberPortalAuthSettings> settings)
    {
        _jwt = jwt.Value;
        _settings = settings.Value;
    }

    public (string Token, DateTimeOffset ExpiresAt) CreateAccessToken(PrescriberPortalRepository.PrescriberProfileRow prescriber)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_settings.AccessTokenExpireMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, prescriber.Id.ToString()),
            new(PrescriberPortalAuthConstants.PrescriberIdClaim, prescriber.Id.ToString()),
            new(PrescriberPortalAuthConstants.TokenTypeClaim, PrescriberPortalAuthConstants.TokenTypeValue),
            new(ClaimTypes.Name, prescriber.FullName),
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
