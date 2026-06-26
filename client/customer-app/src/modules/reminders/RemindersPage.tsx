import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  TimePicker,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  createReminder,
  fetchReminders,
  getApiErrorMessage,
  searchProducts,
  updateReminder,
} from '@/shared/api/customer-app.api';
import type { CustomerProductSearchItem, MedicationReminder } from '@/shared/api/customer-app.types';
import { DAY_LABELS } from '@/shared/api/customer-app.types';
import { normalizeReminderId } from '@/shared/api/reminder-normalize';
import { BackToHomeButton } from '@/shared/components/BackToHomeButton';

const DAY_OPTIONS = Object.entries(DAY_LABELS).map(([value, label]) => ({
  label,
  value: Number(value),
}));

function formatProductLabel(product: CustomerProductSearchItem) {
  const unit = product.saleUnitName ? ` · ${product.saleUnitName}` : '';
  return `${product.productName} (${product.productCode})${unit}`;
}

function stableReminderOrder(items: MedicationReminder[]): MedicationReminder[] {
  return [...items].sort((a, b) => {
    const createdCmp = a.createdAt.localeCompare(b.createdAt);
    if (createdCmp !== 0) return createdCmp;
    return a.id.localeCompare(b.id);
  });
}

function assertUniqueReminderIds(items: MedicationReminder[]) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`Trùng id lịch nhắc: ${item.id}`);
    }
    seen.add(item.id);
  }
}

function patchReminderById(
  items: MedicationReminder[],
  reminderId: string,
  patch: Partial<MedicationReminder>,
): MedicationReminder[] {
  const targetId = normalizeReminderId(reminderId);
  let matched = false;
  const next = items.map((row) => {
    if (row.id !== targetId) return row;
    matched = true;
    return { ...row, ...patch };
  });
  if (!matched) {
    throw new Error(`Không tìm thấy lịch nhắc ${targetId}`);
  }
  return next;
}

function ReminderRow({
  item,
  rowNumber,
  togglingId,
  onToggle,
  onEdit,
}: {
  item: MedicationReminder;
  rowNumber: number;
  togglingId: string | null;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (item: MedicationReminder) => void;
}) {
  const reminderId = item.id;

  return (
    <div
      data-reminder-id={reminderId}
      data-row-number={rowNumber}
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid #e2e8f0',
        opacity: item.isActive ? 1 : 0.72,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Space wrap style={{ marginBottom: 4 }}>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            #{rowNumber}
          </Typography.Text>
          <Typography.Text strong>{item.productName}</Typography.Text>
          {item.isActive ? <Tag color="green">Đang bật</Tag> : <Tag>Đã tắt</Tag>}
        </Space>
        <div>
          <Typography.Text>
            <strong>{item.remindTime}</strong>
            {item.dosageNote ? ` · ${item.dosageNote}` : ''}
          </Typography.Text>
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {item.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')}
          {item.nextRemindAt ? ` · Tiếp theo: ${dayjs(item.nextRemindAt).format('DD/MM HH:mm')}` : ''}
        </Typography.Text>
      </div>

      <Space direction="vertical" align="end" size={4}>
        <Switch
          checked={item.isActive}
          loading={togglingId === reminderId}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
          onClick={(_, e) => e.stopPropagation()}
          onChange={(checked) => onToggle(reminderId, checked)}
        />
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onEdit(item)}>
          Sửa
        </Button>
      </Space>
    </div>
  );
}

export function RemindersPage() {
  const [items, setItems] = useState<MedicationReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MedicationReminder | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [productOptions, setProductOptions] = useState<CustomerProductSearchItem[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [form] = Form.useForm();
  const searchTimerRef = useRef<number | null>(null);

  const visibleItems = useMemo(() => {
    const ordered = stableReminderOrder(items);
    return includeInactive ? ordered : ordered.filter((item) => item.isActive);
  }, [items, includeInactive]);

  const loadProducts = useCallback(async (search?: string) => {
    setProductSearchLoading(true);
    try {
      const result = await searchProducts(search, 1, 30);
      setProductOptions(result.items);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Không tải được danh sách sản phẩm'));
    } finally {
      setProductSearchLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReminders(true);
      const ordered = stableReminderOrder(data.items);
      assertUniqueReminderIds(ordered);
      setItems(ordered);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Không tải được danh sách nhắc'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    void loadProducts();
  }, [modalOpen, loadProducts]);

  const onProductSearch = (value: string) => {
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = window.setTimeout(() => {
      void loadProducts(value);
    }, 300);
  };

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      productId: undefined,
      dosageNote: '',
      remindTime: dayjs('08:00', 'HH:mm'),
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    });
    setModalOpen(true);
  };

  const openEdit = (item: MedicationReminder) => {
    setEditing(item);
    setProductOptions((prev) => {
      if (prev.some((p) => p.id === item.productId)) return prev;
      return [
        {
          id: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          genericName: null,
          saleUnitName: null,
        },
        ...prev,
      ];
    });
    form.setFieldsValue({
      productId: item.productId,
      dosageNote: item.dosageNote ?? '',
      remindTime: dayjs(item.remindTime, 'HH:mm'),
      daysOfWeek: item.daysOfWeek,
      isActive: item.isActive,
    });
    setModalOpen(true);
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    const remindTime = (values.remindTime as Dayjs).format('HH:mm');
    try {
      if (editing) {
        const updated = await updateReminder(editing.id, {
          productId: values.productId,
          dosageNote: values.dosageNote || undefined,
          remindTime,
          daysOfWeek: values.daysOfWeek,
          isActive: values.isActive,
        });
        setItems((prev) => patchReminderById(prev, updated.id, updated));
        message.success('Đã cập nhật nhắc uống thuốc');
      } else {
        const created = await createReminder({
          productId: values.productId,
          dosageNote: values.dosageNote || undefined,
          remindTime,
          daysOfWeek: values.daysOfWeek,
        });
        setItems((prev) => stableReminderOrder([...prev, created]));
        message.success('Đã thêm nhắc uống thuốc');
      }
      setModalOpen(false);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Không lưu được'));
    }
  };

  const onToggleActive = async (reminderId: string, isActive: boolean) => {
    const targetId = normalizeReminderId(reminderId);
    const previousItems = items;

    if (!includeInactive && !isActive) {
      setIncludeInactive(true);
    }

    setTogglingId(targetId);

    try {
      const updated = await updateReminder(targetId, { isActive });
      if (normalizeReminderId(updated.id) !== targetId) {
        throw new Error('API trả về id không khớp lịch nhắc vừa cập nhật');
      }
      setItems((prev) => patchReminderById(prev, targetId, updated));
      message.success(isActive ? 'Đã bật nhắc' : 'Đã tắt nhắc');
    } catch (error) {
      setItems(previousItems);
      message.error(getApiErrorMessage(error, 'Không cập nhật được trạng thái nhắc'));
    } finally {
      setTogglingId(null);
    }
  };

  const selectOptions = productOptions.map((p) => ({
    value: p.id,
    label: formatProductLabel(p),
  }));

  return (
    <div>
      <BackToHomeButton />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Nhắc uống thuốc
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm
        </Button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Checkbox checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)}>
          Hiện cả lịch đã tắt
        </Checkbox>
      </div>

      {loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : visibleItems.length === 0 ? (
        <Empty description="Chưa có lịch nhắc" />
      ) : (
        <div>
          {visibleItems.map((item, index) => (
            <ReminderRow
              key={item.id}
              item={item}
              rowNumber={index + 1}
              togglingId={togglingId}
              onToggle={onToggleActive}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      <Modal
        title={editing ? 'Sửa nhắc uống thuốc' : 'Thêm nhắc uống thuốc'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void onSubmit()}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="productId" label="Sản phẩm" rules={[{ required: true, message: 'Chọn sản phẩm' }]}>
            <Select
              showSearch
              filterOption={false}
              loading={productSearchLoading}
              options={selectOptions}
              placeholder="Gõ tên hoặc mã sản phẩm"
              onSearch={onProductSearch}
              notFoundContent={productSearchLoading ? <Spin size="small" /> : 'Không tìm thấy sản phẩm'}
            />
          </Form.Item>
          <Form.Item name="dosageNote" label="Liều dùng / ghi chú">
            <Input placeholder="1 viên sau ăn sáng" />
          </Form.Item>
          <Form.Item name="remindTime" label="Giờ nhắc" rules={[{ required: true }]}>
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="daysOfWeek" label="Ngày trong tuần" rules={[{ required: true }]}>
            <Checkbox.Group options={DAY_OPTIONS} />
          </Form.Item>
          {editing ? (
            <Form.Item name="isActive" label="Bật nhắc" valuePropName="checked">
              <Switch />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}
