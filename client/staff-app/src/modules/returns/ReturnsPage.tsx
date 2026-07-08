import { useEffect, useMemo, useState } from 'react';
import { App, Alert, Button, Input, InputNumber, Segmented, Space, Spin, Typography } from 'antd';
import dayjs from 'dayjs';
import {
  createSaleReturn,
  fetchSalesOrderById,
  searchSalesOrders,
} from '@/shared/api/sales.api';
import type { SalesOrderDetailFull, SalesOrderListItem } from '@/shared/api/sales.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { formatMoney } from '@/shared/utils/money';
import { previewReturnRefund, returnableQuantity } from '@/modules/returns/sales-return-pricing';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';
import { SALES_PAYMENT_CASH } from '@/shared/api/sales.types';

type SearchMode = 'document' | 'customer';

const ORDER_STATUS_LABEL: Record<number, string> = {
  2: 'Đã bán',
  4: 'Đã trả một phần',
};

export function ReturnsPage() {
  const { message } = App.useApp();
  const [searchMode, setSearchMode] = useState<SearchMode>('customer');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SalesOrderListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [order, setOrder] = useState<SalesOrderDetailFull | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          setHits(await searchSalesOrders(query.trim(), searchMode));
        } catch {
          setHits([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, searchMode]);

  const loadOrder = async (id: string) => {
    try {
      const detail = await fetchSalesOrderById(id);
      if (detail.status !== 2 && detail.status !== 4) {
        message.warning('Chỉ trả hàng trên đơn đã hoàn tất');
        return;
      }
      setOrder(detail);
      const initial: Record<string, number> = {};
      for (const line of detail.items) {
        if (line.id) initial[line.id] = 0;
      }
      setQuantities(initial);
      setQuery('');
      setHits([]);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được đơn'));
    }
  };

  const preview = useMemo(
    () => (order ? previewReturnRefund(order, quantities) : { totalRefund: 0, lines: [] }),
    [order, quantities],
  );

  const submit = async () => {
    if (!order || preview.lines.length === 0) {
      message.warning('Nhập số lượng trả');
      return;
    }
    setSaving(true);
    try {
      const result = await createSaleReturn(order.id, {
        reason: reason.trim() || undefined,
        items: preview.lines.map((line) => ({
          salesOrderItemId: line.itemId,
          quantity: line.quantity,
        })),
        payments: [{ paymentMethod: SALES_PAYMENT_CASH, amount: preview.totalRefund }],
      });
      message.success(`Đã trả · ${result.returnNumber} · ${formatMoney(result.totalRefund)}`);
      setOrder(null);
      setReason('');
      setQuantities({});
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không trả được hàng'));
    } finally {
      setSaving(false);
    }
  };

  const returnableLines = order?.items.filter((line) => returnableQuantity(line) > 0) ?? [];

  const searchPlaceholder =
    searchMode === 'customer' ? 'SĐT hoặc tên khách...' : 'Số hóa đơn (HD...)';

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Trả hàng" backTo="/" />
      <main className="staff-body" style={{ paddingBottom: order ? 120 : undefined }}>
        {!order ? (
          <>
            <Segmented
              block
              value={searchMode}
              onChange={(v) => {
                setSearchMode(v as SearchMode);
                setQuery('');
                setHits([]);
              }}
              options={[
                { label: 'Khách hàng', value: 'customer' },
                { label: 'Số HĐ', value: 'document' },
              ]}
              style={{ marginBottom: 12 }}
            />
            <Input
              size="large"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              allowClear
            />
            <Typography.Text type="secondary" style={{ display: 'block', margin: '8px 0 12px', fontSize: 12 }}>
              {searchMode === 'customer'
                ? 'Gõ SĐT/tên → chọn đơn gần nhất. Khách không cầm bill vẫn trả được.'
                : 'Tìm theo số hóa đơn nếu khách có bill.'}
              {' '}Cần mở ca cùng kho · chỉ trả dòng có lô.
            </Typography.Text>
            {searching ? <Spin /> : null}
            {!searching && query.trim().length >= 2 && hits.length === 0 ? (
              <Typography.Text type="secondary">Không tìm thấy đơn phù hợp</Typography.Text>
            ) : null}
            {hits.map((hit) => (
              <div key={hit.id} className="search-hit" onClick={() => void loadOrder(hit.id)}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Typography.Text strong>{hit.orderNumber}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {ORDER_STATUS_LABEL[hit.status] ?? ''}
                  </Typography.Text>
                </Space>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {hit.customerName ?? 'Khách lẻ'} · {formatMoney(hit.totalAmount)} ·{' '}
                  {dayjs(hit.orderDate).format('DD/MM HH:mm')}
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <Alert
              type="info"
              showIcon
              message={`Đơn ${order.orderNumber}`}
              description={`${order.customerName ?? 'Khách lẻ'} · ${dayjs(order.orderDate).format('DD/MM/YYYY HH:mm')}`}
              style={{ marginBottom: 12 }}
            />
            <Button type="link" style={{ padding: 0, marginBottom: 12 }} onClick={() => setOrder(null)}>
              ← Tìm đơn khác
            </Button>

            {returnableLines.length === 0 ? (
              <Alert type="warning" message="Không còn dòng nào trả được (hoặc thiếu lô kho)" />
            ) : (
              returnableLines.map((line) => {
                const max = returnableQuantity(line);
                return (
                  <div key={line.id} className="cart-line">
                    <Typography.Text strong>{line.productName}</Typography.Text>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {line.productCode}
                      {line.batchNumber ? ` · Lô ${line.batchNumber}` : ''} · Đã bán {line.quantity} · Còn trả {max}
                    </div>
                    <InputNumber
                      min={0}
                      max={max}
                      value={quantities[line.id ?? ''] ?? 0}
                      onChange={(v) =>
                        setQuantities((prev) => ({ ...prev, [line.id ?? '']: Number(v ?? 0) }))
                      }
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </div>
                );
              })
            )}

            <Input.TextArea
              placeholder="Lý do trả (tuỳ chọn)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              style={{ marginTop: 12 }}
            />

            <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
              <Typography.Text strong>Hoàn tiền: {formatMoney(preview.totalRefund)}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Mặc định hoàn tiền mặt. Ghi nợ/giảm công nợ xử lý theo đơn gốc.
              </Typography.Text>
            </Space>
          </>
        )}
      </main>

      {order ? (
        <footer className="staff-footer">
          <Button
            type="primary"
            block
            size="large"
            loading={saving}
            disabled={preview.lines.length === 0}
            onClick={() => void submit()}
          >
            Xác nhận trả hàng
          </Button>
        </footer>
      ) : null}
    </div>
  );
}
