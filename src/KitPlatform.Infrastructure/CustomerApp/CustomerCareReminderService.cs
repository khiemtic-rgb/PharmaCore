using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Infrastructure.CustomerApp;

internal sealed class CustomerCareReminderService : ICustomerCareReminderService
{
    private static readonly HashSet<string> AllowedReminderTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "medication", "visit", "lab", "exercise", "nutrition", "other",
    };

    private readonly CustomerCareReminderRepository _repo;
    private readonly CustomerEngagementRepository _engagement;
    private readonly CustomerNotificationRepository _notifications;

    public CustomerCareReminderService(
        CustomerCareReminderRepository repo,
        CustomerEngagementRepository engagement,
        CustomerNotificationRepository notifications)
    {
        _repo = repo;
        _engagement = engagement;
        _notifications = notifications;
    }

    public async Task<CustomerCareReminderListResult> ListAsync(
        Guid tenantId,
        Guid accountId,
        bool includeDone,
        CancellationToken cancellationToken = default)
    {
        var rows = await _repo.ListAsync(tenantId, accountId, includeDone, cancellationToken);
        return new CustomerCareReminderListResult(rows.Select(MapRow).ToList());
    }

    public async Task<CustomerCareReminderDto?> GetAsync(
        Guid tenantId,
        Guid accountId,
        Guid careReminderId,
        CancellationToken cancellationToken = default)
    {
        var row = await _repo.GetAsync(tenantId, accountId, careReminderId, cancellationToken);
        return row is null ? null : MapRow(row);
    }

    public async Task<CustomerCareReminderDto> CreateAsync(
        Guid tenantId,
        Guid accountId,
        CreateCustomerCareReminderRequest request,
        CancellationToken cancellationToken = default)
    {
        var id = await _repo.CreateAsync(
            tenantId,
            accountId,
            request.FamilyMemberId,
            request.HealthRecordId,
            NormalizeReminderType(request.ReminderType),
            NormalizeRequired(request.Title, "Tiêu đề"),
            NormalizeOptional(request.Note),
            request.RemindAt,
            cancellationToken);

        var created = await _repo.GetAsync(tenantId, accountId, id, cancellationToken)
            ?? throw new InvalidOperationException("Không tạo được nhắc chăm sóc.");

        var customerId = await _engagement.GetCustomerIdForAccountAsync(tenantId, accountId, cancellationToken);
        if (customerId is Guid cid)
        {
            var when = request.RemindAt.ToOffset(TimeSpan.FromHours(7)).ToString("dd/MM/yyyy HH:mm");
            await _notifications.InsertAsync(
                tenantId,
                cid,
                channel: 0,
                category: "care",
                title: "Đã lên lịch nhắc",
                body: $"{NormalizeRequired(request.Title, "Tiêu đề")} — {when}",
                href: "/health",
                payloadJson: System.Text.Json.JsonSerializer.Serialize(new { type = "care_reminder_scheduled", careReminderId = id }),
                cancellationToken);
        }

        return MapRow(created);
    }

    public async Task<CustomerCareReminderDto?> UpdateAsync(
        Guid tenantId,
        Guid accountId,
        Guid careReminderId,
        UpdateCustomerCareReminderRequest request,
        CancellationToken cancellationToken = default)
    {
        var updated = await _repo.UpdateAsync(
            tenantId,
            accountId,
            careReminderId,
            request.FamilyMemberId,
            request.HealthRecordId,
            NormalizeReminderType(request.ReminderType),
            NormalizeRequired(request.Title, "Tiêu đề"),
            NormalizeOptional(request.Note),
            request.RemindAt,
            request.IsDone,
            request.SnoozedUntil,
            cancellationToken);

        if (!updated)
            return null;

        var row = await _repo.GetAsync(tenantId, accountId, careReminderId, cancellationToken);
        return row is null ? null : MapRow(row);
    }

    public Task<bool> DeleteAsync(
        Guid tenantId,
        Guid accountId,
        Guid careReminderId,
        CancellationToken cancellationToken = default) =>
        _repo.DeleteAsync(tenantId, accountId, careReminderId, cancellationToken);

    private static string NormalizeReminderType(string value)
    {
        var normalized = NormalizeRequired(value, "Loại nhắc").ToLowerInvariant();
        if (!AllowedReminderTypes.Contains(normalized))
            throw new InvalidOperationException("Loại nhắc không hợp lệ.");
        return normalized;
    }

    private static string NormalizeRequired(string value, string fieldName)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
            throw new InvalidOperationException($"{fieldName} là bắt buộc.");
        return normalized;
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static CustomerCareReminderDto MapRow(CustomerCareReminderRow row) =>
        new(
            row.Id,
            row.FamilyMemberId,
            row.HealthRecordId,
            row.ReminderType,
            row.Title,
            row.Note,
            new DateTimeOffset(DateTime.SpecifyKind(row.RemindAt, DateTimeKind.Utc)),
            row.IsDone,
            row.DoneAt.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(row.DoneAt.Value, DateTimeKind.Utc))
                : null,
            row.SnoozedUntil.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(row.SnoozedUntil.Value, DateTimeKind.Utc))
                : null,
            new DateTimeOffset(DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc)),
            new DateTimeOffset(DateTime.SpecifyKind(row.UpdatedAt, DateTimeKind.Utc)));
}
