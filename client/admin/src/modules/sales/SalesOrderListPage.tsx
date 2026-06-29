import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EyeOutlined,
  EditOutlined,
  DollarOutlined,
  PrinterOutlined,
  ReloadOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import {
  cancelDraftSale,
  completeDraftSale,
  createSaleReturn,
  fetchOrderReturns,
  fetchPosCustomerLoyalty,
  fetchSalesOrder,
  fetchSalesOrders,
  fetchSalesReturn,
  searchCustomers,
} from '@/shared/api/sales.api';
import type {
  CustomerListItem,
  PosCheckoutConfirm,
  PosCustomerLoyalty,
  SalesOrderDetail,
  SalesOrderListItem,
  SalesReturnListItem,
} from '@/shared/api/sales.types';
import { SALES_RETURN_STATUS_LABELS } from '@/shared/api/sales.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { useHasPermission } from '@/shared/auth/usePermission';
import {
  matchesSaleStatusFilter,
  orderDisplayStatus,
  PARTIAL_RETURN_STATUS,
  SALE_STATUS_FILTER_OPTIONS,
} from '@/modules/sales/sales-order-status';
import { OrderDetailFinancials } from '@/modules/sales/OrderDetailFinancials';
import { buildCustomerPaymentCreateUrl } from '@/modules/sales/customer-payment-nav';
import { resolveOrderPaymentSummary } from '@/modules/sales/sales-order-payment-summary';
import { CustomerFormDrawer } from '@/modules/customer/CustomerFormDrawer';
import type { CustomerDetail } from '@/shared/api/customer-admin.types';
import { PosCheckoutModal } from '@/modules/sales/PosCheckoutModal';
import { SalesReturnDetailDrawer } from '@/modules/sales/SalesReturnDetailDrawer';
import { SalesReturnModal } from '@/modules/sales/SalesReturnModal';
import { printSalesInvoice } from '@/modules/sales/sales-invoice-print';
import { formatPosCheckoutSuccessMessage } from '@/modules/sales/pos-checkout-message';
import { printSalesReturn } from '@/modules/sales/sales-return-print';
import { sectionGapStyle, sectionGapTopStyle, TabularMoney } from '@/modules/sales/sales-ui-styles';
import {
  buildCustomerSearchSuggestions,
  buildDocumentSearchSuggestions,
} from '@/modules/sales/sales-list-customer-search';
import { SalesListDualSearchBar, SalesListDualSearchWrap } from '@/modules/sales/SalesListDualSearchBar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDisplayDate } from '@/shared/utils/date';
import { formatDisplayMoney } from '@/shared/utils/money';

function isCompletedSaleStatus(status: number): boolean {
  return status === 2 || status === 4;
}

export function SalesOrderListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canRead = useHasPermission('sales.read');
  const canWrite = useHasPermission('sales.write');
  const [items, setItems] = useState<SalesOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [customerInput, setCustomerInput] = useState('');
  const [documentInput, setDocumentInput] = useState('');
  const [appliedCustomer, setAppliedCustomer] = useState('');
  const [appliedDocument, setAppliedDocument] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | typeof PARTIAL_RETURN_STATUS | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<SalesOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnSaving, setReturnSaving] = useState(false);
  const [orderReturns, setOrderReturns] = useState<SalesReturnListItem[]>([]);
  const [orderReturnsLoading, setOrderReturnsLoading] = useState(false);
  const [returnDetailOpen, setReturnDetailOpen] = useState(false);
  const [returnDetailId, setReturnDetailId] = useState<string | null>(null);
  const [draftCheckoutOpen, setDraftCheckoutOpen] = useState(false);
  const [draftCustomerId, setDraftCustomerId] = useState<string>();
  const [draftCustomerLoyalty, setDraftCustomerLoyalty] = useState<PosCustomerLoyalty | null>(null);
  const [draftCompleting, setDraftCompleting] = useState(false);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);

  const load = useCallback(async (
    nextPage: number,
    nextPageSize: number,
    nextStatus: number | typeof PARTIAL_RETURN_STATUS | undefined = statusFilter,
    customerSearch: string = appliedCustomer,
    documentSearch: string = appliedDocument,
  ) => {
    setLoading(true);
    try {
      const apiStatus = typeof nextStatus === 'number' ? nextStatus : undefined;
      const result = await fetchSalesOrders({
        customerSearch: customerSearch.trim() || undefined,
        documentSearch: documentSearch.trim() || undefined,
        status: apiStatus,
        page: nextPage,
        pageSize: nextPageSize,
      });
      const rows =
        nextStatus === PARTIAL_RETURN_STATUS
          ? result.items.filter((row) => matchesSaleStatusFilter(row, nextStatus))
          : result.items;
      setItems(rows);
      setTotal(nextStatus === PARTIAL_RETURN_STATUS ? rows.length : result.total);
      setPage(nextPage);
      setPageSize(nextPageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được đơn bán'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, appliedCustomer, appliedDocument]);

  const applySearch = (values: { customer: string; document: string }) => {
    const customer = values.customer.trim();
    const document = values.document.trim();
    setCustomerInput(customer);
    setDocumentInput(document);
    setAppliedCustomer(customer);
    setAppliedDocument(document);
  };

  const reloadList = useCallback(() => {
    void load(page, pageSize, statusFilter, appliedCustomer, appliedDocument);
  }, [load, page, pageSize, statusFilter, appliedCustomer, appliedDocument]);

  useEffect(() => {
    void searchCustomers()
      .then(setCustomers)
      .catch(() => {
        /* POS/search KH tùy chọn */
      });
  }, []);

  useEffect(() => {
    const onFocus = () => reloadList();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reloadList]);

  useEffect(() => {
    void load(1, pageSize, statusFilter, appliedCustomer, appliedDocument);
  }, [statusFilter, pageSize, appliedCustomer, appliedDocument, load]);

  const customerSuggestions = useMemo(() => {
    const rows = [
      ...customers.map((customer) => ({
        customerName: customer.fullName,
        customerPhone: customer.phone,
      })),
      ...items.map((row) => ({
        customerName: row.customerName ?? '',
        customerPhone: null as string | null,
      })),
    ];
    return buildCustomerSearchSuggestions(rows, customerInput);
  }, [customers, items, customerInput]);

  const documentSuggestions = useMemo(
    () => buildDocumentSearchSuggestions(items.map((row) => row.orderNumber), documentInput),
    [items, documentInput],
  );

  const filteredItems = items;

  const resetFilters = () => {
    setCustomerInput('');
    setDocumentInput('');
    setAppliedCustomer('');
    setAppliedDocument('');
    setStatusFilter(undefined);
  };

  const loadOrderReturns = useCallback(async (orderId: string) => {
    setOrderReturnsLoading(true);
    try {
      setOrderReturns(await fetchOrderReturns(orderId));
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được phiếu trả của đơn'));
      setOrderReturns([]);
    } finally {
      setOrderReturnsLoading(false);
    }
  }, []);

  const openDetailById = useCallback(
    async (orderId: string) => {
      setDetailOpen(true);
      setDetail(null);
      setOrderReturns([]);
      setDetailLoading(true);
      try {
        const order = await fetchSalesOrder(orderId);
        setDetail(order);
        if (isCompletedSaleStatus(order.status) && (order.totalRefunded ?? 0) > 0) {
          await loadOrderReturns(orderId);
        }
      } catch (error) {
        message.error(apiErrorMessage(error, 'Không tải được chi tiết đơn'));
        setDetailOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [loadOrderReturns],
  );

  const deepLinkHandled = useRef<string | null>(null);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (!orderId) {
      deepLinkHandled.current = null;
      return;
    }
    if (deepLinkHandled.current === orderId) return;
    deepLinkHandled.current = orderId;
    void openDetailById(orderId).finally(() => {
      deepLinkHandled.current = null;
      setSearchParams({}, { replace: true });
    });
  }, [searchParams, openDetailById, setSearchParams]);

  const openDetail = async (row: SalesOrderListItem) => {
    await openDetailById(row.id);
  };

  const refreshDetail = async (id: string) => {
    const next = await fetchSalesOrder(id);
    setDetail(next);
    if (isCompletedSaleStatus(next.status) && (next.totalRefunded ?? 0) > 0) {
      await loadOrderReturns(id);
    } else {
      setOrderReturns([]);
    }
    void load(page, pageSize);
  };

  const handleCompleteDraft = () => {
    if (!detail) return;
    setDraftCustomerId(detail.customerId);
    setDraftCheckoutOpen(true);
  };

  const handleQuickCustomerSaved = useCallback((customer: CustomerDetail) => {
    const listItem: CustomerListItem = {
      id: customer.id,
      customerCode: customer.customerCode,
      fullName: customer.fullName,
      phone: customer.phone,
      allowCredit: customer.allowCredit,
      creditLimit: customer.creditLimit ?? undefined,
    };
    setCustomers((prev) => {
      if (prev.some((row) => row.id === customer.id)) {
        return prev.map((row) => (row.id === customer.id ? listItem : row));
      }
      return [...prev, listItem].sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
    });
    setDraftCustomerId(customer.id);
    message.success(`Đã chọn ${customer.fullName} (${customer.customerCode})`);
  }, []);

  useEffect(() => {
    if (!draftCheckoutOpen || !draftCustomerId || !detail || detail.totalAmount <= 0) {
      setDraftCustomerLoyalty(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const loyalty = await fetchPosCustomerLoyalty(draftCustomerId, detail.totalAmount);
      if (!cancelled) setDraftCustomerLoyalty(loyalty);
    })();
    return () => {
      cancelled = true;
    };
  }, [draftCheckoutOpen, draftCustomerId, detail?.totalAmount]);

  const draftCustomer = useMemo(
    () => customers.find((c) => c.id === draftCustomerId),
    [customers, draftCustomerId],
  );

  const confirmCompleteDraft = async ({ payments, loyaltyDiscountAmount }: PosCheckoutConfirm) => {
    if (!detail) {
      message.error('Không tìm thấy đơn tạm');
      throw new Error('missing-draft');
    }
    setDraftCompleting(true);
    try {
      const updated = await completeDraftSale(detail.id, {
        payments,
        customerId: draftCustomerId ?? detail.customerId ?? null,
        ...(loyaltyDiscountAmount != null && loyaltyDiscountAmount > 0
          ? { loyaltyDiscountAmount }
          : {}),
      });
      setDetail(updated);
      setDraftCheckoutOpen(false);
      message.success(formatPosCheckoutSuccessMessage(updated));
      if (!(await printSalesInvoice(updated))) {
        message.warning('Trình duyệt chặn cửa sổ in — bấm In hóa đơn trong chi tiết đơn.');
      }
      void load(page, pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không hoàn tất được đơn'));
      throw error;
    } finally {
      setDraftCompleting(false);
    }
  };

  const handleCancelDraft = async () => {
    if (!detail) return;
    try {
      await cancelDraftSale(detail.id);
      message.success('Đã hủy đơn tạm');
      setDetailOpen(false);
      void load(page, pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không hủy được đơn'));
    }
  };

  const printOrderById = async (id: string) => {
    try {
      if (!(await printSalesInvoice(await fetchSalesOrder(id)))) {
        message.warning('Trình duyệt chặn cửa sổ in — cho phép popup và thử lại.');
      }
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không in được hóa đơn'));
    }
  };

  const openReturnModal = () => {
    if (!detail) return;
    setReturnOpen(true);
  };

  const openReturnDetail = (returnId: string) => {
    setReturnDetailId(returnId);
    setReturnDetailOpen(true);
  };

  const printReturnById = async (returnId: string) => {
    try {
      if (!(await printSalesReturn(await fetchSalesReturn(returnId)))) {
        message.warning('Trình duyệt chặn cửa sổ in — cho phép popup và thử lại.');
      }
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không in được phiếu trả'));
    }
  };

  const submitReturn = async (payload: {
    reason?: string;
    items: { salesOrderItemId: string; quantity: number }[];
    payments: { paymentMethod: number; amount: number }[];
  }) => {
    if (!detail) return;
    try {
      setReturnSaving(true);
      const ret = await createSaleReturn(detail.id, payload);
      message.success(`Đã ghi nhận trả hàng ${ret.returnNumber}`);
      setReturnOpen(false);
      if (!(await printSalesReturn(ret))) {
        message.warning('Trình duyệt chặn cửa sổ in — mở lại từ chi tiết đơn.');
      }
      await refreshDetail(detail.id);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không trả hàng được'));
    } finally {
      setReturnSaving(false);
    }
  };

  const renderOrderStatus = (row: SalesOrderListItem & { items?: SalesOrderDetail['items'] }) => {
    const { label, color } = orderDisplayStatus(row);
    return <Tag color={color}>{label}</Tag>;
  };

  const columns: ColumnsType<SalesOrderListItem> = [
    { title: 'Số đơn', dataIndex: 'orderNumber', width: 130 },
    { title: 'Kho', dataIndex: 'warehouseName', width: 140 },
    { title: 'Khách', dataIndex: 'customerName', render: (v) => v ?? '—' },
    {
      title: 'Ngày',
      dataIndex: 'orderDate',
      width: 110,
      render: (v: string) => formatDisplayDate(v),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 160,
      render: (_: number, row) => renderOrderStatus(row),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      width: 130,
      align: 'right',
      render: (v: number, row) => {
        const outstanding = row.outstanding ?? 0;
        return (
          <Space direction="vertical" size={0} style={{ alignItems: 'flex-end' }}>
            <TabularMoney>{formatDisplayMoney(v)}</TabularMoney>
            {outstanding > 0.009 ? (
              <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>
                Nợ {formatDisplayMoney(outstanding)}
              </Tag>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: 'Thao tác',
      width: 130,
      render: (_, row) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => void openDetail(row)}
          >
            Xem
          </Button>
          {isCompletedSaleStatus(row.status) && canRead && (
            <Button
              type="link"
              size="small"
              icon={<PrinterOutlined />}
              title="In hóa đơn"
              onClick={() => void printOrderById(row.id)}
            />
          )}
        </Space>
      ),
    },
  ];

  const lineColumns: ColumnsType<SalesOrderDetail['items'][number]> = [
    { title: 'Mã SP', dataIndex: 'productCode', width: 72, ellipsis: true },
    { title: 'Tên SP', dataIndex: 'productName', ellipsis: true },
    { title: 'Lô', dataIndex: 'batchNumber', width: 76, ellipsis: true, render: (v?: string) => v ?? '—' },
    {
      title: 'HSD',
      dataIndex: 'expiryDate',
      width: 84,
      render: (v?: string) => (v ? formatDisplayDate(v) : '—'),
    },
    { title: 'ĐVT', dataIndex: 'unitName', width: 48, ellipsis: true },
    {
      title: 'Sl mua',
      dataIndex: 'quantity',
      width: 56,
      align: 'right',
      render: (v: number) => v.toLocaleString('vi-VN'),
    },
    {
      title: 'Sl trả',
      dataIndex: 'returnedQuantity',
      width: 56,
      align: 'right',
      render: (v?: number) => (v ? v.toLocaleString('vi-VN') : '—'),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      width: 84,
      align: 'right',
      render: (v: number) => <TabularMoney>{formatDisplayMoney(v)}</TabularMoney>,
    },
    {
      title: 'Thành tiền',
      dataIndex: 'lineTotal',
      width: 92,
      align: 'right',
      render: (v: number) => <TabularMoney>{formatDisplayMoney(v)}</TabularMoney>,
    },
  ];

  const returnColumns: ColumnsType<SalesReturnListItem> = [
    {
      title: 'Số phiếu',
      dataIndex: 'returnNumber',
      width: 120,
      render: (value: string, row) => (
        <Button
          type="link"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            openReturnDetail(row.id);
          }}
        >
          {value}
        </Button>
      ),
    },
    {
      title: 'Ngày',
      dataIndex: 'returnDate',
      width: 100,
      render: (v: string) => formatDisplayDate(v),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 90,
      render: (status: number) => (
        <Tag>{SALES_RETURN_STATUS_LABELS[status] ?? status}</Tag>
      ),
    },
    {
      title: 'Tổng hoàn tiền',
      dataIndex: 'totalRefund',
      width: 110,
      align: 'right',
      render: (v: number) => <TabularMoney>{formatDisplayMoney(v)}</TabularMoney>,
    },
    {
      title: '',
      width: 120,
      render: (_, row) =>
        canRead ? (
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openReturnDetail(row.id)}>
              Xem
            </Button>
            <Button
              type="link"
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => void printReturnById(row.id)}
            >
              In
            </Button>
          </Space>
        ) : null,
    },
  ];

  const returnableLines =
    detail?.items.filter(
      (line) => line.batchId && line.quantity - (line.returnedQuantity ?? 0) > 0.0001,
    ) ?? [];

  const canCollectOrderDebt =
    Boolean(
      detail &&
        canWrite &&
        detail.customerId &&
        isCompletedSaleStatus(detail.status) &&
        resolveOrderPaymentSummary(detail).hasOutstanding,
    );

  const openCollectOrderDebt = () => {
    if (!detail?.customerId) {
      message.warning('Đơn không có khách hàng để thu nợ');
      return;
    }
    const { outstanding } = resolveOrderPaymentSummary(detail);
    setDetailOpen(false);
    navigate(
      buildCustomerPaymentCreateUrl({
        customerId: detail.customerId,
        salesOrderId: detail.id,
        amount: outstanding,
      }),
    );
  };

  return (
    <Card title="Đơn bán hàng">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Đơn gửi app khách (Gửi khách hàng tại POS) nằm tại tab Đơn hàng từ app"
        description="Tab này chỉ liệt kê đơn bán nội bộ (nháp / hoàn tất). Đơn chờ khách xác nhận trên app xem tại Bán hàng → Đơn hàng từ app."
        action={
          <Button size="small" onClick={() => navigate('/sales/customer-drafts')}>
            Mở Đơn hàng từ app
          </Button>
        }
      />
      <SalesListDualSearchWrap>
        <SalesListDualSearchBar
          customerValue={customerInput}
          documentValue={documentInput}
          onCustomerChange={setCustomerInput}
          onDocumentChange={setDocumentInput}
          onApply={applySearch}
          customerSuggestions={customerSuggestions}
          documentSuggestions={documentSuggestions}
          documentPlaceholder="Số đơn"
        />
        <Select
          allowClear
          placeholder="Trạng thái"
          style={{ width: 140 }}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          options={SALE_STATUS_FILTER_OPTIONS.map(({ value, label }) => ({ value, label }))}
        />
        <Button onClick={resetFilters}>Xóa lọc</Button>
        <Button
          type="primary"
          ghost
          icon={<ReloadOutlined />}
          onClick={reloadList}
          loading={loading}
        >
          Tải lại
        </Button>
      </SalesListDualSearchWrap>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={filteredItems}
        columns={columns}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `${t} đơn`,
          onChange: (nextPage, nextPageSize) => {
            void load(
              nextPage,
              nextPageSize ?? pageSize,
              statusFilter,
              appliedCustomer,
              appliedDocument,
            );
          },
        }}
        onRow={(record) => ({
          onClick: () => void openDetail(record),
          style: { cursor: 'pointer' },
        })}
      />

      <Drawer
        title={detail ? `Xem ${detail.orderNumber}` : 'Xem đơn bán'}
        width={880}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        loading={detailLoading}
      >
        {detail && (
          <>
            {detail.status === 1 && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Đơn nháp chưa trừ tồn kho"
                description="Bấm Hoàn tất đơn để xuất hóa đơn, trừ tồn theo FEFO và cho phép trả hàng sau này."
              />
            )}

            {(detail.status === 1 && canWrite) ||
            (isCompletedSaleStatus(detail.status) && (canRead || canWrite)) ? (
              <Card size="small" title="Thao tác" style={sectionGapStyle}>
                <Space wrap>
                  {detail.status === 1 && canWrite && (
                    <>
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                          setDetailOpen(false);
                          navigate(`/sales/pos?draftId=${detail.id}`);
                        }}
                      >
                        Tiếp tục sửa
                      </Button>
                      <Button type="primary" onClick={handleCompleteDraft}>
                        Hoàn tất đơn
                      </Button>
                      <Popconfirm title="Hủy đơn tạm?" onConfirm={() => void handleCancelDraft()}>
                        <Button danger>Hủy đơn</Button>
                      </Popconfirm>
                    </>
                  )}
                  {isCompletedSaleStatus(detail.status) && canRead && (
                    <Button icon={<PrinterOutlined />} onClick={() => void printSalesInvoice(detail)}>
                      In hóa đơn
                    </Button>
                  )}
                  {isCompletedSaleStatus(detail.status) &&
                    canWrite &&
                    returnableLines.length > 0 && (
                      <Button icon={<RollbackOutlined />} onClick={openReturnModal}>
                        Trả hàng
                      </Button>
                    )}
                  {canCollectOrderDebt && (
                    <Button type="primary" icon={<DollarOutlined />} onClick={openCollectOrderDebt}>
                      Thu nợ
                    </Button>
                  )}
                </Space>
              </Card>
            ) : null}

            <Descriptions column={2} size="small" bordered style={sectionGapStyle}>
              <Descriptions.Item label="Kho">{detail.warehouseName}</Descriptions.Item>
              <Descriptions.Item label="Khách">{detail.customerName ?? '—'}</Descriptions.Item>
              {(detail.voucherDiscountAmount ?? 0) > 0 ? (
                <Descriptions.Item label="Voucher">
                  {detail.voucherCode ? `${detail.voucherCode} · ` : ''}
                  −{formatDisplayMoney(detail.voucherDiscountAmount ?? 0)}
                </Descriptions.Item>
              ) : null}
              {(detail.loyaltyPointsRedeemed ?? 0) > 0 ? (
                <Descriptions.Item label="Đổi điểm">
                  −{detail.loyaltyPointsRedeemed!.toLocaleString('vi-VN')} điểm (
                  −{formatDisplayMoney(detail.loyaltyDiscountAmount ?? 0)})
                </Descriptions.Item>
              ) : null}
              {(detail.loyaltyPointsEarned ?? 0) > 0 ? (
                <Descriptions.Item label="Tích điểm">
                  +{detail.loyaltyPointsEarned!.toLocaleString('vi-VN')} điểm
                </Descriptions.Item>
              ) : null}
              <Descriptions.Item label="Trạng thái">
                {renderOrderStatus({
                  ...detail,
                  itemCount: detail.items.length,
                  items: detail.items,
                })}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày">{formatDisplayDate(detail.orderDate)}</Descriptions.Item>
              <Descriptions.Item label="Ca">{detail.shiftNumber ?? '—'}</Descriptions.Item>
            </Descriptions>

            <OrderDetailFinancials
              order={detail}
              onCollectDebt={canCollectOrderDebt ? openCollectOrderDebt : undefined}
            />

            <Table
              rowKey="id"
              size="small"
              pagination={false}
              tableLayout="fixed"
              style={{ width: '100%' }}
              dataSource={detail.items}
              columns={lineColumns}
            />

            {orderReturns.length > 0 || orderReturnsLoading ? (
              <Card
                size="small"
                title="Phiếu trả hàng"
                style={sectionGapTopStyle}
                loading={orderReturnsLoading}
              >
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={orderReturns}
                  columns={returnColumns}
                  onRow={(record) => ({
                    onClick: () => openReturnDetail(record.id),
                    style: { cursor: 'pointer' },
                  })}
                />
              </Card>
            ) : null}
          </>
        )}
      </Drawer>

      <SalesReturnModal
        open={returnOpen}
        loading={returnSaving}
        order={detail}
        onCancel={() => setReturnOpen(false)}
        onConfirm={(payload) => void submitReturn(payload)}
      />

      <SalesReturnDetailDrawer
        open={returnDetailOpen}
        returnId={returnDetailId}
        onClose={() => {
          setReturnDetailOpen(false);
          setReturnDetailId(null);
        }}
        onOpenOrder={(orderId) => {
          setReturnDetailOpen(false);
          setReturnDetailId(null);
          navigate(`/sales/orders?orderId=${orderId}`);
        }}
      />

      {detail && (
        <PosCheckoutModal
          open={draftCheckoutOpen}
          loading={draftCompleting}
          totalAmount={detail.totalAmount}
          subtotalGross={detail.subtotal}
          lineDiscountTotal={
            detail.lineDiscountTotal ??
            detail.items.reduce((sum, line) => sum + (line.discountAmount ?? 0), 0)
          }
          orderDiscountAmount={detail.discountAmount}
          customerId={draftCustomerId}
          customers={customers}
          onCustomerChange={setDraftCustomerId}
          onQuickAddCustomer={canWrite ? () => setQuickCustomerOpen(true) : undefined}
          customerAllowCredit={draftCustomer?.allowCredit}
          customerCreditLimit={draftCustomer?.creditLimit}
          customerCurrentOutstanding={draftCustomer?.currentOutstanding}
          customerLoyalty={draftCustomerLoyalty}
          onCancel={() => setDraftCheckoutOpen(false)}
          onConfirm={(result) => confirmCompleteDraft(result)}
        />
      )}

      <CustomerFormDrawer
        open={quickCustomerOpen}
        editing={null}
        variant="quick"
        onClose={() => setQuickCustomerOpen(false)}
        onSaved={handleQuickCustomerSaved}
      />
    </Card>
  );
}
