import { useCallback, useEffect, useState } from 'react';
import { App, Button, Spin, Tag, Typography } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { fetchDraftSalesOrders, fetchSalesOrder, searchCustomers } from '@/shared/api/sales.api';
import type { SalesOrderListItem } from '@/shared/api/sales.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { formatMoney } from '@/shared/utils/money';
import {
  loadDraftCartLines,
  orderDiscountFromDetail,
  persistPosDraftEdit,
} from '@/modules/sales/sales-draft-helpers';
import { usePosSession } from '@/modules/pos/pos-session.store';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';

export function DraftsPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const loadDraftIntoSession = usePosSession((s) => s.loadDraftIntoSession);
  const [items, setItems] = useState<SalesOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPos, setLoadingPos] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchDraftSalesOrders());
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được đơn nháp'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const openInPos = async (id: string) => {
    setLoadingPos(id);
    try {
      const order = await fetchSalesOrder(id);
      if (order.status !== 1) {
        message.warning('Đơn không còn ở trạng thái nháp');
        await load();
        return;
      }
      const lines = await loadDraftCartLines(order);
      let customer = null;
      if (order.customerId) {
        const hits = await searchCustomers(order.customerName ?? '');
        customer = hits.find((c) => c.id === order.customerId) ?? hits[0] ?? null;
      }
      loadDraftIntoSession({
        warehouseId: order.warehouseId ?? '',
        cart: lines,
        customer,
        orderDiscount: orderDiscountFromDetail(order),
        draftId: order.id,
        draftNumber: order.orderNumber,
      });
      persistPosDraftEdit(order.id);
      message.success(`Đã mở nháp ${order.orderNumber}`);
      navigate('/pos');
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không mở được đơn nháp'));
    } finally {
      setLoadingPos(null);
    }
  };

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Đơn nháp" backTo="/" />
      <main className="staff-body">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          Đơn tạm lưu tại quầy · mở lại để sửa hoặc thanh toán.
        </Typography.Text>
        {loading ? (
          <Spin />
        ) : items.length === 0 ? (
          <Typography.Text type="secondary">Không có đơn nháp</Typography.Text>
        ) : (
          items.map((item) => (
            <div key={item.id} className="cart-line">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <Typography.Text strong>{item.orderNumber}</Typography.Text>
                  <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    {item.customerName ?? 'Khách lẻ'} · {dayjs(item.orderDate).format('DD/MM HH:mm')}
                  </Typography.Text>
                </div>
                <Tag color="gold">Nháp</Tag>
              </div>
              <Typography.Text style={{ display: 'block', marginTop: 8 }}>
                {formatMoney(item.totalAmount)}
              </Typography.Text>
              <Button
                block
                type="primary"
                icon={<ShoppingCartOutlined />}
                style={{ marginTop: 10 }}
                loading={loadingPos === item.id}
                onClick={() => void openInPos(item.id)}
              >
                Mở trong POS
              </Button>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
