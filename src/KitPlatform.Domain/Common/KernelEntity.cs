namespace KitPlatform.Domain.Common;

/// <summary>
/// Base type for new KIT Platform Kernel tables (kit_* schemas).
/// Legacy public.* entities keep <see cref="BaseEntity"/> / <see cref="TenantEntity"/>.
/// </summary>
public abstract class KernelEntity
{
    public Guid Id { get; set; }
    public int RowVersion { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}

public abstract class KernelTenantEntity : KernelEntity
{
    public Guid TenantId { get; set; }
    public Guid? WorkspaceId { get; set; }
}
