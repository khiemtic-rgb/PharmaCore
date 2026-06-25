import { Button, Card, Descriptions, Typography, message } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { logoutApi } from '@/shared/api/customer-app.api';
import { useAuthStore } from '@/shared/auth/auth.store';
import { BackToHomeButton } from '@/shared/components/BackToHomeButton';

export function ProfilePage() {
  const profile = useAuthStore((s) => s.profile);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      if (refreshToken) {
        await logoutApi(refreshToken);
      }
    } catch {
      // vẫn xóa session local
    } finally {
      clearSession();
      message.success('Đã đăng xuất');
      navigate('/login', { replace: true });
    }
  };

  return (
    <div>
      <BackToHomeButton />
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        Tài khoản
      </Typography.Title>

      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Họ tên">{profile?.fullName ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{profile?.phone ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Nhà thuốc">{profile?.tenantCode ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Button danger block icon={<LogoutOutlined />} size="large" onClick={() => void onLogout()}>
        Đăng xuất
      </Button>
    </div>
  );
}
