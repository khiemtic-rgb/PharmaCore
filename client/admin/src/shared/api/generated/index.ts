/**
 * Re-export types sinh từ OpenAPI — dùng dần thay cho khai báo tay trong sales.types.ts.
 * Regenerate: npm run openapi:sync
 */
import type { components } from './api-schema';

export type ApiSchemas = components['schemas'];

export type CompleteDraftSaleRequest = ApiSchemas['CompleteDraftSaleRequest'];
export type CreateSaleLineRequest = ApiSchemas['CreateSaleLineRequest'];
export type CreateSalePaymentRequest = ApiSchemas['CreateSalePaymentRequest'];
export type CreateSaleRequest = ApiSchemas['CreateSaleRequest'];
export type UpdateDraftSaleRequest = ApiSchemas['UpdateDraftSaleRequest'];
export type TenantBatchModeSettingsDto = ApiSchemas['TenantBatchModeSettingsDto'];
