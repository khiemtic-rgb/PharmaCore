import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Space, Steps, Typography, message } from 'antd';
import { MobileOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage, requestOtp, verifyOtp } from '@/shared/api/customer-app.api';
import {
  APP_BRAND,
  DEFAULT_TENANT_CODE,
  isTenantCodeLocked,
  loadStoredTenantCode,
  saveStoredTenantCode,
} from '@/shared/config/app-brand';
import { applyTenantFromUrl } from '@/shared/config/tenant-link';
import { useAuthStore } from '@/shared/auth/auth.store';

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function OtpLoginPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  const initialTenant = useMemo(() => applyTenantFromUrl(search ? `?${search}` : ''), [search]);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState(import.meta.env.DEV ? '0909123456' : '');
  const [tenantCode, setTenantCode] = useState(initialTenant.code || DEFAULT_TENANT_CODE);
  const [pilotCode, setPilotCode] = useState<string | null>(null);
  const [expiresInSeconds, setExpiresInSeconds] = useState(0);
  const [form] = Form.useForm<{ code: string }>();
  const tenantLocked = initialTenant.locked || isTenantCodeLocked();
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  useEffect(() => {
    if (initialTenant.locked) {
      setTenantCode(initialTenant.code);
    }
  }, [initialTenant.code, initialTenant.locked]);

  useEffect(() => {
    if (step !== 1) return;

    const timer = window.setInterval(() => {
      setExpiresInSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step]);

  const resetOtpStep = () => {
    setStep(0);
    setPilotCode(null);
    setExpiresInSeconds(0);
    form.resetFields();
  };

  const onRequestOtp = async () => {
    const normalized = phone.trim();
    if (normalized.length < 9) {
      message.warning(t('auth.invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      const code = (tenantLocked ? DEFAULT_TENANT_CODE || tenantCode : tenantCode).trim().toUpperCase();
      if (!code) {
        message.warning(t('auth.tenantRequired'));
        return;
      }
      saveStoredTenantCode(code);
      const res = await requestOtp(normalized, code);
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
      const data = await verifyOtp(
        phone.trim(),
        values.code.trim(),
        (tenantLocked ? DEFAULT_TENANT_CODE || tenantCode : tenantCode).trim().toUpperCase(),
      );
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
              {tenantLocked && tenantCode ? (
                <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                  {t('auth.tenantLocked', { tenant: tenantCode })}
                </Typography.Paragraph>
              ) : null}
              <Form.Item label={t('auth.phoneLabel')} required>
                <Input
                  prefix={<MobileOutlined />}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0909123456"
                  size="large"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </Form.Item>
              {!tenantLocked ? (
                <Form.Item label={t('auth.tenantLabel')} required>
                  <Input
                    value={tenantCode}
                    onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                    placeholder={DEFAULT_TENANT_CODE || loadStoredTenantCode() || 'NT_A'}
                    size="large"
                    style={{ textTransform: 'uppercase' }}
                  />
                </Form.Item>
              ) : null}
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                {t('auth.sendOtp')}
              </Button>
            </Form>
          ) : (
            <Form form={form} layout="vertical" onFinish={onVerifyOtp}>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                {t('auth.otpSentTo')} <strong>{phone}</strong>.
                {import.meta.env.DEV && !pilotCode ? (
                  <> {t('auth.devOtpHint')} <code>000000</code></>
                ) : null}
              </Typography.Paragraph>

              {pilotCode ? (
                <div
                  style={{
                    marginBottom: 16,
                    padding: '16px 12px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%)',
                    border: '1px solid #99f6e4',
                    textAlign: 'center',
                  }}
                >
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    {t('auth.pilotCodeTitle')}
                  </Typography.Text>
                  <Typography.Title
                    level={2}
                    style={{
                      margin: 0,
                      letterSpacing: 8,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      color: '#0f766e',
                    }}
                  >
                    {pilotCode}
                  </Typography.Title>
                  <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                    {expiresInSeconds > 0
                      ? t('auth.pilotCodeExpires', { seconds: formatCountdown(expiresInSeconds) })
                      : t('auth.pilotCodeExpired')}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                    {t('auth.pilotCodeHint')}
                  </Typography.Text>
                </div>
              ) : null}

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
              <Button type="link" block onClick={resetOtpStep} style={{ marginTop: 8 }}>
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
