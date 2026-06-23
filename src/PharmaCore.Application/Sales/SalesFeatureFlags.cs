namespace PharmaCore.Application.Sales;

public static class SalesFeatureFlags
{
    /// <summary>
    /// Cảnh báo FEFO trên ca bán. Tắt tạm — bật lại khi POS xác nhận lô/HSD thật lúc chốt đơn.
    /// </summary>
    public static bool ShiftLotComplianceAlertsEnabled => false;
}
