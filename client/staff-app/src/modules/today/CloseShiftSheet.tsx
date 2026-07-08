import { useState } from 'react';
import { App, Form, Input, InputNumber, Modal, Typography } from 'antd';
import type { SalesShiftDetail } from '@/shared/api/sales.types';
import { closeSalesShift } from '@/shared/api/sales.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import { formatMoney } from '@/shared/utils/money';

type Props = {
  open: boolean;
  shift: SalesShiftDetail | null;
  onClose: () => void;
  onClosed: () => void;
};

export function CloseShiftSheet({ open, shift, onClose, onClosed }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ closingCash: number; closeNotes?: string }>();
  const [loading, setLoading] = useState(false);

  const expectedCash = shift?.summary?.expectedCash ?? 0;

  const submit = async () => {
    if (!shift) return;
    try {
      const values = await form.validateFields();
      setLoading(true);
      await closeSalesShift(shift.id, {
        closingCash: Number(values.closingCash),
        closeNotes: values.closeNotes?.trim() || undefined,
      });
      message.success(`Đã đóng ca ${shift.shiftNumber}`);
      form.resetFields();
      onClosed();
      onClose();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      message.error(apiErrorMessage(error, 'Không đóng được ca'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={shift ? `Đóng ca ${shift.shiftNumber}` : 'Đóng ca'}
      okText="Đóng ca"
      okButtonProps={{ danger: true, loading }}
      cancelText="Hủy"
      onCancel={onClose}
      onOk={() => void submit()}
      destroyOnClose
      afterOpenChange={(visible) => {
        if (visible && shift) {
          form.setFieldsValue({ closingCash: expectedCash, closeNotes: '' });
        }
      }}
    >
      {shift?.summary ? (
        <>
          <Typography.Paragraph type="secondary">
            Tiền mặt dự kiến trong két: <strong>{formatMoney(expectedCash)}</strong>
          </Typography.Paragraph>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
            Doanh thu ca: {formatMoney(shift.summary.netTotal)}
          </Typography.Text>
        </>
      ) : null}
      <Form form={form} layout="vertical">
        <Form.Item
          name="closingCash"
          label="Tiền mặt đếm thực tế"
          rules={[{ required: true, message: 'Nhập số tiền' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={(v) => Number(String(v ?? '').replace(/\./g, '')) as 0}
          />
        </Form.Item>
        <Form.Item name="closeNotes" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Chênh lệch, giải trình..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
