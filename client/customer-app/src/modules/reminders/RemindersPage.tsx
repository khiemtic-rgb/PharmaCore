import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import { useTranslation } from 'react-i18next';
import {
  createReminder,
  getApiErrorMessage,
  searchProducts,
  updateReminder,
} from '@/shared/api/customer-app.api';
import type { CustomerProductSearchItem, FamilyMember, MedicationReminder } from '@/shared/api/customer-app.types';
import { useRemindersOverviewQuery } from '@/shared/api/overview-queries';
import { useCustomerLabels } from '@/shared/i18n/useCustomerLabels';
import { normalizeReminderId } from '@/shared/api/reminder-normalize';
import i18n from '@/shared/i18n';
import { BackToHomeButton } from '@/shared/components/BackToHomeButton';
import { ListCardSkeleton } from '@/shared/components/ListCardSkeleton';
import { useRetryWhenApiOnline } from '@/shared/api/useApiHealth';
import { RepurchaseSuggestionsPanel } from '@/modules/reminders/RepurchaseSuggestionsPanel';
import { DueRemindersPanel, MissedMedicationAlert } from '@/modules/reminders/DueRemindersPanel';

function useDayOptions() {
  const { day } = useCustomerLabels();
  return [1, 2, 3, 4, 5, 6, 7].map((value) => ({ label: day(value), value }));
}

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
      throw new Error(i18n.t('reminders.duplicateIdLocal', { id: item.id }));
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
    throw new Error(i18n.t('reminders.notFound', { id: targetId }));
  }
  return next;
}

function formatFamilyMemberLabel(member: FamilyMember, relationLabel: (key: string) => string) {
  const relation = relationLabel(member.relationship);
  return `${member.fullName} (${relation})`;
}

function ReminderRow({
  item,
  rowNumber,
  togglingId,
  familyName,
  onToggle,
  onEdit,
}: {
  item: MedicationReminder;
  rowNumber: number;
  togglingId: string | null;
  familyName?: string;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (item: MedicationReminder) => void;
}) {
  const { t } = useTranslation();
  const { day } = useCustomerLabels();
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
          {familyName ? <Tag color="blue">{familyName}</Tag> : null}
          {item.isActive ? <Tag color="green">{t('common.active')}</Tag> : <Tag>{t('common.inactive')}</Tag>}
        </Space>
        <div>
          <Typography.Text>
            <strong>{item.remindTime}</strong>
            {item.dosageNote ? ` · ${item.dosageNote}` : ''}
          </Typography.Text>
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {item.daysOfWeek.map((d) => day(d)).join(', ')}
          {item.nextRemindAt
            ? ` · ${t('common.nextAt', { time: dayjs(item.nextRemindAt).format('DD/MM HH:mm') })}`
            : ''}
        </Typography.Text>
      </div>

      <Space direction="vertical" align="end" size={4}>
        <Switch
          checked={item.isActive}
          loading={togglingId === reminderId}
          checkedChildren={t('common.on')}
          unCheckedChildren={t('common.off')}
          onClick={(_, e) => e.stopPropagation()}
          onChange={(checked) => onToggle(reminderId, checked)}
        />
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onEdit(item)}>
          {t('common.edit')}
        </Button>
      </Space>
    </div>
  );
}

export function RemindersPage() {
  const { t } = useTranslation();
  const { familyRelationship } = useCustomerLabels();
  const dayOptions = useDayOptions();
  const { data: overview, isLoading, error, refetch } = useRemindersOverviewQuery();
  const [items, setItems] = useState<MedicationReminder[]>([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MedicationReminder | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [productOptions, setProductOptions] = useState<CustomerProductSearchItem[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [form] = Form.useForm();
  const searchTimerRef = useRef<number | null>(null);

  const familyMembers = overview?.familyMembers ?? [];
  const adherence = overview?.adherence ?? { showMissedAlert: false, missedStreakDays: 0 };
  const dueItems = overview?.dueReminders ?? [];
  const repurchaseItems = overview?.repurchaseSuggestions ?? [];
  const loading = isLoading && !overview;
  const dueLoading = loading;
  const repurchaseLoading = loading;
  const loadError = error ? getApiErrorMessage(error, t('reminders.listLoadFailed')) : null;

  useEffect(() => {
    if (!overview) return;
    const ordered = stableReminderOrder(overview.reminders);
    assertUniqueReminderIds(ordered);
    setItems(ordered);
  }, [overview]);

  useEffect(() => {
    if (!error) return;
    message.error(getApiErrorMessage(error, t('reminders.listLoadFailed')));
  }, [error, t]);

  useRetryWhenApiOnline(() => void refetch());

  const familyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of familyMembers) {
      map.set(member.id, formatFamilyMemberLabel(member, familyRelationship));
    }
    return map;
  }, [familyMembers, familyRelationship]);

  const loadProducts = useCallback(async (search?: string) => {
    setProductSearchLoading(true);
    try {
      const result = await searchProducts(search, 1, 30);
      setProductOptions(result.items);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('reminders.productLoadFailed')));
    } finally {
      setProductSearchLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!modalOpen) return;
    void loadProducts();
  }, [modalOpen, loadProducts]);

  const visibleItems = useMemo(() => {
    const ordered = stableReminderOrder(items);
    return includeInactive ? ordered : ordered.filter((item) => item.isActive);
  }, [items, includeInactive]);

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
      familyMemberId: undefined,
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
      familyMemberId: item.familyMemberId ?? undefined,
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
          familyMemberId: values.familyMemberId ?? null,
          dosageNote: values.dosageNote || undefined,
          remindTime,
          daysOfWeek: values.daysOfWeek,
          isActive: values.isActive,
        });
        setItems((prev) => patchReminderById(prev, updated.id, updated));
        message.success(t('reminders.updated'));
      } else {
        const created = await createReminder({
          productId: values.productId,
          familyMemberId: values.familyMemberId ?? undefined,
          dosageNote: values.dosageNote || undefined,
          remindTime,
          daysOfWeek: values.daysOfWeek,
        });
        setItems((prev) => stableReminderOrder([...prev, created]));
        message.success(t('reminders.added'));
      }
      setModalOpen(false);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('reminders.saveFailed')));
    }
  };

  const onToggleActive = async (reminderId: string, isActive: boolean) => {
    const targetId = normalizeReminderId(reminderId);
    const previousItems = items;

    setTogglingId(targetId);

    try {
      const updated = await updateReminder(targetId, { isActive });
      if (normalizeReminderId(updated.id) !== targetId) {
        throw new Error(t('reminders.idMismatch'));
      }
      setItems((prev) => patchReminderById(prev, targetId, updated));
      message.success(isActive ? t('reminders.toggleOn') : t('reminders.toggleOff'));
    } catch (error) {
      setItems(previousItems);
      message.error(getApiErrorMessage(error, t('reminders.toggleFailed')));
    } finally {
      setTogglingId(null);
    }
  };

  const familySelectOptions = familyMembers.map((member) => ({
    value: member.id,
    label: formatFamilyMemberLabel(member, familyRelationship),
  }));

  const selectOptions = productOptions.map((p) => ({
    value: p.id,
    label: formatProductLabel(p),
  }));

  return (
    <div>
      <BackToHomeButton />
      <MissedMedicationAlert show={adherence.showMissedAlert} streak={adherence.missedStreakDays} />
      <DueRemindersPanel
        dueItems={dueItems}
        dueLoading={dueLoading}
        onResponded={() => void refetch()}
      />
      <RepurchaseSuggestionsPanel
        suggestions={repurchaseItems}
        familyMembers={familyMembers}
        suggestionsLoading={repurchaseLoading}
        onAccepted={() => void refetch()}
      />

      {loadError ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={loadError}
          action={
            <Button size="small" onClick={() => void refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {t('reminders.pageTitle')}
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('common.add')}
        </Button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Checkbox checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)}>
          {t('reminders.showInactive')}
        </Checkbox>
      </div>

      {loading && items.length === 0 ? (
        <ListCardSkeleton rows={4} />
      ) : visibleItems.length === 0 ? (
        <Empty description={t('reminders.empty')} />
      ) : (
        <div>
          {visibleItems.map((item, index) => (
            <ReminderRow
              key={item.id}
              item={item}
              rowNumber={index + 1}
              togglingId={togglingId}
              familyName={item.familyMemberId ? familyNameById.get(item.familyMemberId) : undefined}
              onToggle={onToggleActive}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      <Modal
        title={editing ? t('reminders.modalEdit') : t('reminders.modalAdd')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void onSubmit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="productId"
            label={t('reminders.formProduct')}
            rules={[{ required: true, message: t('reminders.formProductRequired') }]}
          >
            <Select
              showSearch
              filterOption={false}
              loading={productSearchLoading}
              options={selectOptions}
              placeholder={t('reminders.formProductSearch')}
              onSearch={onProductSearch}
              notFoundContent={
                productSearchLoading ? <Spin size="small" /> : t('reminders.formProductNotFound')
              }
            />
          </Form.Item>
          <Form.Item name="familyMemberId" label={t('reminders.formTaker')}>
            <Select
              allowClear
              placeholder={t('reminders.formTakerSelf')}
              options={familySelectOptions}
              notFoundContent={t('reminders.formTakerEmpty')}
            />
          </Form.Item>
          <Form.Item name="dosageNote" label={t('reminders.formDosage')}>
            <Input placeholder={t('reminders.formDosagePlaceholder')} />
          </Form.Item>
          <Form.Item name="remindTime" label={t('reminders.formRemindTime')} rules={[{ required: true }]}>
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="daysOfWeek" label={t('reminders.formDaysOfWeek')} rules={[{ required: true }]}>
            <Checkbox.Group options={dayOptions} />
          </Form.Item>
          {editing ? (
            <Form.Item name="isActive" label={t('reminders.formActive')} valuePropName="checked">
              <Switch />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}
