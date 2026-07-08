import { Alert, Button, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { apiOfflineHint } from '@/shared/api/api-network';
import { useApiHealth } from '@/shared/api/useApiHealth';

export function ApiHealthBanner() {
  const { t } = useTranslation();
  const { online, checking, recheck } = useApiHealth();

  if (online) return null;

  return (
    <Alert
      type="warning"
      showIcon
      banner
      message={t('common.apiOffline')}
      description={checking ? t('common.reconnecting') : apiOfflineHint()}
      action={
        checking ? (
          <Spin size="small" />
        ) : (
          <Button size="small" onClick={() => void recheck()}>
            {t('common.checkNow')}
          </Button>
        )
      }
      style={{ margin: '0 0 8px' }}
    />
  );
}

/** Ẩn lỗi tải trang khi layout đã báo API offline. */
export function shouldHidePageErrorForOfflineApi(
  error: string | null | undefined,
  apiOnline: boolean,
): boolean {
  if (!error || apiOnline) return false;
  return true;
}
