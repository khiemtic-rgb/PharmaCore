import { useQuery } from '@tanstack/react-query';
import { Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { fetchLeads } from '@/shared/api/partner-portal.api';

export function LeadsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['partner-leads'], queryFn: fetchLeads });

  return (
    <div>
      <Typography.Title level={3}>Khảo sát của bạn</Typography.Title>
      <Table
        loading={isLoading}
        rowKey="id"
        dataSource={data ?? []}
        columns={[
          { title: 'Nhà thuốc', dataIndex: 'orgName', render: (v, r) => v || r.contactName || '—' },
          { title: 'Liên hệ', dataIndex: 'contactName' },
          { title: 'SĐT', dataIndex: 'phone', width: 120 },
          { title: 'Trạng thái', dataIndex: 'status', width: 120 },
          { title: 'Pipeline', dataIndex: 'leadPipelineStatus', width: 140 },
          { title: 'Hoa hồng', dataIndex: 'commissionStatus', width: 110 },
          {
            title: 'Điểm',
            dataIndex: 'overallPct',
            width: 80,
            render: (v) => (v == null ? '—' : Math.round(Number(v))),
          },
          {
            title: 'Ngày',
            dataIndex: 'startedAt',
            width: 120,
            render: (v) => dayjs(v).format('DD/MM/YYYY'),
          },
        ]}
      />
    </div>
  );
}
