import type {
  AdjustmentDetailDto,
  AdjustmentItemDto,
  AdjustmentListItemDto,
  BranchLookupDto,
  OpeningBalanceBatchListItemDto,
  OpeningBalanceLineRequest,
  OpeningBalanceResultDto,
  PagedStockBatchesResult,
  PagedStockProductsResult,
  Req,
  StockBatchListItemDto,
  StockProductSummaryDto,
  TransferDetailDto,
  TransferItemDto,
  TransferListItemDto,
  WarehouseDto,
} from '@/shared/api/generated';

export type StockBatch = Req<
  StockBatchListItemDto,
  | 'id'
  | 'warehouseId'
  | 'warehouseCode'
  | 'warehouseName'
  | 'productId'
  | 'productCode'
  | 'productName'
  | 'batchNumber'
  | 'unitCost'
  | 'quantityAvailable'
  | 'quantityReceived'
  | 'status'
>;

export type PagedStockBatches = Omit<Req<PagedStockBatchesResult, 'total' | 'page' | 'pageSize'>, 'items'> & {
  items: StockBatch[];
};

export type StockProductSummary = Req<
  StockProductSummaryDto,
  'productId' | 'productCode' | 'productName' | 'totalQuantity' | 'warehouseCount' | 'batchCount'
>;

export type PagedStockProducts = Omit<Req<PagedStockProductsResult, 'total' | 'page' | 'pageSize'>, 'items'> & {
  items: StockProductSummary[];
};

export type Warehouse = Req<
  WarehouseDto,
  'id' | 'branchId' | 'branchName' | 'warehouseCode' | 'warehouseName' | 'warehouseType' | 'isDefault' | 'status'
>;

export type BranchLookup = Req<BranchLookupDto, 'id' | 'branchCode' | 'branchName'>;

export type OpeningBalanceLine = Req<
  OpeningBalanceLineRequest,
  'productId' | 'batchNumber' | 'unitCost' | 'quantity'
>;

export type OpeningBalanceResult = Req<OpeningBalanceResultDto, 'warehouseId' | 'linesProcessed'> & {
  batchIds: string[];
};

export type OpeningBalanceBatch = Req<
  OpeningBalanceBatchListItemDto,
  | 'batchId'
  | 'warehouseId'
  | 'warehouseName'
  | 'productId'
  | 'productCode'
  | 'productName'
  | 'batchNumber'
  | 'unitCost'
  | 'quantityAvailable'
  | 'openingQuantity'
  | 'firstOpeningDate'
  | 'canVoid'
>;

export type TransferListItem = Req<
  TransferListItemDto,
  | 'id'
  | 'transferNumber'
  | 'fromWarehouseId'
  | 'fromWarehouseName'
  | 'toWarehouseId'
  | 'toWarehouseName'
  | 'status'
  | 'transferDate'
  | 'itemCount'
>;

export type TransferItem = Req<
  TransferItemDto,
  'id' | 'batchId' | 'productId' | 'productCode' | 'productName' | 'batchNumber' | 'quantity'
>;

export type TransferDetail = Omit<
  Req<
    TransferDetailDto,
    | 'id'
    | 'transferNumber'
    | 'fromWarehouseId'
    | 'fromWarehouseName'
    | 'toWarehouseId'
    | 'toWarehouseName'
    | 'status'
    | 'transferDate'
  >,
  'items'
> & {
  items: TransferItem[];
  itemCount?: number;
};

export type AdjustmentListItem = Req<
  AdjustmentListItemDto,
  'id' | 'adjustmentNumber' | 'warehouseId' | 'warehouseName' | 'status' | 'adjustmentDate' | 'itemCount'
>;

export type AdjustmentItem = Req<
  AdjustmentItemDto,
  | 'id'
  | 'batchId'
  | 'productId'
  | 'productCode'
  | 'productName'
  | 'batchNumber'
  | 'systemQuantity'
  | 'actualQuantity'
  | 'differenceQuantity'
>;

export type AdjustmentDetail = Omit<
  Req<
    AdjustmentDetailDto,
    'id' | 'adjustmentNumber' | 'warehouseId' | 'warehouseName' | 'status' | 'adjustmentDate'
  >,
  'items'
> & {
  items: AdjustmentItem[];
  itemCount?: number;
};

export const WAREHOUSE_TYPE_LABELS: Record<number, string> = {
  1: 'Kho chính',
  2: 'Kho bán lẻ',
  3: 'Kho thuốc kê đơn',
  4: 'Kho lạnh',
  5: 'Kho trả hàng',
};

export const TRANSFER_STATUS_LABELS: Record<number, string> = {
  1: 'Nháp',
  2: 'Chờ xử lý',
  3: 'Hoàn tất',
  4: 'Đã hủy',
};

export const ADJUSTMENT_STATUS_LABELS: Record<number, string> = {
  1: 'Nháp',
  2: 'Đang kiểm',
  3: 'Đã duyệt',
  4: 'Đã hủy',
};

export const STATUS_LABELS: Record<number, string> = {
  1: 'Hoạt động',
  2: 'Ngừng',
};
