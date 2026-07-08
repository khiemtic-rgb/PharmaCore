namespace KitPlatform.Application.Abstractions;

public sealed record BranchAccessScope(
    bool Unrestricted,
    IReadOnlyList<Guid> BranchIds,
    IReadOnlyList<Guid> WarehouseIds,
    Guid? PrimaryBranchId)
{
    public static BranchAccessScope UnrestrictedScope() => new(true, [], [], null);

    public static BranchAccessScope EmptyScope() => new(false, [], [], null);
}

public interface IBranchAccessService
{
    Task<BranchAccessScope> GetScopeAsync(CancellationToken cancellationToken = default);

    Task EnsureWarehouseAccessAsync(Guid warehouseId, CancellationToken cancellationToken = default);

    Task EnsureBranchAccessAsync(Guid branchId, CancellationToken cancellationToken = default);

    /// <summary>Single id, or null id + allowed list for scoped users, or both null when unrestricted without filter.</summary>
    Task<(Guid? WarehouseId, Guid[]? AllowedWarehouseIds)> ResolveWarehouseQueryAsync(
        Guid? requestedWarehouseId,
        CancellationToken cancellationToken = default);
}
