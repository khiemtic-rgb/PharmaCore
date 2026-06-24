import type {
  ApiSchemas,
  PosAllocationPreviewDto,
  PosAllocationPreviewLineDto,
  PosBatchAllocationPreviewDto,
  PosBatchHintDto,
  PosProductLookupDto,
  PosProductSearchItemDto,
  Req,
  SalesOrderDetailDto,
  SalesOrderItemDto,
  SalesOrderListItemDto,
  SalesPaymentDto,
  SalesReturnDetailDto,
  SalesReturnItemDto,
  SalesReturnListItemDto,
  SalesShiftDetailDto,
  SalesShiftListItemDto,
  SalesShiftPaymentSummaryDto,
  SalesShiftSummaryDto,
  ShiftLotComplianceAlertDto,
  TenantReceiptSettingsDto,
} from '@/shared/api/generated';

type S = ApiSchemas;

export type CustomerListItem = Req<S['CustomerListItemDto'], 'id' | 'customerCode' | 'fullName' | 'phone'>;

export type PosBatchHint = Req<PosBatchHintDto, 'batchId' | 'batchNumber' | 'quantityAvailable' | 'isSuggested'>;

export type PosProductLookup = Omit<
  Req<
    PosProductLookupDto,
    | 'productId'
    | 'productCode'
    | 'productName'
    | 'productUnitId'
    | 'unitName'
    | 'conversionFactor'
    | 'unitPrice'
    | 'stockAvailable'
  >,
  'batchHints'
> & {
  batchHints?: PosBatchHint[];
};

export type PosProductSearchItem = Req<
  PosProductSearchItemDto,
  'productCode' | 'productName' | 'lookupCode' | 'unitName' | 'unitPrice' | 'stockAvailable'
>;

export type ReceiptStoreSettings = Req<TenantReceiptSettingsDto, 'name'>;

export type PosBatchAllocationPreview = Req<
  PosBatchAllocationPreviewDto,
  'batchId' | 'batchNumber' | 'quantity' | 'bookQuantityAvailable'
>;

export type PosAllocationPreviewLine = Omit<
  Req<
    PosAllocationPreviewLineDto,
    'productId' | 'productCode' | 'productName' | 'productUnitId' | 'unitName' | 'requestedQuantity'
  >,
  'allocations'
> & {
  allocations: PosBatchAllocationPreview[];
};

export type PosAllocationPreview = Omit<Req<PosAllocationPreviewDto, 'stockSourceLabel'>, 'lines'> & {
  lines: PosAllocationPreviewLine[];
};

export type SalesOrderListItem = Req<
  SalesOrderListItemDto,
  | 'id'
  | 'orderNumber'
  | 'warehouseId'
  | 'warehouseName'
  | 'status'
  | 'orderDate'
  | 'totalAmount'
  | 'itemCount'
>;

export type SalesPaymentLine = Req<SalesPaymentDto, 'paymentMethod' | 'amount'>;

export type SalesOrderItem = Req<
  SalesOrderItemDto,
  | 'id'
  | 'productId'
  | 'productCode'
  | 'productName'
  | 'productUnitId'
  | 'unitName'
  | 'quantity'
  | 'unitPrice'
  | 'lineTotal'
>;

export type SalesReturnItem = Req<
  SalesReturnItemDto,
  'id' | 'salesOrderItemId' | 'productCode' | 'productName' | 'batchNumber' | 'quantity' | 'refundAmount'
>;

export type SalesReturnListItem = Req<
  SalesReturnListItemDto,
  'id' | 'returnNumber' | 'salesOrderId' | 'orderNumber' | 'returnDate' | 'status' | 'totalRefund'
>;

export type SalesReturnDetail = Omit<
  Req<
    SalesReturnDetailDto,
    'id' | 'returnNumber' | 'salesOrderId' | 'orderNumber' | 'returnDate' | 'status' | 'totalRefund'
  >,
  'items' | 'payments'
> & {
  items: SalesReturnItem[];
  payments?: SalesPaymentLine[];
};

export type ShiftLotComplianceAlert = Req<
  ShiftLotComplianceAlertDto,
  | 'productId'
  | 'productCode'
  | 'productName'
  | 'soldBatchNumber'
  | 'earlierBatchNumber'
  | 'earlierBookQuantity'
  | 'stockSourceLabel'
>;

export type SalesShiftPaymentSummary = Req<
  SalesShiftPaymentSummaryDto,
  'paymentMethod' | 'salesAmount' | 'refundAmount' | 'netAmount'
>;

export type SalesShiftSummary = Omit<
  Req<SalesShiftSummaryDto, 'from' | 'to' | 'totalSales' | 'totalRefunds' | 'netTotal'>,
  'byMethod'
> & {
  byMethod: SalesShiftPaymentSummary[];
};

export type SalesShiftListItem = Req<
  SalesShiftListItemDto,
  'id' | 'shiftNumber' | 'warehouseId' | 'warehouseName' | 'openedByUserName' | 'openedAt' | 'openingCash' | 'status'
>;

export type SalesShiftDetail = Omit<
  Req<
    SalesShiftDetailDto,
    | 'id'
    | 'shiftNumber'
    | 'warehouseId'
    | 'warehouseName'
    | 'openedByUserName'
    | 'openedAt'
    | 'openingCash'
    | 'status'
  >,
  'summary' | 'lotAlerts'
> & {
  summary: SalesShiftSummary;
  lotAlerts?: ShiftLotComplianceAlert[];
};

export const SALES_SHIFT_STATUSES = {
  Open: 1,
  Closed: 2,
} as const;

export type SalesOrderDetail = Omit<
  Req<
    SalesOrderDetailDto,
    | 'id'
    | 'orderNumber'
    | 'warehouseId'
    | 'warehouseName'
    | 'status'
    | 'orderDate'
    | 'subtotal'
    | 'discountAmount'
    | 'totalAmount'
  >,
  'items' | 'payments' | 'refundPayments'
> & {
  items: SalesOrderItem[];
  payments?: SalesPaymentLine[];
  refundPayments?: Pick<SalesPaymentLine, 'paymentMethod' | 'amount'>[];
};

export const SALES_DISCOUNT_TYPES = {
  Percent: 1,
  Fixed: 2,
} as const;

export type SalesDiscountType = (typeof SALES_DISCOUNT_TYPES)[keyof typeof SALES_DISCOUNT_TYPES];

export const SALES_PAYMENT_METHOD_LABELS: Record<number, string> = {
  1: 'Tiền mặt',
  2: 'Thẻ',
  3: 'Chuyển khoản',
  4: 'Ví điện tử',
};

export interface PosCheckoutPaymentLine {
  paymentMethod: number;
  amount: number;
}

export interface CartLine {
  key: string;
  productId: string;
  productCode: string;
  productName: string;
  productUnitId: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  stockAvailable?: number;
  batchHints?: PosBatchHint[];
  /** Số lô nhân viên xác nhận (label_optional / label_required) */
  batchLabel?: string;
  stockSourceLabel?: string;
  discountType?: SalesDiscountType;
  discountValue?: number;
  /** Cảnh báo tồn kho hiển thị ngay tại ô SL */
  qtyWarning?: string;
}

export const SALES_RETURN_STATUS_LABELS: Record<number, string> = {
  2: 'Hoàn tất',
};
