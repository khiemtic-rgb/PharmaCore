import { useCallback, useEffect, useState } from 'react';
import { App, Alert, Button, Card, Spin, Statistic, Typography } from 'antd';
import dayjs from 'dayjs';
import {
  fetchBatchModeSettings,
  fetchOpenShift,
  fetchShiftSummary,
  fetchWarehouses,
} from '@/shared/api/sales.api';
import type { SalesShiftDetail, SalesShiftSummary, TenantBatchModeValue } from '@/shared/api/sales.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { formatMoney } from '@/shared/utils/money';
import { enablesShiftFefoLotAlerts } from '@/modules/sales/tenant-batch-mode';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';
import { CloseShiftSheet } from '@/modules/today/CloseShiftSheet';
import { usePosSession } from '@/modules/pos/pos-session.store';

const PAYMENT_LABEL: Record<number, string> = {
  1: 'Tiền mặt',
  2: 'Thẻ',
  3: 'Chuyển khoản',
  4: 'Ví điện tử',
  5: 'Ghi nợ',
};

function SummaryCard({ title, summary }: { title: string; summary: SalesShiftSummary }) {
  return (
    <Card size="small" title={title} style={{ marginBottom: 12 }}>
      <Statistic title="Doanh thu thuần" value={formatMoney(summary.netTotal)} />
      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        Bán {formatMoney(summary.totalSales)} · Hoàn {formatMoney(summary.totalRefunds)}
      </Typography.Text>
      {summary.byMethod.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          {summary.byMethod.map((row) => (
            <div key={row.paymentMethod} className="today-method-row">
              <span>{PAYMENT_LABEL[row.paymentMethod] ?? `HT ${row.paymentMethod}`}</span>
              <span>{formatMoney(row.netAmount)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function TodayPage() {
  const { message } = App.useApp();
  const posWarehouseId = usePosSession((s) => s.warehouseId);
  const [loading, setLoading] = useState(true);
  const [openShift, setOpenShift] = useState<SalesShiftDetail | null>(null);
  const [todaySummary, setTodaySummary] = useState<SalesShiftSummary | null>(null);
  const [batchMode, setBatchMode] = useState<TenantBatchModeValue>('suggest');
  const [closeOpen, setCloseOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const warehouses = await fetchWarehouses();
      const warehouseId = posWarehouseId ?? warehouses[0]?.id;
      const start = dayjs().startOf('day').toISOString();
      const end = dayjs().endOf('day').toISOString();

      const [shift, daySummary, mode] = await Promise.all([
        warehouseId ? fetchOpenShift(warehouseId) : Promise.resolve(null),
        fetchShiftSummary(start, end),
        fetchBatchModeSettings().catch(() => 'suggest' as TenantBatchModeValue),
      ]);
      setOpenShift(shift);
      setTodaySummary(daySummary);
      setBatchMode(mode);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được số liệu hôm nay'));
    } finally {
      setLoading(false);
    }
  }, [message, posWarehouseId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Hôm nay" backTo="/" />
      <main className="staff-body">
        {loading ? (
          <Spin />
        ) : (
          <>
            {openShift ? (
              <Alert
                type="success"
                showIcon
                message={`Ca ${openShift.shiftNumber} đang mở`}
                description={
                  openShift.warehouseName
                    ? `${openShift.warehouseName}${openShift.openedAt ? ` · từ ${dayjs(openShift.openedAt).format('HH:mm')}` : ''}`
                    : undefined
                }
                style={{ marginBottom: 12 }}
              />
            ) : (
              <Alert type="warning" showIcon message="Chưa mở ca" description="Mở ca tại POS trước khi bán." style={{ marginBottom: 12 }} />
            )}

            {enablesShiftFefoLotAlerts(batchMode) &&
            openShift?.lotAlerts &&
            openShift.lotAlerts.length > 0 ? (
              <Alert
                type="warning"
                showIcon
                message={`Cảnh báo lô FEFO (${openShift.lotAlerts[0]?.stockSourceLabel ?? 'Hệ thống'})`}
                description={
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                    {openShift.lotAlerts.map((alert) => (
                      <li key={`${alert.productId}-${alert.soldBatchNumber}-${alert.earlierBatchNumber}`}>
                        {alert.productCode}: bán lô {alert.soldBatchNumber}
                        {alert.soldExpiryDate ? ` (HSD ${dayjs(alert.soldExpiryDate).format('MM/YYYY')})` : ''} — còn
                        lô {alert.earlierBatchNumber}
                        {alert.earlierExpiryDate ? ` (HSD ${dayjs(alert.earlierExpiryDate).format('MM/YYYY')})` : ''}{' '}
                        tồn {alert.earlierBookQuantity.toLocaleString()}
                      </li>
                    ))}
                  </ul>
                }
                style={{ marginBottom: 12 }}
              />
            ) : null}

            {openShift?.summary ? (
              <SummaryCard title="Trong ca hiện tại" summary={openShift.summary} />
            ) : null}

            {todaySummary ? <SummaryCard title="Cả ngày (theo giờ hệ thống)" summary={todaySummary} /> : null}

            {openShift?.summary ? (
              <Card size="small" title="Tiền mặt trong ca" style={{ marginBottom: 12 }}>
                <Statistic title="Dự kiến trong két" value={formatMoney(openShift.summary.expectedCash)} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Đầu ca {formatMoney(openShift.summary.openingCash)} + bán TM{' '}
                  {formatMoney(openShift.summary.cashSales)} − hoàn TM {formatMoney(openShift.summary.cashRefunds)}
                </Typography.Text>
              </Card>
            ) : null}

            {openShift ? (
              <Button danger block size="large" onClick={() => setCloseOpen(true)}>
                Đóng ca
              </Button>
            ) : null}
          </>
        )}
      </main>
      <CloseShiftSheet
        open={closeOpen}
        shift={openShift}
        onClose={() => setCloseOpen(false)}
        onClosed={() => void load()}
      />
    </div>
  );
}
