import { Link } from 'react-router-dom';
import { Typography } from 'antd';
import {
  FormOutlined,
  ReadOutlined,
  RiseOutlined,
  TrophyOutlined,
} from '@ant-design/icons';

/** Vòng People thống nhất — dùng trên Đào tạo & Ghi nhận. */
const CYCLE = [
  {
    key: 'train',
    to: '/people/learn',
    icon: <ReadOutlined style={{ fontSize: 22, color: '#1677ff' }} />,
    label: 'Đào tạo',
  },
  {
    key: 'eval',
    to: '/people/evaluations',
    icon: <FormOutlined style={{ fontSize: 22, color: '#722ed1' }} />,
    label: 'Đánh giá tháng',
  },
  {
    key: 'rec',
    to: '/people/recognize',
    icon: <TrophyOutlined style={{ fontSize: 22, color: '#faad14' }} />,
    label: 'Ghi nhận',
  },
  {
    key: 'grow',
    to: '/people/grow',
    icon: <RiseOutlined style={{ fontSize: 22, color: '#52c41a' }} />,
    label: 'Phát triển nghề',
  },
] as const;

export function NovixaPeopleCycle({ activeKey }: { activeKey?: (typeof CYCLE)[number]['key'] }) {
  return (
    <div>
      <Typography.Text strong style={{ display: 'block', marginBottom: 12, fontSize: 15 }}>
        Vòng phát triển Novixa
      </Typography.Text>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 12,
        }}
      >
        {CYCLE.map((step) => {
          const active = activeKey === step.key;
          const inner = (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                minHeight: 88,
                padding: '14px 8px',
                borderRadius: 12,
                background: active ? '#e6f4ff' : '#fff',
                border: `1px solid ${active ? '#91caff' : '#f0f0f0'}`,
                boxShadow: active ? 'none' : '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              {step.icon}
              <Typography.Text
                strong={active}
                style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.3 }}
              >
                {step.label}
              </Typography.Text>
            </div>
          );
          return active ? (
            <div key={step.key}>{inner}</div>
          ) : (
            <Link key={step.key} to={step.to} style={{ textDecoration: 'none' }}>
              {inner}
            </Link>
          );
        })}
      </div>
      <Typography.Paragraph type="secondary" style={{ margin: '12px 0 0', fontSize: 12 }}>
        Bài học L0–L6 là kỹ năng trên ca. Bậc 1–5 là chức danh / trách nhiệm — không phải cùng một
        thang.
      </Typography.Paragraph>
    </div>
  );
}
