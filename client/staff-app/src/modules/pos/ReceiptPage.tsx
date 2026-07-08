import { useEffect, useMemo, useState } from 'react';
import { App, Button, Space, Typography } from 'antd';
import { CheckCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SalesOrderDetail } from '@/shared/api/sales.types';
import { fetchReceiptSettings } from '@/shared/api/sales.api';
import { buildReceiptHtml, printReceiptDocument } from '@/modules/sales/receipt-print';
import { formatMoney } from '@/shared/utils/money';

export function ReceiptPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const order = (location.state as { order?: SalesOrderDetail } | null)?.order;
  const [storeName, setStoreName] = useState('Nhà thuốc');

  useEffect(() => {
    if (!order) {
      navigate('/pos', { replace: true });
      return;
    }
    void fetchReceiptSettings().then((s) => setStoreName(s.name));
  }, [navigate, order]);

  const receiptHtml = useMemo(() => {
    if (!order) return '';
    return buildReceiptHtml(order, { name: storeName });
  }, [order, storeName]);

  if (!order) return null;

  const print = () => {
    try {
      printReceiptDocument(receiptHtml);
    } catch {
      message.error('Không in được — thử Chia sẻ hoặc kiểm tra máy in Bluetooth');
    }
  };

  return (
    <div className="staff-shell">
      <main className="staff-body" style={{ paddingBottom: 120 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <CheckCircleOutlined style={{ fontSize: 40, color: '#16a34a' }} />
            <Typography.Title level={4} style={{ marginTop: 8 }}>
              Đã bán · {order.orderNumber}
            </Typography.Title>
            <Typography.Text type="secondary">{formatMoney(order.totalAmount)}</Typography.Text>
          </div>

          <div className="receipt-preview receipt-print-area">
            <iframe
              title="receipt-preview"
              srcDoc={receiptHtml}
              style={{ width: '100%', height: 320, border: 'none' }}
            />
          </div>
        </Space>
      </main>

      <footer className="staff-footer no-print">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button type="primary" block size="large" icon={<PrinterOutlined />} onClick={print}>
            In bill
          </Button>
          <Button block size="large" onClick={() => navigate('/pos', { replace: true })}>
            Đơn mới
          </Button>
        </Space>
      </footer>
    </div>
  );
}
