import { useCallback, useEffect, useRef, useState } from 'react';
import {
  App,
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  completeGoodsReceipt,
  createGoodsReceipt,
  fetchPurchaseOrder,
  fetchPurchaseOrders,
  fetchSuppliers,
  fetchVatTreatments,
} from '@/shared/api/procurement.api';
import type { PurchaseOrderListItem } from '@/shared/api/procurement.types';
import { fetchWarehouses, lookupPosProduct, searchPosProducts } from '@/shared/api/sales.api';
import type { Warehouse } from '@/shared/api/sales.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { defaultVatTreatmentId } from '@/modules/procurement/default-vat';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';

type GrnLineForm = {
  purchaseOrderItemId?: string;
  productId?: string;
  productUnitId?: string;
  productCode?: string;
  productName?: string;
  unitName?: string;
  batchNumber: string;
  expiryDate?: dayjs.Dayjs;
  quantity: number;
  unitCost: number;
};

type GrnFormValues = {
  warehouseId: string;
  supplierId: string;
  purchaseOrderId?: string;
  notes?: string;
  items: GrnLineForm[];
};

function defaultExpiry() {
  return dayjs().add(2, 'year');
}

function warehouseLabel(w: Warehouse) {
  return w.branchName ? `${w.warehouseName} · ${w.branchName}` : w.warehouseName;
}

function GrnProductLine({
  field,
  warehouseId,
  remove,
}: {
  field: { name: number; key: number };
  warehouseId?: string;
  remove: () => void;
}) {
  const form = Form.useFormInstance<GrnFormValues>();
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const searchProducts = useCallback(
    (query: string) => {
      if (!warehouseId) {
        setOptions([]);
        return;
      }
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        void (async () => {
          setSearching(true);
          try {
            const hits = await searchPosProducts(query.trim(), warehouseId);
            setOptions(
              hits.map((hit) => ({
                value: hit.lookupCode,
                label: `${hit.productCode} · ${hit.productName} · ${hit.unitName}`,
              })),
            );
          } catch {
            setOptions([]);
          } finally {
            setSearching(false);
          }
        })();
      }, 300);
    },
    [warehouseId],
  );

  const pickProduct = async (lookupCode: string) => {
    if (!warehouseId) return;
    try {
      const hit = await lookupPosProduct(lookupCode, warehouseId);
      form.setFieldValue(['items', field.name], {
        ...form.getFieldValue(['items', field.name]),
        productId: hit.productId,
        productUnitId: hit.productUnitId,
        productCode: hit.productCode,
        productName: hit.productName,
        unitName: hit.unitName,
        unitCost: form.getFieldValue(['items', field.name, 'unitCost']) || 0,
        batchNumber: form.getFieldValue(['items', field.name, 'batchNumber']) || '',
        expiryDate: form.getFieldValue(['items', field.name, 'expiryDate']) || defaultExpiry(),
        quantity: form.getFieldValue(['items', field.name, 'quantity']) || 1,
      });
    } catch {
      // ignore lookup errors
    }
  };

  const line = Form.useWatch(['items', field.name], form) as GrnLineForm | undefined;

  return (
    <div className="cart-line" style={{ marginBottom: 12 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Text strong>Dòng {field.name + 1}</Typography.Text>
        <Button type="text" danger icon={<MinusCircleOutlined />} onClick={remove} />
      </Space>

      <Form.Item name={[field.name, 'purchaseOrderItemId']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={[field.name, 'productId']} hidden rules={[{ required: true, message: 'Chọn SP' }]}>
        <Input />
      </Form.Item>
      <Form.Item name={[field.name, 'productUnitId']} hidden rules={[{ required: true, message: 'Chọn SP' }]}>
        <Input />
      </Form.Item>

      <Form.Item label="Sản phẩm" style={{ marginBottom: 8 }}>
        <AutoComplete
          options={options}
          onSearch={searchProducts}
          onSelect={(value) => void pickProduct(String(value))}
          placeholder="Mã / tên / barcode"
          notFoundContent={searching ? <Spin size="small" /> : null}
        />
        {line?.productName ? (
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            {line.productCode} · {line.productName} · {line.unitName}
          </Typography.Text>
        ) : null}
      </Form.Item>

      <Form.Item
        name={[field.name, 'batchNumber']}
        label="Số lô"
        rules={[{ required: true, message: 'Nhập số lô' }]}
        style={{ marginBottom: 8 }}
      >
        <Input placeholder="VD: LOT2026A" />
      </Form.Item>

      <Form.Item
        name={[field.name, 'expiryDate']}
        label="Hạn dùng"
        rules={[{ required: true, message: 'Chọn HSD' }]}
        style={{ marginBottom: 8 }}
      >
        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
      </Form.Item>

      <Space style={{ width: '100%' }} size={12}>
        <Form.Item
          name={[field.name, 'quantity']}
          label="SL"
          rules={[{ required: true, message: 'SL' }]}
          style={{ flex: 1, marginBottom: 0 }}
        >
          <InputNumber min={0.01} step={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name={[field.name, 'unitCost']}
          label="Giá nhập"
          rules={[{ required: true, message: 'Giá' }]}
          style={{ flex: 1, marginBottom: 0 }}
        >
          <InputNumber min={0} step={1000} style={{ width: '100%' }} />
        </Form.Item>
      </Space>
    </div>
  );
}

export function GoodsReceiptCreatePage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<GrnFormValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Awaited<ReturnType<typeof fetchSuppliers>>>([]);
  const [pendingPos, setPendingPos] = useState<PurchaseOrderListItem[]>([]);
  const [vatTreatmentId, setVatTreatmentId] = useState<string>();
  const warehouseId = Form.useWatch('warehouseId', form);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [wh, sup, pos, vat] = await Promise.all([
          fetchWarehouses(),
          fetchSuppliers(true),
          fetchPurchaseOrders({ pendingReceiptOnly: true, page: 1, pageSize: 100 }),
          fetchVatTreatments(true),
        ]);
        setWarehouses(wh);
        setSuppliers(sup.filter((row) => !row.isPlaceholder));
        setPendingPos(pos.items);
        const defaultVat = defaultVatTreatmentId(vat);
        setVatTreatmentId(defaultVat);
        form.setFieldsValue({
          warehouseId: wh[0]?.id,
          supplierId: sup.find((row) => !row.isPlaceholder)?.id,
          items: [
            {
              batchNumber: '',
              expiryDate: defaultExpiry(),
              quantity: 1,
              unitCost: 0,
            },
          ],
        });
      } catch (error) {
        message.error(apiErrorMessage(error, 'Không tải được dữ liệu nhập hàng'));
      } finally {
        setLoading(false);
      }
    })();
  }, [form, message]);

  const loadFromPo = async (poId: string) => {
    try {
      const po = await fetchPurchaseOrder(poId);
      const expiry = defaultExpiry();
      const lines = po.items
        .filter((line) => line.receivedQty < line.orderedQty)
        .map((line) => ({
          purchaseOrderItemId: line.id,
          productId: line.productId,
          productUnitId: line.productUnitId,
          productCode: line.productCode,
          productName: line.productName,
          unitName: line.unitName,
          batchNumber: '',
          expiryDate: expiry,
          quantity: line.orderedQty - line.receivedQty,
          unitCost: line.unitPrice,
        }));
      form.setFieldsValue({
        purchaseOrderId: poId,
        supplierId: po.supplierId,
        warehouseId: po.warehouseId,
        items: lines.length > 0 ? lines : form.getFieldValue('items'),
      });
      message.success(`Đã nạp ${lines.length} dòng từ ${po.poNumber}`);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được đơn mua'));
    }
  };

  const submit = async (values: GrnFormValues, completeAfterSave: boolean) => {
    if (!vatTreatmentId) {
      message.error('Chưa cấu hình thuế VAT nhập hàng');
      return;
    }
    const items = values.items.filter((line) => line.productId && line.productUnitId);
    if (items.length === 0) {
      message.error('Thêm ít nhất một dòng sản phẩm');
      return;
    }
    for (const line of items) {
      if (!line.batchNumber?.trim()) {
        message.error('Mỗi dòng cần số lô');
        return;
      }
      if (!line.expiryDate) {
        message.error('Mỗi dòng cần hạn dùng');
        return;
      }
    }

    setSaving(true);
    try {
      const created = await createGoodsReceipt({
        purchaseOrderId: values.purchaseOrderId,
        supplierId: values.supplierId,
        warehouseId: values.warehouseId,
        notes: values.notes?.trim() || undefined,
        vatTreatmentId,
        items: items.map((line) => ({
          purchaseOrderItemId: line.purchaseOrderItemId,
          productId: line.productId!,
          productUnitId: line.productUnitId!,
          batchNumber: line.batchNumber.trim(),
          expiryDate: dayjs(line.expiryDate).format('YYYY-MM-DD'),
          quantity: line.quantity,
          unitCost: line.unitCost,
        })),
      });
      if (completeAfterSave) {
        await completeGoodsReceipt(created.id);
        message.success(`Đã nhập kho ${created.grnNumber}`);
      } else {
        message.success(`Đã lưu nháp ${created.grnNumber}`);
      }
      navigate(`/goods-receipt/${created.id}`, { replace: true });
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tạo được phiếu nhập'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="staff-shell">
        <StaffPageHeader title="Nhập hàng mới" backTo="/goods-receipt" />
        <main className="staff-body">
          <Spin />
        </main>
      </div>
    );
  }

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Nhập hàng mới" backTo="/goods-receipt" />
      <main className="staff-body">
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => void submit(values, true)}
        >
          <Form.Item name="warehouseId" label="Kho nhập" rules={[{ required: true, message: 'Chọn kho' }]}>
            <Select
              options={warehouses.map((w) => ({ value: w.id, label: warehouseLabel(w) }))}
              placeholder="Chọn kho"
            />
          </Form.Item>

          <Form.Item name="supplierId" label="Nhà cung cấp" rules={[{ required: true, message: 'Chọn NCC' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={suppliers.map((s) => ({ value: s.id, label: `${s.supplierCode} · ${s.supplierName}` }))}
              placeholder="Chọn NCC"
            />
          </Form.Item>

          {pendingPos.length > 0 ? (
            <Form.Item name="purchaseOrderId" label="Từ đơn mua (tuỳ chọn)">
              <Select
                allowClear
                placeholder="Chọn PO chờ nhập"
                options={pendingPos.map((po) => ({
                  value: po.id,
                  label: `${po.poNumber} · ${po.supplierName} · ${po.itemCount} dòng`,
                }))}
                onChange={(value) => {
                  if (value) void loadFromPo(String(value));
                }}
              />
            </Form.Item>
          ) : null}

          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú phiếu nhập" />
          </Form.Item>

          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            Dòng hàng
          </Typography.Text>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <GrnProductLine
                    key={field.key}
                    field={field}
                    warehouseId={warehouseId}
                    remove={() => remove(field.name)}
                  />
                ))}
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() =>
                    add({
                      batchNumber: '',
                      expiryDate: defaultExpiry(),
                      quantity: 1,
                      unitCost: 0,
                    })
                  }
                  style={{ marginBottom: 16 }}
                >
                  Thêm dòng
                </Button>
              </>
            )}
          </Form.List>

          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Button type="primary" htmlType="submit" block size="large" loading={saving}>
              Lưu và hoàn tất nhập
            </Button>
            <Button
              block
              size="large"
              loading={saving}
              onClick={() => {
                void form.validateFields().then((values) => void submit(values, false));
              }}
            >
              Chỉ lưu nháp
            </Button>
          </Space>
        </Form>
      </main>
    </div>
  );
}
