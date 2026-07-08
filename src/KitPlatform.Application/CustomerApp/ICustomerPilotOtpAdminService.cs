namespace KitPlatform.Application.CustomerApp;

public interface ICustomerPilotOtpAdminService
{
    Task<CustomerPilotOtpStatusDto?> GetStatusAsync(
        Guid customerId,
        CancellationToken cancellationToken = default);
}
