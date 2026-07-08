import { useCallback, useEffect, useState } from 'react';
import { App, Button, Spin, Tag, Typography } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  CUSTOMER_DRAFT_ORDER_STATUS,
  CUSTOMER_DRAFT_ORDER_STATUS_COLORS,
  CUSTOMER_DRAFT_ORDER_STATUS_LABELS,
  fetchCustomerDraftOrders,
  loadCustomerDraftOrderForPos,
} from '@/shared/api/customer-draft-orders.api';
import { fetchCustomerById } from '@/shared/api/customer.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import { formatMoney } from '@/shared/utils/money';
import {
  isActionableCustomerDraftStatus,
  loadCustomerDraftCartLines,
  orderDiscountFromCustomerDraft,
} from '@/modules/sales/customer-draft-order-helpers';
import { usePosSession } from '@/modules/pos/pos-session.store';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';

const ACTIVE_STATUSES = [
  CUSTOMER_DRAFT_ORDER_STATUS.Sent,
  CUSTOMER_DRAFT_ORDER_STATUS.Confirmed,
];

export function CustomerDraftOrdersPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { setWarehouseId, replaceCart, setCustomer, setOrderDiscount, setLoadedCustomerDraft } =
    usePosSession();
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchCustomerDraftOrders>>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPos, setLoadingPos] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchCustomerDraftOrders(ACTIVE_STATUSES);
      setItems(rows.filter((row) => isActionableCustomerDraftStatus(row.status)));
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được đơn nháp khách'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendToPos = async (id: string) => {
    setLoadingPos(id);
    try {
      const payload = await loadCustomerDraftOrderForPos(id);
      const lines = await loadCustomerDraftCartLines(payload);
      setWarehouseId(payload.warehouseId);
      replaceCart(lines);
      setOrderDiscount(orderDiscountFromCustomerDraft(payload));
      const customer = await fetchCustomerById(payload.customerId);
      setCustomer({
        id: customer.id,
        customerCode: customer.customerCode,
        fullName: customer.fullName,
        phone: customer.phone,
        allowCredit: customer.allowCredit,
      });
      setLoadedCustomerDraft(payload.draftOrderId, payload.draftNumber);
      message.success(`Đã nạp đơn nháp ${payload.draftNumber} vào POS`);
      navigate('/pos');
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không đưa được vào POS'));
    } finally {
      setLoadingPos(null);
    }
  };

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Đơn nháp app khách" backTo="/" />
      <main className="staff-body">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          Đơn dược sĩ gửi qua app khách · khách xác nhận → đưa vào POS bán.
        </Typography.Text>
        {loading ? (
          <Spin />
        ) : items.length === 0 ? (
          <Typography.Text type="secondary">Không có đơn nháp đang chờ</Typography.Text>
        ) : (
          items.map((item) => (
            <div key={item.id} className="cart-line">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <Typography.Text strong>{item.draftNumber}</Typography.Text>
                <Tag color={CUSTOMER_DRAFT_ORDER_STATUS_COLORS[item.status] ?? 'default'}>
                  {CUSTOMER_DRAFT_ORDER_STATUS_LABELS[item.status] ?? item.status}
                </Tag>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                {item.customerName}
                {item.customerPhone ? ` · ${item.customerPhone}` : ''} · {item.itemCount} SP ·{' '}
                {formatMoney(item.totalAmount)}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {item.confirmedAt
                  ? `Xác nhận ${dayjs(item.confirmedAt).format('DD/MM HH:mm')}`
                  : item.sentAt
                    ? `Gửi ${dayjs(item.sentAt).format('DD/MM HH:mm')}`
                    : ''}
              </div>
              <div style={{ marginTop: 10 }}>
                <Button
                  size="small"
                  type="primary"
                  icon={<ShoppingCartOutlined />}
                  loading={loadingPos === item.id}
                  onClick={() => void sendToPos(item.id)}
                >
                  Đưa vào POS
                </Button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
