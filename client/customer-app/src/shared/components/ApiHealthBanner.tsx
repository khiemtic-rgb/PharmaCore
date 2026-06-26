import { Alert, Button, Spin } from 'antd';
import { useApiHealth } from '@/shared/api/useApiHealth';

export function ApiHealthBanner() {
  const { online, checking, recheck } = useApiHealth();

  if (online === null && checking) {
    return (
      <Alert
        type="info"
        showIcon
        banner
        message="Đang kiểm tra kết nối API…"
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
      message="API tạm ngưng — trang sẽ tự tải lại khi kết nối trở lại"
      description={
        checking
          ? 'Đang thử kết nối lại…'
          : 'Watchdog tự khởi động API (~8 giây). Chỉ cần run-dev.bat hoặc npm run dev — không bấm Thử lại từng trang.'
      }
      action={
        checking ? (
          <Spin size="small" />
        ) : (
          <Button size="small" onClick={() => void recheck()}>
            Kiểm tra ngay
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
