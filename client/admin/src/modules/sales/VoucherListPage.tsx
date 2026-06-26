import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  createVoucherAdmin,
  deleteVoucherAdmin,
  fetchIssuedVouchersAdmin,
  fetchVouchersAdmin,
  issueVoucherAdmin,
  updateVoucherAdmin,
  VOUCHER_DISCOUNT_TYPE,
  VOUCHER_DISCOUNT_TYPE_LABELS,
  VOUCHER_STATUS,
  VOUCHER_STATUS_LABELS,
  type IssuedCustomerVoucher,
  type VoucherAdmin,
} from '@/shared/api/vouchers.api';
import { searchCustomers } from '@/shared/api/sales.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import { useHasPermission } from '@/shared/auth/usePermission';
import { TabularMoney } from '@/modules/sales/sales-ui-styles';
import { VoucherBulkIssueDrawer } from '@/modules/sales/VoucherBulkIssueDrawer';
import {
  formatDisplayMoney,
  moneyInputNumberPropsAllowZeroSuffix,
  moneyInputNumberStyle,
  percentInputNumberProps,
} from '@/shared/utils/money';

type VoucherForm = {
  voucherCode: string;
  voucherName: string;
  discountType: number;
  discountValue: number;
  minOrderAmount: number;
  maxUses?: number | null;
  validRange: [dayjs.Dayjs, dayjs.Dayjs];
  status: boolean;
};

function canDeleteVoucher(row: VoucherAdmin) {
  return row.usedCount === 0;
}

function formatDiscount(row: VoucherAdmin) {
  if (row.discountType === VOUCHER_DISCOUNT_TYPE.Percent) {
    return `${row.discountValue} %`;
  }
  return formatDisplayMoney(row.discountValue);
}

function EditableCell({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return <span>{children}</span>;
  }
  return (
    <Button
      type="link"
      size="small"
      onClick={onClick}
      style={{ padding: 0, height: 'auto', fontWeight: 'inherit', textAlign: 'left', whiteSpace: 'normal' }}
    >
      {children}
    </Button>
  );
}

export function VoucherListPage() {
  const { message } = App.useApp();
  const canWrite = useHasPermission('sales.write');
  const [items, setItems] = useState<VoucherAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string>();
  const [discountType, setDiscountType] = useState<number>(VOUCHER_DISCOUNT_TYPE.Fixed);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<VoucherAdmin | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueTarget, setIssueTarget] = useState<VoucherAdmin | null>(null);
  const [issued, setIssued] = useState<IssuedCustomerVoucher[]>([]);
  const [issuedLoading, setIssuedLoading] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
  const [bulkIssueOpen, setBulkIssueOpen] = useState(false);
  const [form] = Form.useForm<VoucherForm>();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setItems(await fetchVouchersAdmin());
    } catch (error) {
      const errMsg = apiErrorMessage(error, 'Không tải được voucher');
      setLoadError(errMsg);
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setDiscountType(VOUCHER_DISCOUNT_TYPE.Fixed);
    form.setFieldsValue({
      voucherCode: '',
      voucherName: '',
      discountType: VOUCHER_DISCOUNT_TYPE.Fixed,
      discountValue: 50000,
      minOrderAmount: 0,
      maxUses: null,
      validRange: [dayjs(), dayjs().add(30, 'day')],
      status: true,
    });
    setEditOpen(true);
  };

  const openEdit = (row: VoucherAdmin) => {
    setEditing(row);
    setDiscountType(row.discountType);
    form.setFieldsValue({
      voucherCode: row.voucherCode,
      voucherName: row.voucherName,
      discountType: row.discountType,
      discountValue: row.discountValue,
      minOrderAmount: row.minOrderAmount,
      maxUses: row.maxUses ?? null,
      validRange: [dayjs(row.validFrom), dayjs(row.validTo)],
      status: row.status === VOUCHER_STATUS.Active,
    });
    setEditOpen(true);
  };

  const saveVoucher = async () => {
    const values = await form.validateFields();
    const payload = {
      voucherCode: values.voucherCode.trim(),
      voucherName: values.voucherName.trim(),
      discountType: values.discountType,
      discountValue: values.discountValue,
      minOrderAmount: values.minOrderAmount ?? 0,
      maxUses: values.maxUses ?? null,
      validFrom: values.validRange[0].startOf('day').toISOString(),
      validTo: values.validRange[1].endOf('day').toISOString(),
      status: values.status ? VOUCHER_STATUS.Active : VOUCHER_STATUS.Inactive,
    };
    try {
      if (editing) {
        await updateVoucherAdmin(editing.id, payload);
        message.success('Đã cập nhật voucher');
      } else {
        await createVoucherAdmin(payload);
        message.success('Đã tạo voucher');
      }
      setEditOpen(false);
      await load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không lưu được voucher'));
    }
  };

  const handleDelete = async (row: VoucherAdmin) => {
    setDeletingId(row.id);
    try {
      await deleteVoucherAdmin(row.id);
      message.success('Đã xóa voucher');
      await load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không xóa được voucher'));
    } finally {
      setDeletingId(undefined);
    }
  };

  const openIssue = async (row: VoucherAdmin) => {
    setIssueTarget(row);
    setSelectedCustomerId(undefined);
    setCustomerQuery('');
    setIssueOpen(true);
    setIssuedLoading(true);
    try {
      setIssued(await fetchIssuedVouchersAdmin(row.id));
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được danh sách phát'));
    } finally {
      setIssuedLoading(false);
    }
  };

  const searchCustomerOptions = async (text: string) => {
    setCustomerQuery(text);
    if (!text.trim()) {
      setCustomerOptions([]);
      return;
    }
    try {
      const rows = await searchCustomers(text.trim());
      setCustomerOptions(
        rows.map((c) => ({
          value: c.id,
          label: `${c.fullName}${c.phone ? ` · ${c.phone}` : ''}`,
        })),
      );
    } catch {
      setCustomerOptions([]);
    }
  };

  const refreshIssuedList = async () => {
    if (!issueTarget) return;
    setIssued(await fetchIssuedVouchersAdmin(issueTarget.id));
    await load();
  };

  const submitIssue = async () => {
    if (!issueTarget || !selectedCustomerId) {
      message.warning('Chọn khách hàng');
      return;
    }
    try {
      await issueVoucherAdmin(issueTarget.id, selectedCustomerId);
      message.success('Đã phát voucher cho khách');
      setIssued(await fetchIssuedVouchersAdmin(issueTarget.id));
      setSelectedCustomerId(undefined);
      setCustomerQuery('');
      await load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không phát được voucher'));
    }
  };

  const columns: ColumnsType<VoucherAdmin> = useMemo(
    () => [
      {
        title: 'Thao tác',
        key: 'actions',
        width: 72,
        fixed: 'left',
        render: (_, row) => (
          <Space size={0} onClick={(e) => e.stopPropagation()}>
            {canWrite ? (
              <>
                <Tooltip title="Phát cho khách">
                  <Button
                    type="text"
                    size="small"
                    icon={<UserAddOutlined />}
                    aria-label="Phát KH"
                    onClick={() => void openIssue(row)}
                  />
                </Tooltip>
                {canDeleteVoucher(row) ? (
                  <Popconfirm
                    title="Xóa voucher?"
                    description={
                      row.issuedCount > 0
                        ? `${row.voucherCode} · gỡ khỏi ví ${row.issuedCount} khách chưa dùng`
                        : row.voucherCode
                    }
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => void handleDelete(row)}
                  >
                    <Tooltip title="Xóa">
                      <Button
                        type="text"
                        size="small"
                        danger
                        loading={deletingId === row.id}
                        icon={<DeleteOutlined />}
                        aria-label="Xóa"
                      />
                    </Tooltip>
                  </Popconfirm>
                ) : (
                  <Tooltip title="Voucher đã dùng — hãy tắt thay vì xóa">
                    <Button type="text" size="small" danger disabled icon={<DeleteOutlined />} aria-label="Xóa" />
                  </Tooltip>
                )}
              </>
            ) : (
              <Tooltip title="Xem danh sách phát">
                <Button
                  type="text"
                  size="small"
                  icon={<UserAddOutlined />}
                  aria-label="Xem phát"
                  onClick={() => void openIssue(row)}
                />
              </Tooltip>
            )}
          </Space>
        ),
      },
      {
        title: 'Mã',
        dataIndex: 'voucherCode',
        width: 108,
        render: (code: string, row) => (
          <EditableCell disabled={!canWrite} onClick={() => openEdit(row)}>
            <Typography.Text code style={{ fontSize: 11 }}>
              {code}
            </Typography.Text>
          </EditableCell>
        ),
      },
      {
        title: 'Tên',
        dataIndex: 'voucherName',
        ellipsis: { showTitle: true },
        render: (name: string, row) => (
          <EditableCell disabled={!canWrite} onClick={() => openEdit(row)}>
            <span style={{ fontSize: 12 }}>{name}</span>
          </EditableCell>
        ),
      },
      {
        title: 'Giảm',
        key: 'discount',
        width: 96,
        align: 'right',
        render: (_, row) =>
          row.discountType === VOUCHER_DISCOUNT_TYPE.Percent ? (
            formatDiscount(row)
          ) : (
            <TabularMoney>{formatDiscount(row)}</TabularMoney>
          ),
      },
      {
        title: 'Đơn TT',
        dataIndex: 'minOrderAmount',
        width: 96,
        align: 'right',
        render: (v: number) =>
          v > 0 ? <TabularMoney>{formatDisplayMoney(v)}</TabularMoney> : '—',
      },
      {
        title: 'Hiệu lực',
        key: 'valid',
        width: 148,
        render: (_, row) => (
          <span style={{ fontSize: 11 }}>
            {dayjs(row.validFrom).format('DD/MM/YY')} – {dayjs(row.validTo).format('DD/MM/YY')}
          </span>
        ),
      },
      {
        title: 'Dùng/Phát',
        key: 'usage',
        width: 88,
        render: (_, row) => (
          <span style={{ fontSize: 11 }}>
            {row.usedCount}
            {row.maxUses ? `/${row.maxUses}` : ''} · {row.issuedCount}
          </span>
        ),
      },
      {
        title: 'TT',
        dataIndex: 'status',
        width: 72,
        render: (status: number) => (
          <Tag
            color={status === VOUCHER_STATUS.Active ? 'green' : 'default'}
            style={{ margin: 0, fontSize: 11, lineHeight: '18px', padding: '0 6px' }}
          >
            {VOUCHER_STATUS_LABELS[status] ?? status}
          </Tag>
        ),
      },
    ],
    [canWrite, deletingId],
  );

  const tableScrollY = 'calc(100vh - 232px)';

  return (
    <Card
      title="Voucher khách hàng"
      styles={{
        header: { minHeight: 40, padding: '8px 16px' },
        body: { padding: '8px 12px 12px' },
      }}
      extra={
        <Space size={8}>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Làm mới
          </Button>
          {canWrite ? (
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>
              Tạo voucher
            </Button>
          ) : null}
        </Space>
      }
    >
      <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.35 }}>
        Tạo mã giảm giá, phát vào ví khách — khách xem trên app, dược sĩ áp tại POS.
      </Typography.Text>

      {loadError ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
          message="Không tải được danh sách voucher"
          description={
            <>
              {loadError}
              <div style={{ marginTop: 4, fontSize: 12 }}>
                Kiểm tra API đang chạy tại <code>http://localhost:5290</code> — chạy{' '}
                <code>.\scripts\restart-api.ps1</code> nếu cần.
              </div>
            </>
          }
          action={
            <Button size="small" onClick={() => void load()} loading={loading}>
              Thử lại
            </Button>
          }
        />
      ) : null}

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={{
          pageSize: 50,
          size: 'small',
          showSizeChanger: true,
          pageSizeOptions: [20, 50, 100, 200],
          showTotal: (t) => `${t} voucher`,
        }}
        scroll={{ x: 980, y: tableScrollY }}
        size="small"
        style={{ marginTop: 8 }}
      />

      <Modal
        title={editing ? 'Sửa voucher' : 'Tạo voucher'}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => void saveVoucher()}
        okText="Lưu"
        okButtonProps={{ disabled: !canWrite }}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }} disabled={!canWrite}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="voucherCode"
                label="Mã voucher"
                rules={[{ required: true, message: 'Nhập mã' }]}
              >
                <Input placeholder="WELCOME50K" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="status" label="Kích hoạt" valuePropName="checked">
                <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="voucherName"
            label="Tên hiển thị"
            rules={[{ required: true, message: 'Nhập tên' }]}
          >
            <Input placeholder="Giảm 50.000đ đơn từ 300k" />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="discountType" label="Loại giảm">
                <Select
                  onChange={(value) => setDiscountType(Number(value))}
                  options={[
                    { value: VOUCHER_DISCOUNT_TYPE.Fixed, label: VOUCHER_DISCOUNT_TYPE_LABELS[2] },
                    { value: VOUCHER_DISCOUNT_TYPE.Percent, label: VOUCHER_DISCOUNT_TYPE_LABELS[1] },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="discountValue" label="Giá trị" rules={[{ required: true }]}>
                <InputNumber
                  {...(discountType === VOUCHER_DISCOUNT_TYPE.Percent
                    ? percentInputNumberProps
                    : moneyInputNumberPropsAllowZeroSuffix)}
                  style={moneyInputNumberStyle}
                  min={1}
                  max={discountType === VOUCHER_DISCOUNT_TYPE.Percent ? 100 : undefined}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="minOrderAmount" label="Đơn tối thiểu">
                <InputNumber
                  {...moneyInputNumberPropsAllowZeroSuffix}
                  style={moneyInputNumberStyle}
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="maxUses" label="Lượt dùng tối đa (trống = không giới hạn)">
                <InputNumber style={{ width: '100%' }} min={1} placeholder="Không giới hạn" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="validRange"
                label="Hiệu lực"
                rules={[{ required: true, message: 'Chọn thời gian' }]}
              >
                <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={issueTarget ? `Phát voucher · ${issueTarget.voucherCode}` : 'Phát voucher'}
        open={issueOpen}
        onCancel={() => setIssueOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        {canWrite ? (
          <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
            <Typography.Text type="secondary">
              Chọn khách để thêm vào ví (app khách sẽ thấy ngay).
            </Typography.Text>
            <AutoComplete
              style={{ width: '100%' }}
              options={customerOptions}
              value={customerQuery}
              onSearch={(v) => void searchCustomerOptions(v)}
              onSelect={(value, option) => {
                setSelectedCustomerId(String(value));
                setCustomerQuery(String(option.label ?? value));
              }}
              placeholder="Tìm tên / SĐT khách hàng"
            />
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              disabled={!selectedCustomerId}
              onClick={() => void submitIssue()}
            >
              Phát voucher
            </Button>
            <Button icon={<TeamOutlined />} onClick={() => setBulkIssueOpen(true)}>
              Phát cho nhiều KH
            </Button>
          </Space>
        ) : null}
        <Typography.Text strong>Đã phát ({issued.length})</Typography.Text>
        <Table
          size="small"
          style={{ marginTop: 8 }}
          rowKey="customerVoucherId"
          loading={issuedLoading}
          pagination={false}
          dataSource={issued}
          columns={[
            { title: 'Khách', dataIndex: 'customerName' },
            { title: 'SĐT', dataIndex: 'customerPhone', width: 120 },
            {
              title: 'Phát lúc',
              dataIndex: 'issuedAt',
              width: 130,
              render: (v: string) => dayjs(v).format('DD/MM/YY HH:mm'),
            },
            {
              title: 'Trạng thái',
              key: 'used',
              width: 100,
              render: (_, row) => (row.usedAt ? <Tag>Đã dùng</Tag> : <Tag color="green">Chưa dùng</Tag>),
            },
          ]}
        />
      </Modal>

      <VoucherBulkIssueDrawer
        open={bulkIssueOpen}
        voucher={issueTarget}
        onClose={() => setBulkIssueOpen(false)}
        onIssued={refreshIssuedList}
      />
    </Card>
  );
}
