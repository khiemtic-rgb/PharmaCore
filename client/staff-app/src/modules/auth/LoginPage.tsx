import { useEffect, useState } from 'react';
import { App, Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { LockOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loginApi } from '@/shared/api/auth.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import { useAuthStore } from '@/shared/auth/auth.store';
import { APP_BRAND, loadStoredTenantCode, saveStoredTenantCode } from '@/shared/config/app-brand';
import { AppBrandLogo } from '@/shared/components/AppBrandLogo';
import { apiPath, resolveApiOrigin } from '@/shared/api/api-base';

type FormValues = { tenantCode: string; username: string; password: string };

export function LoginPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    void fetch(apiPath('/api/health'), { method: 'GET' })
      .then((res) => setApiOnline(res.ok))
      .catch(() => setApiOnline(false));
  }, []);

  const onFinish = async (values: FormValues) => {
    const tenantCode = values.tenantCode.trim().toUpperCase();
    if (!tenantCode) {
      message.warning('Nhập mã nhà thuốc');
      return;
    }
    setLoading(true);
    try {
      saveStoredTenantCode(tenantCode);
      const data = await loginApi({
        tenantCode,
        username: values.username.trim(),
        password: values.password,
      });
      setSession(data);
      message.success('Đăng nhập thành công');
      navigate('/', { replace: true });
    } catch (error) {
      message.error(apiErrorMessage(error, 'Sai mã nhà thuốc, tên đăng nhập hoặc mật khẩu'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-shell" style={{ justifyContent: 'center', padding: 20 }}>
      <Card style={{ borderRadius: 16, width: '100%' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <AppBrandLogo height={64} maxWidth={180} />
            </div>
            <Typography.Title level={3} style={{ marginBottom: 4, color: '#0f766e' }}>
              {APP_BRAND}
            </Typography.Title>
            <Typography.Text type="secondary">Quầy bán hàng</Typography.Text>
          </div>
          {apiOnline === false ? (
            <Alert
              type="warning"
              showIcon
              message="API chưa chạy"
              description={
                resolveApiOrigin()
                  ? `Không kết nối được ${resolveApiOrigin()}. Kiểm tra mạng hoặc thử lại sau vài giây.`
                  : 'Chạy run-dev.bat ở thư mục KitPlatform (API port 5290), rồi tải lại trang.'
              }
            />
          ) : null}
          <Form layout="vertical" onFinish={onFinish} initialValues={{ tenantCode: loadStoredTenantCode() || 'DEMO_PHARMACY', username: 'admin' }}>
            <Form.Item name="tenantCode" label="Mã nhà thuốc" rules={[{ required: true }]}>
              <Input prefix={<ShopOutlined />} placeholder="NT_XUANHOA" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
            <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true }]}>
              <Input prefix={<UserOutlined />} autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Đăng nhập
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
