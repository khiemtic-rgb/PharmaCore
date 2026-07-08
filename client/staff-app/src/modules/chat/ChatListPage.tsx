import { useCallback, useEffect, useState } from 'react';
import { App, Badge, Empty, Spin, Typography } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { fetchChatThreads } from '@/shared/api/chat.api';
import type { ChatThread } from '@/shared/api/chat.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { useAuthStore } from '@/shared/auth/auth.store';
import { buildChatEventsUrl, subscribeChatSse } from '@/shared/utils/chat-sse';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';

export function ChatListPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setThreads(await fetchChatThreads());
    } catch (error) {
      if (!silent) message.error(apiErrorMessage(error, 'Không tải được hội thoại'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!accessToken) return;
    return subscribeChatSse(buildChatEventsUrl(accessToken), () => void load(true));
  }, [accessToken, load]);

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Chat khách" backTo="/" />
      <main className="staff-body">
        {loading ? (
          <Spin />
        ) : threads.length === 0 ? (
          <Empty description="Chưa có tin nhắn" />
        ) : (
          threads.map((thread) => (
            <div
              key={thread.customerId}
              className="search-hit"
              onClick={() => navigate(`/chat/${thread.customerId}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <Typography.Text strong>{thread.customerName}</Typography.Text>
                {thread.staffUnreadCount > 0 ? <Badge count={thread.staffUnreadCount} /> : null}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {thread.customerPhone ?? thread.customerCode}
              </div>
              {thread.lastMessagePreview ? (
                <Typography.Text type="secondary" ellipsis style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
                  {thread.lastMessagePreview}
                </Typography.Text>
              ) : null}
              {thread.lastMessageAt ? (
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {dayjs(thread.lastMessageAt).format('DD/MM HH:mm')}
                </Typography.Text>
              ) : null}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
