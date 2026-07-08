namespace KitPlatform.Application.Configuration;

public interface ITenantSettingsService
{
    Task<TenantBatchMode> GetBatchModeAsync(CancellationToken cancellationToken = default);

    Task<TenantReceiptSettingsDto> GetReceiptSettingsAsync(CancellationToken cancellationToken = default);

    Task<TenantReceiptSettingsDto> UpdateReceiptSettingsAsync(
        UpdateTenantReceiptSettingsRequest request,
        CancellationToken cancellationToken = default);

    Task<TenantBatchModeSettingsDto> GetBatchModeSettingsAsync(
        CancellationToken cancellationToken = default);

    Task<TenantBatchModeSettingsDto> UpdateBatchModeAsync(
        UpdateTenantBatchModeRequest request,
        CancellationToken cancellationToken = default);

    Task<TenantDefaultMinStockDto> GetDefaultMinStockAsync(CancellationToken cancellationToken = default);

    Task<TenantDefaultMinStockDto> UpdateDefaultMinStockAsync(
        UpdateTenantDefaultMinStockRequest request,
        CancellationToken cancellationToken = default);

    Task<TenantCustomerAppSettingsDto> GetCustomerAppSettingsAsync(
        CancellationToken cancellationToken = default);

    Task<TenantCustomerAppSettingsDto> UpdateCustomerAppSettingsAsync(
        UpdateTenantCustomerAppSettingsRequest request,
        CancellationToken cancellationToken = default);
}
