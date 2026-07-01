import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  List,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd';
import { RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  fetchReceivableOrder,
  fetchReceivablesSummary,
  getApiErrorMessage,
} from '@/shared/api/customer-app.api';
import type {
  CustomerPurchaseDetail,
  CustomerReceivableLine,
  CustomerReceivablesSummary,
} from '@/shared/api/customer-app.types';
import { BackToHomeButton } from '@/shared/components/BackToHomeButton';
import { shouldHidePageErrorForOfflineApi } from '@/shared/components/ApiHealthBanner';
import { useApiHealth, useRetryWhenApiOnline } from '@/shared/api/useApiHealth';
import { useCustomerLabels } from '@/shared/i18n/useCustomerLabels';

import { formatMoney } from '@/shared/i18n/format-money';

function ReceivableOrderDetail({ detail }: { detail: CustomerPurchaseDetail }) {
  const { t } = useTranslation();
  const { paymentMethod } = useCustomerLabels();

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message={t('receivables.viewOnlyTitle')}
        description={t('receivables.viewOnlyDesc')}
      />

      <Card size="small" style={{ borderRadius: 12, background: '#fff7ed' }}>
        <Statistic
          title={t('receivables.outstandingThisOrder')}
          value={detail.outstanding}
          formatter={(v) => formatMoney(Number(v))}
          valueStyle={{ color: '#c2410c', fontSize: 24 }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t('receivables.paidAndTotal', {
            paid: formatMoney(detail.amountPaid),
            total: formatMoney(detail.totalAmount),
          })}
        </Typography.Text>
      </Card>

      <List
        size="small"
        dataSource={detail.items}
        renderItem={(line) => (
          <List.Item>
            <List.Item.Meta
              title={line.productName}
              description={`${line.quantity} ${line.unitName} · ${formatMoney(line.lineTotal)}`}
            />
          </List.Item>
        )}
      />

      {detail.payments.length > 0 ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t('receivables.collected')}:{' '}
          {detail.payments
            .map(
              (p) =>
                `${paymentMethod(p.paymentMethod)}: ${formatMoney(p.amount)}`,
            )
            .join(' · ')}
        </Typography.Text>
      ) : null}
    </Space>
  );
}

export function ReceivablesPage() {
  const { t } = useTranslation();
  const { online } = useApiHealth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CustomerReceivablesSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerPurchaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      setSummary(await fetchReceivablesSummary());
    } catch (error) {
      setLoadError(getApiErrorMessage(error, t('receivables.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useRetryWhenApiOnline(() => loadSummary());

  const openDetail = async (line: CustomerReceivableLine) => {
    setSelectedId(line.salesOrderId);
    setDrawerOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await fetchReceivableOrder(line.salesOrderId));
    } catch (error) {
      message.error(getApiErrorMessage(error, t('receivables.detailLoadFailed')));
      setDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 12px 24px' }}>
      <BackToHomeButton />
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        {t('receivables.title')}
      </Typography.Title>

      {loadError && !shouldHidePageErrorForOfflineApi(loadError, online) ? (
        <Alert
          type="error"
          showIcon
          message={loadError}
          action={
            <Button size="small" onClick={() => void loadSummary()}>
              {t('common.retry')}
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {summary && summary.totalReceivable <= 0.009 ? (
        <Empty
          description={t('receivables.empty')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : summary ? (
        <>
          <Card size="small" style={{ borderRadius: 12, marginBottom: 16, background: '#fff7ed' }}>
            <Statistic
              title={t('receivables.totalOutstanding')}
              value={summary.totalReceivable}
              formatter={(v) => formatMoney(Number(v))}
              valueStyle={{ color: '#c2410c', fontSize: 28 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('receivables.openOrdersSummary', { count: summary.openOrderCount })}
            </Typography.Text>
          </Card>

          <List
            dataSource={summary.lines}
            renderItem={(line) => (
              <Card
                size="small"
                style={{
                  marginBottom: 8,
                  borderRadius: 12,
                  borderColor: line.salesOrderId === selectedId ? '#0f766e' : undefined,
                  cursor: 'pointer',
                }}
                onClick={() => void openDetail(line)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <Space direction="vertical" size={2}>
                    <Space wrap>
                      <Typography.Text strong>{line.orderNumber}</Typography.Text>
                      <Tag color="orange">{t('receivables.owed', { amount: formatMoney(line.outstanding) })}</Tag>
                    </Space>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t('receivables.orderDateTotal', {
                        date: dayjs(line.orderDate).format('DD/MM/YYYY'),
                        total: formatMoney(line.orderTotal),
                      })}
                      {line.amountPaid > 0.009
                        ? t('receivables.paidPartial', { amount: formatMoney(line.amountPaid) })
                        : ''}
                    </Typography.Text>
                  </Space>
                  <RightOutlined style={{ color: '#94a3b8', flexShrink: 0 }} />
                </div>
              </Card>
            )}
          />
        </>
      ) : null}

      <Drawer
        title={detail ? detail.orderNumber : t('receivables.drawerDetail')}
        placement="bottom"
        height="85%"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Spin />
          </div>
        ) : detail ? (
          <ReceivableOrderDetail detail={detail} />
        ) : null}
      </Drawer>
    </div>
  );
}
