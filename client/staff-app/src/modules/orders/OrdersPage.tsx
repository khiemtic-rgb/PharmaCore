import { useEffect, useMemo, useState } from 'react';
import { App, Button, Input, Segmented, Spin, Typography } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  fetchReceiptSettings,
  fetchSalesOrderById,
  searchSalesOrders,
} from '@/shared/api/sales.api';
import type { SalesOrderDetailFull, SalesOrderListItem } from '@/shared/api/sales.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { formatMoney } from '@/shared/utils/money';
import { buildReceiptHtml, printReceiptDocument } from '@/modules/sales/receipt-print';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';

type SearchMode = 'customer' | 'document';

function toReceiptOrder(order: SalesOrderDetailFull) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderDate: order.orderDate,
    totalAmount: order.totalAmount,
    amountPaid: order.amountPaid,
    customerName: order.customerName,
    items: order.items.map((i) => ({
      productCode: i.productCode,
      productName: i.productName,
      unitName: i.unitName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      batchNumber: i.batchNumber,
    })),
    payments: order.payments,
  };
}

export function OrdersPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState<SearchMode>('customer');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SalesOrderListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [order, setOrder] = useState<SalesOrderDetailFull | null>(null);
  const [storeName, setStoreName] = useState('Nhà thuốc');

  useEffect(() => {
    void fetchReceiptSettings().then((s) => setStoreName(s.name));
  }, []);

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
        } finally {
          setSearching(false);
        }
      })();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, searchMode]);

  const receiptHtml = useMemo(() => {
    if (!order) return '';
    return buildReceiptHtml(toReceiptOrder(order), { name: storeName });
  }, [order, storeName]);

  const loadOrder = async (id: string) => {
    try {
      const detail = await fetchSalesOrderById(id);
      if (detail.status !== 2 && detail.status !== 4) {
        message.warning('Chỉ xem/in lại đơn đã bán');
        return;
      }
      setOrder(detail);
      setQuery('');
      setHits([]);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được đơn'));
    }
  };

  const print = () => {
    if (!receiptHtml) return;
    try {
      printReceiptDocument(receiptHtml);
    } catch {
      message.error('Không in được bill');
    }
  };

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Đơn & in lại" backTo="/" />
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
                { label: 'Khách / SĐT', value: 'customer' },
                { label: 'Số HĐ', value: 'document' },
              ]}
              style={{ marginBottom: 12 }}
            />
            <Input
              size="large"
              placeholder={searchMode === 'customer' ? 'SĐT hoặc tên khách...' : 'Số hóa đơn...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              allowClear
            />
            {searching ? <Spin style={{ marginTop: 12 }} /> : null}
            {hits.map((hit) => (
              <div key={hit.id} className="search-hit" onClick={() => void loadOrder(hit.id)}>
                <Typography.Text strong>{hit.orderNumber}</Typography.Text>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {hit.customerName ?? 'Khách lẻ'} · {formatMoney(hit.totalAmount)} ·{' '}
                  {dayjs(hit.orderDate).format('DD/MM HH:mm')}
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <Typography.Title level={5}>{order.orderNumber}</Typography.Title>
            <Typography.Text type="secondary">
              {order.customerName ?? 'Khách lẻ'} · {formatMoney(order.totalAmount)} ·{' '}
              {dayjs(order.orderDate).format('DD/MM/YYYY HH:mm')}
            </Typography.Text>
            <Button type="link" style={{ padding: 0, margin: '12px 0' }} onClick={() => setOrder(null)}>
              ← Tìm đơn khác
            </Button>
            <div className="receipt-preview receipt-print-area">
              <iframe title="receipt-reprint" srcDoc={receiptHtml} style={{ width: '100%', height: 320, border: 'none' }} />
            </div>
          </>
        )}
      </main>
      {order ? (
        <footer className="staff-footer no-print">
          <Button type="primary" block size="large" icon={<PrinterOutlined />} onClick={print}>
            In lại bill
          </Button>
          <Button block size="large" style={{ marginTop: 8 }} onClick={() => navigate('/pos')}>
            Sang POS
          </Button>
        </footer>
      ) : null}
    </div>
  );
}
