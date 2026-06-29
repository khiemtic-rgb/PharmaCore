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
import {
  fetchReceivableOrder,
  fetchReceivablesSummary,
  getApiErrorMessage,
} from '@/shared/api/customer-app.api';
import {
  CUSTOMER_PAYMENT_METHOD_LABELS,
  type CustomerPurchaseDetail,
  type CustomerReceivableLine,
  type CustomerReceivablesSummary,
} from '@/shared/api/customer-app.types';
import { BackToHomeButton } from '@/shared/components/BackToHomeButton';
import { shouldHidePageErrorForOfflineApi } from '@/shared/components/ApiHealthBanner';
import { useApiHealth, useRetryWhenApiOnline } from '@/shared/api/useApiHealth';

function formatMoney(value: number) {
  return value.toLocaleString('vi-VN') + 'đ';
}

function ReceivableOrderDetail({ detail }: { detail: CustomerPurchaseDetail }) {
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="Chỉ xem công nợ trên app"
        description="Vui lòng đến quầy nhà thuốc để thanh toán phần còn nợ."
      />

      <Card size="small" style={{ borderRadius: 12, background: '#fff7ed' }}>
        <Statistic
          title="Còn nợ (đơn này)"
          value={detail.outstanding}
          suffix="đ"
          valueStyle={{ color: '#c2410c', fontSize: 24 }}
          formatter={(v) => Number(v).toLocaleString('vi-VN')}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Đã thanh toán: {formatMoney(detail.amountPaid)} · Tổng đơn: {formatMoney(detail.totalAmount)}
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
          Đã thu:{' '}
          {detail.payments
            .map(
              (p) =>
                `${CUSTOMER_PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}: ${formatMoney(p.amount)}`,
            )
            .join(' · ')}
        </Typography.Text>
      ) : null}
    </Space>
  );
}

export function ReceivablesPage() {
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
      setLoadError(getApiErrorMessage(error, 'Không tải được công nợ'));
    } finally {
      setLoading(false);
    }
  }, []);

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
      message.error(getApiErrorMessage(error, 'Không tải được chi tiết đơn'));
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
        Công nợ của tôi
      </Typography.Title>

      {loadError && !shouldHidePageErrorForOfflineApi(loadError, online) ? (
        <Alert
          type="error"
          showIcon
          message={loadError}
          action={
            <Button size="small" onClick={() => void loadSummary()}>
              Thử lại
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {summary && summary.totalReceivable <= 0.009 ? (
        <Empty
          description="Bạn không còn nợ đơn nào tại nhà thuốc."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : summary ? (
        <>
          <Card size="small" style={{ borderRadius: 12, marginBottom: 16, background: '#fff7ed' }}>
            <Statistic
              title="Tổng còn nợ"
              value={summary.totalReceivable}
              suffix="đ"
              valueStyle={{ color: '#c2410c', fontSize: 28 }}
              formatter={(v) => Number(v).toLocaleString('vi-VN')}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {summary.openOrderCount} đơn chưa trả đủ · Thanh toán tại quầy nhà thuốc
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
                      <Tag color="orange">Nợ {formatMoney(line.outstanding)}</Tag>
                    </Space>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(line.orderDate).format('DD/MM/YYYY')} · Tổng {formatMoney(line.orderTotal)}
                      {line.amountPaid > 0.009 ? ` · Đã trả ${formatMoney(line.amountPaid)}` : ''}
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
        title={detail ? detail.orderNumber : 'Chi tiết công nợ'}
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
