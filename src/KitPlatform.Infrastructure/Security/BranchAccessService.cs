using KitPlatform.Application.Abstractions;

namespace KitPlatform.Infrastructure.Security;

internal sealed class BranchAccessService : IBranchAccessService
{
    private readonly BranchAccessRepository _repository;
    private readonly ITenantContext _tenant;
    private readonly ICurrentUserAccessor _user;
    private BranchAccessScope? _cached;

    public BranchAccessService(
        BranchAccessRepository repository,
        ITenantContext tenant,
        ICurrentUserAccessor user)
    {
        _repository = repository;
        _tenant = tenant;
        _user = user;
    }

    public async Task<BranchAccessScope> GetScopeAsync(CancellationToken cancellationToken = default)
    {
        if (_cached is not null)
            return _cached;

        _cached = await _repository.LoadScopeAsync(
            _tenant.UserId,
            _tenant.TenantId,
            _user.IsInRole("ADMIN"),
            cancellationToken);
        return _cached;
    }

    public async Task EnsureWarehouseAccessAsync(Guid warehouseId, CancellationToken cancellationToken = default)
    {
        var scope = await GetScopeAsync(cancellationToken);
        if (scope.Unrestricted)
            return;

        if (!scope.WarehouseIds.Contains(warehouseId))
            throw new UnauthorizedAccessException("Bạn không có quyền thao tác trên kho/chi nhánh này.");
    }

    public async Task EnsureBranchAccessAsync(Guid branchId, CancellationToken cancellationToken = default)
    {
        var scope = await GetScopeAsync(cancellationToken);
        if (scope.Unrestricted)
            return;

        if (!scope.BranchIds.Contains(branchId))
            throw new UnauthorizedAccessException("Bạn không có quyền thao tác trên chi nhánh này.");
    }

    public async Task<(Guid? WarehouseId, Guid[]? AllowedWarehouseIds)> ResolveWarehouseQueryAsync(
        Guid? requestedWarehouseId,
        CancellationToken cancellationToken = default)
    {
        var scope = await GetScopeAsync(cancellationToken);
        if (scope.Unrestricted)
            return (requestedWarehouseId, null);

        if (scope.WarehouseIds.Count == 0)
            throw new UnauthorizedAccessException("Tài khoản chưa được gán chi nhánh. Liên hệ quản trị viên.");

        if (requestedWarehouseId is Guid warehouseId)
        {
            if (!scope.WarehouseIds.Contains(warehouseId))
                throw new UnauthorizedAccessException("Bạn không có quyền xem dữ liệu kho này.");
            return (warehouseId, null);
        }

        return (null, scope.WarehouseIds.ToArray());
    }
}
