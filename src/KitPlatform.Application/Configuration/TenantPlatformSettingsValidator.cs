using KitPlatform.Application.Core;

namespace KitPlatform.Application.Configuration;

public static class TenantPlatformSettingsValidator
{
    public static (IReadOnlyList<string> AcceptedModules, IReadOnlyList<string> IgnoredModules) NormalizeModules(
        IReadOnlyList<string>? requested,
        IReadOnlySet<string> registryCodes)
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

            if (registryCodes.Contains(code))
            {
                if (!accepted.Contains(code, StringComparer.OrdinalIgnoreCase))
                    accepted.Add(code);
            }
            else
            {
                ignored.Add(code);
            }
        }

        if (accepted.Count == 0)
            throw new InvalidOperationException("Không có module hợp lệ trong danh sách đã chọn.");

        return (accepted, ignored);
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
