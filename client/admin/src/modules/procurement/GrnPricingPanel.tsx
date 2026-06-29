import { Form, InputNumber, Select, Space, Typography } from 'antd';
import type { FormInstance } from 'antd';
import type { ProcurementVatTreatment } from '@/shared/api/procurement.types';
import {
  computeGrnPricing,
  PROCUREMENT_DISCOUNT_TYPES,
  type GrnLinePricingLike,
  type ProcurementDiscountType,
} from '@/modules/procurement/grn-pricing';
import { GrnTaxSummaryContent, PROCUREMENT_MONEY_COL_WIDTH } from '@/modules/procurement/GrnPoTaxSummary';
import { formatVatTreatmentOptionLabel } from '@/modules/procurement/po-vat';
import { formatDisplayMoney } from '@/shared/utils/money';

interface GrnLineLike extends GrnLinePricingLike {}

export function GrnPricingControls({
  vatTreatments,
}: {
  vatTreatments: ProcurementVatTreatment[];
}) {
  const orderDiscountType = Form.useWatch('orderDiscountType') as ProcurementDiscountType | undefined;

  return (
    <Space wrap size={8} style={{ marginTop: 6, width: '100%' }}>
      <Form.Item
        name="vatTreatmentId"
        label="Thuế GTGT"
        rules={[{ required: true, message: 'Chọn thuế' }]}
        style={{ marginBottom: 0, minWidth: 180 }}
      >
        <Select
          style={{ width: 180 }}
          options={vatTreatments.map((t) => ({
            value: t.id,
            label: formatVatTreatmentOptionLabel(t),
          }))}
        />
      </Form.Item>
      <Form.Item name="orderDiscountType" label="CK đơn" style={{ marginBottom: 0, width: 88 }}>
        <Select
          allowClear
          placeholder="Loại"
          options={[
            { value: PROCUREMENT_DISCOUNT_TYPES.Percent, label: '%' },
            { value: PROCUREMENT_DISCOUNT_TYPES.Fixed, label: 'Tiền' },
          ]}
        />
      </Form.Item>
      <Form.Item name="orderDiscountValue" label="Giá trị" style={{ marginBottom: 0, width: 100 }}>
        <InputNumber
          min={0}
          disabled={!orderDiscountType}
          style={{ width: '100%' }}
          placeholder={orderDiscountType === PROCUREMENT_DISCOUNT_TYPES.Percent ? '%' : 'đ'}
        />
      </Form.Item>
    </Space>
  );
}

export function GrnLineDiscountFields({ fieldName }: { fieldName: number }) {
  const discountType = Form.useWatch(['items', fieldName, 'discountType']) as ProcurementDiscountType | undefined;

  return (
    <Space size={4}>
      <Form.Item name={[fieldName, 'discountType']} style={{ marginBottom: 0, width: 68 }}>
        <Select
          allowClear
          placeholder="CK"
          size="small"
          options={[
            { value: PROCUREMENT_DISCOUNT_TYPES.Percent, label: '%' },
            { value: PROCUREMENT_DISCOUNT_TYPES.Fixed, label: 'đ' },
          ]}
        />
      </Form.Item>
      <Form.Item name={[fieldName, 'discountValue']} style={{ marginBottom: 0, width: 76 }}>
        <InputNumber
          min={0}
          size="small"
          disabled={!discountType}
          style={{ width: '100%' }}
          placeholder="0"
        />
      </Form.Item>
    </Space>
  );
}

export function GrnPricingSummaryPanel({
  form,
  vatTreatments,
}: {
  form: FormInstance;
  vatTreatments: ProcurementVatTreatment[];
}) {
  const items = Form.useWatch('items', form) as GrnLineLike[] | undefined;
  const vatTreatmentId = Form.useWatch('vatTreatmentId', form) as string | undefined;
  const orderDiscountType = Form.useWatch('orderDiscountType', form) as ProcurementDiscountType | undefined;
  const orderDiscountValue = Form.useWatch('orderDiscountValue', form) as number | undefined;
  const vatTreatment = vatTreatments.find((t) => t.id === vatTreatmentId) ?? null;
  const pricing = computeGrnPricing(
    items,
    { discountType: orderDiscountType, discountValue: orderDiscountValue },
    vatTreatment,
  );

  return (
    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ minWidth: 280 }}>
        {pricing.lineDiscountTotal > 0 || pricing.orderDiscountAmount > 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'right' }}>
            {pricing.lineDiscountTotal > 0 ? `CK dòng: −${formatDisplayMoney(pricing.lineDiscountTotal)}` : ''}
            {pricing.lineDiscountTotal > 0 && pricing.orderDiscountAmount > 0 ? ' · ' : ''}
            {pricing.orderDiscountAmount > 0 ? `CK đơn: −${formatDisplayMoney(pricing.orderDiscountAmount)}` : ''}
          </Typography.Text>
        ) : null}
        <GrnTaxSummaryContent
          subtotal={pricing.merchandiseNet}
          taxAmount={pricing.taxAmount}
          totalAmount={pricing.totalAmount}
          subtotalLabel="Tiền hàng (sau CK dòng)"
          moneyColumnWidth={PROCUREMENT_MONEY_COL_WIDTH}
        />
      </div>
    </div>
  );
}
