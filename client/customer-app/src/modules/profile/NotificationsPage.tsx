import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, List, Space, Spin, Tag, Typography, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  fetchServerNotifications,
  getApiErrorMessage,
  markAllServerNotificationsRead,
  markServerNotificationRead,
} from '@/shared/api/customer-app.api';
import type { ServerNotification } from '@/shared/api/customer-app.types';
import { useCustomerLabels } from '@/shared/i18n/useCustomerLabels';
import { BackToHomeButton } from '@/shared/components/BackToHomeButton';
import { notifyServerNotificationsChanged } from '@/shared/hooks/useCustomerNotificationCount';
import {
  listCustomerNotifications,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead,
  subscribeCustomerNotifications,
  type CustomerNotification,
} from '@/shared/notifications/customer-notifications';

type DisplayNotification = {
  id: string;
  source: 'server' | 'local';
  category?: string;
  title: string;
  body: string;
  href?: string | null;
  createdAt: string;
  read: boolean;
};

function toDisplayFromServer(item: ServerNotification): DisplayNotification {
  return {
    id: item.id,
    source: 'server',
    category: item.category,
    title: item.title,
    body: item.body,
    href: item.href,
    createdAt: item.createdAt,
    read: item.isRead,
  };
}

function toDisplayFromLocal(item: CustomerNotification): DisplayNotification {
  return {
    id: item.id,
    source: 'local',
    category: item.kind,
    title: item.title,
    body: item.body,
    href: item.href,
    createdAt: item.createdAt,
    read: item.read,
  };
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notificationCategory } = useCustomerLabels();
  const [loading, setLoading] = useState(true);
  const [serverItems, setServerItems] = useState<ServerNotification[]>([]);
  const [localItems, setLocalItems] = useState<CustomerNotification[]>(() => listCustomerNotifications());

  const loadServer = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchServerNotifications(50);
      setServerItems(result.items);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('notifications.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadServer();
  }, [loadServer]);

  useEffect(() => {
    const refreshLocal = () => setLocalItems(listCustomerNotifications());
    return subscribeCustomerNotifications(refreshLocal);
  }, []);

  const items = useMemo(() => {
    const server = serverItems.map(toDisplayFromServer);
    const serverKeys = new Set(server.map((item) => `${item.title}|${item.body}`));
    const local = localItems
      .filter((item) => !serverKeys.has(`${item.title}|${item.body}`))
      .map(toDisplayFromLocal);
    return [...server, ...local].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [localItems, serverItems]);

  const unreadCount = items.filter((item) => !item.read).length;

  const openNotification = async (item: DisplayNotification) => {
    try {
      if (item.source === 'server' && !item.read) {
        await markServerNotificationRead(item.id);
        setServerItems((prev) =>
          prev.map((row) => (row.id === item.id ? { ...row, isRead: true, readAt: new Date().toISOString() } : row)),
        );
        notifyServerNotificationsChanged();
      } else if (item.source === 'local' && !item.read) {
        markCustomerNotificationRead(item.id);
      }
    } catch (error) {
      message.error(getApiErrorMessage(error, t('notifications.markReadFailed')));
      return;
    }
    if (item.href) {
      navigate(item.href);
    }
  };

  const markAllRead = async () => {
    try {
      await markAllServerNotificationsRead();
      setServerItems((prev) =>
        prev.map((row) => ({ ...row, isRead: true, readAt: row.readAt ?? new Date().toISOString() })),
      );
      notifyServerNotificationsChanged();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('notifications.markAllReadFailed')));
    }
    markAllCustomerNotificationsRead();
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <BackToHomeButton />
      <Typography.Title level={5} style={{ margin: 0 }}>
        {t('notifications.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
        {t('notifications.subtitle')}
      </Typography.Paragraph>

      {unreadCount > 0 ? (
        <Button size="small" onClick={() => void markAllRead()}>
          {t('notifications.markAllRead')}
        </Button>
      ) : null}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <Card size="small" style={{ borderRadius: 12 }}>
          <Empty description={t('notifications.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        <List
          dataSource={items}
          renderItem={(item) => (
            <Card
              size="small"
              style={{
                marginBottom: 8,
                borderRadius: 12,
                borderColor: item.read ? undefined : '#5eead4',
                cursor: item.href ? 'pointer' : 'default',
              }}
              onClick={() => void openNotification(item)}
            >
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space wrap>
                  <Typography.Text strong={!item.read}>{item.title}</Typography.Text>
                  {!item.read ? <Tag color="processing">{t('common.new')}</Tag> : null}
                  {item.category ? (
                    <Tag>{notificationCategory(item.category)}</Tag>
                  ) : null}
                </Space>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  {item.body}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}
                </Typography.Text>
              </Space>
            </Card>
          )}
        />
      )}

      <Link to="/profile">{t('notifications.backToProfile')}</Link>
    </Space>
  );
}
