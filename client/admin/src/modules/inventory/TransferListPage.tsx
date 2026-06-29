import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import type { FormListFieldData } from 'antd/es/form/FormList';
import type { ColumnsType } from 'antd/es/table';
import { isAxiosError } from 'axios';
import { PlusOutlined, ReloadOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import {
  completeTransfer,
  createTransfer,
  fetchStockBatches,
  fetchStockProducts,
  fetchTransfer,
  fetchTransfers,
  fetchWarehouses,
} from '@/shared/api/inventory.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import type { TransferDetail, TransferListItem, Warehouse } from '@/shared/api/inventory.types';
import { formatDisplayDate } from '@/shared/utils/date';
import { formatDisplayQuantity } from '@/shared/utils/money';
import { TRANSFER_STATUS_LABELS } from '@/shared/api/inventory.types';

interface TransferLineForm {
  productId?: string;
  batchId?: string;
  quantity: number;
}

function stockProductLabel(code: string, name: string, unitName?: string | null, totalQty?: number) {
  const base = unitName ? `${code} — ${name} · ${unitName}` : `${code} — ${name}`;
  return totalQty != null ? `${base} (tồn ${formatDisplayQuantity(totalQty)})` : base;
}

function batchOptionLabel(batchNumber: string, expiryDate: string | undefined, quantityAvailable: number) {
  const hsd = expiryDate ? ` · HSD ${formatDisplayDate(expiryDate)}` : '';
  return `${batchNumber}${hsd} · tồn ${formatDisplayQuantity(quantityAvailable)}`;
}

function TransferLineRow({
  field,
  fromWarehouseId,
  remove,
}: {
  field: FormListFieldData;
  fromWarehouseId?: string;
  remove: () => void;
}) {
  const form = Form.useFormInstance();
  const productId = Form.useWatch(['items', field.name, 'productId'], form) as string | undefined;
  const [productOptions, setProductOptions] = useState<{ value: string; label: string }[]>([]);
  const [batchOptions, setBatchOptions] = useState<{ value: string; label: string }[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const productSearchTimer = useRef<number | undefined>(undefined);

  const loadBatches = useCallback(
    async (nextProductId: string, preferredBatchId?: string) => {
      if (!fromWarehouseId) {
        setBatchOptions([]);
        form.setFieldValue(['items', field.name, 'batchId'], undefined);
        return;
      }
      setBatchLoading(true);
      try {
        const result = await fetchStockBatches({
          warehouseId: fromWarehouseId,
          productId: nextProductId,
          page: 1,
          pageSize: 50,
        });
        const options = result.items
          .filter((b) => b.quantityAvailable > 0)
          .map((b) => ({
            value: b.id,
            label: batchOptionLabel(b.batchNumber, b.expiryDate, b.quantityAvailable),
          }));
        setBatchOptions(options);
        const batchId =
          preferredBatchId && options.some((o) => o.value === preferredBatchId)
            ? preferredBatchId
            : options[0]?.value;
        form.setFieldValue(['items', field.name, 'batchId'], batchId);
      } catch {
        setBatchOptions([]);
        form.setFieldValue(['items', field.name, 'batchId'], undefined);
      } finally {
        setBatchLoading(false);
      }
    },
    [field.name, form, fromWarehouseId],
  );

  const searchProducts = useCallback(
    (query: string) => {
      if (!fromWarehouseId) {
        setProductOptions([]);
        return;
      }
      window.clearTimeout(productSearchTimer.current);
      productSearchTimer.current = window.setTimeout(() => {
        void (async () => {
          setProductLoading(true);
          try {
            const result = await fetchStockProducts({
              warehouseId: fromWarehouseId,
              search: query.trim() || undefined,
              page: 1,
              pageSize: 20,
            });
            setProductOptions(
              result.items.map((p) => ({
                value: p.productId,
                label: stockProductLabel(p.productCode, p.productName, p.saleUnitName, p.totalQuantity),
              })),
            );
          } catch {
            setProductOptions([]);
          } finally {
            setProductLoading(false);
          }
        })();
      }, 300);
    },
    [fromWarehouseId],
  );

  useEffect(() => {
    searchProducts('');
    return () => window.clearTimeout(productSearchTimer.current);
  }, [fromWarehouseId, searchProducts]);

  useEffect(() => {
    if (!fromWarehouseId || !productId) {
      setBatchOptions([]);
      if (!productId) {
        form.setFieldValue(['items', field.name, 'batchId'], undefined);
      }
      return;
    }
    void loadBatches(productId);
  }, [fromWarehouseId, productId, loadBatches, field.name, form]);

  return (
    <Space align="start" style={{ display: 'flex', marginBottom: 8 }}>
      <Form.Item
        {...field}
        name={[field.name, 'productId']}
        rules={[{ required: true, message: 'Chọn SP' }]}
        style={{ width: 240, marginBottom: 0 }}
      >
        <Select
          showSearch
          filterOption={false}
          placeholder="Sản phẩm"
          disabled={!fromWarehouseId}
          loading={productLoading}
          options={productOptions}
          onSearch={searchProducts}
          onDropdownVisibleChange={(open) => {
            if (open) searchProducts('');
          }}
          notFoundContent={fromWarehouseId ? 'Không có SP tồn' : 'Chọn kho xuất trước'}
        />
      </Form.Item>
      <Form.Item
        {...field}
        name={[field.name, 'batchId']}
        rules={[{ required: true, message: 'Chọn lô' }]}
        style={{ width: 220, marginBottom: 0 }}
      >
        <Select
          placeholder="Lô hàng"
          disabled={!productId || batchOptions.length === 0}
          loading={batchLoading}
          options={batchOptions}
          notFoundContent={productId ? 'Không có lô tồn' : 'Chọn SP trước'}
        />
      </Form.Item>
      <Form.Item
        {...field}
        name={[field.name, 'quantity']}
        rules={[{ required: true, message: 'SL' }]}
        style={{ width: 90, marginBottom: 0 }}
      >
        <InputNumber min={0.001} style={{ width: '100%' }} />
      </Form.Item>
      <Button type="text" danger onClick={remove}>
        Xóa
      </Button>
    </Space>
  );
}

export function TransferListPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TransferListItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<TransferDetail | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const fromWarehouseId = Form.useWatch('fromWarehouseId', form);
  const prevFromWarehouseRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!drawerOpen) {
      prevFromWarehouseRef.current = undefined;
      return;
    }
    if (prevFromWarehouseRef.current && prevFromWarehouseRef.current !== fromWarehouseId) {
      const lines = form.getFieldValue('items') as TransferLineForm[] | undefined;
      if (lines?.length) {
        form.setFieldsValue({
          items: lines.map((line) => ({ quantity: line.quantity ?? 1 })),
        });
      }
    }
    prevFromWarehouseRef.current = fromWarehouseId;
  }, [drawerOpen, fromWarehouseId, form]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [transfers, wh] = await Promise.all([fetchTransfers(), fetchWarehouses()]);
      setItems(transfers);
      setWarehouses(wh);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được phiếu điều chuyển'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ items: [{ quantity: 1 }] });
    setDrawerOpen(true);
  };

  const openDetail = async (id: string) => {
    try {
      setDetail(await fetchTransfer(id));
      setDetailOpen(true);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được chi tiết phiếu'));
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const created = await createTransfer({
        fromWarehouseId: values.fromWarehouseId,
        toWarehouseId: values.toWarehouseId,
        notes: values.notes,
        items: (values.items as TransferLineForm[])
          .filter((i) => i.batchId)
          .map((i) => ({
            batchId: i.batchId!,
            quantity: i.quantity,
          })),
      });
      message.success(`Đã tạo phiếu ${created.transferNumber}`);
      setDrawerOpen(false);
      load();
    } catch (error) {
      if (isAxiosError(error)) {
        message.error(apiErrorMessage(error, 'Không tạo được phiếu'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeTransfer(id);
      message.success('Đã hoàn tất điều chuyển');
      if (detail?.id === id) {
        setDetail(await fetchTransfer(id));
      }
      load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không hoàn tất được phiếu'));
    }
  };

  const columns: ColumnsType<TransferListItem> = [
    { title: 'Số phiếu', dataIndex: 'transferNumber', width: 130 },
    { title: 'Kho xuất', dataIndex: 'fromWarehouseName' },
    { title: 'Kho nhận', dataIndex: 'toWarehouseName' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 110,
      render: (v: number) => (
        <Tag color={v === 3 ? 'green' : v === 1 ? 'gold' : 'blue'}>
          {TRANSFER_STATUS_LABELS[v] ?? v}
        </Tag>
      ),
    },
    {
      title: 'Ngày',
      dataIndex: 'transferDate',
      width: 110,
      render: (v: string) => formatDisplayDate(v),
    },
    { title: 'Dòng', dataIndex: 'itemCount', width: 70, align: 'right' },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 160,
      render: (_, row) => (
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          <Tag
            color="blue"
            icon={<EyeOutlined />}
            style={{ cursor: 'pointer', margin: 0 }}
            onClick={() => openDetail(row.id)}
          >
            Chi tiết
          </Tag>
          {row.status !== 3 && row.status !== 4 && (
            <Tag
              color="green"
              icon={<CheckCircleOutlined />}
              style={{ cursor: 'pointer', margin: 0 }}
              onClick={() => handleComplete(row.id)}
            >
              Hoàn tất
            </Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="Phiếu điều chuyển"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
              Tải lại
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Tạo phiếu
            </Button>
          </Space>
        }
      >
        <Table rowKey="id" loading={loading} columns={columns} dataSource={items} pagination={false} />
      </Card>

      <Drawer
        title="Tạo phiếu điều chuyển"
        width={680}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Hủy</Button>
            <Button type="primary" loading={saving} onClick={handleCreate}>
              Lưu
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="fromWarehouseId" label="Kho xuất" rules={[{ required: true }]}>
            <Select
              options={warehouses.map((w) => ({ value: w.id, label: w.warehouseName }))}
              placeholder="Chọn kho xuất"
            />
          </Form.Item>
          <Form.Item name="toWarehouseId" label="Kho nhận" rules={[{ required: true }]}>
            <Select
              options={warehouses.map((w) => ({ value: w.id, label: w.warehouseName }))}
              placeholder="Chọn kho nhận"
            />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <TransferLineRow
                    key={field.key}
                    field={field}
                    fromWarehouseId={fromWarehouseId}
                    remove={() => remove(field.name)}
                  />
                ))}
                <Button type="dashed" onClick={() => add({ quantity: 1 })} block>
                  Thêm dòng
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Drawer>

      <Drawer
        title={detail ? `Phiếu ${detail.transferNumber}` : 'Chi tiết phiếu'}
        width={560}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        extra={
          detail && detail.status !== 3 && detail.status !== 4 ? (
            <Button type="primary" onClick={() => handleComplete(detail.id)}>
              Hoàn tất
            </Button>
          ) : null
        }
      >
        {detail && (
          <>
            <p>
              <strong>Kho xuất:</strong> {detail.fromWarehouseName}
            </p>
            <p>
              <strong>Kho nhận:</strong> {detail.toWarehouseName}
            </p>
            <p>
              <strong>Trạng thái:</strong> {TRANSFER_STATUS_LABELS[detail.status] ?? detail.status}
            </p>
            {detail.notes && (
              <p>
                <strong>Ghi chú:</strong> {detail.notes}
              </p>
            )}
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detail.items}
              columns={[
                { title: 'SP', dataIndex: 'productName' },
                { title: 'Lô', dataIndex: 'batchNumber', width: 100 },
                { title: 'SL', dataIndex: 'quantity', width: 80, align: 'right' },
              ]}
            />
          </>
        )}
      </Drawer>
    </>
  );
}
