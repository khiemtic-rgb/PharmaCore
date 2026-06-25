import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export function BackToHomeButton() {
  const navigate = useNavigate();

  return (
    <Button
      type="link"
      icon={<ArrowLeftOutlined />}
      onClick={() => navigate('/')}
      style={{ paddingLeft: 0, marginBottom: 8, color: '#0f766e' }}
    >
      Quay lại trang chủ
    </Button>
  );
}
