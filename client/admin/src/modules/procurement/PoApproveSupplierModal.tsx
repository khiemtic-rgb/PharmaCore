import { useEffect, useState } from 'react';
import { Form, Modal, Select } from 'antd';
import type { Supplier } from '@/shared/api/procurement.types';
import { isPlaceholderSupplier, realSuppliers } from '@/modules/procurement/grn-pricing';

export function PoApproveSupplierModal({
  open,
  poNumber,
  suppliers,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  poNumber: string;
  suppliers: Supplier[];
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (supplierId: string) => void;
}) {
  const [form] = Form.useForm<{ supplierId: string }>();
  const [submitting, setSubmitting] = useState(false);
  const options = realSuppliers(suppliers);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    const first = options[0];
    if (first) form.setFieldsValue({ supplierId: first.id });
  }, [open, form, options]);

  return (
    <Modal
      title={`Duyệt ${poNumber}`}
      open={open}
      okText="Duyệt PO"
      cancelText="Hủy"
      confirmLoading={loading || submitting}
      onCancel={onCancel}
      onOk={() => {
        void form.validateFields().then(async (values) => {
          const picked = suppliers.find((s) => s.id === values.supplierId);
          if (!picked || isPlaceholderSupplier(picked)) return;
          setSubmitting(true);
          try {
            onConfirm(values.supplierId);
          } finally {
            setSubmitting(false);
          }
        });
      }}
    >
      <p style={{ marginTop: 0 }}>
        PO đang dùng NCC <strong>Chưa xác định</strong>. Chọn NCC thật trước khi duyệt.
      </p>
      <Form form={form} layout="vertical">
        <Form.Item
          name="supplierId"
          label="Nhà cung cấp"
          rules={[{ required: true, message: 'Chọn NCC' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={options.map((s) => ({
              value: s.id,
              label: `${s.supplierCode} — ${s.supplierName}`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
