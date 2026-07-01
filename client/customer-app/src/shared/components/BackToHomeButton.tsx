import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function BackToHomeButton() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Button
      type="link"
      icon={<ArrowLeftOutlined />}
      onClick={() => navigate('/')}
      style={{ paddingLeft: 0, marginBottom: 8, color: '#0f766e' }}
    >
      {t('common.backHome')}
    </Button>
  );
}
