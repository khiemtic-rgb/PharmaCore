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

    private static readonly HashSet<string> PrescriptionAllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".pdf",
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

    [HttpPost("upload-prescription")]
    [RequestSizeLimit(MaxFileBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxFileBytes)]
    public async Task<ActionResult<UploadFileResult>> UploadPrescription(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (!HasPermission("sales.write")
            && !HasPermission("rx.prescription.create")
            && !User.IsInRole("ADMIN"))
        {
            return Forbid();
        }
        if (!AdminTokenRules.IsAdminPrincipal(User))
            return Forbid();

        try
        {
            return Ok(new UploadFileResult(await SaveFileAsync(
                file,
                "prescriptions",
                PrescriptionAllowedExtensions,
                "Chỉ hỗ trợ JPG, PNG, WebP hoặc PDF.",
                cancellationToken)));
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
        => await SaveFileAsync(
            file,
            folder,
            AllowedExtensions,
            "Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc SVG.",
            cancellationToken);

    private async Task<string> SaveFileAsync(
        IFormFile file,
        string folder,
        HashSet<string> allowedExtensions,
        string invalidExtensionMessage,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
            throw new InvalidOperationException("Chọn file để tải lên.");

        if (file.Length > MaxFileBytes)
            throw new InvalidOperationException("File tối đa 5 MB.");

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !allowedExtensions.Contains(extension))
            throw new InvalidOperationException(invalidExtensionMessage);

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

    private bool HasPermission(string permission) =>
        User.Claims.Any(c => c.Type == "permission" && c.Value == permission);
}
