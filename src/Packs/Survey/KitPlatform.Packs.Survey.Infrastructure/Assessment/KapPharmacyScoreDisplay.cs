namespace KitPlatform.Packs.Survey.Infrastructure;

/// <summary>Hiển thị điểm theo thang 10 — dễ hiểu với chủ nhà thuốc (6/10, 4,5/10).</summary>
internal static class KapPharmacyScoreDisplay
{
    private static readonly Dictionary<string, string> Letters = new(StringComparer.OrdinalIgnoreCase)
    {
        ["CUSTOMER"] = "A",
        ["OPERATIONS"] = "B",
        ["INVENTORY"] = "C",
        ["BUSINESS"] = "D",
        ["TECH"] = "E",
        ["GROWTH"] = "F",
    };

    public static decimal ToTen(decimal scoreOutOf4) => Math.Round(scoreOutOf4 * 2.5m, 1);

    public static decimal ToTenFromPct(decimal pct) => Math.Round(pct / 10m, 1);

    public static string Format(decimal scoreOutOf4) => FormatValue(ToTen(scoreOutOf4));

    public static string FormatValue(decimal ten)
    {
        if (ten == Math.Floor(ten))
            return $"{ten:F0}/10";
        return $"{ten.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture).Replace('.', ',')}/10";
    }

    public static string Letter(string code) => Letters.TryGetValue(code, out var l) ? l : "•";

    public static string LabeledLine(string code, string? name, decimal scoreOutOf4) =>
        $"{Letter(code)}. {KapPharmacyLanguage.SimpleName(code, name)} đạt {Format(scoreOutOf4)}";
}
