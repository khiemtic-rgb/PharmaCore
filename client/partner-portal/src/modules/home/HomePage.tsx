import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Statistic, Table, Typography } from 'antd';
import { fetchDashboard } from '@/shared/api/partner-portal.api';
import dayjs from 'dayjs';

export function HomePage() {
  const { data, isLoading } = useQuery({ queryKey: ['partner-dashboard'], queryFn: fetchDashboard });

  return (
    <div>
      <Typography.Title level={3}>Tổng quan</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={8}><Card loading={isLoading}><Statistic title="Khảo sát" value={data?.submissionCount ?? 0} /></Card></Col>
        <Col xs={12} md={8}><Card loading={isLoading}><Statistic title="Hoàn thành" value={data?.completedCount ?? 0} /></Card></Col>
        <Col xs={12} md={8}><Card loading={isLoading}><Statistic title="Có SĐT (lead)" value={data?.leadCount ?? 0} /></Card></Col>
        <Col xs={12} md={8}><Card loading={isLoading}><Statistic title="Demo đã hẹn" value={data?.demoScheduledCount ?? 0} /></Card></Col>
        <Col xs={12} md={8}><Card loading={isLoading}><Statistic title="Chốt (won)" value={data?.wonCount ?? 0} /></Card></Col>
        <Col xs={12} md={8}><Card loading={isLoading}><Statistic title="HH chờ duyệt" value={data?.pendingCommissionCount ?? 0} /></Card></Col>
      </Row>

      <Typography.Title level={4} style={{ marginTop: 28 }}>Gần đây</Typography.Title>
      <Table
        loading={isLoading}
        rowKey="id"
        dataSource={data?.recentLeads ?? []}
        pagination={false}
        columns={[
          { title: 'Nhà thuốc', dataIndex: 'orgName', render: (v, r) => v || r.contactName || '—' },
          { title: 'SĐT', dataIndex: 'phone', width: 120 },
          { title: 'Điểm', dataIndex: 'overallPct', width: 80, render: (v) => (v == null ? '—' : Math.round(v)) },
          { title: 'Pipeline', dataIndex: 'leadPipelineStatus', width: 130 },
          { title: 'Ngày', dataIndex: 'startedAt', width: 120, render: (v) => dayjs(v).format('DD/MM/YYYY') },
        ]}
      />
    </div>
  );
}
