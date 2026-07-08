import { useEffect, useMemo, useState } from 'react';
import { Button, Typography } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchReceiptSettings } from '@/shared/api/sales.api';
import type { ReceiptStoreSettings } from '@/shared/api/sales.types';
import type { CustomerPaymentReceipt } from '@/shared/api/receivables.api';
import { buildPaymentReceiptHtml, printPaymentReceipt } from '@/modules/collect/payment-receipt-print';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';
import { formatMoney } from '@/shared/utils/money';

export function CollectPaymentReceiptPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const payment = (location.state as { payment?: CustomerPaymentReceipt } | null)?.payment ?? null;
  const [storeSettings, setStoreSettings] = useState<ReceiptStoreSettings>({ name: 'Nhà thuốc' });

  useEffect(() => {
    if (!payment) navigate('/collect', { replace: true });
  }, [payment, navigate]);

  useEffect(() => {
    void fetchReceiptSettings().then(setStoreSettings);
  }, []);

  const receiptHtml = useMemo(() => {
    if (!payment) return '';
    return buildPaymentReceiptHtml(payment, storeSettings);
  }, [payment, storeSettings]);

  if (!payment) return null;

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Phiếu thu" backTo="/collect" />
      <main className="staff-body" style={{ paddingBottom: 120 }}>
        <Typography.Title level={5}>{payment.paymentNumber}</Typography.Title>
        <Typography.Text type="secondary">
          {payment.customerName} · {formatMoney(payment.amount)}
        </Typography.Text>
        <div className="receipt-preview receipt-print-area" style={{ marginTop: 16 }}>
          <iframe title="payment-receipt" srcDoc={receiptHtml} style={{ width: '100%', height: 320, border: 'none' }} />
        </div>
      </main>
      <footer className="staff-footer no-print">
        <Button
          type="primary"
          block
          size="large"
          icon={<PrinterOutlined />}
          onClick={() => printPaymentReceipt(payment, storeSettings)}
        >
          In phiếu thu
        </Button>
        <Button block size="large" style={{ marginTop: 8 }} onClick={() => navigate('/collect')}>
          Thu tiếp
        </Button>
        <Button block size="large" style={{ marginTop: 8 }} onClick={() => navigate('/')}>
          Về menu
        </Button>
      </footer>
    </div>
  );
}
