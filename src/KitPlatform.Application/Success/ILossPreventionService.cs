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
}
