import { Button, Space, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

type Props = {
  title: string;
  backTo?: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function StaffPageHeader({ title, backTo = '/', onBack, right }: Props) {
  const navigate = useNavigate();

  return (
    <header className="staff-header">
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => (onBack ? onBack() : navigate(backTo))}
          />
          <Typography.Text strong>{title}</Typography.Text>
        </Space>
        {right}
      </Space>
    </header>
  );
}
