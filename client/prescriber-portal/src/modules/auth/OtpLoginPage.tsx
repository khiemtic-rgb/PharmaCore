import { useEffect, useState } from 'react';
import { App, Button, Card, Form, Input, Space, Steps, Typography } from 'antd';
import { MobileOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage, requestPrescriberOtp, verifyPrescriberOtp } from '@/shared/api/prescriber-portal.api';
import { useAuthStore } from '@/shared/auth/auth.store';

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function OtpLoginPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState(import.meta.env.DEV ? '0909123456' : '');
  const [pilotCode, setPilotCode] = useState<string | null>(null);
  const [expiresInSeconds, setExpiresInSeconds] = useState(0);
  const [form] = Form.useForm<{ code: string }>();
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  useEffect(() => {
    if (step !== 1) return;
    const timer = window.setInterval(() => {
      setExpiresInSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  const onRequestOtp = async () => {
    const normalized = phone.trim();
    if (normalized.length < 9) {
      message.warning(t('auth.invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      const res = await requestPrescriberOtp(normalized);
      message.success(res.message || t('auth.otpSent'));
      setPilotCode(res.pilotCode?.trim() || null);
      setExpiresInSeconds(res.expiresInSeconds);
      if (res.pilotCode?.trim()) {
        form.setFieldsValue({ code: res.pilotCode.trim() });
      } else {
        form.resetFields();
      }
      setStep(1);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('auth.otpSendFailed')));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (values: { code: string }) => {
    setLoading(true);
    try {
      const data = await verifyPrescriberOtp(phone.trim(), values.code.trim());
      setSession(data);
      message.success(t('auth.welcome', { name: data.profile.fullName }));
      navigate('/', { replace: true });
    } catch {
      message.error(t('auth.otpInvalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'linear-gradient(160deg, #dbeafe 0%, #eff6ff 45%, #f8fafc 100%)',
      }}
    >
      <Card style={{ width: 'min(420px, 100%)', borderRadius: 16, boxShadow: '0 12px 40px rgba(29,78,216,0.12)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0, color: '#1d4ed8' }}>
              {t('auth.title')}
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {t('auth.subtitle')}
            </Typography.Paragraph>
          </div>

          <Steps
            size="small"
            current={step}
            items={[
              { title: t('auth.phone'), icon: <MobileOutlined /> },
              { title: t('auth.otp'), icon: <SafetyOutlined /> },
            ]}
          />

          {step === 0 ? (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Input
                size="large"
                prefix={<MobileOutlined />}
                placeholder={t('auth.phone')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onPressEnter={() => void onRequestOtp()}
              />
              <Button type="primary" size="large" block loading={loading} onClick={() => void onRequestOtp()}>
                {t('auth.sendOtp')}
              </Button>
            </Space>
          ) : (
            <Form form={form} layout="vertical" onFinish={onVerifyOtp}>
              <Typography.Text type="secondary">{phone}</Typography.Text>
              {pilotCode ? (
                <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                  Pilot OTP: <Typography.Text code>{pilotCode}</Typography.Text>
                </Typography.Paragraph>
              ) : null}
              <Form.Item
                name="code"
                label={t('auth.otp')}
                rules={[{ required: true, message: t('auth.otpInvalid') }]}
              >
                <Input size="large" autoComplete="one-time-code" inputMode="numeric" />
              </Form.Item>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                  {t('auth.verifyOtp')}
                </Button>
                <Button type="link" disabled={expiresInSeconds > 0} onClick={() => void onRequestOtp()}>
                  {expiresInSeconds > 0
                    ? t('auth.resendIn', { time: formatCountdown(expiresInSeconds) })
                    : t('auth.sendOtp')}
                </Button>
                <Button type="text" onClick={() => setStep(0)}>
                  {t('common.cancel')}
                </Button>
              </Space>
            </Form>
          )}
        </Space>
      </Card>
    </div>
  );
}
