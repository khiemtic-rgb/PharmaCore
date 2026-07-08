namespace KitPlatform.Packs.Pharmacy.Infrastructure;

internal static class SalesOrderReminderNormalizer
{
    private const int MaxDaysSupply = 730;
    private const int MaxLabelLength = 120;
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public static (string? Label, int? DaysSupply) Normalize(string? label, int? daysSupply)
    {
        if (daysSupply is null or < 1)
            return (null, null);

        var days = Math.Min(daysSupply.Value, MaxDaysSupply);
        var trimmed = string.IsNullOrWhiteSpace(label) ? null : label.Trim();
        if (trimmed is null)
        {
            var vnNow = DateTimeOffset.UtcNow.ToOffset(VietnamOffset);
            trimmed = $"Đơn thuốc ngày {vnNow:dd/MM/yyyy}";
        }
        else if (trimmed.Length > MaxLabelLength)
        {
            trimmed = trimmed[..MaxLabelLength];
        }

        return (trimmed, days);
    }
}
