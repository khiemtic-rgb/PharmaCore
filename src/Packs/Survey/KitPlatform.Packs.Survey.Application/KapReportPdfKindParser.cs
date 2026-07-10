namespace KitPlatform.Packs.Survey;

public static class KapReportPdfKindParser
{
    public static KapReportPdfKind Parse(string? kind) =>
        kind?.Trim().ToLowerInvariant() switch
        {
            "executive" or "exec" => KapReportPdfKind.Executive,
            "appendix" or "technical" => KapReportPdfKind.Appendix,
            "consulting" or "full" or "" or null => KapReportPdfKind.Consulting,
            _ => KapReportPdfKind.Consulting,
        };
}
