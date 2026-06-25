namespace PharmaCore.Infrastructure.CustomerApp;

internal static class ReminderScheduleHelper
{
    public static readonly int[] AllDaysOfWeek = [1, 2, 3, 4, 5, 6, 7];

    public static TimeSpan ParseRemindTime(string value)
    {
        if (TimeSpan.TryParseExact(value.Trim(), ["hh\\:mm", "h\\:mm"], null, out var time))
            return time;

        if (TimeSpan.TryParse(value.Trim(), out time) && time < TimeSpan.FromDays(1))
            return time;

        throw new InvalidOperationException("Giờ nhắc phải theo định dạng HH:mm (ví dụ 08:00).");
    }

    public static string FormatRemindTime(TimeOnly time) =>
        time.ToString("HH:mm", System.Globalization.CultureInfo.InvariantCulture);

    public static string FormatRemindTime(TimeSpan time) =>
        FormatRemindTime(TimeOnly.FromTimeSpan(time));

    public static int[] NormalizeDaysOfWeek(IReadOnlyList<int>? days)
    {
        if (days is null || days.Count == 0)
            return AllDaysOfWeek;

        var normalized = days
            .Where(d => d is >= 1 and <= 7)
            .Distinct()
            .OrderBy(d => d)
            .ToArray();

        if (normalized.Length == 0)
            throw new InvalidOperationException("daysOfWeek phải là các số từ 1 (Thứ 2) đến 7 (Chủ nhật).");

        return normalized;
    }

    public static DateTimeOffset? ComputeNextRemindAt(
        TimeSpan remindTime,
        IReadOnlyList<int> daysOfWeek,
        DateTimeOffset utcNow)
    {
        if (daysOfWeek.Count == 0)
            return null;

        var days = daysOfWeek.ToHashSet();
        for (var offset = 0; offset <= 7; offset++)
        {
            var date = utcNow.UtcDateTime.Date.AddDays(offset);
            var isoDow = date.DayOfWeek == DayOfWeek.Sunday ? 7 : (int)date.DayOfWeek;
            if (!days.Contains(isoDow))
                continue;

            var candidate = new DateTimeOffset(date.Add(remindTime), TimeSpan.Zero);
            if (candidate > utcNow)
                return candidate;
        }

        return null;
    }
}
