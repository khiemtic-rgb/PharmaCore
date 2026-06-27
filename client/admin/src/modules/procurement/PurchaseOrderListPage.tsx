import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { isAxiosError } from 'axios';
import { PlusOutlined, EyeOutlined, EditOutlined, CheckOutlined, CloseCircleOutlined, LockOutlined, EyeInvisibleOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { fetchProducts } from '@/shared/api/catalog.api';
import type { ProductListItem } from '@/shared/api/catalog.types';
import { fetchWarehouses } from '@/shared/api/inventory.api';
import type { Warehouse } from '@/shared/api/inventory.types';
import {
  approvePurchaseOrder,
  archivePurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrder,
  createPurchaseOrder,
  fetchPurchaseOrder,
  fetchPurchaseOrders,
  fetchSuppliers,
  fetchVatTreatments,
  purgePurchaseOrder,
} from '@/shared/api/procurement.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import type {
  ProcurementVatTreatment,
  PurchaseOrderDetail,
  PurchaseOrderListFilters,
  PurchaseOrderListItem,
  Supplier,
} from '@/shared/api/procurement.types';
import { PO_STATUS_LABELS, PO_STATUS_TAG, canEditPurchaseOrder } from '@/shared/api/procurement.types';
import { PurchaseOrderEditDrawer } from '@/modules/procurement/PurchaseOrderEditDrawer';
import { PoReadonlyTaxSummaryFooter, PROCUREMENT_MONEY_COL_WIDTH } from '@/modules/procurement/GrnPoTaxSummary';
import { PurchaseOrderFormHeader } from '@/modules/procurement/PurchaseOrderFormHeader';
import { PurchaseOrderLinesEditor } from '@/modules/procurement/PurchaseOrderLinesEditor';
import { defaultVatTreatmentId } from '@/modules/procurement/po-vat';
import { PurchaseOrderFilterBar } from '@/modules/procurement/PurchaseOrderFilterBar';
import { downloadCsv } from '@/shared/utils/download-csv';
import { formatDisplayDate } from '@/shared/utils/date';
import { formatDisplayMoney } from '@/shared/utils/money';
import {
  procurementQuantityColumn,
  procurementRemainingQtyColumn,
} from '@/modules/procurement/procurement-quantity-cell';
import { useProcurementWrite, useSystemDeletePermanent } from '@/shared/auth/usePermission';
import { useSearchParams } from 'react-router-dom';

interface PoLineForm {
  productId: string;
  productUnitId: string;
  orderedQty: number;
  unitPrice: number;
}

const emptyFilters: PurchaseOrderListFilters = {};

export function PurchaseOrderListPage() {
  const canWrite = useProcurementWrite();
  const canPurge = useSystemDeletePermanent();
  const [searchParams] = useSearchParams();
  const initialFilters = useMemo((): PurchaseOrderListFilters => {
    const pending = searchParams.get('pendingReceipt');
    if (pending === '1' || pending === 'true') return { pendingReceiptOnly: true };
    return emptyFilters;
  }, [searchParams]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PurchaseOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [vatTreatments, setVatTreatments] = useState<ProcurementVatTreatment[]>([]);
  const [filters, setFilters] = useState<PurchaseOrderListFilters>(emptyFilters);
  const [searchInput, setSearchInput] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);
  const [poDetailCache, setPoDetailCache] = useState<Record<string, PurchaseOrderDetail>>({});
  const poDetailCacheRef = useRef(poDetailCache);
  poDetailCacheRef.current = poDetailCache;
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [editPoOpen, setEditPoOpen] = useState(false);
  const supplierId = Form.useWatch('supplierId', form);

  const loadMasterData = useCallback(async () => {
    const [sup, wh, prod, vat] = await Promise.all([
      fetchSuppliers(true),
      fetchWarehouses(),
      fetchProducts({ page: 1, pageSize: 200 }),
      fetchVatTreatments(),
    ]);
    setSuppliers(sup);
    setWarehouses(wh);
    setProducts(prod.items);
    setVatTreatments(vat);
  }, []);

  const loadOrders = useCallback(async (
    nextFilters: PurchaseOrderListFilters,
    search: string,
    nextPage = 1,
    nextPageSize = pageSize,
  ) => {
    setFilters(nextFilters);
    setSearchInput(search);
    setPage(nextPage);
    setPageSize(nextPageSize);
    setLoading(true);
    try {
      const result = await fetchPurchaseOrders({
        ...nextFilters,
        search: search.trim() || undefined,
        page: nextPage,
        pageSize: nextPageSize,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được đơn đặt hàng'));
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    void loadMasterData().catch(() => {
      message.error('Không tải được dữ liệu tham chiếu');
    });
    void loadOrders(initialFilters, '');
  }, [loadMasterData, loadOrders, initialFilters]);

  const resetFilters = () => {
    void loadOrders(emptyFilters, '');
  };

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      items: [{ orderedQty: 1, unitPrice: 0 }],
      vatTreatmentId: defaultVatTreatmentId(vatTreatments),
    });
    setDrawerOpen(true);
  };

  const openDetail = async (id: string) => {
    try {
      const po = await fetchPurchaseOrder(id);
      setDetail(po);
      setPoDetailCache((cache) => ({ ...cache, [id]: po }));
      setDetailOpen(true);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được chi tiết đơn đặt hàng'));
    }
  };

  const loadPoExpand = async (id: string) => {
    if (poDetailCache[id]) return;
    try {
      const po = await fetchPurchaseOrder(id);
      setPoDetailCache((cache) => ({ ...cache, [id]: po }));
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được dòng hàng'));
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const created = await createPurchaseOrder({
        supplierId: values.supplierId,
        warehouseId: values.warehouseId,
        expectedDate: values.expectedDate || undefined,
        notes: values.notes,
        vatTreatmentId: values.vatTreatmentId,
        items: (values.items as PoLineForm[]).map((i) => ({
          productId: i.productId,
          productUnitId: i.productUnitId,
          orderedQty: i.orderedQty,
          unitPrice: i.unitPrice,
        })),
      });
      const approved = await approvePurchaseOrder(created.id);
      message.success(`Đã tạo ${approved.poNumber}`);
      setDrawerOpen(false);
      void loadOrders(filters, searchInput, page, pageSize);
    } catch (error) {
      if (isAxiosError(error)) {
        message.error(apiErrorMessage(error, 'Không tạo được đơn đặt hàng'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const updated = await approvePurchaseOrder(id);
      message.success(`Đã duyệt ${updated.poNumber}`);
      if (detail?.id === id) setDetail(updated);
      void loadOrders(filters, searchInput, page, pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không duyệt được đơn'));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelPurchaseOrder(id);
      message.success('Đã hủy đơn đặt hàng');
      if (detail?.id === id) setDetail(await fetchPurchaseOrder(id));
      void loadOrders(filters, searchInput, page, pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không hủy được đơn'));
    }
  };

  const handleClose = async (id: string) => {
    try {
      const updated = await closePurchaseOrder(id);
      message.success(`Đã đóng ${updated.poNumber}`);
      if (detail?.id === id) setDetail(updated);
      void loadOrders(filters, searchInput, page, pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không đóng được đơn'));
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archivePurchaseOrder(id);
      message.success('Đã ẩn đơn đặt hàng (có thể xem trong bản ghi đã ẩn)');
      setDetailOpen(false);
      setDetail(null);
      void loadOrders(filters, searchInput, page, pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không ẩn được đơn'));
    }
  };

  const handlePurge = async (id: string) => {
    try {
      await purgePurchaseOrder(id);
      message.success('Đã xóa vĩnh viễn đơn đặt hàng');
      setDetailOpen(false);
      setDetail(null);
      void loadOrders(filters, searchInput, page, pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không xóa vĩnh viễn được đơn'));
    }
  };

  const canArchivePo = (status: number, deletedAt?: string) => status === 6 && !deletedAt;
  const showLockedDeletePo = (status: number, deletedAt?: string) =>
    status !== 1 && status !== 6 && !deletedAt;

  const exportOrders = () => {
    if (items.length === 0) {
      message.info('Không có dữ liệu để xuất');
      return;
    }
    downloadCsv(
      `don-dat-hang-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Số PO', 'NCC', 'Kho nhận', 'Trạng thái', 'Ngày đặt', 'Số dòng', 'Tổng tiền'],
      items.map((row) => [
        row.poNumber,
        row.supplierName,
        row.warehouseName,
        PO_STATUS_LABELS[row.status] ?? String(row.status),
        formatDisplayDate(row.orderDate),
        String(row.itemCount),
        formatDisplayMoney(row.totalAmount),
      ]),
    );
  };

  const columns: ColumnsType<PurchaseOrderListItem> = [
    { title: 'Số PO', dataIndex: 'poNumber', width: 140 },
    { title: 'NCC', dataIndex: 'supplierName' },
    { title: 'Kho nhận', dataIndex: 'warehouseName' },
    {
      title: 'Ngày đặt',
      dataIndex: 'orderDate',
      width: 110,
      render: (v: string) => formatDisplayDate(v),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (s: number, row) => (
        <Space size={4}>
          <Tag color={PO_STATUS_TAG[s] ?? 'default'}>{PO_STATUS_LABELS[s] ?? s}</Tag>
          {row.deletedAt ? <Tag color="default">Đã ẩn</Tag> : null}
        </Space>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      width: 120,
      align: 'right',
      render: (v: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDisplayMoney(v)}</span>
      ),
    },
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
            void openDetail(row.id);
          }}
        >
          Xem
        </Button>
      ),
    },
  ];

  const poLineColumns: ColumnsType<PurchaseOrderDetail['items'][number]> = [
    { title: 'Mã SP', dataIndex: 'productCode', width: 90 },
    { title: 'Tên SP', dataIndex: 'productName', width: 280, ellipsis: true },
    { title: 'ĐVT', dataIndex: 'unitName', width: 64 },
    procurementQuantityColumn('Đặt', 'orderedQty', 68),
    procurementQuantityColumn('Đã nhận', 'receivedQty', 76),
    procurementRemainingQtyColumn(),
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      width: PROCUREMENT_MONEY_COL_WIDTH,
      align: 'right',
      render: (v: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', display: 'block', textAlign: 'right' }}>
          {formatDisplayMoney(v)}
        </span>
      ),
    },
  ];

  return (
    <Card
      title="Đơn đặt hàng"
      extra={
        canWrite ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo đơn
          </Button>
        ) : undefined
      }
    >
      <PurchaseOrderFilterBar
        filters={filters}
        searchInput={searchInput}
        suppliers={suppliers}
        warehouses={warehouses}
        products={products}
        loading={loading}
        onSearchInputChange={setSearchInput}
        onApply={loadOrders}
        onReset={resetFilters}
        onExport={exportOrders}
      />

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `${t} đơn`,
          onChange: (nextPage, nextPageSize) => {
            void loadOrders(filters, searchInput, nextPage, nextPageSize);
          },
        }}
        scroll={{ x: 1000 }}
        onRow={(record) => ({
          onClick: () => void openDetail(record.id),
          style: { cursor: 'pointer' },
        })}
        expandable={{
          onExpand: (expanded, record) => {
            if (expanded) void loadPoExpand(record.id);
          },
          expandedRowRender: (record) => {
            const po = poDetailCache[record.id];
            if (!po) return <Spin size="small" />;
            return (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                className="grn-lines-table"
                dataSource={po.items}
                columns={poLineColumns}
              />
            );
          },
        }}
      />

      <Drawer
        title="Tạo đơn đặt hàng"
        width={980}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{ body: { paddingTop: 12, display: 'flex', flexDirection: 'column' } }}
        extra={
          <Button type="primary" icon={<SaveOutlined />} onClick={() => void handleCreate()} loading={saving}>
            Tạo đơn
          </Button>
        }
      >
        <Form form={form} layout="vertical" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <PurchaseOrderFormHeader
            form={form}
            mode="create"
            vatTreatments={vatTreatments}
            suppliers={suppliers}
            warehouses={warehouses}
          />
          <PurchaseOrderLinesEditor
            form={form}
            supplierId={supplierId}
            products={products}
            mode="create"
            scrollY={420}
          />
        </Form>
      </Drawer>

      <Drawer
        title={detail ? `Xem ${detail.poNumber}` : 'Xem đơn đặt hàng'}
        width={880}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        extra={
          detail &&
          canWrite && (
            <Space>
              {canEditPurchaseOrder(detail.status) && !detail.deletedAt && (
                <Button icon={<EditOutlined />} onClick={() => setEditPoOpen(true)}>
                  Sửa đơn
                </Button>
              )}
              {detail.status === 1 && (
                <Button type="primary" icon={<CheckOutlined />} onClick={() => handleApprove(detail.id)}>
                  Duyệt
                </Button>
              )}
              {(detail.status === 1 || detail.status === 2) && (
                <Popconfirm title="Huỷ đơn đặt hàng này?" onConfirm={() => void handleCancel(detail.id)}>
                  <Button danger icon={<CloseCircleOutlined />}>
                    Huỷ đơn
                  </Button>
                </Popconfirm>
              )}
              {detail.status === 4 && (
                <Button type="primary" icon={<LockOutlined />} onClick={() => handleClose(detail.id)}>
                  Đóng đơn
                </Button>
              )}
              {canArchivePo(detail.status, detail.deletedAt) && (
                <Popconfirm title="Ẩn đơn đã huỷ khỏi danh sách?" onConfirm={() => void handleArchive(detail.id)}>
                  <Button danger icon={<EyeInvisibleOutlined />}>
                    Ẩn đơn
                  </Button>
                </Popconfirm>
              )}
              {detail.deletedAt && canPurge && (
                <Popconfirm
                  title="Xóa vĩnh viễn? Không thể hoàn tác."
                  onConfirm={() => void handlePurge(detail.id)}
                >
                  <Button danger type="primary" icon={<DeleteOutlined />}>
                    Xóa vĩnh viễn
                  </Button>
                </Popconfirm>
              )}
              {showLockedDeletePo(detail.status, detail.deletedAt) && (
                <Tooltip title="Chỉ ẩn được đơn đã huỷ">
                  <Button disabled icon={<EyeInvisibleOutlined />}>
                    Ẩn đơn
                  </Button>
                </Tooltip>
              )}
            </Space>
          )
        }
      >
        {detail && (
          <>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="NCC">{detail.supplierName}</Descriptions.Item>
              <Descriptions.Item label="Kho">{detail.warehouseName}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={PO_STATUS_TAG[detail.status] ?? 'default'}>{PO_STATUS_LABELS[detail.status]}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <div className="grn-lines-detail-panel">
              <p className="grn-lines-detail-panel__title">Chi tiết hàng đặt</p>
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                className="grn-lines-table"
                scroll={{ x: 760 }}
                dataSource={detail.items}
                columns={poLineColumns}
                summary={() => (
                  <PoReadonlyTaxSummaryFooter
                    subtotal={detail.subtotal}
                    taxAmount={detail.taxAmount}
                    totalAmount={detail.totalAmount}
                    poNumber={detail.poNumber}
                    vatTreatmentName={detail.vatTreatmentName}
                    leadingColSpan={5}
                  />
                )}
              />
            </div>
          </>
        )}
      </Drawer>

      <PurchaseOrderEditDrawer
        poId={detail?.id ?? null}
        open={editPoOpen}
        onClose={() => setEditPoOpen(false)}
        onSaved={(po) => {
          setDetail(po);
          setPoDetailCache((cache) => ({ ...cache, [po.id]: po }));
          void loadOrders(filters, searchInput, page, pageSize);
        }}
      />
    </Card>
  );
}
