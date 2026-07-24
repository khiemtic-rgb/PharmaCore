import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, Space, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

/** Chiều rộng nội dung chuẩn phân hệ Phát triển Nhân sự. */
export const PEOPLE_CONTENT_MAX = 1100;

export const peoplePageWrap: CSSProperties = {
  width: '100%',
  maxWidth: PEOPLE_CONTENT_MAX,
};

/** Vỏ trang — tiêu đề + mô tả + nội dung, đồng bộ khoảng cách. */
export function PeoplePageShell({
  title,
  hint,
  extra,
  children,
  maxWidth = PEOPLE_CONTENT_MAX,
}: {
  title: ReactNode;
  hint?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%', maxWidth }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          {hint ? (
            <Typography.Paragraph type="secondary" style={{ marginTop: 6, marginBottom: 0 }}>
              {hint}
            </Typography.Paragraph>
          ) : null}
        </div>
        {extra ? <div>{extra}</div> : null}
      </div>
      {children}
    </Space>
  );
}

/** Link chức năng chuẩn: nút + icon. */
export function PeopleNavButton({
  to,
  icon,
  children,
  type = 'default',
  block,
  size = 'middle',
}: {
  to: string;
  icon?: ReactNode;
  children: ReactNode;
  type?: 'default' | 'primary' | 'link' | 'dashed' | 'text';
  block?: boolean;
  size?: 'small' | 'middle' | 'large';
}) {
  return (
    <Link to={to}>
      <Button type={type} icon={icon} block={block} size={size}>
        {children}
      </Button>
    </Link>
  );
}

export function PeopleBackLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <PeopleNavButton to={to} icon={<ArrowLeftOutlined />} size="middle">
      {children}
    </PeopleNavButton>
  );
}

/** Thuật ngữ kỹ thuật — ưu tiên câu đời thường trên UI; viết tắt chỉ khi cần. */
export const TERM = {
  cskh: 'chăm sóc khách hàng',
  crm: 'hồ sơ / quản lý khách',
  fefo: 'xuất hàng gần hết hạn trước',
  pos: 'bán hàng tại quầy',
  kpi: 'chỉ số hiệu suất',
  sop: 'quy trình chuẩn',
  quiz: 'câu hỏi kiểm tra',
  pulse: 'cảm nhận công việc',
  force: 'duyệt ngoại lệ (bỏ qua điều kiện)',
  ai: 'gợi ý thông minh',
  softGate: 'không khóa bán hàng',
} as const;
