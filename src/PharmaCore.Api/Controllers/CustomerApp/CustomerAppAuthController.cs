using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Api.Authorization;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/auth")]
public sealed class CustomerAppAuthController : ControllerBase
{
    private readonly ICustomerAppAuthService _auth;

    public CustomerAppAuthController(ICustomerAppAuthService auth) => _auth = auth;

    /// <summary>Gửi OTP — demo: SĐT 0909123456 (Trần Thị Mai), tenant DEMO_PHARMACY.</summary>
    [HttpPost("request-otp")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(CustomerOtpSentResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> RequestOtp(
        [FromBody] RequestCustomerOtpRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _auth.RequestOtpAsync(request, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("verify-otp")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(CustomerLoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> VerifyOtp(
        [FromBody] VerifyCustomerOtpRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _auth.VerifyOtpAsync(
            request,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return result is null
            ? Unauthorized(new { message = "Mã OTP không đúng hoặc đã hết hạn." })
            : Ok(result);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(CustomerLoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(
        [FromBody] CustomerRefreshTokenRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _auth.RefreshAsync(request, cancellationToken);
        return result is null ? Unauthorized(new { message = "Refresh token không hợp lệ." }) : Ok(result);
    }

    [HttpPost("logout")]
    [Authorize(Policy = CustomerAppPolicies.Authenticated)]
    public async Task<IActionResult> Logout(
        [FromBody] CustomerRefreshTokenRequest request,
        CancellationToken cancellationToken)
    {
        await _auth.LogoutAsync(request.RefreshToken, cancellationToken);
        return Ok(new { message = "Đã đăng xuất." });
    }

    [HttpGet("me")]
    [Authorize(Policy = CustomerAppPolicies.Authenticated)]
    [ProducesResponseType(typeof(CustomerProfileDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var accountIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(accountIdClaim, out var accountId))
            return Unauthorized();

        var profile = await _auth.GetProfileAsync(accountId, cancellationToken);
        return profile is null ? Unauthorized() : Ok(profile);
    }
}
