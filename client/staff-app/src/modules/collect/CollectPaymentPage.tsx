import { useEffect, useState } from 'react';
import { App, Alert, Button, Input, InputNumber, Radio, Spin, Typography } from 'antd';
import {
  createAndPostCustomerPayment,
  fetchCustomerReceivablesDetail,
} from '@/shared/api/receivables.api';
import { fetchCustomerList } from '@/shared/api/customer.api';
import type { CustomerAdminListItem } from '@/shared/api/customer.types';
import { SALES_PAYMENT_BANK, SALES_PAYMENT_CASH } from '@/shared/api/sales.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { formatMoney } from '@/shared/utils/money';
import { useNavigate } from 'react-router-dom';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';

type PayMode = 'cash' | 'bank';

export function CollectPaymentPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<CustomerAdminListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CustomerAdminListItem | null>(null);
  const [receivable, setReceivable] = useState<Awaited<ReturnType<typeof fetchCustomerReceivablesDetail>> | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [mode, setMode] = useState<PayMode>('cash');
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
          setHits((await fetchCustomerList(query.trim())).items);
        } finally {
          setSearching(false);
        }
      })();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  const pickCustomer = async (customer: CustomerAdminListItem) => {
    setSelected(customer);
    setQuery('');
    setHits([]);
    setLoadingDetail(true);
    try {
      const detail = await fetchCustomerReceivablesDetail(customer.id, {
        customerCode: customer.customerCode,
        fullName: customer.fullName,
        phone: customer.phone,
      });
      setReceivable(detail);
      setAmount(detail.totalReceivable);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được công nợ'));
      setSelected(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const submit = async () => {
    if (!selected || !receivable || amount <= 0) return;
    if (amount > receivable.totalReceivable + 0.01) {
      message.warning('Số tiền vượt công nợ');
      return;
    }
    setSaving(true);
    try {
      const result = await createAndPostCustomerPayment({
        customerId: selected.id,
        amount,
        paymentMethod: mode === 'bank' ? SALES_PAYMENT_BANK : SALES_PAYMENT_CASH,
        customerName: selected.fullName,
        customerCode: selected.customerCode,
      });
      navigate('/collect/receipt', { replace: true, state: { payment: result } });
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không thu được tiền'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Thu công nợ" backTo="/" />
      <main className="staff-body" style={{ paddingBottom: selected ? 120 : undefined }}>
        {!selected ? (
          <>
            <Input
              size="large"
              placeholder="SĐT hoặc tên khách..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              allowClear
            />
            <Typography.Text type="secondary" style={{ display: 'block', margin: '8px 0 12px', fontSize: 12 }}>
              Thu tiền khách trả nợ tại quầy. Phiếu thu được ghi sổ ngay.
            </Typography.Text>
            {searching ? <Spin /> : null}
            {hits.map((c) => (
              <div key={c.id} className="search-hit" onClick={() => void pickCustomer(c)}>
                <Typography.Text strong>{c.fullName}</Typography.Text>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {c.phone} · {c.customerCode}
                </div>
              </div>
            ))}
          </>
        ) : loadingDetail ? (
          <Spin />
        ) : receivable ? (
          <>
            <Alert
              type="info"
              showIcon
              message={receivable.customerName}
              description={`${receivable.customerPhone ?? ''} · Nợ ${formatMoney(receivable.totalReceivable)}`}
              style={{ marginBottom: 12 }}
            />
            <Button type="link" style={{ padding: 0, marginBottom: 12 }} onClick={() => { setSelected(null); setReceivable(null); }}>
              ← Chọn khách khác
            </Button>
            {receivable.totalReceivable <= 0 ? (
              <Alert type="success" message="Khách không còn công nợ" />
            ) : (
              <>
                <Typography.Text strong>Số tiền thu</Typography.Text>
                <InputNumber
                  style={{ width: '100%', margin: '8px 0 16px' }}
                  min={0}
                  max={receivable.totalReceivable}
                  value={amount}
                  onChange={(v) => setAmount(Number(v ?? 0))}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(v) => Number((v ?? '').replace(/\./g, ''))}
                />
                <Radio.Group value={mode} onChange={(e) => setMode(e.target.value as PayMode)}>
                  <Radio value="cash">Tiền mặt</Radio>
                  <Radio value="bank">Chuyển khoản</Radio>
                </Radio.Group>
                {receivable.lines.length > 0 ? (
                  <div style={{ marginTop: 16 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Công nợ theo đơn (tham khảo)
                    </Typography.Text>
                    {receivable.lines.slice(0, 5).map((line) => (
                      <div key={line.salesOrderId} className="today-method-row">
                        <span>{line.orderNumber}</span>
                        <span>{formatMoney(line.outstanding)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </main>
      {selected && receivable && receivable.totalReceivable > 0 ? (
        <footer className="staff-footer">
          <Button type="primary" block size="large" loading={saving} onClick={() => void submit()}>
            Xác nhận thu {formatMoney(amount)}
          </Button>
        </footer>
      ) : null}
    </div>
  );
}
