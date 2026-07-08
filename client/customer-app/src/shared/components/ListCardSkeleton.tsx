import { Card, Skeleton, Space } from 'antd';

type Props = {
  rows?: number;
};

/** Skeleton danh sách card — hiện ngay khi chờ API. */
export function ListCardSkeleton({ rows = 3 }: Props) {
  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      {Array.from({ length: rows }, (_, i) => (
        <Card key={i} size="small" style={{ borderRadius: 12 }}>
          <Skeleton active paragraph={{ rows: 2 }} title={{ width: '55%' }} />
        </Card>
      ))}
    </Space>
  );
}
