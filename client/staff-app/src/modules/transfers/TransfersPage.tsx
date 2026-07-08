import { useCallback, useEffect, useRef, useState } from 'react';
import { App, Button, Drawer, Form, Input, InputNumber, Select, Space, Spin, Tag, Typography } from 'antd';
import { MinusCircleOutlined, PlusOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  cancelTransfer,
  completeTransfer,
  createTransfer,
  fetchStockBatches,
  fetchStockProducts,
  fetchTransfer,
  fetchTransfers,
} from '@/shared/api/inventory.api';
import { fetchWarehouses } from '@/shared/api/sales.api';
import type { TransferDetail, TransferListItem } from '@/shared/api/inventory.types';
import type { Warehouse } from '@/shared/api/sales.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';
import { usePosSession } from '@/modules/pos/pos-session.store';
import {
  canCompleteTransfer,
  transferStatusColor,
  transferStatusLabel,
} from '@/modules/transfers/transfer-labels';

type TransferLineForm = {
  productId?: string;
  batchId?: string;
  quantity: number;
};

function warehouseOptionLabel(w: Warehouse) {
  return w.branchName ? `${w.warehouseName} · ${w.branchName}` : w.warehouseName;
}

function TransferLineRow({
  field,
  fromWarehouseId,
  remove,
}: {
  field: { name: number; key: number };
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
                label: `${p.productCode} · ${p.productName} · Tồn ${p.totalQuantity}`,
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

  const loadBatches = useCallback(
    async (nextProductId: string) => {
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
            label: `${b.batchNumber}${b.expiryDate ? ` · HSD ${dayjs(b.expiryDate).format('MM/YYYY')}` : ''} · ${b.quantityAvailable}`,
          }));
        setBatchOptions(options);
        const current = form.getFieldValue(['items', field.name, 'batchId']) as string | undefined;
        if (!current || !options.some((o) => o.value === current)) {
          form.setFieldValue(['items', field.name, 'batchId'], options[0]?.value);
        }
      } catch {
        setBatchOptions([]);
        form.setFieldValue(['items', field.name, 'batchId'], undefined);
      } finally {
        setBatchLoading(false);
      }
    },
    [field.name, form, fromWarehouseId],
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
    <div className="transfer-line-card">
      <div className="transfer-line-card-head">
        <Typography.Text strong>Dòng {field.name + 1}</Typography.Text>
        <Button type="text" danger icon={<MinusCircleOutlined />} onClick={remove} aria-label="Xóa dòng" />
      </div>
      <Form.Item
        name={[field.name, 'productId']}
        label="Sản phẩm"
        rules={[{ required: true, message: 'Chọn sản phẩm' }]}
      >
        <Select
          showSearch
          filterOption={false}
          placeholder={fromWarehouseId ? 'Tìm mã hoặc tên SP' : 'Chọn kho đi trước'}
          disabled={!fromWarehouseId}
          loading={productLoading}
          options={productOptions}
          onSearch={searchProducts}
          onDropdownVisibleChange={(open) => {
            if (open) searchProducts('');
          }}
        />
      </Form.Item>
      <Form.Item
        name={[field.name, 'batchId']}
        label="Lô"
        rules={[{ required: true, message: 'Chọn lô' }]}
      >
        <Select
          placeholder="Chọn lô"
          disabled={!productId || batchOptions.length === 0}
          loading={batchLoading}
          options={batchOptions}
        />
      </Form.Item>
      <Form.Item
        name={[field.name, 'quantity']}
        label="Số lượng"
        rules={[{ required: true, message: 'Nhập số lượng' }]}
      >
        <InputNumber min={0.001} style={{ width: '100%' }} />
      </Form.Item>
    </div>
  );
}

export function TransfersPage() {
  const { message } = App.useApp();
  const posWarehouseId = usePosSession((s) => s.warehouseId);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TransferListItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<TransferDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [form] = Form.useForm();
  const fromWarehouseId = Form.useWatch('fromWarehouseId', form) as string | undefined;
  const prevFromWarehouseRef = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [transfers, wh] = await Promise.all([fetchTransfers(), fetchWarehouses()]);
      setItems(transfers);
      setWarehouses(wh);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được phiếu chuyển kho'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!createOpen) {
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
  }, [createOpen, fromWarehouseId, form]);

  const openCreate = () => {
    form.resetFields();
    const defaultFrom =
      posWarehouseId && warehouses.some((w) => w.id === posWarehouseId) ? posWarehouseId : warehouses[0]?.id;
    form.setFieldsValue({
      fromWarehouseId: defaultFrom,
      items: [{ quantity: 1 }],
    });
    setCreateOpen(true);
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
      if (values.fromWarehouseId === values.toWarehouseId) {
        message.warning('Kho đi và kho đến phải khác nhau');
        return;
      }
      setSaving(true);
      const created = await createTransfer({
        fromWarehouseId: values.fromWarehouseId,
        toWarehouseId: values.toWarehouseId,
        notes: values.notes,
        items: (values.items as TransferLineForm[])
          .filter((line) => line.batchId)
          .map((line) => ({
            batchId: line.batchId!,
            quantity: line.quantity,
          })),
      });
      message.success(`Đã tạo phiếu ${created.transferNumber}`);
      setCreateOpen(false);
      await load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tạo được phiếu chuyển kho'));
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: string) => {
    setCompleting(true);
    try {
      await completeTransfer(id);
      message.success('Đã chốt chuyển kho');
      if (detail?.id === id) {
        setDetail(await fetchTransfer(id));
      }
      await load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không chốt được phiếu'));
    } finally {
      setCompleting(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCompleting(true);
    try {
      await cancelTransfer(id);
      message.success('Đã hủy phiếu chuyển kho');
      if (detail?.id === id) {
        setDetail(await fetchTransfer(id));
      }
      await load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không hủy được phiếu'));
    } finally {
      setCompleting(false);
    }
  };

  const warehouseOptions = warehouses.map((w) => ({
    value: w.id,
    label: warehouseOptionLabel(w),
  }));

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Chuyển kho" backTo="/" />
      <main className="staff-body">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          Quy trình: tra tồn kho nguồn → tạo phiếu → chốt hoàn tất → bán tại kho đích.
        </Typography.Text>

        <Space style={{ marginBottom: 12, width: '100%' }} wrap>
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Tải lại
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={warehouses.length < 2}>
            Tạo phiếu
          </Button>
        </Space>

        {warehouses.length < 2 ? (
          <Typography.Text type="warning">Cần ít nhất 2 kho để chuyển hàng giữa quầy.</Typography.Text>
        ) : null}

        {loading ? (
          <Spin />
        ) : items.length === 0 ? (
          <Typography.Text type="secondary">Chưa có phiếu chuyển kho</Typography.Text>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="transfer-list-item"
              onClick={() => void openDetail(item.id)}
            >
              <div className="transfer-list-item-top">
                <Typography.Text strong>{item.transferNumber}</Typography.Text>
                <Tag color={transferStatusColor(item.status)}>{transferStatusLabel(item.status)}</Tag>
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {item.fromWarehouseName} → {item.toWarehouseName}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                {dayjs(item.transferDate).format('DD/MM/YYYY')} · {item.itemCount} dòng
              </Typography.Text>
            </button>
          ))
        )}
      </main>

      <Drawer
        title="Tạo phiếu chuyển kho"
        placement="bottom"
        height="92%"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        extra={
          <Button type="primary" loading={saving} onClick={() => void handleCreate()}>
            Lưu
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="fromWarehouseId"
            label="Kho đi (lấy hàng)"
            rules={[{ required: true, message: 'Chọn kho đi' }]}
          >
            <Select options={warehouseOptions} placeholder="VD: Quầy 1" />
          </Form.Item>
          <Form.Item
            name="toWarehouseId"
            label="Kho đến (nhận hàng)"
            rules={[{ required: true, message: 'Chọn kho đến' }]}
          >
            <Select options={warehouseOptions} placeholder="VD: Quầy 2" />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="VD: Quầy 2 thiếu Paracetamol" />
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
                <Button type="dashed" onClick={() => add({ quantity: 1 })} block icon={<PlusOutlined />}>
                  Thêm dòng
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Drawer>

      <Drawer
        title={detail ? detail.transferNumber : 'Chi tiết phiếu'}
        placement="bottom"
        height="85%"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        extra={
          detail && canCompleteTransfer(detail.status) ? (
            <Space>
              <Button danger loading={completing} icon={<StopOutlined />} onClick={() => void handleCancel(detail.id)}>
                Hủy
              </Button>
              <Button type="primary" loading={completing} onClick={() => void handleComplete(detail.id)}>
                Chốt hoàn tất
              </Button>
            </Space>
          ) : null
        }
      >
        {detail ? (
          <>
            <p>
              <strong>Kho đi:</strong> {detail.fromWarehouseName}
            </p>
            <p>
              <strong>Kho đến:</strong> {detail.toWarehouseName}
            </p>
            <p>
              <strong>Trạng thái:</strong>{' '}
              <Tag color={transferStatusColor(detail.status)}>{transferStatusLabel(detail.status)}</Tag>
            </p>
            {detail.notes ? (
              <p>
                <strong>Ghi chú:</strong> {detail.notes}
              </p>
            ) : null}
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              Chi tiết hàng
            </Typography.Text>
            {detail.items.map((line) => (
              <div key={line.id} className="cart-line" style={{ marginBottom: 8 }}>
                <Typography.Text strong>{line.productName}</Typography.Text>
                <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  {line.productCode} · Lô {line.batchNumber} · SL {line.quantity}
                </Typography.Text>
              </div>
            ))}
          </>
        ) : null}
      </Drawer>
    </div>
  );
}
