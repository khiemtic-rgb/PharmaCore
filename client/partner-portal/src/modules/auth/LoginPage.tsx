import { useState } from 'react';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { loginPartner } from '@/shared/api/partner-portal.api';
import { useAuthStore } from '@/shared/auth/auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 420 }} title="Đăng nhập Partner Portal">
        <Typography.Paragraph type="secondary">
          Dành cho CTV / Chuyên viên đánh giá vận hành nhà thuốc. Dùng mã đối tác hoặc SĐT/email do admin cấp.
        </Typography.Paragraph>
        <Form
          layout="vertical"
          onFinish={async (values: { login: string; password: string }) => {
            setLoading(true);
            try {
              const result = await loginPartner(values.login.trim(), values.password);
              setSession(result);
              message.success('Đăng nhập thành công');
              navigate('/');
            } catch (error) {
              let msg = 'Sai tài khoản hoặc mật khẩu';
              if (isAxiosError(error)) {
                const data = error.response?.data as { message?: string } | undefined;
                if (data?.message?.trim()) msg = data.message;
                else if (!error.response) msg = 'Không kết nối được máy chủ. Thử lại sau.';
              }
              message.error(msg);
            } finally {
              setLoading(false);
            }
          }}
        >
          <Form.Item name="login" label="Mã / SĐT / Email" rules={[{ required: true }]}>
            <Input autoComplete="username" placeholder="VD: CTV0984660399" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} style={{ background: '#0f766e' }}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
}
