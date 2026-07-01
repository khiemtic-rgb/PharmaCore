import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Empty, Space, Spin, Tag, Timeline, Typography, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  fetchActiveMedications,
  fetchRepurchaseSuggestions,
  getApiErrorMessage,
} from '@/shared/api/customer-app.api';
import type { ActiveMedication, RepurchaseSuggestion } from '@/shared/api/customer-app.types';
import { BackToHomeButton } from '@/shared/components/BackToHomeButton';
import { RepurchaseSuggestionsPanel } from '@/modules/reminders/RepurchaseSuggestionsPanel';

function isVisibleRepurchase(item: RepurchaseSuggestion) {
  if (item.status === 'dismissed' || item.status === 'expired') return false;
  if (item.status === 'snoozed' && item.snoozedUntil) {
    return dayjs().isAfter(dayjs(item.snoozedUntil));
  }
  return item.status === 'pending' || item.status === 'snoozed';
}

function MedicationCard({ item }: { item: ActiveMedication }) {
  const { t } = useTranslation();
  const lowSupply = item.daysRemaining != null && item.daysRemaining <= 3;

  const daysLabel =
    item.daysRemaining == null
      ? t('medications.daysUnknown')
      : item.daysRemaining <= 0
        ? t('medications.daysMayRunOut')
        : t('medications.daysRemaining', { days: item.daysRemaining });

  return (
    <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}>
      <Space direction="vertical" style={{ width: '100%' }} size={6}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Typography.Text strong>{item.productName}</Typography.Text>
          <Tag color={lowSupply ? 'orange' : 'green'}>{daysLabel}</Tag>
        </div>
        {item.remindTime ? (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {t('medications.remindAt', { time: item.remindTime })}
            {item.dosageNote ? ` · ${item.dosageNote}` : ''}
          </Typography.Text>
        ) : null}
        {item.lastOrderNumber ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('medications.purchased', { orderNumber: item.lastOrderNumber })}
            {item.lastOrderDate ? ` · ${dayjs(item.lastOrderDate).format('DD/MM/YYYY')}` : ''}
          </Typography.Text>
        ) : null}
        {lowSupply ? (
          <Alert
            type="info"
            showIcon
            style={{ borderRadius: 8 }}
            message={t('medications.lowSupplyAlert')}
            action={
              <Link to="/reservations">
                <Button size="small" type="primary">
                  {t('medications.reserveMed')}
                </Button>
              </Link>
            }
          />
        ) : null}
        {item.timeline.length > 0 ? (
          <Timeline
            style={{ marginTop: 8, marginBottom: 0 }}
            items={item.timeline.slice(-5).map((ev) => ({
              children: (
                <div>
                  <Typography.Text style={{ fontSize: 13 }}>{ev.label}</Typography.Text>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(ev.occurredAt).format('DD/MM/YYYY')}
                    </Typography.Text>
                  </div>
                </div>
              ),
            }))}
          />
        ) : null}
        <Link to={`/ai?productId=${item.productId}`}>
          <Button size="small" type="link" style={{ padding: 0, height: 'auto' }}>
            {t('medications.askCopilot')}
          </Button>
        </Link>
      </Space>
    </Card>
  );
}

export function MyMedicationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<ActiveMedication[]>([]);
  const [repurchase, setRepurchase] = useState<RepurchaseSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMedsUnavailable, setActiveMedsUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setActiveMedsUnavailable(false);
    try {
      const [medsResult, suggestionsResult] = await Promise.allSettled([
        fetchActiveMedications(),
        fetchRepurchaseSuggestions(),
      ]);

      if (medsResult.status === 'fulfilled') {
        setItems(medsResult.value);
      } else {
        setItems([]);
        setActiveMedsUnavailable(true);
      }

      if (suggestionsResult.status === 'fulfilled') {
        setRepurchase(suggestionsResult.value.filter(isVisibleRepurchase));
      } else {
        setRepurchase([]);
        message.error(getApiErrorMessage(suggestionsResult.reason, t('medications.loadRepurchaseFailed')));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasRepurchase = repurchase.length > 0;

  return (
    <div>
      <BackToHomeButton />
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        {t('medications.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
        {t('medications.intro')}
      </Typography.Paragraph>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : (
        <>
          {activeMedsUnavailable ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12, borderRadius: 10 }}
              message={t('medications.apiUnavailableTitle')}
              description={t('medications.apiUnavailableDesc')}
            />
          ) : null}

          {items.length > 0 ? items.map((item) => <MedicationCard key={item.productId} item={item} />) : null}

          {items.length === 0 && !hasRepurchase ? (
            <Empty description={t('medications.empty')}>
              <Space>
                <Button type="primary" onClick={() => navigate('/reminders')}>
                  {t('medications.addReminder')}
                </Button>
                <Button onClick={() => navigate('/orders')}>{t('medications.viewOrders')}</Button>
              </Space>
            </Empty>
          ) : null}

          {hasRepurchase ? (
            <div style={{ marginTop: items.length > 0 ? 16 : 0 }}>
              <RepurchaseSuggestionsPanel onAccepted={() => void load()} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
