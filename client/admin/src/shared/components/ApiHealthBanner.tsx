import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useApiHealth } from '@/shared/api/useApiHealth';
import { apiHealthBannerDescription, apiHealthBannerMessage } from '@/shared/api/api-network';

export function ApiHealthBanner() {
  const { t } = useTranslation('common', { keyPrefix: 'apiHealth' });
  const { online, checking, recheck } = useApiHealth();
  if (online) return null;

  return (
    <Alert
      type="error"
      showIcon
      banner
      message={apiHealthBannerMessage()}
      description={apiHealthBannerDescription()}
      action={
        <Button size="small" loading={checking} onClick={() => void recheck()}>
          {t('recheck')}
        </Button>
      }
    />
  );
}
