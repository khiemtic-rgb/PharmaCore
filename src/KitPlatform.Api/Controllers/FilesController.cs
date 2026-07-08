using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Application.Abstractions;

namespace KitPlatform.Api.Controllers;

public sealed record UploadFileResult(string Url);

[ApiController]
[Authorize]
[Route("api/files")]
public sealed class FilesController : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".svg",
    };

    private const long MaxFileBytes = 5 * 1024 * 1024;

    private readonly ITenantContext _tenant;
    private readonly IWebHostEnvironment _environment;

    public FilesController(ITenantContext tenant, IWebHostEnvironment environment)
    {
        _tenant = tenant;
        _environment = environment;
    }

    [HttpPost("upload")]
    [Authorize(Policy = CatalogPolicies.Write)]
    [RequestSizeLimit(MaxFileBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxFileBytes)]
    public async Task<ActionResult<UploadFileResult>> Upload(IFormFile file, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(new UploadFileResult(await SaveImageAsync(file, "products", cancellationToken)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("upload-branding-logo")]
    [Authorize(Policy = SalesPolicies.Write)]
    [RequestSizeLimit(MaxFileBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxFileBytes)]
    public async Task<ActionResult<UploadFileResult>> UploadBrandingLogo(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(new UploadFileResult(await SaveImageAsync(file, "branding", cancellationToken)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private async Task<string> SaveImageAsync(
        IFormFile file,
        string folder,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
            throw new InvalidOperationException("Chọn file ảnh để tải lên.");

        if (file.Length > MaxFileBytes)
            throw new InvalidOperationException("Ảnh tối đa 5 MB.");

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
            throw new InvalidOperationException("Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc SVG.");

        var tenantFolder = _tenant.TenantId.ToString("N");
        var directory = Path.Combine(_environment.ContentRootPath, "uploads", folder, tenantFolder);
        Directory.CreateDirectory(directory);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var fullPath = Path.Combine(directory, fileName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return $"/uploads/{folder}/{tenantFolder}/{fileName}";
    }
}
