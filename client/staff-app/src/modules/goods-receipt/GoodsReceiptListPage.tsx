import { useCallback, useEffect, useState } from 'react';
import { App, Button, Spin, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { completeGoodsReceipt, cancelGoodsReceipt, fetchGoodsReceipts } from '@/shared/api/procurement.api';
import { GRN_STATUS_LABELS, GRN_STATUS_TAG } from '@/shared/api/procurement.types';
import type { GoodsReceiptListItem } from '@/shared/api/procurement.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { formatMoney } from '@/shared/utils/money';
import { useCanProcurementWrite } from '@/shared/auth/usePermission';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';

const PENDING_STATUS = 1;

export function GoodsReceiptListPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const canWrite = useCanProcurementWrite();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<GoodsReceiptListItem[]>([]);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchGoodsReceipts({ page: 1, pageSize: 40 });
      setItems(result.items);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được phiếu nhập'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const completeReceipt = async (id: string) => {
    setCompletingId(id);
    try {
      await completeGoodsReceipt(id);
      message.success('Đã hoàn tất nhập kho');
      await load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không hoàn tất được phiếu nhập'));
    } finally {
      setCompletingId(null);
    }
  };

  const cancelReceipt = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelGoodsReceipt(id);
      message.success('Đã hủy phiếu nhập');
      await load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không hủy được phiếu nhập'));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Nhập hàng" backTo="/" />
      <main className="staff-body">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
          Tạo phiếu nhập · nhập lô/HSD · chốt tồn kho trên điện thoại.
        </Typography.Text>

        {canWrite ? (
          <Button
            type="primary"
            block
            size="large"
            icon={<PlusOutlined />}
            style={{ marginBottom: 16 }}
            onClick={() => navigate('/goods-receipt/new')}
          >
            Nhập hàng mới
          </Button>
        ) : null}

        {loading ? (
          <Spin />
        ) : items.length === 0 ? (
          <Typography.Text type="secondary">Chưa có phiếu nhập</Typography.Text>
        ) : (
          items.map((item) => (
            <div key={item.id} className="cart-line" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <Typography.Text strong>{item.grnNumber}</Typography.Text>
                <Tag color={GRN_STATUS_TAG[item.status] ?? 'default'}>
                  {GRN_STATUS_LABELS[item.status] ?? item.status}
                </Tag>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                {item.supplierName} · {item.warehouseName}
                {item.poNumber ? ` · PO ${item.poNumber}` : ''}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {dayjs(item.receiptDate).format('DD/MM/YYYY')} · {item.itemCount} dòng
                {item.totalAmount ? ` · ${formatMoney(item.totalAmount)}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Button size="small" onClick={() => navigate(`/goods-receipt/${item.id}`)}>
                  Chi tiết
                </Button>
                {canWrite && item.status === PENDING_STATUS ? (
                  <>
                    <Button
                      size="small"
                      type="primary"
                      loading={completingId === item.id}
                      onClick={() => void completeReceipt(item.id)}
                    >
                      Hoàn tất nhập
                    </Button>
                    <Button
                      size="small"
                      danger
                      loading={cancellingId === item.id}
                      onClick={() => void cancelReceipt(item.id)}
                    >
                      Hủy
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
