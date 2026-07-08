import { useCallback, useEffect, useState } from 'react';
import { App, Button, Space, Spin, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import { completeGoodsReceipt, cancelGoodsReceipt, fetchGoodsReceipt } from '@/shared/api/procurement.api';
import { GRN_STATUS_LABELS, GRN_STATUS_TAG } from '@/shared/api/procurement.types';
import type { GoodsReceiptDetail } from '@/shared/api/procurement.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { formatMoney } from '@/shared/utils/money';
import { useCanProcurementWrite } from '@/shared/auth/usePermission';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';

const PENDING_STATUS = 1;

export function GoodsReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const canWrite = useCanProcurementWrite();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<GoodsReceiptDetail | null>(null);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setDetail(await fetchGoodsReceipt(id));
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được chi tiết phiếu nhập'));
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    void load();
  }, [load]);

  const complete = async () => {
    if (!id) return;
    setCompleting(true);
    try {
      await completeGoodsReceipt(id);
      message.success('Đã hoàn tất nhập kho');
      await load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không hoàn tất được phiếu nhập'));
    } finally {
      setCompleting(false);
    }
  };

  const cancel = async () => {
    if (!id) return;
    setCancelling(true);
    try {
      await cancelGoodsReceipt(id);
      message.success('Đã hủy phiếu nhập');
      await load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không hủy được phiếu nhập'));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="staff-shell">
        <StaffPageHeader title="Phiếu nhập" backTo="/goods-receipt" />
        <main className="staff-body">
          <Spin />
        </main>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="staff-shell">
        <StaffPageHeader title="Phiếu nhập" backTo="/goods-receipt" />
        <main className="staff-body">
          <Typography.Text type="secondary">Không tìm thấy phiếu nhập</Typography.Text>
        </main>
      </div>
    );
  }

  return (
    <div className="staff-shell">
      <StaffPageHeader title={detail.grnNumber} backTo="/goods-receipt" />
      <main className="staff-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <Typography.Text strong>{detail.supplierName}</Typography.Text>
          <Tag color={GRN_STATUS_TAG[detail.status] ?? 'default'}>
            {GRN_STATUS_LABELS[detail.status] ?? detail.status}
          </Tag>
        </div>
        <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 12 }}>
          {detail.warehouseName} · {dayjs(detail.receiptDate).format('DD/MM/YYYY')}
          {detail.poNumber ? ` · PO ${detail.poNumber}` : ''}
        </Typography.Text>
        {detail.notes ? (
          <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
            Ghi chú: {detail.notes}
          </Typography.Paragraph>
        ) : null}

        {detail.items.map((line) => (
          <div key={line.id} className="cart-line" style={{ marginBottom: 8 }}>
            <Typography.Text strong>
              {line.productCode} · {line.productName}
            </Typography.Text>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {line.quantity} {line.unitName} · Lô {line.batchNumber}
              {line.expiryDate ? ` · HSD ${dayjs(line.expiryDate).format('DD/MM/YYYY')}` : ''}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Giá nhập {formatMoney(line.unitCost)} · {formatMoney(line.lineTotal)}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
          <Typography.Text strong>Tổng: {formatMoney(detail.totalAmount)}</Typography.Text>
        </div>

        {canWrite && detail.status === PENDING_STATUS ? (
          <Space direction="vertical" style={{ width: '100%', marginTop: 16 }} size={12}>
            <Button type="primary" block size="large" loading={completing} onClick={() => void complete()}>
              Hoàn tất nhập kho
            </Button>
            <Button block size="large" danger loading={cancelling} onClick={() => void cancel()}>
              Hủy phiếu nhập
            </Button>
          </Space>
        ) : null}
        {detail.status === 2 ? (
          <Button block size="large" style={{ marginTop: 12 }} onClick={() => navigate('/goods-receipt')}>
            Quay lại danh sách
          </Button>
        ) : null}
      </main>
    </div>
  );
}
