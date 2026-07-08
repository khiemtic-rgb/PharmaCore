namespace KitPlatform.Infrastructure.Kernel.Pharmacy;

/// <summary>Phase C read cutover — strangler views in <c>pack_pharmacy</c>.</summary>
internal static class PackPharmacyReadViews
{
    public const string Product = "pack_pharmacy.v_product";
    public const string SalesOrder = "pack_pharmacy.v_sales_order";
    public const string Customer = "pack_pharmacy.v_customer";
    public const string Warehouse = "pack_pharmacy.v_warehouse";
    public const string InventoryBatch = "pack_pharmacy.v_inventory_batch";
    public const string Supplier = "pack_pharmacy.v_supplier";
    public const string PurchaseOrder = "pack_pharmacy.v_purchase_order";
    public const string GoodsReceipt = "pack_pharmacy.v_goods_receipt";
}
