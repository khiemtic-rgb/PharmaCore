import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Spin, Typography, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import {
  getApiErrorMessage,
  sendChatMessage,
  upsertConsents,
  type ChatOverview,
} from '@/shared/api/customer-app.api';
import type { CustomerChatMessage } from '@/shared/api/customer-app.types';
import { CUSTOMER_APP_CHAT_CONSENT } from '@/shared/api/customer-app.types';
import { overviewQueryKeys, useChatOverviewQuery } from '@/shared/api/overview-queries';
import { buildCustomerChatEventsUrl, subscribeChatSse } from '@/shared/hooks/chat-sse';
import { useVisualViewportInset } from '@/shared/hooks/useVisualViewportInset';
import { useAuthStore } from '@/shared/auth/auth.store';

const STAFF_SENDER = 2;
const FALLBACK_POLL_MS = 30_000;

function ChatBubble({ item, isMine }: { item: CustomerChatMessage; isMine: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        marginBottom: 10,
      }}
    >
      <div
        style={{
          maxWidth: '82%',
          padding: '10px 12px',
          borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isMine ? '#0f766e' : '#fff',
          color: isMine ? '#fff' : '#134e4a',
          border: isMine ? 'none' : '1px solid #ccfbf1',
          boxShadow: '0 1px 2px rgba(15,118,110,0.08)',
        }}
      >
        {!isMine && item.senderName ? (
          <Typography.Text
            style={{ display: 'block', fontSize: 11, color: '#0f766e', marginBottom: 4 }}
          >
            {item.senderName}
          </Typography.Text>
        ) : null}
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.body}</div>
        <Typography.Text
          style={{
            display: 'block',
            fontSize: 10,
            marginTop: 6,
            color: isMine ? 'rgba(255,255,255,0.75)' : '#64748b',
          }}
        >
          {dayjs(item.createdAt).format('DD/MM HH:mm')}
        </Typography.Text>
      </div>
    </div>
  );
}

export function ChatPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  useVisualViewportInset();
  const { data: overview, isLoading, error, refetch } = useChatOverviewQuery();
  const [messages, setMessages] = useState<CustomerChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [enablingConsent, setEnablingConsent] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const chatConsentGranted = overview?.chatConsentGranted ?? false;
  const hasMore = overview?.hasMore ?? false;
  const loading = isLoading && !overview;
  const loadError = error ? getApiErrorMessage(error, t('chat.loadFailed')) : null;

  useEffect(() => {
    document.body.classList.add('customer-app--chat-route');
    return () => document.body.classList.remove('customer-app--chat-route');
  }, []);

  useEffect(() => {
    document.body.classList.toggle('customer-app--chat-typing', inputFocused);
    return () => document.body.classList.remove('customer-app--chat-typing');
  }, [inputFocused]);

  useEffect(() => {
    if (overview) {
      setMessages(overview.messages);
    }
  }, [overview]);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [draft]);

  useEffect(() => {
    const timer = window.setInterval(() => void refetch(), FALLBACK_POLL_MS);
    return () => window.clearInterval(timer);
  }, [refetch]);

  useEffect(() => {
    if (!accessToken) return;
    const url = buildCustomerChatEventsUrl(accessToken);
    return subscribeChatSse(url, () => void refetch());
  }, [accessToken, refetch]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const onEnableChatConsent = async () => {
    setEnablingConsent(true);
    try {
      const saved = await upsertConsents([
        {
          channel: CUSTOMER_APP_CHAT_CONSENT.channel,
          purpose: CUSTOMER_APP_CHAT_CONSENT.purpose,
          granted: true,
        },
      ]);
      const chatConsent = saved.find(
        (c) =>
          c.channel === CUSTOMER_APP_CHAT_CONSENT.channel &&
          c.purpose === CUSTOMER_APP_CHAT_CONSENT.purpose,
      );
      queryClient.setQueryData<ChatOverview>(overviewQueryKeys.chat(), (current) =>
        current
          ? {
              ...current,
              chatConsentGranted: chatConsent?.granted ?? false,
              consents: saved,
            }
          : current,
      );
      message.success(t('chat.consentEnabled'));
    } catch (err) {
      message.error(getApiErrorMessage(err, t('chat.consentEnableFailed')));
    } finally {
      setEnablingConsent(false);
    }
  };

  const onSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const created = await sendChatMessage(text);
      setMessages((prev) => [...prev, created]);
      setDraft('');
      scrollToBottom();
    } catch (err) {
      message.error(getApiErrorMessage(err, t('chat.sendFailed')));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="customer-chat-page">
        <div className="customer-chat-toolbar">
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
            {t('chat.title')}
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="customer-chat-intro">
            {t('chat.intro')}
          </Typography.Paragraph>

          {!chatConsentGranted ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
              message={t('chat.consentRequired')}
              action={
                <div className="customer-chat-alert-actions">
                  <Button
                    size="small"
                    type="primary"
                    loading={enablingConsent}
                    onClick={() => void onEnableChatConsent()}
                  >
                    {t('chat.enableNow')}
                  </Button>
                  <Link to="/profile">{t('chat.account')}</Link>
                </div>
              }
            />
          ) : null}

          {loadError ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
              message={t('chat.loadErrorTitle')}
              description={loadError}
              action={
                <Button size="small" onClick={() => void refetch()}>
                  {t('common.retry')}
                </Button>
              }
            />
          ) : null}
        </div>

        <div ref={listRef} className="customer-chat-messages">
          {loading && messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Spin />
            </div>
          ) : messages.length === 0 ? (
            <Typography.Text type="secondary">{t('chat.empty')}</Typography.Text>
          ) : (
            messages.map((item) => (
              <ChatBubble key={item.id} item={item} isMine={item.senderType !== STAFF_SENDER} />
            ))
          )}
          {hasMore ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('chat.longConversation')}
            </Typography.Text>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="customer-chat-composer-dock" aria-label={t('chat.title')}>
        <div className="customer-chat-composer-inner">
          <textarea
            ref={textareaRef}
            className="customer-chat-native-input"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={chatConsentGranted ? t('chat.placeholder') : t('chat.placeholderDisabled')}
            disabled={!chatConsentGranted || sending}
            enterKeyHint="send"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
          />
          <button
            type="button"
            className="customer-chat-send-btn"
            aria-label={t('chat.send')}
            disabled={!chatConsentGranted || !draft.trim() || sending}
            onClick={() => void onSend()}
          >
            {sending ? <Spin size="small" /> : <SendOutlined />}
          </button>
        </div>
      </div>
    </>
  );
}
