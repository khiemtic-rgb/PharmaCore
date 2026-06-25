using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Infrastructure.CustomerApp;

internal sealed class CustomerReminderService : ICustomerReminderService
{
    private readonly CustomerReminderRepository _repo;

    public CustomerReminderService(CustomerReminderRepository repo) => _repo = repo;

    public async Task<MedicationReminderListResult> ListAsync(
        Guid tenantId,
        Guid customerId,
        bool includeInactive,
        CancellationToken cancellationToken = default)
    {
        var rows = await _repo.ListAsync(tenantId, customerId, includeInactive, cancellationToken);
        return new MedicationReminderListResult(rows.Select(MapRow).ToList());
    }

    public async Task<MedicationReminderDto?> GetAsync(
        Guid tenantId,
        Guid customerId,
        Guid reminderId,
        CancellationToken cancellationToken = default)
    {
        var row = await _repo.GetByIdAsync(tenantId, customerId, reminderId, cancellationToken);
        return row is null ? null : MapRow(row);
    }

    public async Task<MedicationReminderDto> CreateAsync(
        Guid tenantId,
        Guid customerId,
        CreateMedicationReminderRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!await _repo.ProductExistsAsync(tenantId, request.ProductId, cancellationToken))
            throw new InvalidOperationException("Sản phẩm không tồn tại hoặc không thuộc nhà thuốc.");

        var remindTime = ReminderScheduleHelper.ParseRemindTime(request.RemindTime);
        var days = ReminderScheduleHelper.NormalizeDaysOfWeek(request.DaysOfWeek);
        var nextRemindAt = ReminderScheduleHelper.ComputeNextRemindAt(
            remindTime,
            days,
            DateTimeOffset.UtcNow);

        var id = await _repo.CreateAsync(
            tenantId,
            customerId,
            request.ProductId,
            NormalizeDosageNote(request.DosageNote),
            remindTime,
            days,
            nextRemindAt,
            cancellationToken);

        var created = await _repo.GetByIdAsync(tenantId, customerId, id, cancellationToken)
            ?? throw new InvalidOperationException("Không tạo được nhắc uống thuốc.");

        return MapRow(created);
    }

    public async Task<MedicationReminderDto?> UpdateAsync(
        Guid tenantId,
        Guid customerId,
        Guid reminderId,
        UpdateMedicationReminderRequest request,
        CancellationToken cancellationToken = default)
    {
        var existing = await _repo.GetByIdAsync(tenantId, customerId, reminderId, cancellationToken);
        if (existing is null)
            return null;

        var productId = request.ProductId ?? existing.ProductId;
        if (productId != existing.ProductId
            && !await _repo.ProductExistsAsync(tenantId, productId, cancellationToken))
        {
            throw new InvalidOperationException("Sản phẩm không tồn tại hoặc không thuộc nhà thuốc.");
        }

        var remindTime = request.RemindTime is null
            ? existing.RemindTime.ToTimeSpan()
            : ReminderScheduleHelper.ParseRemindTime(request.RemindTime);

        var days = request.DaysOfWeek is null
            ? existing.DaysOfWeek.Select(d => (int)d).ToArray()
            : ReminderScheduleHelper.NormalizeDaysOfWeek(request.DaysOfWeek);

        var isActive = request.IsActive ?? existing.IsActive;
        var dosageNote = request.DosageNote is null
            ? existing.DosageNote
            : NormalizeDosageNote(request.DosageNote);

        DateTimeOffset? nextRemindAt = null;
        if (isActive)
        {
            nextRemindAt = ReminderScheduleHelper.ComputeNextRemindAt(
                remindTime,
                days,
                DateTimeOffset.UtcNow);
        }

        var updated = await _repo.UpdateAsync(
            tenantId,
            customerId,
            reminderId,
            productId,
            dosageNote,
            remindTime,
            days,
            nextRemindAt,
            isActive,
            cancellationToken);

        if (!updated)
            return null;

        var row = await _repo.GetByIdAsync(tenantId, customerId, reminderId, cancellationToken);
        return row is null ? null : MapRow(row);
    }

    public Task<bool> DeactivateAsync(
        Guid tenantId,
        Guid customerId,
        Guid reminderId,
        CancellationToken cancellationToken = default) =>
        _repo.DeactivateAsync(tenantId, customerId, reminderId, cancellationToken);

    private static string? NormalizeDosageNote(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static MedicationReminderDto MapRow(MedicationReminderRow row) =>
        new(
            row.Id,
            row.ProductId,
            row.ProductCode,
            row.ProductName,
            row.DosageNote,
            ReminderScheduleHelper.FormatRemindTime(row.RemindTime),
            row.DaysOfWeek,
            row.NextRemindAt.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(row.NextRemindAt.Value, DateTimeKind.Utc))
                : null,
            row.IsActive,
            new DateTimeOffset(DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc)),
            new DateTimeOffset(DateTime.SpecifyKind(row.UpdatedAt, DateTimeKind.Utc)));
}
