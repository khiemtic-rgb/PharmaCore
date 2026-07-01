import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Space, Spin, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  fetchDueReminders,
  getApiErrorMessage,
  respondMedicationReminder,
} from '@/shared/api/customer-app.api';
import type { MedicationReminder } from '@/shared/api/customer-app.types';

type Props = {
  onResponded?: () => void;
  compact?: boolean;
};

export function DueRemindersPanel({ onResponded, compact }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<MedicationReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchDueReminders();
      setItems(rows);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('reminders.dueTitle')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (id: string, action: 'taken' | 'skipped' | 'snooze') => {
    setActingId(id);
    try {
      await respondMedicationReminder(id, action, action === 'snooze' ? 15 : undefined);
      message.success(
        action === 'taken'
          ? t('reminders.takenRecorded')
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
      style={{ borderRadius: 12, borderColor: '#5eead4', marginBottom: compact ? 0 : 12 }}
      styles={{ body: { padding: compact ? '10px 12px' : '12px 16px' } }}
    >
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        {t('reminders.dueTitle')}
      </Typography.Text>
      <Space direction="vertical" style={{ width: '100%' }} size={10}>
        {items.map((item) => (
          <div key={item.id} style={{ borderTop: items[0].id === item.id ? 'none' : '1px solid #e2e8f0', paddingTop: items[0].id === item.id ? 0 : 10 }}>
            <Typography.Text>
              <strong>{item.remindTime}</strong> — {item.productName}
            </Typography.Text>
            {item.dosageNote ? (
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                {item.dosageNote}
              </Typography.Text>
            ) : null}
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 11, marginBottom: 8 }}>
              {t('reminders.dueQuestion')}
            </Typography.Text>
            <Space wrap>
              <Button
                type="primary"
                size="small"
                loading={actingId === item.id}
                onClick={() => void respond(item.id, 'taken')}
              >
                {t('common.taken')}
              </Button>
              <Button size="small" loading={actingId === item.id} onClick={() => void respond(item.id, 'skipped')}>
                {t('common.skipped')}
              </Button>
              <Button size="small" loading={actingId === item.id} onClick={() => void respond(item.id, 'snooze')}>
                {t('common.snooze15')}
              </Button>
            </Space>
            {item.nextRemindAt ? (
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 6 }}>
                {t('common.scheduleAt', { time: dayjs(item.nextRemindAt).format('DD/MM HH:mm') })}
              </Typography.Text>
            ) : null}
          </div>
        ))}
      </Space>
    </Card>
  );
}

export function MissedMedicationAlert({ show, streak }: { show: boolean; streak: number }) {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 12, borderRadius: 12 }}
      message={t('reminders.missedAlert', { days: streak })}
      description={t('reminders.missedDesc')}
    />
  );
}
