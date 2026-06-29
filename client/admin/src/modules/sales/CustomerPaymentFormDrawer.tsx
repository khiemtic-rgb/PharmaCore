import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { isAxiosError } from 'axios';
import { CustomerPaymentAmountHint } from '@/modules/sales/CustomerPaymentAmountHint';
import {
  createCustomerPayment,
  fetchCustomerPayment,
  fetchCustomerReceivablesDetail,
  updateCustomerPayment,
} from '@/shared/api/sales.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import type {
  CustomerListItem,
  CustomerPaymentListItem,
  CustomerReceivablesDetailLine,
} from '@/shared/api/sales.types';
import { SALES_PAYMENT_METHOD_LABELS } from '@/shared/api/sales.types';
import { PharmaDatePicker } from '@/shared/ui/PharmaDatePicker';
import {
  formatDisplayMoney,
  moneyInputNumberProps,
  moneyInputNumberStyle,
  parseMoneyInput,
} from '@/shared/utils/money';
import type { CustomerPaymentPrefill } from '@/modules/sales/customer-payment-nav';

const collectionMethodOptions = Object.entries(SALES_PAYMENT_METHOD_LABELS)
  .filter(([value]) => Number(value) !== 5)
  .map(([value, label]) => ({ value: Number(value), label }));

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toFormPaymentDate(value?: string): string {
  if (!value) return todayIsoDate();
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function resolveAmount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseMoneyInput(value) ?? Number.NaN;
  return Number.NaN;
}

export type CustomerPaymentFormDrawerProps = {
  open: boolean;
  editingId: string | null;
  editingRow: CustomerPaymentListItem | null;
  customers: CustomerListItem[];
  prefill?: CustomerPaymentPrefill;
  onClose: () => void;
  onSaved: (saved: CustomerPaymentListItem) => void;
};

export const CustomerPaymentFormDrawer = memo(function CustomerPaymentFormDrawer({
  open,
  editingId,
  editingRow,
  customers,
  prefill,
  onClose,
  onSaved,
}: CustomerPaymentFormDrawerProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [orderLines, setOrderLines] = useState<CustomerReceivablesDetailLine[]>([]);
  const customerId = Form.useWatch('customerId', form);
  const salesOrderId = Form.useWatch('salesOrderId', form);

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: `${c.customerCode} — ${c.fullName}`,
      })),
    [customers],
  );

  const loadOrderLines = useCallback(async (id: string) => {
    try {
      const detail = await fetchCustomerReceivablesDetail(id);
      setOrderLines(detail.lines.filter((line) => line.outstanding > 0.009));
    } catch (error) {
      setOrderLines([]);
      message.error(apiErrorMessage(error, 'Không tải được đơn còn nợ'));
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    if (prefill) {
      form.setFieldsValue({
        customerId: prefill.customerId,
        salesOrderId: prefill.salesOrderId,
        amount: prefill.amount,
        paymentMethod: 1,
        paymentDate: todayIsoDate(),
        notes: undefined,
      });
      void loadOrderLines(prefill.customerId);
      return;
    }

    if (editingRow) {
      form.setFieldsValue({
        customerId: editingRow.customerId,
        salesOrderId: editingRow.salesOrderId,
        amount: editingRow.amount,
        paymentMethod: editingRow.paymentMethod,
        paymentDate: toFormPaymentDate(editingRow.paymentDate),
        notes: editingRow.notes,
      });
      void loadOrderLines(editingRow.customerId);
      return;
    }

    form.resetFields();
    form.setFieldsValue({ paymentMethod: 1, paymentDate: todayIsoDate() });
    setOrderLines([]);
  }, [open, prefill, editingRow, form, loadOrderLines]);

  useEffect(() => {
    if (!open || !editingId || editingRow) return;
    let cancelled = false;
    void fetchCustomerPayment(editingId)
      .then((row) => {
        if (cancelled) return;
        form.setFieldsValue({
          customerId: row.customerId,
          salesOrderId: row.salesOrderId,
          amount: row.amount,
          paymentMethod: row.paymentMethod,
          paymentDate: toFormPaymentDate(row.paymentDate),
          notes: row.notes,
        });
        void loadOrderLines(row.customerId);
      })
      .catch((error) => {
        if (!cancelled) {
          message.error(apiErrorMessage(error, 'Không tải được chi tiết phiếu'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, editingId, editingRow, form, loadOrderLines]);

  useEffect(() => {
    if (!open) return;
    if (!customerId) {
      setOrderLines([]);
      return;
    }
    void loadOrderLines(String(customerId));
  }, [open, customerId, loadOrderLines]);

  const selectedOrder = useMemo(
    () => orderLines.find((line) => line.salesOrderId === salesOrderId),
    [orderLines, salesOrderId],
  );

  const orderLineOptions = useMemo(
    () =>
      orderLines.map((line) => ({
        value: line.salesOrderId,
        label: `${line.orderNumber} — nợ ${formatDisplayMoney(line.outstanding)}`,
      })),
    [orderLines],
  );

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        customerId: values.customerId as string,
        salesOrderId: values.salesOrderId as string | undefined,
        amount: resolveAmount(values.amount),
        paymentMethod: Number(values.paymentMethod),
        paymentDate: (values.paymentDate as string | undefined) || todayIsoDate(),
        notes: values.notes as string | undefined,
      };
      if (Number.isNaN(payload.amount) || payload.amount <= 0) {
        message.error('Số tiền không hợp lệ');
        return;
      }
      if (selectedOrder && payload.amount > selectedOrder.outstanding + 0.009) {
        message.error(`Số tiền thu không được vượt còn nợ ${formatDisplayMoney(selectedOrder.outstanding)}`);
        return;
      }
      if (editingId) {
        const updated = await updateCustomerPayment(editingId, payload);
        message.success(`Đã cập nhật ${updated.paymentNumber}`);
        onSaved(updated);
      } else {
        const created = await createCustomerPayment(payload);
        message.success(
          `Đã lưu ${created.paymentNumber}. Bấm Ghi sổ để trừ nợ trên đơn và ghi nhận tiền thu.`,
        );
        onSaved(created);
      }
    } catch (error) {
      if (isAxiosError(error)) {
        message.error(apiErrorMessage(error, 'Không lưu được phiếu thu nợ'));
      } else {
        message.error('Kiểm tra lại thông tin trên form');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={editingId ? 'Sửa phiếu thu nợ' : 'Ghi nhận thu nợ'}
      width={480}
      open={open}
      destroyOnClose
      onClose={onClose}
      extra={
        <Button type="primary" icon={<SaveOutlined />} onClick={() => void handleSave()} loading={saving}>
          Lưu
        </Button>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ paymentMethod: 1, paymentDate: todayIsoDate() }}>
        <Form.Item name="customerId" label="Khách hàng" rules={[{ required: true, message: 'Chọn khách hàng' }]}>
          <Select
            showSearch
            optionFilterProp="label"
            options={customerOptions}
            onChange={(id) => {
              form.setFieldsValue({ salesOrderId: undefined, amount: undefined });
              if (id) void loadOrderLines(String(id));
              else setOrderLines([]);
            }}
          />
        </Form.Item>
        <Form.Item name="salesOrderId" label="Liên kết đơn bán (tùy chọn)">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={!customerId}
            placeholder={customerId ? 'Chọn đơn còn nợ' : 'Chọn khách hàng trước'}
            options={orderLineOptions}
            onChange={(value: string | undefined) => {
              const line = orderLines.find((row) => row.salesOrderId === value);
              if (line && !form.getFieldValue('amount')) {
                form.setFieldsValue({ amount: line.outstanding });
              }
            }}
          />
        </Form.Item>
        {selectedOrder ? (
          <CustomerPaymentAmountHint
            orderNumber={selectedOrder.orderNumber}
            outstanding={selectedOrder.outstanding}
            onFillAmount={(amount) => form.setFieldsValue({ amount })}
          />
        ) : null}
        <Form.Item
          name="amount"
          label="Số tiền thu"
          rules={[
            { required: true, message: 'Nhập số tiền' },
            {
              validator: async (_, value) => {
                if (!selectedOrder) return;
                const amount = resolveAmount(value);
                if (Number.isNaN(amount) || amount <= 0) {
                  throw new Error('Số tiền không hợp lệ');
                }
                if (amount > selectedOrder.outstanding + 0.009) {
                  throw new Error(`Không vượt còn nợ ${formatDisplayMoney(selectedOrder.outstanding)}`);
                }
              },
            },
          ]}
        >
          <InputNumber
            {...moneyInputNumberProps}
            style={moneyInputNumberStyle}
            min={1}
            max={selectedOrder ? selectedOrder.outstanding : undefined}
          />
        </Form.Item>
        <Form.Item name="paymentMethod" label="Hình thức" rules={[{ required: true }]}>
          <Select options={collectionMethodOptions} />
        </Form.Item>
        <Form.Item name="paymentDate" label="Ngày thu">
          <PharmaDatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="notes" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});
