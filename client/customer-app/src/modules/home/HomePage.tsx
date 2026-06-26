import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Row, Space, Spin, Statistic, Typography } from 'antd';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { fetchDraftOrders, fetchLoyaltySummary, fetchReminders, getApiErrorMessage } from '@/shared/api/customer-app.api';
import { useApiHealth, useRetryWhenApiOnline } from '@/shared/api/useApiHealth';
import { shouldHidePageErrorForOfflineApi } from '@/shared/components/ApiHealthBanner';
import { CUSTOMER_DRAFT_ORDER_STATUS, type LoyaltyProgramSummary } from '@/shared/api/customer-app.types';
import { useAuthStore } from '@/shared/auth/auth.store';
import { formatPoints } from '@/shared/utils/points';

export function HomePage() {
  const profile = useAuthStore((s) => s.profile);
  const { online } = useApiHealth();
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [program, setProgram] = useState<LoyaltyProgramSummary | null>(null);
  const [reminderCount, setReminderCount] = useState(0);
  const [nextReminder, setNextReminder] = useState<string | null>(null);
  const [pendingDraftCount, setPendingDraftCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [loyaltyResult, remindersResult, draftsResult] = await Promise.allSettled([
        fetchLoyaltySummary(),
        fetchReminders(),
        fetchDraftOrders(),
      ]);

      if (loyaltyResult.status === 'rejected') {
        setLoadError(getApiErrorMessage(loyaltyResult.reason, 'Không tải được dữ liệu'));
      } else if (remindersResult.status === 'rejected') {
        setLoadError(getApiErrorMessage(remindersResult.reason, 'Không tải được dữ liệu'));
      }

      if (draftsResult.status === 'rejected') {
        console.error(getApiErrorMessage(draftsResult.reason, 'Không tải được đơn hàng'));
      }

      if (loyaltyResult.status === 'fulfilled') {
        setProgram(loyaltyResult.value?.programs[0] ?? null);
      }

      if (remindersResult.status === 'fulfilled') {
        const active = remindersResult.value.items.filter((r) => r.isActive);
        setReminderCount(active.length);
        const next = active
          .map((r) => r.nextRemindAt)
          .filter(Boolean)
          .sort()[0];
        setNextReminder(next ?? null);
      }

      if (draftsResult.status === 'fulfilled') {
        setOrderCount(draftsResult.value.length);
        setPendingDraftCount(
          draftsResult.value.filter(
            (d) =>
              d.status === CUSTOMER_DRAFT_ORDER_STATUS.Sent ||
              d.status === CUSTOMER_DRAFT_ORDER_STATUS.Confirmed,
          ).length,
        );
      }
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useRetryWhenApiOnline(() => loadData());

  if (initialLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={4} style={{ marginBottom: 4 }}>
          Xin chào, {profile?.fullName ?? 'bạn'}!
        </Typography.Title>
        <Typography.Text type="secondary">Chào mừng trở lại nhà thuốc của bạn</Typography.Text>
      </div>

      {loadError && !shouldHidePageErrorForOfflineApi(loadError, online) ? (
        <Alert
          type="warning"
          showIcon
          message="Không tải được dữ liệu"
          description={loadError}
          action={
            <Button size="small" onClick={() => void loadData()}>
              Thử lại
            </Button>
          }
        />
      ) : null}

      {online === false && loadError ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin tip="Đang chờ API — tự tải lại khi kết nối trở lại" />
        </div>
      ) : null}

      {!(online === false && loadError) ? (
        <>
          <Row gutter={[12, 12]}>
            <Col span={12}>
              <Card size="small" style={{ borderRadius: 12 }}>
                <Statistic
                  title="Điểm thưởng"
                  value={formatPoints(program?.pointsBalance ?? 0)}
                  suffix="điểm"
                  valueStyle={{ color: '#0f766e', fontSize: 22 }}
                />
                {program?.currentTier ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Hạng {program.currentTier.tierName}
                  </Typography.Text>
                ) : null}
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ borderRadius: 12 }}>
                <Statistic
                  title="Nhắc uống thuốc"
                  value={reminderCount}
                  suffix="lịch"
                  valueStyle={{ fontSize: 22 }}
                />
                {nextReminder ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Tiếp theo: {dayjs(nextReminder).format('DD/MM HH:mm')}
                  </Typography.Text>
                ) : null}
              </Card>
            </Col>
          </Row>

          <Card size="small" title="Truy cập nhanh" style={{ borderRadius: 12 }}>
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              <Link to="/loyalty">Xem điểm & voucher →</Link>
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              <Link to="/chat">Chat với dược sĩ →</Link>
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              <Link to="/orders">
                Đơn hàng
                {pendingDraftCount > 0
                  ? ` (${pendingDraftCount} đang đặt)`
                  : orderCount > 0
                    ? ` (${orderCount})`
                    : ''}{' '}
                →
              </Link>
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <Link to="/reminders">Quản lý nhắc uống thuốc →</Link>
            </Typography.Paragraph>
          </Card>
        </>
      ) : null}
    </Space>
  );
}
