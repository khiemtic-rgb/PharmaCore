import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Empty, List, Popconfirm, Space, Spin, Tabs, Tag, Typography, message } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  confirmDraftOrder,
  cancelReservation,
  fetchDraftOrder,
  fetchDraftOrders,
  fetchPurchase,
  fetchPurchases,
  fetchReservation,
  fetchReservations,
  getApiErrorMessage,
  hideDraftOrder,
  cancelDraftOrder,
} from '@/shared/api/customer-app.api';
import {
  CUSTOMER_DRAFT_ORDER_STATUS,
  CUSTOMER_PURCHASE_STATUS,
  CUSTOMER_RESERVATION_STATUS,
  type CustomerDraftOrder,
  type CustomerDraftOrderListItem,
  type CustomerPurchaseDetail,
  type CustomerPurchaseListItem,
  type CustomerReservationDetail,
  type CustomerReservationListItem,
} from '@/shared/api/customer-app.types';
import { useCustomerLabels } from '@/shared/i18n/useCustomerLabels';
import { BackToHomeButton } from '@/shared/components/BackToHomeButton';
import { shouldHidePageErrorForOfflineApi } from '@/shared/components/ApiHealthBanner';
import { useApiHealth, useRetryWhenApiOnline } from '@/shared/api/useApiHealth';
import { subscribeDraftOrderAlerts } from '@/shared/hooks/draft-order-alert-bus';
import {
  filterUnseenSentDrafts,
  markSentDraftsSeen,
} from '@/shared/hooks/draft-order-seen';

import { formatMoney } from '@/shared/i18n/format-money';

function isPlacedOrder(status: number): boolean {
  return (
    status === CUSTOMER_DRAFT_ORDER_STATUS.Sent ||
    status === CUSTOMER_DRAFT_ORDER_STATUS.Confirmed ||
    status === CUSTOMER_DRAFT_ORDER_STATUS.Cancelled ||
    status === CUSTOMER_DRAFT_ORDER_STATUS.Expired
  );
}

function purchaseStatusLabel(
  item: CustomerPurchaseListItem,
  labels: { purchaseStatus: (n: number) => string; partialRefund: string },
): { label: string; color: string } {
  if (
    item.status === CUSTOMER_PURCHASE_STATUS.Completed &&
    item.totalRefunded > 0.0001
  ) {
    return { label: labels.partialRefund, color: 'orange' };
  }
  return {
    label: labels.purchaseStatus(item.status) ?? String(item.status),
    color: item.status === CUSTOMER_PURCHASE_STATUS.Refunded ? 'warning' : 'success',
  };
}

function statusTagColor(status: number): string {
  if (status === CUSTOMER_DRAFT_ORDER_STATUS.Confirmed) return 'green';
  if (status === CUSTOMER_DRAFT_ORDER_STATUS.Completed) return 'success';
  if (status === CUSTOMER_DRAFT_ORDER_STATUS.Cancelled) return 'error';
  if (status === CUSTOMER_DRAFT_ORDER_STATUS.Expired) return 'warning';
  return 'blue';
}

function OrderListCards({
  items,
  selectedId,
  onSelect,
}: {
  items: CustomerDraftOrderListItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { draftOrderStatus } = useCustomerLabels();

  if (items.length === 0) {
    return <Empty description={t('ordersDetail.emptyPlaced')} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <List
      dataSource={items}
      renderItem={(item) => (
        <Card
          size="small"
          style={{
            marginBottom: 8,
            borderRadius: 12,
            borderColor: item.id === selectedId ? '#0f766e' : undefined,
            cursor: 'pointer',
          }}
          onClick={() => onSelect(item.id)}
        >
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Space wrap>
              <Typography.Text strong>{item.draftNumber}</Typography.Text>
              <Tag color={statusTagColor(item.status)}>
                {draftOrderStatus(item.status)}
              </Tag>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('ordersDetail.productCount', { count: item.itemCount })} · {formatMoney(item.totalAmount)}
            </Typography.Text>
          </Space>
        </Card>
      )}
    />
  );
}

function PurchaseListCards({
  items,
  selectedId,
  onSelect,
}: {
  items: CustomerPurchaseListItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { purchaseStatus } = useCustomerLabels();

  if (items.length === 0) {
    return (
      <Empty
        description={t('ordersDetail.emptyPurchased')}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <List
      dataSource={items}
      renderItem={(item) => {
        const status = purchaseStatusLabel(item, {
          purchaseStatus,
          partialRefund: t('orders.partialRefund'),
        });
        return (
          <Card
            size="small"
            style={{
              marginBottom: 8,
              borderRadius: 12,
              borderColor: item.id === selectedId ? '#0f766e' : undefined,
              cursor: 'pointer',
            }}
            onClick={() => onSelect(item.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Space direction="vertical" size={2} style={{ flex: 1, minWidth: 0 }}>
                <Space wrap>
                  <Typography.Text strong>{item.orderNumber}</Typography.Text>
                  <Tag color={status.color}>{status.label}</Tag>
                </Space>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(item.orderDate).format('DD/MM/YYYY HH:mm')} · {t('ordersDetail.productCount', { count: item.itemCount })} ·{' '}
                  {formatMoney(item.totalAmount)}
                </Typography.Text>
                {item.id === selectedId ? (
                  <Typography.Text style={{ fontSize: 12, color: '#0f766e' }}>
                    {t('ordersDetail.viewingDetail')}
                  </Typography.Text>
                ) : null}
              </Space>
              <RightOutlined
                style={{
                  color: item.id === selectedId ? '#0f766e' : '#94a3b8',
                  fontSize: 14,
                  flexShrink: 0,
                }}
              />
            </div>
          </Card>
        );
      }}
    />
  );
}

function PurchaseDetailPanel({ detail }: { detail: CustomerPurchaseDetail }) {
  const { t } = useTranslation();
  const { purchaseStatus, paymentMethod } = useCustomerLabels();
  const status = purchaseStatusLabel({
    id: detail.id,
    orderNumber: detail.orderNumber,
    status: detail.status,
    orderDate: detail.orderDate,
    totalAmount: detail.totalAmount,
    amountPaid: detail.amountPaid,
    outstanding: detail.outstanding,
    itemCount: detail.items.length,
    totalRefunded: detail.totalRefunded,
  }, { purchaseStatus, partialRefund: t('orders.partialRefund') });

  return (
    <Card size="small" title={t('ordersDetail.invoiceTitle', { number: detail.orderNumber })} style={{ borderRadius: 12 }}>
      <Space wrap style={{ marginBottom: 12 }}>
        <Tag color={status.color}>{status.label}</Tag>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(detail.orderDate).format('DD/MM/YYYY HH:mm')}
        </Typography.Text>
      </Space>

      <List
        size="small"
        dataSource={detail.items}
        renderItem={(line) => (
          <List.Item>
            <List.Item.Meta
              title={line.productName}
              description={
                <Space direction="vertical" size={0}>
                  <span>
                    {line.quantity} {line.unitName} · {formatMoney(line.lineTotal)}
                  </span>
                  {line.returnedQuantity > 0 ? (
                    <Typography.Text type="warning" style={{ fontSize: 12 }}>
                      {t('ordersDetail.returnedQty', { qty: line.returnedQuantity, unit: line.unitName })}
                    </Typography.Text>
                  ) : null}
                </Space>
              }
            />
          </List.Item>
        )}
      />

      <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
        <Typography.Text>
          {t('ordersDetail.totalPayment')}: <strong>{formatMoney(detail.totalAmount)}</strong>
        </Typography.Text>
        {detail.discountAmount > 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('ordersDetail.discount')}: {formatMoney(detail.discountAmount)}
          </Typography.Text>
        ) : null}
        {detail.loyaltyDiscountAmount > 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('ordersDetail.loyaltyDiscount')}: {formatMoney(detail.loyaltyDiscountAmount)}
          </Typography.Text>
        ) : null}
        {detail.voucherDiscountAmount > 0 && detail.voucherCode ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('ordersDetail.voucherDiscount', { code: detail.voucherCode })}: -{formatMoney(detail.voucherDiscountAmount)}
          </Typography.Text>
        ) : null}
        {detail.loyaltyPointsEarned ? (
          <Typography.Text type="success" style={{ fontSize: 12 }}>
            {t('ordersDetail.loyaltyPointsEarned', { points: detail.loyaltyPointsEarned })}
          </Typography.Text>
        ) : null}
        {detail.payments.length > 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('ordersDetail.payment')}:{' '}
            {detail.payments
              .map(
                (p) =>
                  `${paymentMethod(p.paymentMethod)}: ${formatMoney(p.amount)}`,
              )
              .join(' · ')}
          </Typography.Text>
        ) : null}
        {detail.outstanding > 0.009 ? (
          <>
            <Typography.Text style={{ fontSize: 13 }}>
              {t('ordersDetail.paid')}: <strong>{formatMoney(detail.amountPaid)}</strong>
            </Typography.Text>
            <Typography.Text style={{ fontSize: 13, color: '#c2410c' }}>
              {t('ordersDetail.outstanding')}: <strong>{formatMoney(detail.outstanding)}</strong>
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('ordersDetail.payAtCounter')}
            </Typography.Text>
          </>
        ) : null}
        {detail.notes ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('ordersDetail.notes')}: {detail.notes}
          </Typography.Text>
        ) : null}
        <Link to="/reservations">
          <Button type="primary" size="small" style={{ marginTop: 8 }}>
            {t('ordersDetail.reorder')}
          </Button>
        </Link>
      </Space>
    </Card>
  );
}

function reservationStatusColor(status: number): string {
  if (status === CUSTOMER_RESERVATION_STATUS.Ready) return 'green';
  if (status === CUSTOMER_RESERVATION_STATUS.Confirmed) return 'blue';
  if (status === CUSTOMER_RESERVATION_STATUS.Collected) return 'success';
  if (status === CUSTOMER_RESERVATION_STATUS.Cancelled || status === CUSTOMER_RESERVATION_STATUS.Rejected)
    return 'error';
  return 'gold';
}

function ReservationListCards({
  items,
  selectedId,
  onSelect,
}: {
  items: CustomerReservationListItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { reservationStatus, reservationFulfillment } = useCustomerLabels();

  if (items.length === 0) {
    return (
      <Empty
        description={t('ordersDetail.emptyReservations')}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <List
      dataSource={items}
      renderItem={(item) => (
        <Card
          size="small"
          style={{
            marginBottom: 8,
            borderRadius: 12,
            borderColor: item.id === selectedId ? '#0f766e' : undefined,
            cursor: 'pointer',
          }}
          onClick={() => onSelect(item.id)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Space direction="vertical" size={2} style={{ flex: 1, minWidth: 0 }}>
              <Space wrap>
                <Typography.Text strong>{item.reservationNumber}</Typography.Text>
                <Tag color={reservationStatusColor(item.status)}>
                  {reservationStatus(item.status)}
                </Tag>
              </Space>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(item.submittedAt).format('DD/MM/YYYY HH:mm')} · {t('ordersDetail.productCount', { count: item.itemCount })} ·{' '}
                {reservationFulfillment(item.fulfillmentType)}
              </Typography.Text>
            </Space>
            <RightOutlined
              style={{
                color: item.id === selectedId ? '#0f766e' : '#94a3b8',
                fontSize: 14,
                flexShrink: 0,
              }}
            />
          </div>
        </Card>
      )}
    />
  );
}

function ReservationDetailPanel({
  detail,
  cancelling,
  onCancel,
}: {
  detail: CustomerReservationDetail;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { reservationStatus, reservationFulfillment } = useCustomerLabels();

  return (
    <Card size="small" title={t('ordersDetail.requestTitle', { number: detail.reservationNumber })} style={{ borderRadius: 12 }}>
      <Space wrap style={{ marginBottom: 12 }}>
        <Tag color={reservationStatusColor(detail.status)}>
          {reservationStatus(detail.status)}
        </Tag>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {reservationFulfillment(detail.fulfillmentType)}
          {detail.addressSummary ? ` · ${detail.addressSummary}` : ''}
        </Typography.Text>
      </Space>

      {detail.salesOrderNumber ? (
        <Typography.Text type="success" style={{ fontSize: 13, display: 'block' }}>
          {t('ordersDetail.invoiceLinkPurchased', { number: detail.salesOrderNumber })}
        </Typography.Text>
      ) : detail.status === CUSTOMER_RESERVATION_STATUS.Collected ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 8 }}
          message={t('ordersDetail.noInvoiceTitle')}
          description={t('ordersDetail.noInvoiceDesc')}
        />
      ) : null}

      <List
        size="small"
        dataSource={detail.items}
        renderItem={(line) => (
          <List.Item>
            <List.Item.Meta
              title={line.productName}
              description={
                <span>
                  {line.quantity} {line.unitName}
                  {line.customerNote ? ` · ${line.customerNote}` : ''}
                </span>
              }
            />
          </List.Item>
        )}
      />

      {detail.notes ? (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
          {t('ordersDetail.notes')}: {detail.notes}
        </Typography.Text>
      ) : null}
      {detail.staffNotes ? (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
          {t('ordersDetail.pharmacy')}: {detail.staffNotes}
        </Typography.Text>
      ) : null}

      {detail.status === CUSTOMER_RESERVATION_STATUS.Pending ? (
        <Popconfirm title={t('ordersDetail.cancelReservationConfirm')} onConfirm={onCancel}>
          <Button danger block loading={cancelling} style={{ marginTop: 12 }}>
            {t('ordersDetail.cancelRequest')}
          </Button>
        </Popconfirm>
      ) : null}
    </Card>
  );
}

function OrderDetailPanel({
  detail,
  confirming,
  cancelling,
  hiding,
  onConfirm,
  onCancel,
  onHide,
}: {
  detail: CustomerDraftOrder;
  confirming: boolean;
  cancelling: boolean;
  hiding: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onHide: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card size="small" title={t('ordersDetail.detailTitle', { number: detail.draftNumber })} style={{ borderRadius: 12 }}>
      {detail.status === CUSTOMER_DRAFT_ORDER_STATUS.Sent ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={t('ordersDetail.confirmInfo')}
        />
      ) : null}

      <List
        size="small"
        dataSource={detail.items}
        renderItem={(line) => (
          <List.Item>
            <List.Item.Meta
              title={line.productName}
              description={
                <Space direction="vertical" size={0}>
                  <span>
                    {line.quantity} {line.unitName} · {formatMoney(line.lineAmount)}
                  </span>
                  {line.dosageNote ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {line.dosageNote}
                    </Typography.Text>
                  ) : null}
                </Space>
              }
            />
          </List.Item>
        )}
      />

      <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
        <Typography.Text>
          {t('ordersDetail.totalAmount')}: <strong>{formatMoney(detail.totalAmount)}</strong>
        </Typography.Text>
        {detail.expiresAt && detail.status !== CUSTOMER_DRAFT_ORDER_STATUS.Completed ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('ordersDetail.expiresAt')}: {dayjs(detail.expiresAt).format('DD/MM/YYYY HH:mm')}
          </Typography.Text>
        ) : null}
        {detail.completedAt ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('ordersDetail.purchasedAt')}: {dayjs(detail.completedAt).format('DD/MM/YYYY HH:mm')}
          </Typography.Text>
        ) : null}
        {detail.notes ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('ordersDetail.notes')}: {detail.notes}
          </Typography.Text>
        ) : null}
        {detail.status === CUSTOMER_DRAFT_ORDER_STATUS.Sent ? (
          <Button type="primary" loading={confirming} onClick={onConfirm}>
            {t('ordersDetail.confirmOrder')}
          </Button>
        ) : null}
        {detail.status === CUSTOMER_DRAFT_ORDER_STATUS.Sent ||
        detail.status === CUSTOMER_DRAFT_ORDER_STATUS.Confirmed ? (
          <Popconfirm
            title={t('ordersDetail.cancelOrderTitle')}
            description={t('ordersDetail.cancelOrderDesc')}
            okText={t('ordersDetail.cancelOrderOk')}
            cancelText={t('ordersDetail.cancelOrderNo')}
            onConfirm={onCancel}
          >
            <Button danger loading={cancelling} disabled={confirming || hiding}>
              {t('ordersDetail.cancelOrder')}
            </Button>
          </Popconfirm>
        ) : null}
        {detail.status === CUSTOMER_DRAFT_ORDER_STATUS.Completed && detail.salesOrderNumber ? (
          <Typography.Text type="success">
            {t('ordersDetail.purchasedAtCounter', { number: detail.salesOrderNumber })}
          </Typography.Text>
        ) : null}
        <Popconfirm
          title={t('ordersDetail.hideTitle')}
          description={t('ordersDetail.hideDesc')}
          okText={t('ordersDetail.hideOk')}
          cancelText={t('common.cancel')}
          onConfirm={onHide}
        >
          <Button danger loading={hiding} disabled={confirming}>
            {t('ordersDetail.hideFromApp')}
          </Button>
        </Popconfirm>
      </Space>
    </Card>
  );
}

export function DraftOrdersPage() {
  const { t } = useTranslation();
  const { online } = useApiHealth();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [purchaseLoadError, setPurchaseLoadError] = useState<string | null>(null);
  const [reservationLoadError, setReservationLoadError] = useState<string | null>(null);
  const [orders, setOrders] = useState<CustomerDraftOrderListItem[]>([]);
  const [purchases, setPurchases] = useState<CustomerPurchaseListItem[]>([]);
  const [reservations, setReservations] = useState<CustomerReservationListItem[]>([]);
  const [activeTab, setActiveTab] = useState<'placed' | 'purchased' | 'reservations'>('placed');
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>();
  const [selectedReservationId, setSelectedReservationId] = useState<string>();
  const [detail, setDetail] = useState<CustomerDraftOrder | null>(null);
  const [purchaseDetail, setPurchaseDetail] = useState<CustomerPurchaseDetail | null>(null);
  const [reservationDetail, setReservationDetail] = useState<CustomerReservationDetail | null>(null);
  const [purchaseDetailLoading, setPurchaseDetailLoading] = useState(false);
  const [reservationDetailLoading, setReservationDetailLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancellingReservation, setCancellingReservation] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [newDraftBanner, setNewDraftBanner] = useState<CustomerDraftOrderListItem[]>([]);
  const purchaseDetailRef = useRef<HTMLDivElement>(null);

  const placedOrders = useMemo(() => orders.filter((o) => isPlacedOrder(o.status)), [orders]);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setInitialLoading(true);
    setLoadError(null);
    setPurchaseLoadError(null);
    setReservationLoadError(null);
    try {
      const [draftResult, purchaseResult, reservationResult] = await Promise.allSettled([
        fetchDraftOrders(),
        fetchPurchases(),
        fetchReservations(),
      ]);

      if (draftResult.status === 'fulfilled') {
        const items = draftResult.value;
        setOrders(items);
        const unseenSent = filterUnseenSentDrafts(
          items.filter((o) => o.status === CUSTOMER_DRAFT_ORDER_STATUS.Sent),
        );
        if (unseenSent.length > 0) {
          setNewDraftBanner(unseenSent);
        }
        const placed = items.filter((o) => isPlacedOrder(o.status));
        setActiveTab((tab) => {
          if (tab === 'placed' && placed.length === 0 && purchaseResult.status === 'fulfilled' && purchaseResult.value.length > 0) {
            return 'purchased';
          }
          return tab;
        });
        setSelectedId((current) => {
          if (current && items.some((o) => o.id === current)) return current;
          const placed = items.filter((o) => isPlacedOrder(o.status));
          return placed[0]?.id;
        });
      } else {
        setOrders([]);
        setLoadError(getApiErrorMessage(draftResult.reason, t('ordersDetail.loadDraftFailed')));
      }

      if (purchaseResult.status === 'fulfilled') {
        const items = purchaseResult.value;
        setPurchases(items);
        setSelectedPurchaseId((current) => {
          if (current && items.some((o) => o.id === current)) return current;
          return items[0]?.id;
        });
      } else {
        setPurchases([]);
        setPurchaseLoadError(getApiErrorMessage(purchaseResult.reason, t('ordersDetail.loadPurchaseFailed')));
      }

      if (reservationResult.status === 'fulfilled') {
        const items = reservationResult.value;
        setReservations(items);
        setSelectedReservationId((current) => {
          if (current && items.some((o) => o.id === current)) return current;
          return items[0]?.id;
        });
      } else {
        setReservations([]);
        setReservationLoadError(getApiErrorMessage(reservationResult.reason, t('ordersDetail.loadReservationFailed')));
      }
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAll(false);
  }, [loadAll]);

  useRetryWhenApiOnline(() => loadAll(true));

  useEffect(() => {
    return subscribeDraftOrderAlerts((drafts) => {
      setNewDraftBanner((current) => {
        const merged = new Map(current.map((d) => [d.id, d]));
        drafts.forEach((d) => merged.set(d.id, d));
        return [...merged.values()];
      });
      void loadAll(true);
    });
  }, [loadAll]);

  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  useEffect(() => {
    return () => {
      const sentIds = ordersRef.current
        .filter((o) => o.status === CUSTOMER_DRAFT_ORDER_STATUS.Sent)
        .map((o) => o.id);
      markSentDraftsSeen(sentIds);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'placed' || placedOrders.length === 0) {
      if (activeTab === 'placed') {
        setSelectedId(undefined);
        setDetail(null);
      }
      return;
    }
    setSelectedId((current) => {
      if (current && placedOrders.some((o) => o.id === current)) return current;
      return placedOrders[0].id;
    });
  }, [activeTab, placedOrders]);

  useEffect(() => {
    if (activeTab !== 'purchased' || purchases.length === 0) {
      if (activeTab === 'purchased') {
        setSelectedPurchaseId(undefined);
        setPurchaseDetail(null);
      }
      return;
    }
    setSelectedPurchaseId((current) => {
      if (current && purchases.some((o) => o.id === current)) return current;
      return purchases[0].id;
    });
  }, [activeTab, purchases]);

  useEffect(() => {
    if (activeTab !== 'placed' || !selectedId) {
      if (activeTab === 'placed') setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void fetchDraftOrder(selectedId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setDetail(null);
          message.error(getApiErrorMessage(error, t('ordersDetail.detailLoadFailed')));
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedId]);

  useEffect(() => {
    if (activeTab !== 'purchased' || !selectedPurchaseId) {
      if (activeTab === 'purchased') setPurchaseDetail(null);
      return;
    }
    let cancelled = false;
    setPurchaseDetailLoading(true);
    void fetchPurchase(selectedPurchaseId)
      .then((data) => {
        if (!cancelled) setPurchaseDetail(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setPurchaseDetail(null);
          message.error(getApiErrorMessage(error, t('ordersDetail.invoiceDetailLoadFailed')));
        }
      })
      .finally(() => {
        if (!cancelled) setPurchaseDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedPurchaseId]);

  useEffect(() => {
    if (activeTab !== 'reservations' || reservations.length === 0) {
      if (activeTab === 'reservations') {
        setSelectedReservationId(undefined);
        setReservationDetail(null);
      }
      return;
    }
    setSelectedReservationId((current) => {
      if (current && reservations.some((o) => o.id === current)) return current;
      return reservations[0].id;
    });
  }, [activeTab, reservations]);

  useEffect(() => {
    if (activeTab !== 'reservations' || !selectedReservationId) {
      if (activeTab === 'reservations') setReservationDetail(null);
      return;
    }
    let cancelled = false;
    setReservationDetailLoading(true);
    void fetchReservation(selectedReservationId)
      .then((data) => {
        if (!cancelled) setReservationDetail(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setReservationDetail(null);
          message.error(getApiErrorMessage(error, t('ordersDetail.reservationDetailLoadFailed')));
        }
      })
      .finally(() => {
        if (!cancelled) setReservationDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedReservationId]);

  useEffect(() => {
    if (activeTab !== 'purchased' || !purchaseDetail) return;
    purchaseDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeTab, selectedPurchaseId, purchaseDetail]);

  const onConfirm = async () => {
    if (!selectedId) return;
    setConfirming(true);
    try {
      const updated = await confirmDraftOrder(selectedId);
      setDetail(updated);
      message.success(t('ordersDetail.confirmSuccess'));
      await loadAll(true);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('ordersDetail.confirmFailed')));
    } finally {
      setConfirming(false);
    }
  };

  const onCancel = async () => {
    if (!selectedId) return;
    setCancelling(true);
    try {
      const updated = await cancelDraftOrder(selectedId);
      setDetail(updated);
      message.success(t('ordersDetail.cancelSuccess'));
      await loadAll(true);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('ordersDetail.cancelFailed')));
    } finally {
      setCancelling(false);
    }
  };

  const onHide = async () => {
    if (!selectedId) return;
    setHiding(true);
    try {
      await hideDraftOrder(selectedId);
      message.success(t('ordersDetail.hideSuccess'));
      setDetail(null);
      await loadAll(true);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('ordersDetail.hideFailed')));
    } finally {
      setHiding(false);
    }
  };

  const onCancelReservation = async () => {
    if (!selectedReservationId) return;
    setCancellingReservation(true);
    try {
      const updated = await cancelReservation(selectedReservationId);
      setReservationDetail(updated);
      message.success(t('ordersDetail.cancelReservationSuccess'));
      await loadAll(true);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('ordersDetail.cancelReservationFailed')));
    } finally {
      setCancellingReservation(false);
    }
  };

  const waitingForApi = online === false && !!loadError && !!purchaseLoadError && !!reservationLoadError;
  const pageError =
    activeTab === 'placed'
      ? loadError
      : activeTab === 'purchased'
        ? purchaseLoadError ?? loadError
        : reservationLoadError ?? loadError;

  if (initialLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <BackToHomeButton />
      <Typography.Title level={5} style={{ margin: 0 }}>
        {t('orders.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
        {t('orders.intro')}
      </Typography.Paragraph>

      <Card
        size="small"
        style={{ borderRadius: 12, background: '#fffbeb', borderColor: '#fcd34d' }}
        styles={{ body: { padding: '10px 14px' } }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Typography.Text style={{ fontSize: 13 }}>{t('orders.reserveHint')}</Typography.Text>
          <Link to="/reservations">
            <Button type="primary" size="small">
              {t('ordersDetail.reserveButton')}
            </Button>
          </Link>
        </Space>
      </Card>

      {newDraftBanner.length > 0 ? (
        <Alert
          type="info"
          showIcon
          message={t('ordersDetail.newDraftTitle')}
          description={
            newDraftBanner.length === 1
              ? t('ordersDetail.newDraftSingle', {
                  number: newDraftBanner[0].draftNumber,
                  amount: formatMoney(newDraftBanner[0].totalAmount),
                })
              : t('ordersDetail.newDraftMultiple', { count: newDraftBanner.length })
          }
          closable
          onClose={() => {
            markSentDraftsSeen(newDraftBanner.map((d) => d.id));
            setNewDraftBanner([]);
          }}
        />
      ) : null}

      {pageError && !shouldHidePageErrorForOfflineApi(pageError, online) ? (
        <Alert
          type="error"
          showIcon
          message={
            activeTab === 'placed'
              ? t('ordersDetail.loadFailedPlaced')
              : activeTab === 'purchased'
                ? t('ordersDetail.loadFailedPurchased')
                : t('ordersDetail.loadFailedReservations')
          }
          description={pageError}
          action={
            <Button size="small" onClick={() => void loadAll(true)}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : null}

      {waitingForApi ? (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin tip={t('common.waitingApi')} />
        </div>
      ) : null}

      {!waitingForApi && !pageError ? (
        <Spin spinning={refreshing}>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'placed' | 'purchased' | 'reservations')}
            items={[
              {
                key: 'placed',
                label: `${t('orders.tabPlaced')}${placedOrders.length > 0 ? ` (${placedOrders.length})` : ''}`,
                children: (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {selectedId && detailLoading ? (
                      <Card size="small" style={{ borderRadius: 12, textAlign: 'center', padding: 16 }}>
                        <Spin tip={t('ordersDetail.loadingDetail')} />
                      </Card>
                    ) : null}
                    {detail && activeTab === 'placed' && isPlacedOrder(detail.status) ? (
                      <OrderDetailPanel
                        detail={detail}
                        confirming={confirming}
                        cancelling={cancelling}
                        hiding={hiding}
                        onConfirm={() => void onConfirm()}
                        onCancel={() => void onCancel()}
                        onHide={() => void onHide()}
                      />
                    ) : null}
                    <OrderListCards items={placedOrders} selectedId={selectedId} onSelect={setSelectedId} />
                  </Space>
                ),
              },
              {
                key: 'reservations',
                label: `${t('orders.tabReservations')}${reservations.length > 0 ? ` (${reservations.length})` : ''}`,
                children: (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
                      {t('orders.reservationsIntro')}
                    </Typography.Paragraph>
                    {selectedReservationId && reservationDetailLoading ? (
                      <Card size="small" style={{ borderRadius: 12, textAlign: 'center', padding: 16 }}>
                        <Spin tip={t('ordersDetail.loadingReservationDetail')} />
                      </Card>
                    ) : null}
                    {reservationDetail && activeTab === 'reservations' ? (
                      <ReservationDetailPanel
                        detail={reservationDetail}
                        cancelling={cancellingReservation}
                        onCancel={() => void onCancelReservation()}
                      />
                    ) : null}
                    <ReservationListCards
                      items={reservations}
                      selectedId={selectedReservationId}
                      onSelect={setSelectedReservationId}
                    />
                  </Space>
                ),
              },
              {
                key: 'purchased',
                label: `${t('orders.tabPurchased')}${purchases.length > 0 ? ` (${purchases.length})` : ''}`,
                children: (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
                      {t('orders.purchasedIntro')}
                    </Typography.Paragraph>
                    {selectedPurchaseId && purchaseDetailLoading ? (
                      <Card size="small" style={{ borderRadius: 12, textAlign: 'center', padding: 16 }}>
                        <Spin tip={t('ordersDetail.loadingInvoiceDetail')} />
                      </Card>
                    ) : null}
                    {purchaseDetail && activeTab === 'purchased' ? (
                      <div ref={purchaseDetailRef}>
                        <PurchaseDetailPanel detail={purchaseDetail} />
                      </div>
                    ) : null}
                    <PurchaseListCards
                      items={purchases}
                      selectedId={selectedPurchaseId}
                      onSelect={setSelectedPurchaseId}
                    />
                  </Space>
                ),
              },
            ]}
          />
        </Spin>
      ) : null}

      <Link to="/">{t('orders.backHomeLink')}</Link>
    </Space>
  );
}
