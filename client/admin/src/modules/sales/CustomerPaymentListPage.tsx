import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  parseCustomerPaymentPrefill,
  type CustomerPaymentPrefill,
} from '@/modules/sales/customer-payment-nav';
import { CustomerPaymentFormDrawer } from '@/modules/sales/CustomerPaymentFormDrawer';
import {
  buildCustomerSearchSuggestions,
  buildDocumentSearchSuggestions,
} from '@/modules/sales/sales-list-customer-search';
import { SalesListDualSearchBar, SalesListDualSearchWrap } from '@/modules/sales/SalesListDualSearchBar';
import {
  cancelCustomerPayment,
  fetchCustomerPayments,
  postCustomerPayment,
  searchCustomers,
} from '@/shared/api/sales.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import type {
  CustomerListItem,
  CustomerPaymentListFilters,
  CustomerPaymentListItem,
} from '@/shared/api/sales.types';
import {
  CUSTOMER_PAYMENT_STATUS_LABELS,
  CUSTOMER_PAYMENT_STATUS_TAG,
  SALES_PAYMENT_METHOD_LABELS,
} from '@/shared/api/sales.types';
import { useHasPermission } from '@/shared/auth/usePermission';
import { formatDisplayDate } from '@/shared/utils/date';
import { formatDisplayMoney } from '@/shared/utils/money';

const emptyFilters: CustomerPaymentListFilters = {};
const statusFilterOptions = Object.entries(CUSTOMER_PAYMENT_STATUS_LABELS).map(([value, label]) => ({
  value: Number(value),
  label,
}));
const tablePagination = {
  pageSize: 20,
  showTotal: (total: number) => `${total} phiếu`,
};
const tableScroll = { x: 1000 };
const alertStyle = { marginBottom: 16 };
const statusSelectStyle = { width: 140 };
const tableWrapClassName = 'sales-list-table-wrap';

function CustomerPaymentListPageInner() {
  const canWrite = useHasPermission('sales.write');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillHandled = useRef(false);
  const loadSeqRef = useRef(0);
  const [items, setItems] = useState<CustomerPaymentListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [filters, setFilters] = useState<CustomerPaymentListFilters>(emptyFilters);
  const [customerInput, setCustomerInput] = useState('');
  const [documentInput, setDocumentInput] = useState('');
  const [appliedCustomer, setAppliedCustomer] = useState('');
  const [appliedDocument, setAppliedDocument] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formPrefill, setFormPrefill] = useState<CustomerPaymentPrefill | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<CustomerPaymentListItem | null>(null);
  const [detail, setDetail] = useState<CustomerPaymentListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [referenceReady, setReferenceReady] = useState(false);

  const loadPayments = useCallback(async (
    nextFilters: CustomerPaymentListFilters,
    customerSearch: string,
    documentSearch: string,
  ) => {
    const seq = ++loadSeqRef.current;
    try {
      const rows = await fetchCustomerPayments({
        ...nextFilters,
        customerSearch: customerSearch.trim() || undefined,
        documentSearch: documentSearch.trim() || undefined,
      });
      if (seq !== loadSeqRef.current) return;
      setFilters(nextFilters);
      setAppliedCustomer(customerSearch);
      setAppliedDocument(documentSearch);
      setItems(rows);
    } catch (error) {
      if (seq !== loadSeqRef.current) return;
      message.error(apiErrorMessage(error, 'Không tải được phiếu thu nợ'));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void searchCustomers()
      .then((rows) => {
        if (!cancelled) {
          setCustomers(rows);
          setReferenceReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReferenceReady(true);
      });
    void loadPayments(emptyFilters, '', '');
    return () => {
      cancelled = true;
      loadSeqRef.current += 1;
    };
  }, [loadPayments]);

  useEffect(() => {
    if (prefillHandled.current || !referenceReady) return;
    const prefill = parseCustomerPaymentPrefill(searchParams);
    if (!prefill) return;

    prefillHandled.current = true;
    if (!canWrite) {
      message.warning('Bạn không có quyền ghi nhận thu nợ');
      navigate('/sales/customer-payments', { replace: true });
      return;
    }

    setFormPrefill(prefill);
    setEditingId(null);
    setEditingRow(null);
    setFormOpen(true);
    navigate('/sales/customer-payments', { replace: true });
  }, [searchParams, referenceReady, canWrite, navigate]);

  const customerSuggestions = useMemo(() => {
    const rows = [
      ...customers.map((customer) => ({
        customerName: customer.fullName,
        customerPhone: customer.phone,
      })),
      ...items.map((row) => ({
        customerName: row.customerName,
        customerPhone: null as string | null,
      })),
    ];
    return buildCustomerSearchSuggestions(rows, customerInput);
  }, [customers, items, customerInput]);

  const documentSuggestions = useMemo(() => {
    const numbers = items.flatMap((row) =>
      [row.paymentNumber, row.orderNumber].filter((value): value is string => Boolean(value)),
    );
    return buildDocumentSearchSuggestions(numbers, documentInput);
  }, [items, documentInput]);

  const applySearch = useCallback((values: { customer: string; document: string }) => {
    const customer = values.customer.trim();
    const document = values.document.trim();
    setCustomerInput(customer);
    setDocumentInput(document);
    void loadPayments(filters, customer, document);
  }, [filters, loadPayments]);

  const resetFilters = useCallback(() => {
    setCustomerInput('');
    setDocumentInput('');
    void loadPayments(emptyFilters, '', '');
  }, [loadPayments]);

  const reloadList = useCallback(() => {
    void loadPayments(filters, appliedCustomer, appliedDocument);
  }, [loadPayments, filters, appliedCustomer, appliedDocument]);

  const openCreate = useCallback(() => {
    setFormPrefill(undefined);
    setEditingId(null);
    setEditingRow(null);
    setFormOpen(true);
  }, []);

  const closeFormDrawer = useCallback(() => {
    setFormOpen(false);
    setFormPrefill(undefined);
    setEditingId(null);
    setEditingRow(null);
  }, []);

  const openEdit = useCallback((row: CustomerPaymentListItem) => {
    setFormPrefill(undefined);
    setEditingId(row.id);
    setEditingRow(row);
    setDetailOpen(false);
    setFormOpen(true);
  }, []);

  const openDetail = useCallback((row: CustomerPaymentListItem) => {
    setDetail(row);
    setDetailOpen(true);
  }, []);

  const handleFormSaved = useCallback((saved: CustomerPaymentListItem) => {
    closeFormDrawer();
    setDetail(saved);
    setDetailOpen(true);
    void loadPayments(filters, appliedCustomer, appliedDocument);
  }, [closeFormDrawer, loadPayments, filters, appliedCustomer, appliedDocument]);

  const handlePost = async (id: string) => {
    try {
      setSaving(true);
      const updated = await postCustomerPayment(id);
      message.success('Đã ghi sổ thu nợ');
      setDetail(updated);
      void loadPayments(filters, appliedCustomer, appliedDocument);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không ghi sổ được'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      setSaving(true);
      await cancelCustomerPayment(id);
      message.success('Đã hủy phiếu thu nợ');
      setDetailOpen(false);
      void loadPayments(filters, appliedCustomer, appliedDocument);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không hủy được phiếu'));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<ColumnsType<CustomerPaymentListItem>>(
    () => [
      { title: 'Số phiếu', dataIndex: 'paymentNumber', width: 130 },
      { title: 'Khách hàng', dataIndex: 'customerName' },
      {
        title: 'Số tiền',
        dataIndex: 'amount',
        width: 120,
        align: 'right',
        render: (v: number) => (
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDisplayMoney(v)}</span>
        ),
      },
      {
        title: 'Hình thức',
        dataIndex: 'paymentMethod',
        width: 120,
        render: (m: number) => SALES_PAYMENT_METHOD_LABELS[m] ?? m,
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        width: 110,
        render: (s: number) => (
          <Tag color={CUSTOMER_PAYMENT_STATUS_TAG[s] ?? 'default'}>
            {CUSTOMER_PAYMENT_STATUS_LABELS[s] ?? s}
          </Tag>
        ),
      },
      {
        title: 'Ngày thu',
        dataIndex: 'paymentDate',
        width: 110,
        render: (v: string) => formatDisplayDate(v),
      },
      { title: 'Đơn bán', dataIndex: 'orderNumber', width: 120, render: (v) => v ?? '—' },
      {
        title: '',
        width: 90,
        render: (_, row) => (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              openDetail(row);
            }}
          >
            Xem
          </Button>
        ),
      },
    ],
    [openDetail],
  );

  const handleRowClick = useCallback(
    (record: CustomerPaymentListItem) => ({
      onClick: () => openDetail(record),
      style: { cursor: 'pointer' } as const,
    }),
    [openDetail],
  );

  const handleStatusChange = useCallback((status?: number) => {
    void loadPayments({ ...filters, status }, appliedCustomer, appliedDocument);
  }, [loadPayments, filters, appliedCustomer, appliedDocument]);

  return (
    <Card
      title="Thu nợ khách hàng"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!canWrite}>
          Ghi nhận thu
        </Button>
      }
    >
      <Alert
        type="info"
        showIcon
        style={alertStyle}
        message="Lưu tạo phiếu chờ ghi sổ — nợ trên đơn chỉ giảm sau khi bấm Ghi sổ trong chi tiết phiếu."
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
          documentPlaceholder="Số phiếu / đơn bán"
        />
        <Select
          allowClear
          placeholder="Trạng thái"
          style={statusSelectStyle}
          value={filters.status}
          onChange={handleStatusChange}
          options={statusFilterOptions}
        />
        <Button onClick={resetFilters}>Xóa lọc</Button>
        <Button icon={<ReloadOutlined />} onClick={reloadList}>
          Tải lại
        </Button>
      </SalesListDualSearchWrap>

      <div className={tableWrapClassName}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          pagination={tablePagination}
          scroll={tableScroll}
          onRow={handleRowClick}
        />
      </div>

      {formOpen ? (
        <CustomerPaymentFormDrawer
          open
          editingId={editingId}
          editingRow={editingRow}
          customers={customers}
          prefill={formPrefill}
          onClose={closeFormDrawer}
          onSaved={handleFormSaved}
        />
      ) : null}

      <Drawer
        title={detail ? detail.paymentNumber : 'Chi tiết phiếu thu'}
        width={480}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        extra={
          detail && canWrite ? (
            <Space>
              {detail.status === 1 ? (
                <>
                  <Button icon={<EditOutlined />} onClick={() => openEdit(detail)}>
                    Sửa
                  </Button>
                  <Popconfirm title="Ghi sổ phiếu thu nợ?" onConfirm={() => void handlePost(detail.id)}>
                    <Button type="primary" icon={<CheckOutlined />} loading={saving}>
                      Ghi sổ
                    </Button>
                  </Popconfirm>
                  <Popconfirm title="Hủy phiếu?" onConfirm={() => void handleCancel(detail.id)}>
                    <Button danger icon={<CloseCircleOutlined />} loading={saving}>
                      Hủy
                    </Button>
                  </Popconfirm>
                </>
              ) : null}
            </Space>
          ) : undefined
        }
      >
        {detail ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Khách hàng">{detail.customerName}</Descriptions.Item>
            <Descriptions.Item label="Số tiền">{formatDisplayMoney(detail.amount)}</Descriptions.Item>
            <Descriptions.Item label="Hình thức">
              {SALES_PAYMENT_METHOD_LABELS[detail.paymentMethod] ?? detail.paymentMethod}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={CUSTOMER_PAYMENT_STATUS_TAG[detail.status] ?? 'default'}>
                {CUSTOMER_PAYMENT_STATUS_LABELS[detail.status] ?? detail.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày thu">{formatDisplayDate(detail.paymentDate)}</Descriptions.Item>
            <Descriptions.Item label="Đơn bán">{detail.orderNumber ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Ghi chú">{detail.notes ?? '—'}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </Card>
  );
}

export const CustomerPaymentListPage = memo(CustomerPaymentListPageInner);
