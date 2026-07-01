import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Spin, Switch, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  createFamilyMember,
  deleteFamilyMember,
  fetchFamilyMembers,
  getApiErrorMessage,
  setFamilyNotifyCaregiver,
  updateFamilyMember,
} from '@/shared/api/customer-app.api';
import type { FamilyMember } from '@/shared/api/customer-app.types';
import { FAMILY_RELATIONSHIP_LABELS } from '@/shared/api/customer-app.types';
import { BackToHomeButton } from '@/shared/components/BackToHomeButton';
import { useCustomerLabels } from '@/shared/i18n/useCustomerLabels';

export function FamilyPage() {
  const { t } = useTranslation();
  const { familyRelationship } = useCustomerLabels();
  const [items, setItems] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [togglingNotifyId, setTogglingNotifyId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const relationshipOptions = useMemo(
    () =>
      Object.keys(FAMILY_RELATIONSHIP_LABELS).map((value) => ({
        value,
        label: familyRelationship(value),
      })),
    [familyRelationship],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchFamilyMembers();
      setItems(rows.filter((r) => r.status === 1));
    } catch (error) {
      message.error(getApiErrorMessage(error, t('family.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({ relationship: 'parent', fullName: '', phone: '', notes: '', notifyCaregiver: false });
    setModalOpen(true);
  };

  const openEdit = (item: FamilyMember) => {
    setEditing(item);
    form.setFieldsValue({
      fullName: item.fullName,
      relationship: item.relationship,
      phone: item.phone ?? '',
      notes: item.notes ?? '',
      notifyCaregiver: item.notifyCaregiver,
    });
    setModalOpen(true);
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        const updated = await updateFamilyMember(editing.id, {
          fullName: values.fullName,
          relationship: values.relationship,
          phone: values.phone || undefined,
          notes: values.notes || undefined,
          status: 1,
          notifyCaregiver: Boolean(values.notifyCaregiver),
        });
        setItems((prev) =>
          prev.map((r) =>
            r.id === updated.id
              ? { ...updated, notifyCaregiver: Boolean(values.notifyCaregiver) }
              : r,
          ),
        );
        message.success(t('family.updated'));
      } else {
        const created = await createFamilyMember({
          fullName: values.fullName,
          relationship: values.relationship,
          phone: values.phone || undefined,
          notes: values.notes || undefined,
          notifyCaregiver: Boolean(values.notifyCaregiver),
        });
        setItems((prev) => [
          ...prev,
          { ...created, notifyCaregiver: Boolean(values.notifyCaregiver) },
        ]);
        message.success(t('family.memberAdded'));
      }
      setModalOpen(false);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('family.saveFailed')));
    }
  };

  const onDelete = async (item: FamilyMember) => {
    try {
      await deleteFamilyMember(item.id);
      setItems((prev) => prev.filter((r) => r.id !== item.id));
      message.success(t('family.deleted'));
    } catch (error) {
      message.error(getApiErrorMessage(error, t('family.deleteFailed')));
    }
  };

  const toggleNotify = async (item: FamilyMember, checked: boolean) => {
    const previous = items;
    setItems((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, notifyCaregiver: checked } : r)),
    );
    setTogglingNotifyId(item.id);
    try {
      const updated = await setFamilyNotifyCaregiver(item.id, checked);
      setItems((prev) =>
        prev.map((r) => (r.id === item.id ? { ...updated, notifyCaregiver: checked } : r)),
      );
      message.success(checked ? t('family.notifyOn') : t('family.notifyOff'));
    } catch (error) {
      setItems(previous);
      message.error(getApiErrorMessage(error, t('family.updateFailed')));
    } finally {
      setTogglingNotifyId(null);
    }
  };

  return (
    <div>
      <BackToHomeButton />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {t('family.title')}
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('common.add')}
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <Typography.Text type="secondary">{t('family.emptyHint')}</Typography.Text>
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {items.map((item) => (
            <div key={item.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '12px 0' }}>
              <Typography.Text strong>{item.fullName}</Typography.Text>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {familyRelationship(item.relationship)}
                  {item.phone ? ` · ${item.phone}` : ''}
                </Typography.Text>
              </div>
              <div style={{ marginTop: 8 }}>
                <Space align="center">
                  <Switch
                    size="small"
                    checked={item.notifyCaregiver}
                    loading={togglingNotifyId === item.id}
                    onClick={(_, e) => e.stopPropagation()}
                    onChange={(checked) => void toggleNotify(item, checked)}
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {t('family.notifyCaregiverLabel')}
                  </Typography.Text>
                </Space>
              </div>
              <Space style={{ marginTop: 8 }}>
                <Button size="small" onClick={() => openEdit(item)}>
                  {t('common.edit')}
                </Button>
                <Button size="small" danger onClick={() => void onDelete(item)}>
                  {t('common.delete')}
                </Button>
              </Space>
            </div>
          ))}
        </Space>
      )}

      <Modal
        title={editing ? t('family.modalEdit') : t('family.modalAdd')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void onSubmit()}
        okText={t('common.save')}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="fullName" label={t('family.fullName')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="relationship" label={t('family.relationship')} rules={[{ required: true }]}>
            <Select options={relationshipOptions} />
          </Form.Item>
          <Form.Item name="phone" label={t('family.phone')}>
            <Input />
          </Form.Item>
          <Form.Item name="notes" label={t('family.notes')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="notifyCaregiver"
            label={t('family.notifyCaregiver')}
            valuePropName="checked"
            extra={t('family.notifyCaregiverExtra')}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
