using Microsoft.Extensions.Options;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal sealed class AssessmentPartnerAdminService : IAssessmentPartnerAdminService
{
    private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "ctv", "consultant", "tdv", "agency",
    };

    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "active", "suspended", "archived",
    };

    private readonly AssessmentPartnerRepository _repo;
    private readonly AssessmentSettings _settings;

    public AssessmentPartnerAdminService(
        AssessmentPartnerRepository repo,
        IOptions<AssessmentSettings> settings)
    {
        _repo = repo;
        _settings = settings.Value;
    }

    public async Task<IReadOnlyList<KapPartnerListItemDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        EnsureEnabled();
        var partners = await _repo.ListAsync(cancellationToken);
        IReadOnlyDictionary<Guid, AssessmentPartnerRepository.PartnerStatsRow> stats;
        try
        {
            stats = await _repo.GetStatsByPartnerIdsAsync(partners.Select(p => p.Id).ToList(), cancellationToken);
        }
        catch
        {
            stats = new Dictionary<Guid, AssessmentPartnerRepository.PartnerStatsRow>();
        }

        return partners.Select(p =>
        {
            stats.TryGetValue(p.Id, out var s);
            return new KapPartnerListItemDto(
                p.Id, p.Code, p.Name, p.PartnerType, p.Phone, p.Email, p.Status,
                p.CommissionRatePct, p.CreatedAt, p.LastLoginAt,
                s?.SubmissionCount ?? 0, s?.LeadCount ?? 0);
        }).ToList();
    }

    public async Task<KapPartnerDetailDto?> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        EnsureEnabled();
        var partner = await _repo.GetByIdAsync(id, cancellationToken);
        return partner is null ? null : await ToDetailAsync(partner, cancellationToken);
    }

    public async Task<KapPartnerDetailDto> CreateAsync(
        CreateKapPartnerRequest request,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();
        ValidateCreate(request);

        var desiredCode = string.IsNullOrWhiteSpace(request.Code)
            ? BuildCodeFromTypeAndPhone(request.PartnerType, request.Phone)
            : request.Code.Trim().ToUpperInvariant();
        var code = await AllocateUniqueCodeAsync(desiredCode, cancellationToken);

        var hash = BCrypt.Net.BCrypt.HashPassword(request.Password.Trim());
        var id = await _repo.InsertAsync(
            code,
            request.Name,
            request.PartnerType.Trim().ToLowerInvariant(),
            request.Phone,
            request.Email,
            hash,
            request.CommissionRatePct,
            request.Notes,
            cancellationToken);

        var created = await _repo.GetByIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException("Không tạo được đối tác.");
        return await ToDetailAsync(created, cancellationToken);
    }

    public async Task<KapPartnerDetailDto?> UpdateAsync(
        Guid id,
        UpdateKapPartnerRequest request,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();
        ValidateUpdate(request);

        string? hash = null;
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            if (request.NewPassword.Trim().Length < 6)
                throw new InvalidOperationException("Mật khẩu mới tối thiểu 6 ký tự.");
            hash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword.Trim());
        }

        var ok = await _repo.UpdateAsync(
            id,
            request.Name,
            request.PartnerType.Trim().ToLowerInvariant(),
            request.Phone,
            request.Email,
            request.Status.Trim().ToLowerInvariant(),
            request.CommissionRatePct,
            request.Notes,
            hash,
            cancellationToken);

        if (!ok)
            return null;

        var partner = await _repo.GetByIdAsync(id, cancellationToken);
        return partner is null ? null : await ToDetailAsync(partner, cancellationToken);
    }

    private async Task<KapPartnerDetailDto> ToDetailAsync(
        AssessmentPartnerRepository.PartnerRow partner,
        CancellationToken cancellationToken)
    {
        var stats = await _repo.GetStatsByPartnerIdsAsync([partner.Id], cancellationToken);
        stats.TryGetValue(partner.Id, out var s);
        var baseUrl = (_settings.KapPublicUrl ?? "https://survey.novixa.vn").TrimEnd('/');
        var referralUrl = $"{baseUrl}/?ref={Uri.EscapeDataString(partner.Code)}";

        return new KapPartnerDetailDto(
            partner.Id,
            partner.Code,
            partner.Name,
            partner.PartnerType,
            partner.Phone,
            partner.Email,
            partner.Status,
            partner.CommissionRatePct,
            partner.Notes,
            partner.CreatedAt,
            partner.LastLoginAt,
            referralUrl,
            s?.SubmissionCount ?? 0,
            s?.LeadCount ?? 0,
            s?.CompletedCount ?? 0);
    }

    private void EnsureEnabled()
    {
        // Reuse KAP admin feature gate via AssessmentAdminService pattern — callers already ADMIN.
    }

    private async Task<string> AllocateUniqueCodeAsync(string desiredCode, CancellationToken cancellationToken)
    {
        var baseCode = desiredCode.Length > 28 ? desiredCode[..28] : desiredCode;
        for (var i = 0; i < 20; i++)
        {
            var candidate = i == 0 ? baseCode : $"{baseCode}{i + 1}";
            if (candidate.Length > 32)
                candidate = candidate[..32];
            var existing = await _repo.GetByCodeAsync(candidate, cancellationToken);
            if (existing is null)
                return candidate;
        }

        var fallback = $"{baseCode[..Math.Min(baseCode.Length, 24)]}{DateTime.UtcNow:HHmmss}";
        if (fallback.Length > 32)
            fallback = fallback[..32];
        var clash = await _repo.GetByCodeAsync(fallback, cancellationToken);
        if (clash is not null)
            throw new InvalidOperationException("Mã đối tác đã tồn tại. Hãy chọn mã khác.");
        return fallback;
    }

    /// <summary>Quy ước: CTV/TDV/CSL/DLY + SĐT chuẩn hoá (vd CTV0984660399).</summary>
    private static string BuildCodeFromTypeAndPhone(string partnerType, string? phone)
    {
        var prefix = partnerType.Trim().ToLowerInvariant() switch
        {
            "ctv" => "CTV",
            "tdv" => "TDV",
            "consultant" => "CSL",
            "agency" => "DLY",
            _ => "CTV",
        };
        var phoneNorm = NormalizeVnPhone(phone)
            ?? throw new InvalidOperationException("Thiếu SĐT hợp lệ để tự sinh mã đối tác.");
        return $"{prefix}{phoneNorm}";
    }

    private static string? NormalizeVnPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return null;
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.Length == 0)
            return null;
        if (digits.StartsWith("84", StringComparison.Ordinal) && digits.Length >= 11)
            digits = "0" + digits[2..];
        if (digits.Length == 9 && !digits.StartsWith('0'))
            digits = "0" + digits;
        if (digits.Length is < 9 or > 11)
            return null;
        return digits;
    }

    private static void ValidateCreate(CreateKapPartnerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("Thiếu tên đối tác.");
        if (!AllowedTypes.Contains(request.PartnerType ?? ""))
            throw new InvalidOperationException("Loại đối tác không hợp lệ.");
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Trim().Length < 6)
            throw new InvalidOperationException("Mật khẩu tối thiểu 6 ký tự.");

        var hasCode = !string.IsNullOrWhiteSpace(request.Code) && request.Code.Trim().Length >= 2;
        if (!hasCode && NormalizeVnPhone(request.Phone) is null)
            throw new InvalidOperationException("Nhập SĐT hợp lệ để tự sinh mã, hoặc nhập mã thủ công.");
        if (hasCode && request.Code!.Trim().Length < 2)
            throw new InvalidOperationException("Mã đối tác tối thiểu 2 ký tự.");
    }

    private static void ValidateUpdate(UpdateKapPartnerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("Thiếu tên đối tác.");
        if (!AllowedTypes.Contains(request.PartnerType ?? ""))
            throw new InvalidOperationException("Loại đối tác không hợp lệ.");
        if (!AllowedStatuses.Contains(request.Status ?? ""))
            throw new InvalidOperationException("Trạng thái không hợp lệ.");
    }
}
