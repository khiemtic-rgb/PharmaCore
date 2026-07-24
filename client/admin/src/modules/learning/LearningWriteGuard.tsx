import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Space, Typography } from 'antd';
import { HomeOutlined, ReadOutlined } from '@ant-design/icons';
import { useCanLearningWrite } from '@/shared/auth/usePermission';

/**
 * Trang chỉ dành chủ / quản lý (quyền ghi phân hệ).
 * Nhân viên được hướng về học bài — không ép buộc chấm điểm.
 */
export function LearningWriteGuard({ children }: { children: ReactNode }) {
  const canWrite = useCanLearningWrite();

  if (!canWrite) {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 560 }}>
        <Alert
          type="info"
          showIcon
          message="Trang này dành cho chủ nhà thuốc / quản lý"
          description="Bạn không cần chấm điểm hay duyệt bậc đồng nghiệp. Hãy học bài, hoàn thành onboarding ca đầu và phản hồi đánh giá tháng của chính mình — không khóa bán hàng."
        />
        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
          Nếu bạn là quản lý mà vẫn thấy thông báo này, nhờ người quản trị hệ thống mở quyền ghi
          cho phân hệ Phát triển Nhân sự.
        </Typography.Paragraph>
        <Space wrap>
          <Link to="/people/learn">
            <Button type="primary" size="large" icon={<ReadOutlined />}>
              Vào học bài của tôi
            </Button>
          </Link>
          <Link to="/people">
            <Button size="large" icon={<HomeOutlined />}>
              Về trang chính
            </Button>
          </Link>
        </Space>
      </Space>
    );
  }

  return <>{children}</>;
}
