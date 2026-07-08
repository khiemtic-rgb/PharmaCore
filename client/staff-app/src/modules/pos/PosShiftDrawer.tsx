import { Button, Drawer, Typography } from 'antd';
import { BarChartOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { SalesShiftDetail } from '@/shared/api/sales.types';
import { formatMoney } from '@/shared/utils/money';

type Props = {
  open: boolean;
  shift: SalesShiftDetail | null;
  warehouseLabel?: string;
  onClose: () => void;
  onOpenShift: () => void;
  onCloseShift: () => void;
  onViewToday: () => void;
};

export function PosShiftDrawer({
  open,
  shift,
  warehouseLabel,
  onClose,
  onOpenShift,
  onCloseShift,
  onViewToday,
}: Props) {
  return (
    <Drawer
      title="Ca làm việc"
      placement="bottom"
      open={open}
      onClose={onClose}
      height="auto"
      styles={{ body: { paddingBottom: 24 } }}
    >
      {shift ? (
        <>
          <Typography.Text strong style={{ fontSize: 16 }}>
            Ca {shift.shiftNumber}
          </Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
            {warehouseLabel ?? '—'}
            {shift.openedAt ? ` · mở lúc ${dayjs(shift.openedAt).format('HH:mm')}` : ''}
          </Typography.Paragraph>
          {shift.summary ? (
            <div className="pos-shift-stats">
              <div>
                <Typography.Text type="secondary">Doanh thu ca</Typography.Text>
                <div className="pos-shift-stat-value">{formatMoney(shift.summary.netTotal)}</div>
              </div>
              <div>
                <Typography.Text type="secondary">Tiền mặt dự kiến</Typography.Text>
                <div className="pos-shift-stat-value">{formatMoney(shift.summary.expectedCash)}</div>
              </div>
            </div>
          ) : null}
          <Button block icon={<BarChartOutlined />} style={{ marginTop: 16 }} onClick={onViewToday}>
            Xem chi tiết hôm nay
          </Button>
          <Button
            block
            danger
            icon={<LockOutlined />}
            style={{ marginTop: 8 }}
            onClick={onCloseShift}
          >
            Đóng ca
          </Button>
        </>
      ) : (
        <>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            Chưa mở ca bán hàng. Ca mới cần mở ca trước khi thanh toán.
          </Typography.Paragraph>
          <Button block type="primary" size="large" icon={<UnlockOutlined />} onClick={onOpenShift}>
            Mở ca bán hàng
          </Button>
        </>
      )}
    </Drawer>
  );
}
