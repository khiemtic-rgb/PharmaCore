import { useState } from 'react';
import { Button, Card, Form, Input, Space, Steps, Typography, message } from 'antd';
import { MobileOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage, requestOtp, verifyOtp } from '@/shared/api/customer-app.api';
import {
  APP_BRAND,
  DEFAULT_TENANT_CODE,
  loadStoredTenantCode,
  saveStoredTenantCode,
} from '@/shared/config/app-brand';
import { useAuthStore } from '@/shared/auth/auth.store';

export function OtpLoginPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState(import.meta.env.DEV ? '0909123456' : '');
  const [tenantCode, setTenantCode] = useState(loadStoredTenantCode);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  const onRequestOtp = async () => {
    const normalized = phone.trim();
    if (normalized.length < 9) {
      message.warning(t('auth.invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      const code = tenantCode.trim().toUpperCase();
      if (!code) {
        message.warning(t('auth.tenantRequired'));
        return;
      }
      saveStoredTenantCode(code);
      const res = await requestOtp(normalized, code);
      message.success(res.message || t('auth.otpSent'));
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
      const data = await verifyOtp(phone.trim(), values.code.trim(), tenantCode.trim().toUpperCase());
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
        background: 'linear-gradient(160deg, #ccfbf1 0%, #f0fdfa 45%, #ecfeff 100%)',
      }}
    >
      <Card style={{ width: '100%', maxWidth: 400, borderRadius: 16 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Typography.Title level={3} style={{ marginBottom: 4, color: '#0f766e' }}>
              {APP_BRAND}
            </Typography.Title>
            <Typography.Text type="secondary">{t('auth.subtitle')}</Typography.Text>
          </div>

          <Steps
            size="small"
            current={step}
            items={[{ title: t('auth.stepPhone') }, { title: t('auth.stepOtp') }]}
          />

          {step === 0 ? (
            <Form layout="vertical" onFinish={onRequestOtp}>
              <Form.Item label={t('auth.phoneLabel')} required>
                <Input
                  prefix={<MobileOutlined />}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0909123456"
                  size="large"
                />
              </Form.Item>
              <Form.Item label={t('auth.tenantLabel')} required>
                <Input
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                  placeholder={DEFAULT_TENANT_CODE || 'NT_A'}
                  size="large"
                  style={{ textTransform: 'uppercase' }}
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                {t('auth.sendOtp')}
              </Button>
            </Form>
          ) : (
            <Form layout="vertical" onFinish={onVerifyOtp}>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                {t('auth.otpSentTo')} <strong>{phone}</strong>.
                {import.meta.env.DEV ? (
                  <> {t('auth.devOtpHint')} <code>000000</code></>
                ) : null}
              </Typography.Paragraph>
              <Form.Item
                name="code"
                label={t('auth.otpLabel')}
                rules={[{ required: true, message: t('auth.otpRequired') }]}
              >
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="000000"
                  size="large"
                  maxLength={6}
                  inputMode="numeric"
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                {t('auth.confirm')}
              </Button>
              <Button type="link" block onClick={() => setStep(0)} style={{ marginTop: 8 }}>
                {t('auth.changePhone')}
              </Button>
            </Form>
          )}

          {import.meta.env.DEV ? (
            <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: 12, textAlign: 'center' }}>
              Demo: 0909123456 · {DEFAULT_TENANT_CODE}
            </Typography.Paragraph>
          ) : null}
        </Space>
      </Card>
    </div>
  );
}
