import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Space, Spin, Typography, message } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  fetchFamilyDueReminders,
  fetchFamilyMembers,
  getApiErrorMessage,
  respondMedicationReminder,
} from '@/shared/api/customer-app.api';
import type { FamilyMember, MedicationReminder } from '@/shared/api/customer-app.types';

type Props = {
  compact?: boolean;
  onResponded?: () => void;
};

export function FamilyCaregiverDuePanel({ compact, onResponded }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<MedicationReminder[]>([]);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [due, members] = await Promise.all([fetchFamilyDueReminders(), fetchFamilyMembers()]);
      setItems(due);
      setFamily(members.filter((m) => m.status === 1));
    } catch (error) {
      console.error(getApiErrorMessage(error));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const familyName = (id: string | null) => {
    if (!id) return t('common.familyMember');
    return family.find((m) => m.id === id)?.fullName ?? t('common.familyMember');
  };

  const respond = async (id: string, action: 'taken' | 'skipped' | 'snooze') => {
    setActingId(id);
    try {
      await respondMedicationReminder(id, action, action === 'snooze' ? 15 : undefined);
      message.success(
        action === 'taken'
          ? t('reminders.familyTakenRecorded')
          : action === 'skipped'
            ? t('common.skipped')
            : t('common.snooze15'),
      );
      await load();
      onResponded?.();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return compact ? null : (
      <div style={{ textAlign: 'center', padding: 16 }}>
        <Spin size="small" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <Card
      size="small"
      style={{ borderRadius: 12, borderColor: '#fcd34d', marginBottom: compact ? 0 : 12 }}
      styles={{ body: { padding: compact ? '10px 12px' : '12px 16px' } }}
    >
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        {t('reminders.familyDueTitle')}
      </Typography.Text>
      <Space direction="vertical" style={{ width: '100%' }} size={10}>
        {items.map((item, index) => (
          <div
            key={item.id}
            style={{
              borderTop: index === 0 ? 'none' : '1px solid #e2e8f0',
              paddingTop: index === 0 ? 0 : 10,
            }}
          >
            <Typography.Text>
              <strong>{familyName(item.familyMemberId)}</strong> — {item.remindTime} · {item.productName}
            </Typography.Text>
            {item.dosageNote ? (
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                {item.dosageNote}
              </Typography.Text>
            ) : null}
            <Space wrap style={{ marginTop: 8 }}>
              <Button
                size="small"
                type="primary"
                loading={actingId === item.id}
                onClick={() => void respond(item.id, 'taken')}
              >
                {t('common.taken')}
              </Button>
              <Button
                size="small"
                loading={actingId === item.id}
                onClick={() => void respond(item.id, 'snooze')}
              >
                {t('common.snoozeLater')}
              </Button>
              <Button
                size="small"
                loading={actingId === item.id}
                onClick={() => void respond(item.id, 'skipped')}
              >
                {t('common.skipped')}
              </Button>
            </Space>
          </div>
        ))}
      </Space>
      <Link to="/family" style={{ fontSize: 12, marginTop: 8, display: 'inline-block' }}>
        {t('reminders.familyManage')}
      </Link>
    </Card>
  );
}
