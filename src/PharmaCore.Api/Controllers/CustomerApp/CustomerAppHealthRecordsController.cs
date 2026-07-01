using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Api.Authorization;
using PharmaCore.Application.Abstractions;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Api.Controllers.CustomerApp;

public sealed record HealthRecordAttachmentUploadResult(string Url, string FileName, string MimeType);

[ApiController]
[Route("api/customer-app/health-records")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
public sealed class CustomerAppHealthRecordsController : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".pdf",
    };

    private const long MaxFileBytes = 5 * 1024 * 1024;

    private readonly ICustomerHealthService _health;
    private readonly ICurrentCustomerAccessor _customer;
    private readonly IWebHostEnvironment _environment;

    public CustomerAppHealthRecordsController(
        ICustomerHealthService health,
        ICurrentCustomerAccessor customer,
        IWebHostEnvironment environment)
    {
        _health = health;
        _customer = customer;
        _environment = environment;
    }

    [HttpGet]
    [ProducesResponseType(typeof(CustomerHealthRecordListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken) =>
        Ok(await _health.ListAsync(
            _customer.TenantId,
            _customer.CustomerAccountId,
            cancellationToken));

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CustomerHealthRecordDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var item = await _health.GetAsync(
            _customer.TenantId,
            _customer.CustomerAccountId,
            id,
            cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CustomerHealthRecordDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateCustomerHealthRecordRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _health.CreateAsync(
                _customer.TenantId,
                _customer.CustomerAccountId,
                request,
                cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(CustomerHealthRecordDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateCustomerHealthRecordRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _health.UpdateAsync(
                _customer.TenantId,
                _customer.CustomerAccountId,
                id,
                request,
                cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var ok = await _health.DeleteAsync(
            _customer.TenantId,
            _customer.CustomerAccountId,
            id,
            cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("upload-attachment")]
    [RequestSizeLimit(MaxFileBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxFileBytes)]
    [ProducesResponseType(typeof(HealthRecordAttachmentUploadResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadAttachment(IFormFile file, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await SaveAttachmentAsync(file, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private async Task<HealthRecordAttachmentUploadResult> SaveAttachmentAsync(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
            throw new InvalidOperationException("Chọn file để tải lên.");

        if (file.Length > MaxFileBytes)
            throw new InvalidOperationException("File tối đa 5 MB.");

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
            throw new InvalidOperationException("Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc PDF.");

        var tenantFolder = _customer.TenantId.ToString("N");
        var accountFolder = _customer.CustomerAccountId.ToString("N");
        var directory = Path.Combine(
            _environment.ContentRootPath,
            "uploads",
            "health-records",
            tenantFolder,
            accountFolder);
        Directory.CreateDirectory(directory);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var fullPath = Path.Combine(directory, fileName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var url = $"/uploads/health-records/{tenantFolder}/{accountFolder}/{fileName}";
        var mimeType = extension.ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => file.ContentType ?? "application/octet-stream",
        };

        return new HealthRecordAttachmentUploadResult(url, file.FileName, mimeType);
    }
}
