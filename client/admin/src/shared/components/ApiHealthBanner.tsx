import { Alert, Button } from 'antd';
import { useApiHealth } from '@/shared/api/useApiHealth';

export function ApiHealthBanner() {
  const { online, checking, recheck } = useApiHealth();
  if (online) return null;

  return (
    <Alert
      type="error"
      showIcon
      banner
      message="API backend không phản hồi (port 5290)"
      description="API port 5290 chưa phản hồi. Chạy npm run dev (tu dong bat API) hoac .\scripts\restart-api.ps1 — API chay nen, khong can giu cua so CMD."
      action={
        <Button size="small" loading={checking} onClick={() => void recheck()}>
          Kiểm tra lại
        </Button>
      }
    />
  );
}
