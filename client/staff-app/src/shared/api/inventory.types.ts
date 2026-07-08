export type PagedStockBatches = {
  items: StockBatch[];
  total: number;
  page: number;
  pageSize: number;
};

export type PagedStockProducts = {
  items: StockProductSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type Warehouse = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  branchName?: string;
};

export type StockProductSummary = {
  productId: string;
  productCode: string;
  productName: string;
  saleUnitName?: string;
  totalQuantity: number;
};

export type StockBatch = {
  id: string;
  batchNumber: string;
  expiryDate?: string;
  quantityAvailable: number;
};

export type TransferListItem = {
  id: string;
  transferNumber: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  status: number;
  transferDate: string;
  itemCount: number;
};

export type TransferItem = {
  id: string;
  batchId: string;
  productId: string;
  productCode: string;
  productName: string;
  batchNumber: string;
  quantity: number;
};

export type TransferDetail = TransferListItem & {
  notes?: string;
  items: TransferItem[];
};

export type AdjustmentListItem = {
  id: string;
  adjustmentNumber: string;
  warehouseId: string;
  warehouseName: string;
  status: number;
  adjustmentDate: string;
  itemCount: number;
};

export type AdjustmentCountEntry = {
  id: string;
  productId?: string;
  productCode?: string;
  productName?: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  zone?: string;
};

export type InventoryBarcodeResolve = {
  productId: string;
  productCode: string;
  productName: string;
  saleUnitName?: string;
  suggestedBatchId?: string;
  suggestedBatchNumber?: string;
};

export const ADJUSTMENT_STATUS = {
  Draft: 1,
  Counting: 2,
  Approved: 3,
  Cancelled: 4,
} as const;

export const ADJUSTMENT_STATUS_LABELS: Record<number, string> = {
  1: 'Chờ duyệt',
  2: 'Đang kiểm',
  3: 'Đã duyệt',
  4: 'Đã hủy',
};
