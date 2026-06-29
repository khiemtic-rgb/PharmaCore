import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Descriptions, Drawer, AutoComplete, Input, Space, Spin, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DollarOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { fetchCustomerReceivables, fetchCustomerReceivablesDetail, searchCustomers } from '@/shared/api/sales.api';
import type { CustomerListItem, CustomerReceivablesDetail, CustomerReceivablesDetailLine, CustomerReceivablesRow } from '@/shared/api/sales.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { buildCustomerPaymentCreateUrl } from '@/modules/sales/customer-payment-nav';
import { buildCustomerSearchSuggestions, matchesCustomerNameOrPhone, resolveCustomerPhone } from '@/modules/sales/sales-list-customer-search';
import { filterBarStyle } from '@/modules/sales/sales-ui-styles';
import { useHasPermission } from '@/shared/auth/usePermission';
import { formatDisplayDate } from '@/shared/utils/date';
import { formatDisplayMoney } from '@/shared/utils/money';

function agingCell(value: number) {
  return value > 0.009 ? formatDisplayMoney(value) : '—';
}

export function CustomerReceivablesPage() {
  const canWrite = useHasPermission('sales.write');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CustomerReceivablesRow[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<CustomerReceivablesDetail | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchCustomerReceivables());
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được báo cáo công nợ khách hàng'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
    void searchCustomers()
      .then(setCustomers)
      .catch(() => {
        /* gợi ý SĐT tùy chọn */
      });
  }, [loadSummary]);

  const rowsWithPhone = useMemo(() => {
    const phoneById = new Map(
      customers.map((customer) => [customer.id, customer.phone?.trim() || null]),
    );
    const phoneByCode = new Map(
      customers.map((customer) => [customer.customerCode, customer.phone?.trim() || null]),
    );
    return rows.map((row) => ({
      ...row,
      customerPhone: resolveCustomerPhone(
        row.customerPhone,
        phoneById.get(row.customerId) ?? phoneByCode.get(row.customerCode) ?? null,
      ),
    }));
  }, [rows, customers]);

  const searchSuggestions = useMemo(
    () => buildCustomerSearchSuggestions(rowsWithPhone, search),
    [rowsWithPhone, search],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim();
    if (!q) return rowsWithPhone;
    return rowsWithPhone.filter((row) => matchesCustomerNameOrPhone(q, row.customerName, row.customerPhone));
  }, [rowsWithPhone, search]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, row) => ({
          receivable: acc.receivable + row.totalReceivable,
          current: acc.current + row.aging.current,
          days31To60: acc.days31To60 + row.aging.days31To60,
          days61To90: acc.days61To90 + row.aging.days61To90,
          over90: acc.over90 + row.aging.over90,
        }),
        { receivable: 0, current: 0, days31To60: 0, days61To90: 0, over90: 0 },
      ),
    [filteredRows],
  );

  const openDetail = async (customerId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await fetchCustomerReceivablesDetail(customerId));
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được chi tiết công nợ'));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const goToPayment = (prefill: { customerId: string; salesOrderId?: string; amount?: number }) => {
    navigate(buildCustomerPaymentCreateUrl(prefill));
  };

  const detailColumns: ColumnsType<CustomerReceivablesDetailLine> = useMemo(() => {
    const base: ColumnsType<CustomerReceivablesDetailLine> = [
      { title: 'Số đơn', dataIndex: 'orderNumber', width: 130 },
      {
        title: 'Ngày bán',
        dataIndex: 'orderDate',
        width: 120,
        render: (v: string) => formatDisplayDate(v),
      },
      {
        title: 'Tổng đơn',
        dataIndex: 'orderTotal',
        align: 'right',
        render: (v: number) => formatDisplayMoney(v),
      },
      {
        title: 'Đã thu',
        dataIndex: 'paidAmount',
        align: 'right',
        render: (v: number) => formatDisplayMoney(v),
      },
      {
        title: 'Còn nợ',
        dataIndex: 'outstanding',
        align: 'right',
        render: (v: number) => formatDisplayMoney(v),
      },
      {
        title: 'Tuổi nợ (ngày)',
        dataIndex: 'daysOutstanding',
        width: 120,
        align: 'center',
      },
    ];

    if (!canWrite) return base;

    return [
      ...base,
      {
        title: '',
        width: 100,
        render: (_, line) =>
          line.outstanding > 0.009 && detail ? (
            <Button
              type="link"
              size="small"
              icon={<DollarOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                goToPayment({
                  customerId: detail.customerId,
                  salesOrderId: line.salesOrderId,
                  amount: line.outstanding,
                });
              }}
            >
              Thu nợ
            </Button>
          ) : null,
      },
    ];
  }, [canWrite, detail, navigate]);

  const columns: ColumnsType<CustomerReceivablesRow> = [
    { title: 'Mã KH', dataIndex: 'customerCode', width: 110 },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      width: 280,
      ellipsis: { showTitle: true },
    },
    {
      title: 'Còn phải thu',
      dataIndex: 'totalReceivable',
      width: 140,
      align: 'right',
      render: (v: number) => formatDisplayMoney(v),
    },
    {
      title: '0–30 ngày',
      width: 120,
      align: 'right',
      render: (_, row) => agingCell(row.aging.current),
    },
    {
      title: '31–60',
      width: 110,
      align: 'right',
      render: (_, row) => agingCell(row.aging.days31To60),
    },
    {
      title: '61–90',
      width: 110,
      align: 'right',
      render: (_, row) => agingCell(row.aging.days61To90),
    },
    {
      title: '> 90',
      width: 110,
      align: 'right',
      render: (_, row) => agingCell(row.aging.over90),
    },
    {
      title: 'Đơn mở',
      dataIndex: 'openDocumentCount',
      width: 90,
      align: 'center',
    },
  ];

  return (
    <Card title="Công nợ khách hàng" bordered={false}>
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Công nợ theo trường còn nợ trên đơn bán đã hoàn tất. Phiếu thu nợ không gắn đơn được bù trừ theo thứ tự đơn
        cũ nhất khi ghi sổ.
      </Typography.Paragraph>

      <Space wrap style={filterBarStyle}>
        <AutoComplete
          style={{ width: 280 }}
          options={searchSuggestions}
          value={search}
          filterOption={false}
          onSelect={(value) => setSearch(String(value))}
          onChange={(value) => setSearch(value)}
        >
          <Input allowClear placeholder="Tên khách hoặc SĐT" prefix={<SearchOutlined />} />
        </AutoComplete>
        {search ? (
          <Button onClick={() => setSearch('')}>Xóa lọc</Button>
        ) : null}
      </Space>

      <Table
        rowKey="customerId"
        loading={loading}
        columns={columns}
        dataSource={filteredRows}
        pagination={{ pageSize: 20, showTotal: (total) => `${total} khách hàng` }}
        scroll={{ x: 1100 }}
        summary={() =>
          filteredRows.length > 0 ? (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <strong>Tổng</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <strong>{formatDisplayMoney(totals.receivable)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  {agingCell(totals.current)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  {agingCell(totals.days31To60)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  {agingCell(totals.days61To90)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  {agingCell(totals.over90)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} />
              </Table.Summary.Row>
            </Table.Summary>
          ) : null
        }
        onRow={(record) => ({
          onClick: () => void openDetail(record.customerId),
          style: { cursor: 'pointer' },
        })}
      />

      <Drawer
        title={detail ? `Công nợ — ${detail.customerName}` : 'Chi tiết công nợ'}
        width={880}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        destroyOnClose
        extra={
          detail && canWrite && detail.totalReceivable > 0.009 ? (
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={() =>
                goToPayment({
                  customerId: detail.customerId,
                  amount: detail.totalReceivable,
                })
              }
            >
              Tạo phiếu thu
            </Button>
          ) : undefined
        }
      >
        {detailLoading ? (
          <Spin tip="Đang tải chi tiết..." />
        ) : detail ? (
          <>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã KH">{detail.customerCode}</Descriptions.Item>
              <Descriptions.Item label="Còn phải thu">{formatDisplayMoney(detail.totalReceivable)}</Descriptions.Item>
              <Descriptions.Item label="Thu chưa phân bổ" span={2}>
                {detail.unappliedCredit > 0.009 ? formatDisplayMoney(detail.unappliedCredit) : '—'}
              </Descriptions.Item>
            </Descriptions>
            <Table
              rowKey="salesOrderId"
              size="small"
              pagination={false}
              dataSource={detail.lines.filter((line) => line.outstanding > 0.009)}
              columns={detailColumns}
            />
          </>
        ) : null}
      </Drawer>
    </Card>
  );
}
