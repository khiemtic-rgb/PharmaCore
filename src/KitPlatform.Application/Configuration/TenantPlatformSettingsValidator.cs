using KitPlatform.Application.Core;

namespace KitPlatform.Application.Configuration;

public static class TenantPlatformSettingsValidator
{
    public static (IReadOnlyList<string> AcceptedModules, IReadOnlyList<string> IgnoredModules) NormalizeModules(
        IReadOnlyList<string>? requested,
        IReadOnlySet<string> registryCodes,
        IReadOnlySet<string>? allowedCeiling = null)
    {
        if (requested is null || requested.Count == 0)
            throw new InvalidOperationException("Phải chọn ít nhất một module nền tảng.");

        var accepted = new List<string>();
        var ignored = new List<string>();

        foreach (var raw in requested)
        {
            var code = raw?.Trim();
            if (string.IsNullOrWhiteSpace(code))
                continue;

            if (!registryCodes.Contains(code))
            {
                ignored.Add(code);
                continue;
            }

            if (allowedCeiling is not null
                && allowedCeiling.Count > 0
                && !allowedCeiling.Contains(code))
            {
                throw new InvalidOperationException(
                    $"Module «{code}» không nằm trong gói được cấp (allowed_modules). Liên hệ vận hành Novixa để mở rộng quyền.");
            }

            if (!accepted.Contains(code, StringComparer.OrdinalIgnoreCase))
                accepted.Add(code);
        }

        if (accepted.Count == 0)
            throw new InvalidOperationException("Không có module hợp lệ trong danh sách đã chọn.");

        return (accepted, ignored);
    }

    /// <summary>Core entitlement: modules must be in registry; at least one required.</summary>
    public static IReadOnlyList<string> NormalizeAllowedModules(
        IReadOnlyList<string>? requested,
        IReadOnlySet<string> registryCodes)
    {
        var (accepted, _) = NormalizeModules(requested, registryCodes, allowedCeiling: null);
        return accepted;
    }

    public static IReadOnlyList<string> ClampEnabledToAllowed(
        IReadOnlyList<string> enabled,
        IReadOnlyList<string> allowed)
    {
        var allowedSet = allowed.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var clamped = enabled
            .Where(m => allowedSet.Contains(m))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (clamped.Count == 0)
            return allowed.ToList();

        return clamped;
    }

    /// <summary>Null = unlimited. Must be ≥ 1 when set.</summary>
    public static int? NormalizeMaxBranches(int? maxBranches)
    {
        if (maxBranches is null)
            return null;

        if (maxBranches.Value < 1)
            throw new InvalidOperationException(
                "Số cơ sở tối đa phải ≥ 1, hoặc để trống (không giới hạn).");

        return maxBranches.Value;
    }

    /// <summary>
    /// Ensures planned/active branch count stays within Core ceiling.
    /// Soft-deleted branches are not counted by the caller.
    /// </summary>
    public static void EnsureWithinBranchQuota(int activeOrPlannedCount, int? maxBranches)
    {
        if (maxBranches is null)
            return;

        if (activeOrPlannedCount > maxBranches.Value)
        {
            throw new InvalidOperationException(
                $"Đã đạt hạn mức {maxBranches.Value} cơ sở theo hợp đồng. Liên hệ Novixa để mở rộng.");
        }
    }

    public static string NormalizeVertical(string? vertical)
    {
        var value = vertical?.Trim();
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException("Loại hình tenant (vertical) là bắt buộc.");

        if (!PlatformVerticalCodes.All.Contains(value, StringComparer.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Vertical không hợp lệ: {value}");

        return PlatformVerticalCodes.All.First(v =>
            v.Equals(value, StringComparison.OrdinalIgnoreCase));
    }

    public static Dictionary<string, bool> MergeFeatures(
        IReadOnlyDictionary<string, bool> current,
        IReadOnlyDictionary<string, bool>? requested)
    {
        var merged = new Dictionary<string, bool>(current, StringComparer.OrdinalIgnoreCase);
        if (requested is null)
            return merged;

        foreach (var (key, enabled) in requested)
        {
            if (string.IsNullOrWhiteSpace(key))
                continue;

            if (PlatformFeatureCodes.All.Contains(key, StringComparer.OrdinalIgnoreCase))
                merged[key] = enabled;
        }

        return merged;
    }
}
