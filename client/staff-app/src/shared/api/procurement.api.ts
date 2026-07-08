import { http } from '@/shared/api/http';
import type {
  GoodsReceiptDetail,
  GoodsReceiptListFilters,
  GoodsReceiptListItem,
  PagedListResult,
  ProcurementVatTreatment,
  PurchaseOrderDetail,
  PurchaseOrderListItem,
  Supplier,
} from '@/shared/api/procurement.types';

function buildListParams(filters?: Record<string, string | number | boolean | undefined>) {
  if (!filters) return undefined;
  const params: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '' || value === false) continue;
    params[key] = value;
  }
  return Object.keys(params).length > 0 ? params : undefined;
}

function normalizePagedList<T>(
  data: Record<string, unknown>,
  normalizeItem: (row: Record<string, unknown>) => T,
): PagedListResult<T> {
  const rawItems = (data.items ?? data.Items ?? []) as Record<string, unknown>[];
  return {
    items: rawItems.map(normalizeItem),
    total: Number(data.total ?? data.Total ?? 0),
    page: Number(data.page ?? data.Page ?? 1),
    pageSize: Number(data.pageSize ?? data.PageSize ?? rawItems.length),
  };
}

function normalizeSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: String(row.id ?? row.Id),
    supplierCode: String(row.supplierCode ?? row.SupplierCode ?? ''),
    supplierName: String(row.supplierName ?? row.SupplierName ?? ''),
    paymentTerms: Number(row.paymentTerms ?? row.PaymentTerms ?? 30),
    status: Number(row.status ?? row.Status ?? 1),
    isPlaceholder: Boolean(row.isPlaceholder ?? row.IsPlaceholder ?? false),
  };
}

function normalizeGrnListItem(row: Record<string, unknown>): GoodsReceiptListItem {
  return {
    id: String(row.id ?? row.Id),
    grnNumber: String(row.grnNumber ?? row.GrnNumber ?? ''),
    supplierId: String(row.supplierId ?? row.SupplierId),
    supplierName: String(row.supplierName ?? row.SupplierName ?? ''),
    warehouseId: String(row.warehouseId ?? row.WarehouseId),
    warehouseName: String(row.warehouseName ?? row.WarehouseName ?? ''),
    purchaseOrderId: (row.purchaseOrderId ?? row.PurchaseOrderId) as string | undefined,
    poNumber: (row.poNumber ?? row.PoNumber) as string | undefined,
    status: Number(row.status ?? row.Status ?? 1),
    receiptDate: String(row.receiptDate ?? row.ReceiptDate ?? ''),
    itemCount: Number(row.itemCount ?? row.ItemCount ?? 0),
    totalAmount: Number(row.totalAmount ?? row.TotalAmount ?? 0) || undefined,
  };
}

function normalizeGrnItem(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? row.Id),
    productId: String(row.productId ?? row.ProductId),
    productCode: String(row.productCode ?? row.ProductCode ?? ''),
    productName: String(row.productName ?? row.ProductName ?? ''),
    productUnitId: String(row.productUnitId ?? row.ProductUnitId),
    unitName: String(row.unitName ?? row.UnitName ?? ''),
    batchNumber: String(row.batchNumber ?? row.BatchNumber ?? ''),
    expiryDate: String(row.expiryDate ?? row.ExpiryDate ?? ''),
    quantity: Number(row.quantity ?? row.Quantity ?? 0),
    unitCost: Number(row.unitCost ?? row.UnitCost ?? 0),
    lineTotal: Number(row.lineTotal ?? row.LineTotal ?? 0),
  };
}

function normalizeGrnDetail(data: Record<string, unknown>): GoodsReceiptDetail {
  const base = normalizeGrnListItem(data);
  const rawItems = (data.items ?? data.Items ?? []) as Record<string, unknown>[];
  return {
    ...base,
    totalAmount: Number(data.totalAmount ?? data.TotalAmount ?? 0),
    notes: (data.notes ?? data.Notes) as string | undefined,
    items: rawItems.map(normalizeGrnItem),
  };
}

function normalizePoListItem(row: Record<string, unknown>): PurchaseOrderListItem {
  return {
    id: String(row.id ?? row.Id),
    poNumber: String(row.poNumber ?? row.PoNumber ?? ''),
    supplierId: String(row.supplierId ?? row.SupplierId),
    supplierName: String(row.supplierName ?? row.SupplierName ?? ''),
    warehouseId: String(row.warehouseId ?? row.WarehouseId),
    warehouseName: String(row.warehouseName ?? row.WarehouseName ?? ''),
    status: Number(row.status ?? row.Status ?? 1),
    orderDate: String(row.orderDate ?? row.OrderDate ?? ''),
    totalAmount: Number(row.totalAmount ?? row.TotalAmount ?? 0),
    itemCount: Number(row.itemCount ?? row.ItemCount ?? 0),
  };
}

function normalizePoItem(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? row.Id),
    productId: String(row.productId ?? row.ProductId),
    productCode: String(row.productCode ?? row.ProductCode ?? ''),
    productName: String(row.productName ?? row.ProductName ?? ''),
    productUnitId: String(row.productUnitId ?? row.ProductUnitId),
    unitName: String(row.unitName ?? row.UnitName ?? ''),
    orderedQty: Number(row.orderedQty ?? row.OrderedQty ?? 0),
    receivedQty: Number(row.receivedQty ?? row.ReceivedQty ?? 0),
    unitPrice: Number(row.unitPrice ?? row.UnitPrice ?? 0),
  };
}

function normalizePoDetail(data: Record<string, unknown>): PurchaseOrderDetail {
  const base = normalizePoListItem(data);
  const rawItems = (data.items ?? data.Items ?? []) as Record<string, unknown>[];
  return {
    ...base,
    vatTreatmentId: String(data.vatTreatmentId ?? data.VatTreatmentId ?? ''),
    items: rawItems.map(normalizePoItem),
  };
}

function normalizeVatTreatment(row: Record<string, unknown>): ProcurementVatTreatment {
  return {
    id: String(row.id ?? row.Id),
    treatmentCode: String(row.treatmentCode ?? row.TreatmentCode ?? ''),
    treatmentName: String(row.treatmentName ?? row.TreatmentName ?? ''),
    ratePercent: Number(row.ratePercent ?? row.RatePercent ?? 0),
    isNotSubject: Boolean(row.isNotSubject ?? row.IsNotSubject ?? false),
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? 0),
    isActive: Boolean(row.isActive ?? row.IsActive ?? true),
  };
}

export async function fetchSuppliers(activeOnly = true): Promise<Supplier[]> {
  const { data } = await http.get<Record<string, unknown>[]>('/procurement/suppliers', {
    params: activeOnly ? { activeOnly: true } : undefined,
  });
  return data.map(normalizeSupplier);
}

export async function fetchVatTreatments(activeOnly = true): Promise<ProcurementVatTreatment[]> {
  const { data } = await http.get<Record<string, unknown>[]>('/procurement/vat-treatments', {
    params: { activeOnly },
  });
  return data.map(normalizeVatTreatment);
}

export async function fetchGoodsReceipts(
  filters?: GoodsReceiptListFilters,
): Promise<PagedListResult<GoodsReceiptListItem>> {
  const { data } = await http.get<Record<string, unknown>>('/procurement/goods-receipts', {
    params: buildListParams(filters as Record<string, string | number | boolean | undefined>),
  });
  return normalizePagedList(data, normalizeGrnListItem);
}

export async function fetchGoodsReceipt(id: string): Promise<GoodsReceiptDetail> {
  const { data } = await http.get<Record<string, unknown>>(`/procurement/goods-receipts/${id}`);
  return normalizeGrnDetail(data);
}

export async function createGoodsReceipt(payload: {
  purchaseOrderId?: string;
  supplierId: string;
  warehouseId: string;
  receiptDate?: string;
  notes?: string;
  vatTreatmentId: string;
  items: {
    purchaseOrderItemId?: string;
    productId: string;
    productUnitId: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    unitCost: number;
  }[];
}): Promise<GoodsReceiptDetail> {
  const { data } = await http.post<Record<string, unknown>>('/procurement/goods-receipts', payload);
  return normalizeGrnDetail(data);
}

export async function completeGoodsReceipt(id: string): Promise<GoodsReceiptDetail> {
  const { data } = await http.post<Record<string, unknown>>(`/procurement/goods-receipts/${id}/complete`);
  return normalizeGrnDetail(data);
}

export async function cancelGoodsReceipt(id: string): Promise<GoodsReceiptDetail> {
  const { data } = await http.post<Record<string, unknown>>(`/procurement/goods-receipts/${id}/cancel`);
  return normalizeGrnDetail(data);
}

export async function fetchPurchaseOrders(filters?: {
  pendingReceiptOnly?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<PagedListResult<PurchaseOrderListItem>> {
  const { data } = await http.get<Record<string, unknown>>('/procurement/purchase-orders', {
    params: buildListParams(filters as Record<string, string | number | boolean | undefined>),
  });
  return normalizePagedList(data, normalizePoListItem);
}

export async function fetchPurchaseOrder(id: string): Promise<PurchaseOrderDetail> {
  const { data } = await http.get<Record<string, unknown>>(`/procurement/purchase-orders/${id}`);
  return normalizePoDetail(data);
}
