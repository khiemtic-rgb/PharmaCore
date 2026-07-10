using KitPlatform.Application.Healthcare;
using KitPlatform.Packs.Pharmacy.Rx;
using HealthcareLogin = KitPlatform.Application.Healthcare.PrescriberLoginResponse;
using HealthcareOtpSent = KitPlatform.Application.Healthcare.PrescriberOtpSentResponse;
using HealthcareProfile = KitPlatform.Application.Healthcare.PrescriberProfile;
using PackLogin = KitPlatform.Packs.Pharmacy.Rx.PrescriberLoginResponse;
using PackOtpSent = KitPlatform.Packs.Pharmacy.Rx.PrescriberOtpSentResponse;

namespace KitPlatform.Packs.Pharmacy.Infrastructure.Healthcare;

internal static class HealthcareDtoMapper
{
    public static HealthcareProfile ToProfile(PrescriberProfileDto dto) =>
        new(dto.Id, dto.FullName, dto.LicenseNumber, dto.Phone, dto.Specialty, dto.Status);

    public static PrescriberPharmacyLink ToLink(PrescriberTenantLinkDto dto) =>
        new(
            dto.Id,
            dto.PrescriberId,
            dto.TenantId,
            dto.TenantCode,
            dto.TenantName,
            dto.LinkedPrescriberId,
            dto.LinkStatus,
            dto.InitiatedBy,
            dto.InvitedAt,
            dto.RespondedAt,
            dto.PrescriberName,
            dto.PrescriberPhone,
            dto.PrescriberLicenseNumber);

    public static PharmacyDirectoryEntry ToDirectory(PharmacyDirectoryItemDto dto) =>
        new(dto.TenantId, dto.TenantCode, dto.TenantName, dto.Address, dto.Phone);

    public static HealthcareOtpSent ToOtp(PackOtpSent dto) =>
        new(dto.ExpiresInSeconds, dto.CooldownSeconds, dto.Message, dto.PilotCode);

    public static HealthcareLogin ToLogin(PackLogin dto) =>
        new(dto.AccessToken, dto.ExpiresAt, ToProfile(dto.Profile));
}
