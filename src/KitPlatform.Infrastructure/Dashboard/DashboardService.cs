using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Dashboard;

namespace KitPlatform.Infrastructure.Dashboard;

internal sealed class DashboardService : IDashboardService
{
    private readonly DashboardRepository _repository;
    private readonly IBranchAccessService _branchAccess;

    public DashboardService(DashboardRepository repository, IBranchAccessService branchAccess)
    {
        _repository = repository;
        _branchAccess = branchAccess;
    }

    public async Task<DashboardOverviewDto> GetOverviewAsync(
        int expiryDays = 30,
        decimal lowStockThreshold = 10,
        CancellationToken cancellationToken = default)
    {
        var (_, allowed) = await _branchAccess.ResolveWarehouseQueryAsync(null, cancellationToken);
        return await _repository.GetOverviewAsync(expiryDays, lowStockThreshold, allowed, cancellationToken);
    }
}
