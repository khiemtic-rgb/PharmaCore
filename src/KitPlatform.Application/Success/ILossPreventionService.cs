namespace KitPlatform.Application.Success;

public interface ILossPreventionService
{
    Task<LossCashVarianceTodayDto> GetCashVarianceTodayAsync(
        decimal? threshold = null,
        CancellationToken cancellationToken = default);

    Task<OwnerCockpitRiskStripDto> GetRiskStripAsync(
        decimal? cashVarianceThreshold = null,
        CancellationToken cancellationToken = default);

    Task<LossEmployeeReportsDto> GetEmployeeReportsAsync(
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        Guid? branchId = null,
        CancellationToken cancellationToken = default);

    Task<LossAuditFeedDto> GetAuditFeedAsync(
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        Guid? branchId = null,
        Guid? userId = null,
        string? eventType = null,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<LossCycleCountSuggestionsDto> GetCycleCountSuggestionsAsync(
        Guid? warehouseId = null,
        Guid? branchId = null,
        int limit = 15,
        CancellationToken cancellationToken = default);

    Task<LossCycleCountSessionDto> CreateCycleCountSessionAsync(
        Guid warehouseId,
        int limit = 15,
        string? note = null,
        CancellationToken cancellationToken = default);

    Task<LossCycleCountStatusDto> GetCycleCountStatusTodayAsync(
        Guid? branchId = null,
        CancellationToken cancellationToken = default);

    Task<LossCycleCountVarianceReportDto> GetCycleCountVarianceAsync(
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        Guid? branchId = null,
        CancellationToken cancellationToken = default);
}
