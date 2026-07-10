namespace KitPlatform.Packs.Pharmacy.Catalog;

public sealed record DispensingClassSummaryDto(
    int OtcCount,
    int PrescriptionCount,
    int ControlledCount,
    int InconsistentCount);

public sealed record SyncDispensingClassResultDto(int UpdatedCount);
