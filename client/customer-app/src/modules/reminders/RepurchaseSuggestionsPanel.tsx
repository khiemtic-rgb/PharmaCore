import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, Modal, Select, Space, Spin, Tag, TimePicker, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  acceptRepurchaseSuggestion,
  dismissRepurchaseSuggestion,
  fetchFamilyMembers,
  fetchRepurchaseSuggestions,
  getApiErrorMessage,
  snoozeRepurchaseSuggestion,
} from '@/shared/api/customer-app.api';
import { FAMILY_RELATIONSHIP_LABELS, type FamilyMember, type RepurchaseSuggestion } from '@/shared/api/customer-app.types';
import { useCustomerLabels } from '@/shared/i18n/useCustomerLabels';

function isVisibleSuggestion(item: RepurchaseSuggestion) {
  if (item.status === 'dismissed' || item.status === 'expired') return false;
  if (item.status === 'snoozed' && item.snoozedUntil) {
    return dayjs().isAfter(dayjs(item.snoozedUntil));
  }
  return item.status === 'pending';
}

export function RepurchaseSuggestionsPanel({
  onAccepted,
  suggestions,
  familyMembers: externalFamilyMembers,
  suggestionsLoading,
}: {
  onAccepted?: () => void;
  suggestions?: RepurchaseSuggestion[];
  familyMembers?: FamilyMember[];
  suggestionsLoading?: boolean;
}) {
  const { t } = useTranslation();
  const { familyRelationship } = useCustomerLabels();
  const controlled = suggestions !== undefined;
  const [items, setItems] = useState<RepurchaseSuggestion[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(!controlled);
  const [actingId, setActingId] = useState<string | null>(null);
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const visibleItems = controlled
    ? suggestions.filter(isVisibleSuggestion)
    : items;
  const resolvedFamilyMembers = externalFamilyMembers ?? familyMembers;
  const panelLoading = controlled ? Boolean(suggestionsLoading) : loading;

  const load = useCallback(async () => {
    if (controlled) return;
    setLoading(true);
    try {
      const [rows, family] = await Promise.all([fetchRepurchaseSuggestions(), fetchFamilyMembers()]);
      setItems(rows.filter(isVisibleSuggestion));
      setFamilyMembers(family.filter((m) => m.status === 1));
    } catch (error) {
      message.error(getApiErrorMessage(error, t('repurchase.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [controlled, t]);

  useEffect(() => {
    if (controlled) return;
    void load();
  }, [controlled, load]);

  const patchItem = (updated: RepurchaseSuggestion) => {
    setItems((prev) => {
      const next = prev.map((row) => (row.id === updated.id ? updated : row));
      return next.filter(isVisibleSuggestion);
    });
  };

  const openAccept = (id: string) => {
    setAcceptingId(id);
    form.setFieldsValue({
      familyMemberId: undefined,
      remindTime: dayjs('08:00', 'HH:mm'),
    });
    setAcceptModalOpen(true);
  };

  const onAccept = async () => {
    if (!acceptingId) return;
    const values = await form.validateFields();
    setActingId(acceptingId);
    try {
      const updated = await acceptRepurchaseSuggestion(acceptingId, {
        familyMemberId: values.familyMemberId,
        remindTime: (values.remindTime as dayjs.Dayjs).format('HH:mm'),
      });
      patchItem(updated);
      message.success(
        values.familyMemberId ? t('repurchase.acceptedFamily') : t('repurchase.acceptedSelf'),
      );
      setAcceptModalOpen(false);
      setAcceptingId(null);
      onAccepted?.();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('repurchase.createFailed')));
    } finally {
      setActingId(null);
    }
  };

  const onDismiss = async (id: string) => {
    setActingId(id);
    try {
      const updated = await dismissRepurchaseSuggestion(id);
      patchItem(updated);
      message.success(t('repurchase.dismissed'));
    } catch (error) {
      message.error(getApiErrorMessage(error, t('repurchase.dismissFailed')));
    } finally {
      setActingId(null);
    }
  };

  const onSnooze = async (id: string) => {
    setActingId(id);
    try {
      const updated = await snoozeRepurchaseSuggestion(id, dayjs().add(3, 'day').toISOString());
      patchItem(updated);
      message.success(t('repurchase.snoozed'));
    } catch (error) {
      message.error(getApiErrorMessage(error, t('repurchase.snoozeFailed')));
    } finally {
      setActingId(null);
    }
  };

  const familyOptions = resolvedFamilyMembers.map((member) => ({
    value: member.id,
    label: `${member.fullName} (${familyRelationship(member.relationship) ?? FAMILY_RELATIONSHIP_LABELS[member.relationship]})`,
  }));

  if (panelLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 16 }}>
        <Spin size="small" />
      </div>
    );
  }

  if (visibleItems.length === 0) return null;

  return (
    <>
      <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
        <div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            {t('reminders.repurchasePanelTitle')}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
            {t('reminders.repurchasePanelDesc')}
          </Typography.Paragraph>
        </div>
        {visibleItems.map((item) => (
          <Card key={item.id} size="small" style={{ borderRadius: 12 }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <div>
                <Typography.Text strong>{item.orderLabel}</Typography.Text>
                {item.drinkRemindersCreatedAt ? (
                  <Tag color="blue">{t('repurchase.reminderCreatedTag')}</Tag>
                ) : null}
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('repurchase.orderLine', { orderNumber: item.orderNumber })}
                {item.suggestedForDate
                  ? t('repurchase.expectedRunOut', {
                      date: dayjs(item.suggestedForDate).format('DD/MM/YYYY'),
                    })
                  : ''}
              </Typography.Text>
              <Space wrap>
                {!item.drinkRemindersCreatedAt ? (
                  <Button
                    type="primary"
                    size="small"
                    loading={actingId === item.id}
                    onClick={() => openAccept(item.id)}
                  >
                    {t('repurchase.createReminder')}
                  </Button>
                ) : null}
                <Button size="small" loading={actingId === item.id} onClick={() => void onSnooze(item.id)}>
                  {t('repurchase.snooze3Days')}
                </Button>
                <Button size="small" danger loading={actingId === item.id} onClick={() => void onDismiss(item.id)}>
                  {t('repurchase.dismiss')}
                </Button>
              </Space>
            </Space>
          </Card>
        ))}
      </Space>

      <Modal
        title={t('repurchase.modalTitle')}
        open={acceptModalOpen}
        onCancel={() => {
          setAcceptModalOpen(false);
          setAcceptingId(null);
        }}
        onOk={() => void onAccept()}
        okText={t('repurchase.okCreate')}
        cancelText={t('common.cancel')}
        confirmLoading={actingId !== null}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="familyMemberId" label={t('repurchase.forWho')}>
            <Select
              allowClear
              placeholder={t('repurchase.forWhoPlaceholder')}
              options={familyOptions}
              notFoundContent={t('repurchase.noFamily')}
            />
          </Form.Item>
          <Form.Item name="remindTime" label={t('repurchase.remindTime')} rules={[{ required: true }]}>
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
