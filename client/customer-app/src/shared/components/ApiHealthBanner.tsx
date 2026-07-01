import { Alert, Button, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { useApiHealth } from '@/shared/api/useApiHealth';

export function ApiHealthBanner() {
  const { t } = useTranslation();
  const { online, checking, recheck } = useApiHealth();

  if (online === null && checking) {
    return (
      <Alert
        type="info"
        showIcon
        banner
        message={t('common.checkingApi')}
        style={{ margin: '0 0 8px' }}
      />
    );
  }

  if (online !== false) return null;

  return (
    <Alert
      type="warning"
      showIcon
      banner
      message={t('common.apiOffline')}
      description={checking ? t('common.reconnecting') : t('common.apiOfflineDesc')}
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
  apiOnline: boolean | null,
): boolean {
  if (!error || apiOnline !== false) return false;
  return true;
}
