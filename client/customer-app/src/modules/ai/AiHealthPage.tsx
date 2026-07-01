import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Space, Tag, Typography, message } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { RobotOutlined, SendOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  askAiHealth,
  fetchActiveMedications,
  getApiErrorMessage,
} from '@/shared/api/customer-app.api';
import type { ActiveMedication, AiHealthAskResponse } from '@/shared/api/customer-app.types';
import { BackToHomeButton } from '@/shared/components/BackToHomeButton';

type ChatTurn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  meta?: AiHealthAskResponse;
};

export function AiHealthPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const productIdFromUrl = searchParams.get('productId');
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(productIdFromUrl ?? undefined);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [meds, setMeds] = useState<ActiveMedication[]>([]);

  const sampleQuestions = useMemo(
    () => [t('ai.sampleQ1'), t('ai.sampleQ2'), t('ai.sampleQ3')],
    [t],
  );

  useEffect(() => {
    void fetchActiveMedications()
      .then((items) => {
        setMeds(items);
        if (!selectedProductId && items.length === 1) {
          setSelectedProductId(items[0].productId);
        }
      })
      .catch(() => setMeds([]));
  }, [selectedProductId]);

  useEffect(() => {
    if (productIdFromUrl) {
      setSelectedProductId(productIdFromUrl);
    }
  }, [productIdFromUrl]);

  const focusedMed = useMemo(
    () => meds.find((m) => m.productId === selectedProductId),
    [meds, selectedProductId],
  );

  const selectProduct = (productId: string | undefined) => {
    setSelectedProductId(productId);
    if (productId) {
      setSearchParams({ productId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const send = async (question: string) => {
    const q = question.trim();
    if (!q) return;
    setSending(true);
    const userTurn: ChatTurn = { id: `u-${Date.now()}`, role: 'user', text: q };
    setTurns((prev) => [...prev, userTurn]);
    setDraft('');
    try {
      const response = await askAiHealth(q, selectedProductId);
      setTurns((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: response.answer, meta: response },
      ]);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('ai.sendFailed')));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <BackToHomeButton />
      <Space align="center" style={{ marginBottom: 8 }}>
        <RobotOutlined style={{ fontSize: 22, color: '#0f766e' }} />
        <Typography.Title level={5} style={{ margin: 0 }}>
          {t('ai.title')}
        </Typography.Title>
      </Space>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
        {t('ai.intro')}
      </Typography.Paragraph>

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12, borderRadius: 10 }}
        message={t('ai.disclaimerTitle')}
        description={t('ai.disclaimerDesc')}
      />

      {meds.length > 0 ? (
        <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('ai.selectMed')}
          </Typography.Text>
          <Space wrap style={{ marginTop: 8 }}>
            {meds.map((item) => (
              <Tag.CheckableTag
                key={item.productId}
                checked={selectedProductId === item.productId}
                onChange={(checked) => selectProduct(checked ? item.productId : undefined)}
              >
                {item.productName}
              </Tag.CheckableTag>
            ))}
          </Space>
        </Card>
      ) : (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12, borderRadius: 10 }}
          message={t('ai.noMedsTitle')}
          description={t('ai.noMedsDesc')}
        />
      )}

      {focusedMed ? (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 12, borderRadius: 10 }}
          message={t('ai.askingAbout', { name: focusedMed.productName })}
          description={
            focusedMed.dosageNote || focusedMed.remindTime
              ? t('ai.schedule', {
                  schedule: `${focusedMed.remindTime ?? '—'}${focusedMed.dosageNote ? ` · ${focusedMed.dosageNote}` : ''}`,
                })
              : undefined
          }
        />
      ) : null}

      <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t('ai.sampleQuestions')}
        </Typography.Text>
        <Space wrap style={{ marginTop: 8 }}>
          {sampleQuestions.map((q) => (
            <Button key={q} size="small" onClick={() => void send(q)} disabled={sending}>
              {q}
            </Button>
          ))}
        </Space>
      </Card>

      <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }} size={10}>
        {turns.map((turn) => (
          <Card
            key={turn.id}
            size="small"
            style={{
              borderRadius: 12,
              alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
              background: turn.role === 'user' ? '#ecfdf5' : '#fff',
            }}
          >
            <Typography.Text style={{ whiteSpace: 'pre-wrap' }}>{turn.text}</Typography.Text>
            {turn.meta ? (
              <div style={{ marginTop: 8 }}>
                <Tag color={turn.meta.confidence === 'high' ? 'green' : turn.meta.confidence === 'medium' ? 'blue' : 'default'}>
                  {turn.meta.confidence}
                </Tag>
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  {turn.meta.disclaimer}
                </Typography.Text>
                {turn.meta.suggestChat ? (
                  <Link to="/chat" style={{ fontSize: 13 }}>
                    {t('ai.chatPharmacist')}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </Card>
        ))}
      </Space>

      <Space.Compact style={{ width: '100%' }}>
        <Input
          placeholder={
            focusedMed
              ? t('ai.placeholderFocused', { name: focusedMed.productName })
              : t('ai.placeholderGeneral')
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPressEnter={() => void send(draft)}
          disabled={sending}
        />
        <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={() => void send(draft)}>
          {t('ai.send')}
        </Button>
      </Space.Compact>

      <Alert
        type="info"
        showIcon
        style={{ marginTop: 12, borderRadius: 10 }}
        message={t('ai.emergency')}
      />
    </div>
  );
}
