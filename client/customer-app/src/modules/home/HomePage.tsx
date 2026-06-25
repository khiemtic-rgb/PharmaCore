import { useEffect, useState } from 'react';
import { Card, Col, Row, Space, Spin, Statistic, Typography } from 'antd';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { fetchLoyaltySummary, fetchReminders, getApiErrorMessage } from '@/shared/api/customer-app.api';
import type { LoyaltyProgramSummary } from '@/shared/api/customer-app.types';
import { useAuthStore } from '@/shared/auth/auth.store';
import { formatPoints } from '@/shared/utils/points';

export function HomePage() {
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<LoyaltyProgramSummary | null>(null);
  const [reminderCount, setReminderCount] = useState(0);
  const [nextReminder, setNextReminder] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [loyalty, reminders] = await Promise.all([
          fetchLoyaltySummary(),
          fetchReminders(),
        ]);
        if (cancelled) return;
        setProgram(loyalty?.programs[0] ?? null);
        const active = reminders.items.filter((r) => r.isActive);
        setReminderCount(active.length);
        const next = active
          .map((r) => r.nextRemindAt)
          .filter(Boolean)
          .sort()[0];
        setNextReminder(next ?? null);
      } catch (error) {
        if (!cancelled) {
          console.error(getApiErrorMessage(error));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
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
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          <Link to="/reminders">Quản lý nhắc uống thuốc →</Link>
        </Typography.Paragraph>
      </Card>
    </Space>
  );
}
