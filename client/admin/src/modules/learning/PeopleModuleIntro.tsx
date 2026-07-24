import type { ReactNode } from 'react';
import { Typography } from 'antd';

/** Mô tả ngắn dưới tiêu đề trang — điều hướng về Tổng quan dùng PeopleSubNav. */
export function PeoplePageHint({ children }: { children: ReactNode }) {
  return (
    <Typography.Paragraph
      type="secondary"
      style={{ margin: '6px 0 0', maxWidth: 720 }}
    >
      {children}
    </Typography.Paragraph>
  );
}
