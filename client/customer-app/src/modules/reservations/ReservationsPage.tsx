import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Popconfirm,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  cancelReservation,
  createReservation,
  fetchAddresses,
  fetchReservation,
  fetchReservations,
  getApiErrorMessage,
  searchProducts,
} from '@/shared/api/customer-app.api';
import type {
  CustomerAddress,
  CustomerProductSearchItem,
  CustomerReservationDetail,
  CustomerReservationListItem,
} from '@/shared/api/customer-app.types';
import {
  CUSTOMER_RESERVATION_FULFILLMENT,
  CUSTOMER_RESERVATION_STATUS,
} from '@/shared/api/customer-app.types';
import { useApiHealth, useRetryWhenApiOnline } from '@/shared/api/useApiHealth';
import { shouldHidePageErrorForOfflineApi } from '@/shared/components/ApiHealthBanner';
import { BackToHomeButton } from '@/shared/components/BackToHomeButton';
import { useCustomerLabels } from '@/shared/i18n/useCustomerLabels';

type DraftLine = {
  key: string;
  productId: string;
  productName: string;
  productCode: string;
  unitName: string;
  quantity: number;
  customerNote?: string;
};


function reservationStatusColor(status: number): string {
  if (status === CUSTOMER_RESERVATION_STATUS.Ready) return 'green';
  if (status === CUSTOMER_RESERVATION_STATUS.Confirmed) return 'blue';
  if (status === CUSTOMER_RESERVATION_STATUS.Collected) return 'success';
  if (status === CUSTOMER_RESERVATION_STATUS.Cancelled || status === CUSTOMER_RESERVATION_STATUS.Rejected)
    return 'error';
  return 'gold';
}

function ReservationDetailPanel({
  detail,
  onCancel,
  cancelling,
}: {
  detail: CustomerReservationDetail;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const { t } = useTranslation();
  const { reservationStatus, reservationFulfillment } = useCustomerLabels();

  return (
    <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Space wrap>
          <Typography.Text strong>{detail.reservationNumber}</Typography.Text>
          <Tag color={reservationStatusColor(detail.status)}>
            {reservationStatus(detail.status)}
          </Tag>
        </Space>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {reservationFulfillment(detail.fulfillmentType)}
          {detail.addressSummary ? ` · ${detail.addressSummary}` : ''}
        </Typography.Text>
        {detail.notes ? (
          <Typography.Text style={{ fontSize: 13 }}>{t('reservations.notes')}: {detail.notes}</Typography.Text>
        ) : null}
        {detail.staffNotes ? (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {t('reservations.pharmacy')}: {detail.staffNotes}
          </Typography.Text>
        ) : null}
        {detail.salesOrderNumber ? (
          <Typography.Text type="success" style={{ fontSize: 13, display: 'block' }}>
            {t('reservations.invoiceLink', { number: detail.salesOrderNumber })}
          </Typography.Text>
        ) : detail.status === CUSTOMER_RESERVATION_STATUS.Collected ? (
          <Alert
            type="warning"
            showIcon
            message={t('reservations.noInvoiceTitle')}
            description={t('reservations.noInvoiceDesc')}
          />
        ) : null}
        <List
          size="small"
          dataSource={detail.items}
          renderItem={(line) => (
            <List.Item style={{ paddingInline: 0 }}>
              <Space direction="vertical" size={0}>
                <Typography.Text>
                  {line.productName} × {line.quantity} {line.unitName}
                </Typography.Text>
                {line.customerNote ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {line.customerNote}
                  </Typography.Text>
                ) : null}
              </Space>
            </List.Item>
          )}
        />
        {detail.status === CUSTOMER_RESERVATION_STATUS.Pending ? (
          <Popconfirm title={t('reservations.cancelConfirm')} onConfirm={onCancel}>
            <Button danger loading={cancelling} block>
              {t('reservations.cancelRequest')}
            </Button>
          </Popconfirm>
        ) : null}
      </Space>
    </Card>
  );
}

export function ReservationsPage() {
  const { t } = useTranslation();
  const { reservationStatus } = useCustomerLabels();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { online } = useApiHealth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [items, setItems] = useState<CustomerReservationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerReservationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [createOpen, setCreateOpen] = useState(searchParams.get('create') === '1');
  const [submitting, setSubmitting] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState<number>(CUSTOMER_RESERVATION_FULFILLMENT.Pickup);
  const [addressId, setAddressId] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productOptions, setProductOptions] = useState<CustomerProductSearchItem[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setItems(await fetchReservations());
    } catch (error) {
      setItems([]);
      setLoadError(getApiErrorMessage(error, t('reservations.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useRetryWhenApiOnline(() => loadList());

  useEffect(() => {
    if (!createOpen) return;
    void fetchAddresses()
      .then(setAddresses)
      .catch(() => setAddresses([]));
  }, [createOpen]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    void fetchReservation(selectedId)
      .then(setDetail)
      .catch((error) => {
        message.error(getApiErrorMessage(error, t('reservations.detailLoadFailed')));
        setSelectedId(null);
      })
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const loadProducts = useCallback(async (search?: string) => {
    setProductLoading(true);
    try {
      const result = await searchProducts(search?.trim() || undefined, 1, 30);
      setProductOptions(result.items);
    } catch (error) {
      setProductOptions([]);
      message.error(getApiErrorMessage(error, t('reservations.productLoadFailed')));
    } finally {
      setProductLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!createOpen) return;
    const q = productSearch.trim();
    const timer = window.setTimeout(
      () => {
        void loadProducts(q || undefined);
      },
      q.length === 0 ? 0 : 250,
    );
    return () => window.clearTimeout(timer);
  }, [createOpen, productSearch, loadProducts]);

  useEffect(() => {
    if (createOpen) {
      void loadProducts();
    }
  }, [createOpen, loadProducts]);

  const searchResults = useMemo(
    () => productOptions.filter((p) => !draftLines.some((line) => line.productId === p.id)),
    [productOptions, draftLines],
  );

  const defaultAddressId = useMemo(
    () => addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id,
    [addresses],
  );

  useEffect(() => {
    if (fulfillmentType === CUSTOMER_RESERVATION_FULFILLMENT.Delivery && !addressId && defaultAddressId) {
      setAddressId(defaultAddressId);
    }
  }, [fulfillmentType, addressId, defaultAddressId]);

  const addProduct = (product: CustomerProductSearchItem) => {
    if (draftLines.some((line) => line.productId === product.id)) {
      message.info(t('reservations.productInList'));
      return;
    }
    setDraftLines((prev) => [
      ...prev,
      {
        key: product.id,
        productId: product.id,
        productName: product.productName,
        productCode: product.productCode,
        unitName: product.saleUnitName ?? '',
        quantity: 1,
      },
    ]);
    setProductSearch('');
    setSelectOpen(false);
  };

  const submitCreate = async () => {
    if (draftLines.length === 0) {
      message.warning(t('reservations.addAtLeastOne'));
      return;
    }
    if (fulfillmentType === CUSTOMER_RESERVATION_FULFILLMENT.Delivery && !addressId) {
      message.warning(t('reservations.selectAddress'));
      return;
    }
    setSubmitting(true);
    try {
      const created = await createReservation({
        fulfillmentType,
        addressId: fulfillmentType === CUSTOMER_RESERVATION_FULFILLMENT.Delivery ? addressId : undefined,
        notes: notes.trim() || undefined,
        items: draftLines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          customerNote: line.customerNote?.trim() || undefined,
        })),
      });
      message.success(t('reservations.submitted'));
      setCreateOpen(false);
      setDraftLines([]);
      setNotes('');
      setFulfillmentType(CUSTOMER_RESERVATION_FULFILLMENT.Pickup);
      await loadList();
      setSelectedId(created.id);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('reservations.submitFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedId) return;
    setCancelling(true);
    try {
      const updated = await cancelReservation(selectedId);
      setDetail(updated);
      await loadList();
      message.success(t('reservations.cancelled'));
    } catch (error) {
      message.error(getApiErrorMessage(error, t('reservations.cancelFailed')));
    } finally {
      setCancelling(false);
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
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <BackToHomeButton />
      <div>
        <Typography.Title level={4} style={{ marginBottom: 4 }}>
          {t('reservations.title')}
        </Typography.Title>
        <Typography.Text type="secondary">
          {t('reservations.intro')}
        </Typography.Text>
      </div>

      {loadError && !shouldHidePageErrorForOfflineApi(loadError, online) ? (
        <Typography.Text type="danger">{loadError}</Typography.Text>
      ) : null}

      {!createOpen ? (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          size="large"
          onClick={() => {
            setCreateOpen(true);
            setProductSearch('');
            setSelectOpen(false);
          }}
        >
          {t('reservations.createNew')}
        </Button>
      ) : (
        <Card
          size="small"
          title={t('reservations.newRequest')}
          style={{ borderRadius: 12, overflow: 'visible' }}
          styles={{ body: { overflow: 'visible' } }}
        >
          <Form layout="vertical" requiredMark={false}>
            <Form.Item label={t('reservations.fulfillmentType')}>
              <Radio.Group
                value={fulfillmentType}
                onChange={(e) => setFulfillmentType(e.target.value)}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value={CUSTOMER_RESERVATION_FULFILLMENT.Pickup}>{t('reservations.pickup')}</Radio.Button>
                <Radio.Button value={CUSTOMER_RESERVATION_FULFILLMENT.Delivery}>{t('reservations.delivery')}</Radio.Button>
              </Radio.Group>
            </Form.Item>

            {fulfillmentType === CUSTOMER_RESERVATION_FULFILLMENT.Delivery ? (
              <Form.Item label={t('reservations.deliveryAddress')}>
                {addresses.length === 0 ? (
                  <Typography.Text type="secondary">
                    {t('reservations.noAddress')}{' '}
                    <Link to="/addresses" onClick={() => navigate('/addresses')}>
                      {t('reservations.addAddress')}
                    </Link>
                  </Typography.Text>
                ) : (
                  <Select
                    value={addressId}
                    onChange={setAddressId}
                    options={addresses.map((a) => ({
                      value: a.id,
                      label: `${a.label} — ${[a.addressLine, a.ward, a.district].filter(Boolean).join(', ')}`,
                    }))}
                  />
                )}
              </Form.Item>
            ) : null}

            <Form.Item label={t('reservations.searchProduct')} extra={t('reservations.searchHint')}>
              <Select
                showSearch
                allowClear
                value={null}
                open={selectOpen}
                placeholder={t('reservations.searchPlaceholder')}
                filterOption={false}
                loading={productLoading}
                searchValue={productSearch}
                style={{ width: '100%' }}
                listHeight={280}
                getPopupContainer={(node) => node.parentElement ?? document.body}
                notFoundContent={
                  productLoading ? (
                    <div style={{ textAlign: 'center', padding: 12 }}>
                      <Spin size="small" />
                    </div>
                  ) : (
                    t('reservations.noProducts')
                  )
                }
                onSearch={(value) => setProductSearch(value)}
                onOpenChange={(open) => {
                  setSelectOpen(open);
                  if (open && productOptions.length === 0) {
                    void loadProducts(productSearch.trim() || undefined);
                  }
                }}
                onSelect={(productId) => {
                  const product = productOptions.find((p) => p.id === productId);
                  if (product) addProduct(product);
                  setProductSearch('');
                  setSelectOpen(false);
                }}
                onClear={() => {
                  setProductSearch('');
                  void loadProducts();
                }}
                options={searchResults.map((product) => ({
                  value: product.id,
                  label: `${product.productName} (${product.productCode})${
                    product.saleUnitName ? ` · ${product.saleUnitName}` : ''
                  }`,
                }))}
              />
            </Form.Item>

            {draftLines.length > 0 ? (
              <>
                <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                  {t('reservations.selected', { count: draftLines.length })}
                </Typography.Text>
                {draftLines.map((line) => (
                  <Card
                    key={line.key}
                    size="small"
                    style={{
                      marginBottom: 10,
                      borderRadius: 12,
                      borderColor: '#99f6e4',
                      background: '#f0fdfa',
                    }}
                    styles={{ body: { padding: '12px 14px' } }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Typography.Text strong style={{ fontSize: 15, display: 'block' }}>
                          {line.productName}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {line.productCode}
                          {line.unitName ? ` · ${line.unitName}` : ''}
                        </Typography.Text>
                      </div>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={t('reservations.removeAria', { name: line.productName })}
                        onClick={() => setDraftLines((prev) => prev.filter((x) => x.key !== line.key))}
                      />
                    </div>
                    <InputNumber
                      min={0.01}
                      step={1}
                      value={line.quantity}
                      addonAfter={line.unitName || t('reservations.qtyUnit')}
                      style={{ width: '100%', marginTop: 10 }}
                      onChange={(value) =>
                        setDraftLines((prev) =>
                          prev.map((x) =>
                            x.key === line.key ? { ...x, quantity: Number(value) || 1 } : x,
                          ),
                        )
                      }
                    />
                    <Input
                      placeholder={t('reservations.noteOptional')}
                      value={line.customerNote}
                      style={{ marginTop: 8 }}
                      onChange={(e) =>
                        setDraftLines((prev) =>
                          prev.map((x) =>
                            x.key === line.key ? { ...x, customerNote: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </Card>
                ))}
              </>
            ) : (
              <Empty
                description={t('reservations.emptyDraft')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ marginBottom: 8 }}
              />
            )}

            <Form.Item label={t('reservations.generalNotes')}>
              <Input.TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Form.Item>

            <Space style={{ width: '100%' }} direction="vertical">
              <Button type="primary" block size="large" loading={submitting} onClick={() => void submitCreate()}>
                {t('reservations.submit')}
              </Button>
              <Button block onClick={() => setCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
            </Space>
          </Form>
        </Card>
      )}

      {detailLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : detail ? (
        <ReservationDetailPanel detail={detail} onCancel={() => void handleCancel()} cancelling={cancelling} />
      ) : null}

      {items.length === 0 ? (
        <Empty description={t('reservations.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
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
              onClick={() => setSelectedId(item.id)}
            >
              <Space direction="vertical" size={2}>
                <Space wrap>
                  <Typography.Text strong>{item.reservationNumber}</Typography.Text>
                  <Tag color={reservationStatusColor(item.status)}>
                    {reservationStatus(item.status)}
                  </Tag>
                </Space>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t('reservations.productCount', { count: item.itemCount })} · {dayjs(item.submittedAt).format('DD/MM/YYYY HH:mm')}
                </Typography.Text>
              </Space>
            </Card>
          )}
        />
      )}
    </Space>
  );
}
