import { useEffect } from 'react';
import { App, Button, Drawer, Form, Input, Space } from 'antd';
import { createCustomer } from '@/shared/api/customer.api';
import type { CustomerListItem } from '@/shared/api/sales.types';
import { apiErrorMessage } from '@/shared/api/api-error';

type FormValues = { fullName: string; phone: string };

type Props = {
  open: boolean;
  initialPhone?: string;
  initialName?: string;
  onClose: () => void;
  onCreated: (customer: CustomerListItem) => void;
};

function guessPhoneOrName(query: string): { phone?: string; name?: string } {
  const trimmed = query.trim();
  if (!trimmed) return {};
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 9 && digits.length === trimmed.replace(/[\s+\-().]/g, '').length) {
    return { phone: trimmed };
  }
  return { name: trimmed };
}

export function QuickCreateCustomerSheet({
  open,
  initialPhone,
  initialName,
  onClose,
  onCreated,
}: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      fullName: initialName ?? '',
      phone: initialPhone ?? '',
    });
  }, [form, initialName, initialPhone, open]);

  const submit = async () => {
    try {
      const values = await form.validateFields();
      const created = await createCustomer({
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
      });
      onCreated({
        id: created.id,
        customerCode: created.customerCode,
        fullName: created.fullName,
        phone: created.phone,
        allowCredit: created.allowCredit,
      });
      message.success(`Đã thêm ${created.fullName}`);
      form.resetFields();
      onClose();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      message.error(apiErrorMessage(error, 'Không tạo được khách'));
    }
  };

  return (
    <Drawer
      title="Thêm khách mới"
      open={open}
      onClose={onClose}
      height="55%"
      placement="bottom"
      destroyOnClose
      footer={
        <Space style={{ width: '100%' }}>
          <Button block onClick={onClose}>
            Hủy
          </Button>
          <Button block type="primary" onClick={() => void submit()}>
            Lưu & chọn
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="fullName"
          label="Họ tên"
          rules={[{ required: true, message: 'Nhập họ tên' }]}
        >
          <Input placeholder="Nguyễn Văn A" autoFocus />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Số điện thoại"
          rules={[{ required: true, message: 'Nhập SĐT' }]}
        >
          <Input placeholder="09xxxxxxxx" inputMode="tel" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

export { guessPhoneOrName };
