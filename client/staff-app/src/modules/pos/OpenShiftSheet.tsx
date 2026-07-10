import { useState } from 'react';
import { App, InputNumber, Modal } from 'antd';
import { openSalesShift } from '@/shared/api/sales.api';
import { apiErrorMessage } from '@/shared/api/api-error';

type Props = {
  open: boolean;
  warehouseId: string;
  onClose: () => void;
  onOpened: () => void;
};

export function OpenShiftSheet({ open, warehouseId, onClose, onOpened }: Props) {
  const { message } = App.useApp();
  const [cash, setCash] = useState(0);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await openSalesShift({ warehouseId, openingCash: cash });
      message.success('Đã mở ca bán hàng');
      onOpened();
      onClose();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không mở được ca'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Mở ca bán hàng"
      okText="Mở ca"
      cancelText="Hủy"
      confirmLoading={loading}
      onOk={submit}
      onCancel={onClose}
      destroyOnClose
    >
      <div style={{ marginBottom: 8 }}>Tiền mặt đầu ca</div>
      <InputNumber
        style={{ width: '100%' }}
        min={0}
        value={cash}
        onChange={(v) => setCash(Number(v ?? 0))}
        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
        parser={(v) => Number((v ?? '').replace(/\./g, ''))}
        addonAfter="đ"
      />
    </Modal>
  );
}
