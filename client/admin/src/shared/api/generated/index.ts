/**
 * Re-export types sinh từ OpenAPI — dùng dần thay cho khai báo tay trong *.types.ts.
 * Regenerate: npm run openapi:sync
 */
import type { components } from './api-schema';

export type { Req } from './dto-helpers';

export type ApiSchemas = components['schemas'];

export type CompleteDraftSaleRequest = ApiSchemas['CompleteDraftSaleRequest'];
export type CreateSaleLineRequest = ApiSchemas['CreateSaleLineRequest'];
export type CreateSalePaymentRequest = ApiSchemas['CreateSalePaymentRequest'];
export type CreateSaleRequest = ApiSchemas['CreateSaleRequest'];
export type UpdateDraftSaleRequest = ApiSchemas['UpdateDraftSaleRequest'];
export type TenantBatchModeSettingsDto = ApiSchemas['TenantBatchModeSettingsDto'];
export type CustomerConsentDto = ApiSchemas['CustomerConsentDto'];
export type CustomerListItemDto = ApiSchemas['CustomerListItemDto'];
export type PosAllocationPreviewDto = ApiSchemas['PosAllocationPreviewDto'];
export type PosAllocationPreviewLineDto = ApiSchemas['PosAllocationPreviewLineDto'];
export type PosBatchAllocationPreviewDto = ApiSchemas['PosBatchAllocationPreviewDto'];
export type PosBatchHintDto = ApiSchemas['PosBatchHintDto'];
export type PosProductLookupDto = ApiSchemas['PosProductLookupDto'];
export type PosProductSearchItemDto = ApiSchemas['PosProductSearchItemDto'];
export type TenantReceiptSettingsDto = ApiSchemas['TenantReceiptSettingsDto'];
export type SalesOrderDetailDto = ApiSchemas['SalesOrderDetailDto'];
export type SalesOrderItemDto = ApiSchemas['SalesOrderItemDto'];
export type SalesOrderListItemDto = ApiSchemas['SalesOrderListItemDto'];
export type SalesPaymentDto = ApiSchemas['SalesPaymentDto'];
export type SalesRefundPaymentSummaryDto = ApiSchemas['SalesRefundPaymentSummaryDto'];
export type SalesReturnDetailDto = ApiSchemas['SalesReturnDetailDto'];
export type SalesReturnItemDto = ApiSchemas['SalesReturnItemDto'];
export type SalesReturnListItemDto = ApiSchemas['SalesReturnListItemDto'];
export type SalesShiftDetailDto = ApiSchemas['SalesShiftDetailDto'];
export type SalesShiftListItemDto = ApiSchemas['SalesShiftListItemDto'];
export type SalesShiftPaymentSummaryDto = ApiSchemas['SalesShiftPaymentSummaryDto'];
export type SalesShiftSummaryDto = ApiSchemas['SalesShiftSummaryDto'];
export type ShiftLotComplianceAlertDto = ApiSchemas['ShiftLotComplianceAlertDto'];
