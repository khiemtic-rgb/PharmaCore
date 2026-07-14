namespace KitPlatform.Application.Success;

public interface IOwnerCockpitService
{
    Task<OwnerCockpitDto> GetAsync(
        int expiryDays = 30,
        decimal lowStockThreshold = 10,
        CancellationToken cancellationToken = default);
}
