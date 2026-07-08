namespace KitPlatform.Application.Loyalty;

public interface ILoyaltyAdminService
{
    Task<LoyaltyAdminSettingsDto> GetSettingsAsync(CancellationToken cancellationToken = default);

    Task<LoyaltyAdminSettingsDto> SaveSettingsAsync(
        UpdateLoyaltyAdminSettingsRequest request,
        CancellationToken cancellationToken = default);
}
