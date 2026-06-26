import { useState } from 'react';
import { App, Button, Card, Form, Input, Typography, Space } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginApi } from '@/shared/api/auth.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import { useAuthStore } from '@/shared/auth/auth.store';

type LoginFormValues = { username: string; password: string };

export function LoginPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const fillDemo = () => {
    form.setFieldsValue({ username: 'admin', password: 'Admin@123' });
  };

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const data = await loginApi({
        username: values.username.trim(),
        password: values.password,
      });
      if (!data?.accessToken) {
        message.error('API trả dữ liệu không hợp lệ — thử lại hoặc restart API.');
        return;
      }
      setSession(data);
      message.success('Đăng nhập thành công');
      navigate(from, { replace: true });
    } catch (error) {
      message.error(apiErrorMessage(error, 'Sai tên đăng nhập hoặc mật khẩu'));
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = () => {
    message.warning('Vui lòng nhập tên đăng nhập và mật khẩu.');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 50%, #115e59 100%)',
        padding: 24,
      }}
    >
      <Card style={{ width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Typography.Title level={3} style={{ marginBottom: 4 }}>
              PharmaCore
            </Typography.Title>
            <Typography.Text type="secondary">Đăng nhập hệ thống ERP nhà thuốc</Typography.Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            requiredMark={false}
            initialValues={{ username: 'admin' }}
            autoComplete="on"
          >
            <Form.Item
              name="username"
              label="Tên đăng nhập"
              rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="admin"
                size="large"
                autoComplete="username"
                name="username"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Nhập mật khẩu' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="••••••••"
                size="large"
                autoComplete="current-password"
                name="password"
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Đăng nhập
            </Button>
          </Form>

          <Typography.Paragraph type="secondary" style={{ marginBottom: 0, textAlign: 'center', fontSize: 12 }}>
            Demo:{' '}
            <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 12 }} onClick={fillDemo}>
              admin / Admin@123
            </Button>
            {' · '}
            Nếu bấm không phản hồi, chọn link demo rồi đăng nhập lại.
          </Typography.Paragraph>
        </Space>
      </Card>
    </div>
  );
}
