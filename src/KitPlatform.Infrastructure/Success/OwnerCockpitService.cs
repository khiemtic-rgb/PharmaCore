using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Dashboard;
using KitPlatform.Application.Success;
using KitPlatform.Infrastructure.Dashboard;

namespace KitPlatform.Infrastructure.Success;

internal sealed class OwnerCockpitService : IOwnerCockpitService
{
    private readonly IDashboardService _dashboard;
    private readonly OwnerCockpitRepository _extras;
    private readonly IBranchAccessService _branchAccess;

    public OwnerCockpitService(
        IDashboardService dashboard,
        OwnerCockpitRepository extras,
        IBranchAccessService branchAccess)
    {
        _dashboard = dashboard;
        _extras = extras;
        _branchAccess = branchAccess;
    }

    public async Task<OwnerCockpitDto> GetAsync(
        int expiryDays = 30,
        decimal lowStockThreshold = 10,
        CancellationToken cancellationToken = default)
    {
        var overview = await _dashboard.GetOverviewAsync(expiryDays, lowStockThreshold, cancellationToken);
        var (_, allowed) = await _branchAccess.ResolveWarehouseQueryAsync(null, cancellationToken);
        var (sales, inventory, customers, assessment) =
            await _extras.GetExtrasAsync(expiryDays, allowed, cancellationToken);
        return new OwnerCockpitDto(overview, sales, inventory, customers, assessment);
    }
}
