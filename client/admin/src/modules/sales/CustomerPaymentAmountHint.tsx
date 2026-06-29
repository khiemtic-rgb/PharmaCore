import { Alert, Button, Space } from 'antd';
import { formatDisplayMoney } from '@/shared/utils/money';

interface CustomerPaymentAmountHintProps {
  orderNumber?: string;
  outstanding?: number;
  onFillAmount: (amount: number) => void;
}

export function CustomerPaymentAmountHint({
  orderNumber,
  outstanding,
  onFillAmount,
}: CustomerPaymentAmountHintProps) {
  if (outstanding == null || outstanding <= 0.009) {
    return (
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Đơn bán đã hết nợ — không thể ghi nhận thu trên đơn này."
      />
    );
  }

  return (
    <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
      <Alert
        type="info"
        showIcon
        message={
          orderNumber
            ? `Còn nợ đơn ${orderNumber}: ${formatDisplayMoney(outstanding)}`
            : `Còn nợ: ${formatDisplayMoney(outstanding)}`
        }
        description="Số tiền thu không được vượt còn nợ của đơn. Nợ trên đơn chỉ giảm sau khi Ghi sổ phiếu thu."
      />
      <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onFillAmount(outstanding)}>
        Điền đủ còn nợ
      </Button>
    </Space>
  );
}
