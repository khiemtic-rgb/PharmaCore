import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FormListFieldData } from 'antd/es/form/FormList';
import { isAxiosError } from 'axios';
import { PlusOutlined, EyeOutlined, DeleteOutlined, SaveOutlined, FolderOpenOutlined, CheckOutlined, CloseCircleOutlined, EyeInvisibleOutlined, PrinterOutlined } from '@ant-design/icons';
import { fetchProducts } from '@/shared/api/catalog.api';
import type { ProductListItem } from '@/shared/api/catalog.types';
import { fetchWarehouses } from '@/shared/api/inventory.api';
import type { Warehouse } from '@/shared/api/inventory.types';
import {
  cancelGoodsReceipt,
  completeGoodsReceipt,
  createGoodsReceipt,
  archiveGoodsReceipt,
  fetchGoodsReceipt,
  fetchGoodsReceipts,
  fetchPurchaseOrder,
  fetchPurchaseOrders,
  fetchSuppliers,
  fetchVatTreatments,
  purgeGoodsReceipt,
} from '@/shared/api/procurement.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import type {
  GoodsReceiptDetail,
  GoodsReceiptListFilters,
  GoodsReceiptListItem,
  ProcurementVatTreatment,
  PurchaseOrderDetail,
  PurchaseOrderListItem,
  Supplier,
} from '@/shared/api/procurement.types';
import { GRN_STATUS_LABELS, GRN_STATUS_TAG } from '@/shared/api/procurement.types';
import { PurchaseOrderEditDrawer } from '@/modules/procurement/PurchaseOrderEditDrawer';
import { GoodsReceiptFormHeader } from '@/modules/procurement/GoodsReceiptFormHeader';
import { GrnPoLinesEditor } from '@/modules/procurement/GrnPoLinesEditor';
import { GrnDetailView, GrnDetailLinesPanel } from '@/modules/procurement/GrnDetailView';
import { PROCUREMENT_DRAWER_WIDTH } from '@/modules/procurement/procurement-layout';
import {
  GrnLineDiscountFields,
  GrnPricingControls,
  GrnPricingSummaryPanel,
} from '@/modules/procurement/GrnPricingPanel';
import { defaultVatTreatmentId } from '@/modules/procurement/po-vat';
import { isPlaceholderSupplier } from '@/modules/procurement/grn-pricing';
import { printGoodsReceipt } from '@/shared/print/grn-print';
import { ProductUnitSelect } from '@/modules/procurement/ProductUnitSelect';
import { PoUnitPriceField } from '@/modules/procurement/PoUnitPriceField';
import { PharmaExpiryPicker } from '@/shared/ui/PharmaDatePicker';
import { GoodsReceiptFilterBar } from '@/modules/procurement/GoodsReceiptFilterBar';
import { formatDisplayDate } from '@/shared/utils/date';
import { downloadCsv } from '@/shared/utils/download-csv';
import { quantityInputNumberProps } from '@/shared/utils/money';
import { useProcurementWrite, useSystemDeletePermanent } from '@/shared/auth/usePermission';

const emptyFilters: GoodsReceiptListFilters = {};

interface GrnLineForm {
  purchaseOrderItemId?: string;
  productId: string;
  productUnitId: string;
  productCode?: string;
  productName?: string;
  unitName?: string;
  orderedQty?: number;
  receivedQty?: number;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
  discountType?: number;
  discountValue?: number;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultExpiryDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return d.toISOString().slice(0, 10);
}

function emptyGrnLine(): GrnLineForm {
  return {
    productId: '',
    productUnitId: '',
    batchNumber: '',
    expiryDate: defaultExpiryDate(),
    quantity: 1,
    unitCost: 0,
  };
}

function buildGrnLinesFromPo(po: PurchaseOrderDetail): GrnLineForm[] {
  const expiry = defaultExpiryDate();
  return po.items
    .filter((line) => line.receivedQty < line.orderedQty)
    .map((line) => ({
      purchaseOrderItemId: line.id,
      productId: line.productId,
      productUnitId: line.productUnitId,
      productCode: line.productCode,
      productName: line.productName,
      unitName: line.unitName,
      orderedQty: line.orderedQty,
      receivedQty: line.receivedQty,
      batchNumber: '',
      expiryDate: expiry,
      quantity: line.orderedQty - line.receivedQty,
      unitCost: line.unitPrice,
    }));
}

export function GoodsReceiptListPage() {
  const canWrite = useProcurementWrite();
  const canPurge = useSystemDeletePermanent();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GoodsReceiptListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vatTreatments, setVatTreatments] = useState<ProcurementVatTreatment[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrderListItem[]>([]);
  const [approvedPos, setApprovedPos] = useState<PurchaseOrderListItem[]>([]);
  const [filters, setFilters] = useState<GoodsReceiptListFilters>(emptyFilters);
  const [searchInput, setSearchInput] = useState('');
  const [linkedPo, setLinkedPo] = useState<PurchaseOrderDetail | null>(null);
  const [poDraftGrn, setPoDraftGrn] = useState<GoodsReceiptListItem | null>(null);
  const [poLoading, setPoLoading] = useState(false);
  const [grnDetailCache, setGrnDetailCache] = useState<Record<string, GoodsReceiptDetail>>({});
  const grnDetailCacheRef = useRef(grnDetailCache);
  grnDetailCacheRef.current = grnDetailCache;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<GoodsReceiptDetail | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [poEditOpen, setPoEditOpen] = useState(false);
  const purchaseOrderId = Form.useWatch('purchaseOrderId', form);
  const supplierId = Form.useWatch('supplierId', form);

  const loadMasterData = useCallback(async () => {
    const [sup, wh, prod, pos, pendingPos, vat] = await Promise.all([
      fetchSuppliers(true),
      fetchWarehouses(),
      fetchProducts({ page: 1, pageSize: 200 }),
      fetchPurchaseOrders({ page: 1, pageSize: 500 }),
      fetchPurchaseOrders({ pendingReceiptOnly: true, page: 1, pageSize: 500 }),
      fetchVatTreatments(),
    ]);
    setSuppliers(sup);
    setVatTreatments(vat);
    setWarehouses(wh);
    setProducts(prod.items);
    setAllPurchaseOrders(pos.items);
    setApprovedPos(pendingPos.items);
  }, []);

  const loadReceipts = useCallback(async (
    nextFilters: GoodsReceiptListFilters,
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
      const result = await fetchGoodsReceipts({
        ...nextFilters,
        search: search.trim() || undefined,
        page: nextPage,
        pageSize: nextPageSize,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được phiếu nhập hàng'));
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    void loadMasterData().catch(() => {
      message.error('Không tải được dữ liệu tham chiếu');
    });
    void loadReceipts(emptyFilters, '');
  }, [loadMasterData, loadReceipts]);

  const resetFilters = () => {
    void loadReceipts(emptyFilters, '');
  };

  const exportReceipts = () => {
    if (items.length === 0) {
      message.info('Không có dữ liệu để xuất');
      return;
    }
    downloadCsv(
      `phieu-nhap-hang-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Số phiếu', 'NCC', 'Kho', 'PO', 'Trạng thái', 'Ngày nhập', 'Số dòng'],
      items.map((row) => [
        row.grnNumber,
        row.supplierName,
        row.warehouseName,
        row.poNumber ?? '—',
        GRN_STATUS_LABELS[row.status] ?? String(row.status),
        formatDisplayDate(row.receiptDate),
        String(row.itemCount),
      ]),
    );
  };

  useEffect(() => {
    if (!purchaseOrderId) {
      setLinkedPo(null);
      setPoDraftGrn(null);
      setPoLoading(false);
      return;
    }

    let cancelled = false;
    setPoLoading(true);
    setLinkedPo(null);
    setPoDraftGrn(null);
    form.setFieldsValue({ items: [] });

    fetchGoodsReceipts({ purchaseOrderId, status: 1, page: 1, pageSize: 20 })
      .then(async (result) => {
        if (cancelled) return;
        const draft = result.items[0];
        if (draft) {
          setPoDraftGrn(draft);
          return;
        }

        const po = await fetchPurchaseOrder(purchaseOrderId);
        if (cancelled) return;
        setLinkedPo(po);
        const lines = buildGrnLinesFromPo(po);
        form.setFieldsValue({
          supplierId: po.supplierId,
          warehouseId: po.warehouseId,
          vatTreatmentId: po.vatTreatmentId || defaultVatTreatmentId(vatTreatments),
          items: lines,
        });
        if (lines.length === 0) {
          message.info('PO này đã nhận đủ hàng.');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLinkedPo(null);
          setPoDraftGrn(null);
          message.error('Không tải được chi tiết PO.');
        }
      })
      .finally(() => {
        if (!cancelled) setPoLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [purchaseOrderId, form]);

  const handlePoEdited = (po: PurchaseOrderDetail) => {
    setLinkedPo(po);
    const lines = buildGrnLinesFromPo(po);
    const currentItems = (form.getFieldValue('items') as GrnLineForm[] | undefined) ?? [];
    const merged = lines.map((line) => {
      const prev = currentItems.find((i) => i.purchaseOrderItemId === line.purchaseOrderItemId);
      if (!prev) return line;
      return {
        ...line,
        batchNumber: prev.batchNumber,
        expiryDate: prev.expiryDate,
        quantity: prev.quantity,
        unitCost: prev.unitCost,
      };
    });
    form.setFieldsValue({ items: merged });
    void loadMasterData();
  };

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      receiptDate: todayDateString(),
      vatTreatmentId: defaultVatTreatmentId(vatTreatments),
      items: [emptyGrnLine()],
    });
    setLinkedPo(null);
    setPoDraftGrn(null);
    setPoLoading(false);
    setDrawerOpen(true);
  };

  const openExistingDraftGrn = async (id: string) => {
    setDrawerOpen(false);
    await openDetail(id);
  };

  const loadGrnExpand = async (id: string) => {
    if (grnDetailCache[id]) return;
    try {
      const grn = await fetchGoodsReceipt(id);
      setGrnDetailCache((cache) => ({ ...cache, [id]: grn }));
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được chi tiết phiếu nhập'));
    }
  };

  const openDetail = async (id: string) => {
    try {
      const grn = await fetchGoodsReceipt(id);
      setDetail(grn);
      setDetailOpen(true);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được chi tiết phiếu nhập'));
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const lines = (values.items as GrnLineForm[]).filter((i) => i.quantity > 0);
      if (lines.length === 0) {
        message.warning('Thêm ít nhất một dòng nhập có số lượng > 0.');
        return;
      }
      const supplier = suppliers.find((s) => s.id === values.supplierId);
      if (!supplier || isPlaceholderSupplier(supplier)) {
        message.warning('Chọn NCC thật trước khi lưu phiếu nhập.');
        return;
      }
      setSaving(true);
      const created = await createGoodsReceipt({
        purchaseOrderId: values.purchaseOrderId,
        supplierId: values.supplierId,
        warehouseId: values.warehouseId,
        receiptDate: values.receiptDate || todayDateString(),
        notes: values.notes,
        vatTreatmentId: values.vatTreatmentId,
        orderDiscountType: values.orderDiscountType,
        orderDiscountValue: values.orderDiscountValue,
        items: lines.map((i) => ({
          purchaseOrderItemId: i.purchaseOrderItemId,
          productId: i.productId,
          productUnitId: i.productUnitId,
          batchNumber: i.batchNumber,
          expiryDate: i.expiryDate,
          quantity: i.quantity,
          unitCost: i.unitCost,
          discountType: i.discountType,
          discountValue: i.discountValue,
        })),
      });
      message.success(`Đã tạo ${created.grnNumber}`);
      setDrawerOpen(false);
      void loadReceipts(filters, searchInput, page, pageSize);
      void loadMasterData();
    } catch (error) {
      if (isAxiosError(error)) {
        message.error(apiErrorMessage(error, 'Không tạo được phiếu nhập'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const updated = await completeGoodsReceipt(id);
      message.success(`Đã hoàn tất ${updated.grnNumber} — tồn kho đã cập nhật`);
      if (detail?.id === id) setDetail(updated);
      void loadReceipts(filters, searchInput, page, pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không hoàn tất được phiếu nhập'));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const updated = await cancelGoodsReceipt(id);
      message.success(`Đã hủy ${updated.grnNumber}`);
      setDetail(updated);
      void loadReceipts(filters, searchInput, page, pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không hủy được phiếu nhập'));
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveGoodsReceipt(id);
      message.success('Đã ẩn phiếu nhập (có thể xem trong bản ghi đã ẩn)');
      setDetailOpen(false);
      setDetail(null);
      void loadReceipts(filters, searchInput, page, pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không ẩn được phiếu nhập'));
    }
  };

  const handlePurge = async (id: string) => {
    try {
      await purgeGoodsReceipt(id);
      message.success('Đã xóa vĩnh viễn phiếu nhập');
      setDetailOpen(false);
      setDetail(null);
      void loadReceipts(filters, searchInput, page, pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không xóa vĩnh viễn được phiếu'));
    }
  };

  const canArchiveGrn = (status: number, deletedAt?: string) => status === 3 && !deletedAt;
  const showLockedDeleteGrn = (status: number, deletedAt?: string) => status === 2 && !deletedAt;

  const columns: ColumnsType<GoodsReceiptListItem> = [
    { title: 'Số phiếu', dataIndex: 'grnNumber', width: 140 },
    { title: 'NCC', dataIndex: 'supplierName' },
    { title: 'Kho', dataIndex: 'warehouseName' },
    { title: 'Đơn đặt hàng', dataIndex: 'poNumber', width: 120, render: (v) => v ?? '—' },
    {
      title: 'Ngày nhập',
      dataIndex: 'receiptDate',
      width: 110,
      render: (v: string) => formatDisplayDate(v),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 110,
      render: (s: number, row) => (
        <Space size={4}>
          <Tag color={GRN_STATUS_TAG[s] ?? 'default'}>{GRN_STATUS_LABELS[s] ?? s}</Tag>
          {row.deletedAt ? <Tag color="default">Đã ẩn</Tag> : null}
        </Space>
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

  const renderManualLines = (
    fields: FormListFieldData[],
    add: (defaultValue?: Partial<GrnLineForm>) => void,
    remove: (index: number) => void,
  ) => (
    <>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        Chọn đơn đặt hàng ở trên để điền tự động, hoặc nhập tay từng dòng bên dưới (số lô, HSD tháng/năm).
      </Typography.Text>
      {fields.map((field) => (
        <Form.Item key={field.key} noStyle shouldUpdate>
          {() => {
            const productId = form.getFieldValue(['items', field.name, 'productId']) as string | undefined;
            return (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <Form.Item
                  {...field}
                  name={[field.name, 'productId']}
                  label="Sản phẩm"
                  rules={[{ required: true, message: 'Chọn SP' }]}
                  style={{ flex: '2 1 320px', marginBottom: 0, minWidth: 240 }}
                >
                  <Select
                    placeholder="Sản phẩm"
                    showSearch
                    optionFilterProp="label"
                    options={products.map((p) => ({
                      value: p.id,
                      label: `${p.productCode} — ${p.productName}`,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  {...field}
                  name={[field.name, 'productUnitId']}
                  label="ĐVT"
                  rules={[{ required: true, message: 'Chọn ĐVT' }]}
                  style={{ flex: '0 0 84px', marginBottom: 0 }}
                >
                  <ProductUnitSelect productId={productId} width={84} />
                </Form.Item>
                <Form.Item
                  {...field}
                  name={[field.name, 'batchNumber']}
                  label="Số lô"
                  rules={[{ required: true, message: 'Nhập lô' }]}
                  style={{ flex: '0 0 100px', marginBottom: 0 }}
                >
                  <Input placeholder="Lô" />
                </Form.Item>
                <Form.Item
                  {...field}
                  name={[field.name, 'expiryDate']}
                  label="HSD"
                  rules={[{ required: true, message: 'Chọn HSD' }]}
                  style={{ flex: '0 0 112px', marginBottom: 0 }}
                >
                  <PharmaExpiryPicker style={{ width: 112 }} />
                </Form.Item>
                <Form.Item
                  {...field}
                  name={[field.name, 'quantity']}
                  label="SL"
                  rules={[{ required: true }]}
                  style={{ flex: '0 0 80px', marginBottom: 0 }}
                >
                  <InputNumber {...quantityInputNumberProps} min={0.001} placeholder="SL" style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                  {...field}
                  name={[field.name, 'unitCost']}
                  label="Giá vốn"
                  rules={[{ required: true }]}
                  style={{ flex: '0 0 120px', marginBottom: 0 }}
                >
                  <PoUnitPriceField
                    supplierId={supplierId}
                    productId={productId}
                    form={form}
                    fieldName={field.name}
                    valueFieldName="unitCost"
                  />
                </Form.Item>
                <Form.Item label="CK dòng" style={{ flex: '0 0 156px', marginBottom: 0 }}>
                  <GrnLineDiscountFields fieldName={field.name} />
                </Form.Item>
                <Form.Item label=" " colon={false} style={{ flex: '0 0 auto', marginBottom: 0 }}>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="Xóa dòng"
                    onClick={() => remove(field.name)}
                  />
                </Form.Item>
              </div>
            );
          }}
        </Form.Item>
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => add(emptyGrnLine())}
        block
      >
        Thêm dòng (nhập không theo PO)
      </Button>
    </>
  );

  return (
    <Card
      title="Phiếu nhập hàng"
      extra={
        canWrite ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo phiếu
          </Button>
        ) : undefined
      }
    >
      <GoodsReceiptFilterBar
        filters={filters}
        searchInput={searchInput}
        suppliers={suppliers}
        warehouses={warehouses}
        products={products}
        purchaseOrders={allPurchaseOrders}
        loading={loading}
        onSearchInputChange={setSearchInput}
        onApply={loadReceipts}
        onReset={resetFilters}
        onExport={exportReceipts}
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
          showTotal: (t) => `${t} phiếu`,
          onChange: (nextPage, nextPageSize) => {
            void loadReceipts(filters, searchInput, nextPage, nextPageSize);
          },
        }}
        scroll={{ x: 900 }}
        onRow={(record) => ({
          onClick: () => void openDetail(record.id),
          style: { cursor: 'pointer' },
        })}
        expandable={{
          onExpand: (expanded, record) => {
            if (expanded) void loadGrnExpand(record.id);
          },
          expandedRowRender: (record) => {
            const grn = grnDetailCache[record.id];
            if (!grn) return <Spin size="small" />;
            return <GrnDetailLinesPanel detail={grn} />;
          },
        }}
      />

      <Drawer
        title="Tạo phiếu nhập hàng"
        width={PROCUREMENT_DRAWER_WIDTH}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{ body: { paddingTop: 8, paddingBottom: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleCreate}
            loading={saving}
            disabled={!!poDraftGrn}
          >
            Lưu phiếu
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          <GoodsReceiptFormHeader
            suppliers={suppliers}
            warehouses={warehouses}
            approvedPos={approvedPos}
            purchaseOrderId={purchaseOrderId}
            linkedPo={linkedPo}
            poLoading={poLoading}
            onEditPo={() => setPoEditOpen(true)}
          />
          {!poDraftGrn && <GrnPricingControls vatTreatments={vatTreatments} />}
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {poDraftGrn && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 8 }}
                message={`PO đã có phiếu chờ nhập kho ${poDraftGrn.grnNumber}`}
                description="Hoàn tất nhập kho hoặc hủy phiếu đó trước khi tạo phiếu mới cho PO này."
                action={
                  <Button size="small" icon={<FolderOpenOutlined />} onClick={() => void openExistingDraftGrn(poDraftGrn.id)}>
                    Mở phiếu
                  </Button>
                }
              />
            )}
            <Form.List name="items">
              {(fields, { add, remove }) => {
                if (poDraftGrn) {
                  return null;
                }
                if (!purchaseOrderId) {
                  return renderManualLines(fields, add, remove);
                }
                if (poLoading) {
                  return (
                    <div style={{ padding: '24px 0', textAlign: 'center' }}>
                      <Spin tip="Đang tải hàng từ PO..." />
                    </div>
                  );
                }
                if (!linkedPo) {
                  return (
                    <Typography.Text type="danger">
                      Không tải được PO — bỏ chọn PO hoặc chọn PO khác.
                    </Typography.Text>
                  );
                }
                if (fields.length === 0) {
                  return (
                    <Typography.Text type="secondary">PO đã nhận đủ — chọn PO khác.</Typography.Text>
                  );
                }
                return (
                  <GrnPoLinesEditor
                    form={form}
                    supplierId={supplierId}
                    linkedPo={linkedPo}
                    fields={fields}
                    remove={remove}
                    maxScrollY={560}
                  />
                );
              }}
            </Form.List>
            {!poDraftGrn && <GrnPricingSummaryPanel form={form} vatTreatments={vatTreatments} />}
          </div>
        </Form>
      </Drawer>

      <PurchaseOrderEditDrawer
        poId={purchaseOrderId ?? null}
        open={poEditOpen}
        stackZIndex={1100}
        onClose={() => setPoEditOpen(false)}
        onSaved={handlePoEdited}
      />

      <Drawer
        title={detail ? `Xem ${detail.grnNumber}` : 'Xem phiếu nhập hàng'}
        width={PROCUREMENT_DRAWER_WIDTH}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        styles={{ body: { paddingTop: 8, paddingBottom: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
        extra={
          detail && (
            <Space>
              <Button icon={<PrinterOutlined />} onClick={() => printGoodsReceipt(detail)}>
                In A4
              </Button>
              {canWrite && (
                <>
              {detail.status === 1 && (
                <Button type="primary" icon={<CheckOutlined />} onClick={() => handleComplete(detail.id)}>
                  Hoàn tất nhập kho
                </Button>
              )}
              {detail.status === 1 && (
                <Popconfirm
                  title="Hủy phiếu chờ nhập kho?"
                  okText="Hủy phiếu"
                  cancelText="Đóng"
                  onConfirm={() => void handleCancel(detail.id)}
                >
                  <Button danger icon={<CloseCircleOutlined />}>
                    Hủy phiếu
                  </Button>
                </Popconfirm>
              )}
              {canArchiveGrn(detail.status, detail.deletedAt) && (
                <Popconfirm title="Ẩn phiếu đã hủy khỏi danh sách?" onConfirm={() => void handleArchive(detail.id)}>
                  <Button danger icon={<EyeInvisibleOutlined />}>
                    Ẩn phiếu
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
              {showLockedDeleteGrn(detail.status, detail.deletedAt) && (
                <Tooltip title="Không ẩn được phiếu đã ghi nhận nhập kho">
                  <Button disabled icon={<EyeInvisibleOutlined />}>
                    Ẩn phiếu
                  </Button>
                </Tooltip>
              )}
                </>
              )}
            </Space>
          )
        }
      >
        {detail && <GrnDetailView detail={detail} />}
      </Drawer>
    </Card>
  );
}
