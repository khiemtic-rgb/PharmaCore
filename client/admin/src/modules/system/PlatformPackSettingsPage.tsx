import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, App, Button, Card, Checkbox, Form, Select, Space, Switch, Typography } from 'antd';
import { apiErrorMessage } from '@/shared/api/api-error';
import { useAuthStore } from '@/shared/auth/auth.store';
import {
  fetchPlatformModuleRegistry,
  fetchTenantPlatformSettings,
  updateTenantPlatformSettings,
  type PlatformModuleRegistryItem,
} from '@/shared/platform/tenant-platform.api';
import { useTenantPlatformStore } from '@/shared/platform/tenant-platform.store';

const FEATURE_KEYS = [
  'batch_tracking',
  'national_drug_catalog',
  'order_level_repurchase',
  'family_members',
  'branch_price_overrides',
  'branch_product_listings',
] as const;

type FeatureKey = (typeof FEATURE_KEYS)[number];

interface PlatformPackFormValues {
  vertical: string;
  enabledModules: string[];
  features: Record<FeatureKey, boolean>;
}

const VERTICAL_OPTIONS = [
  'pharmacy',
  'pharmacy_chain',
  'supplement_store',
  'medical_equipment_store',
  'clinic',
  'lab',
  'medical_spa',
  'hybrid',
] as const;

export function PlatformPackSettingsPage() {
  const { t } = useTranslation('system', { keyPrefix: 'platformPack' });
  const { t: tv } = useTranslation('system', { keyPrefix: 'platformPack.verticals' });
  const { t: tf } = useTranslation('system', { keyPrefix: 'platformPack.features' });
  const { message } = App.useApp();
  const [form] = Form.useForm<PlatformPackFormValues>();
  const canEdit = useAuthStore((s) => s.user?.roles.includes('ADMIN') ?? false);
  const setPlatformSettings = useTenantPlatformStore((s) => s.setSettings);
  const setPlatformLoaded = useTenantPlatformStore((s) => s.setLoaded);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState<PlatformModuleRegistryItem[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    void (async () => {
      setLoading(true);
      try {
        const [settings, registry] = await Promise.all([
          fetchTenantPlatformSettings(),
          fetchPlatformModuleRegistry(),
        ]);
        setModules(registry);
        form.setFieldsValue({
          vertical: settings.vertical,
          enabledModules: settings.enabledModules,
          features: FEATURE_KEYS.reduce(
            (acc, key) => {
              acc[key] = settings.features[key] === true;
              return acc;
            },
            {} as Record<FeatureKey, boolean>,
          ),
        });
      } catch (error) {
        message.error(apiErrorMessage(error, t('messages.loadFailed')));
      } finally {
        setLoading(false);
      }
    })();
  }, [form, message, t]);

  const moduleOptions = useMemo(
    () =>
      modules.map((item) => ({
        label: (
          <Space direction="vertical" size={0}>
            <span>{item.moduleName}</span>
            {item.description ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {item.description}
              </Typography.Text>
            ) : null}
          </Space>
        ),
        value: item.moduleCode,
      })),
    [modules],
  );

  const onSave = async (values: PlatformPackFormValues) => {
    setSaving(true);
    try {
      const result = await updateTenantPlatformSettings({
        vertical: values.vertical,
        enabledModules: values.enabledModules,
        features: values.features,
      });
      setPlatformSettings(result.settings);
      setPlatformLoaded(true);
      form.setFieldsValue({
        vertical: result.settings.vertical,
        enabledModules: result.settings.enabledModules,
        features: FEATURE_KEYS.reduce(
          (acc, key) => {
            acc[key] = result.settings.features[key] === true;
            return acc;
          },
          {} as Record<FeatureKey, boolean>,
        ),
      });
      if (result.ignoredModuleCodes.length > 0) {
        message.warning(t('messages.ignoredModules', { codes: result.ignoredModuleCodes.join(', ') }));
      }
      message.success(t('messages.saveSuccess'));
    } catch (error) {
      message.error(apiErrorMessage(error, t('messages.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={t('title')} loading={loading}>
      <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 720 }}>
        <Alert type="info" showIcon message={t('intro')} description={t('introDetail')} />
        {!canEdit ? <Alert type="warning" showIcon message={t('readOnlyHint')} /> : null}

        <Form form={form} layout="vertical" disabled={!canEdit} onFinish={(v) => void onSave(v)}>
          <Form.Item
            name="vertical"
            label={t('fields.vertical')}
            rules={[{ required: true, message: t('validation.verticalRequired') }]}
          >
            <Select
              options={VERTICAL_OPTIONS.map((code) => ({
                value: code,
                label: tv(code, { defaultValue: code }),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="enabledModules"
            label={t('fields.enabledModules')}
            rules={[{ required: true, message: t('validation.modulesRequired') }]}
          >
            <Checkbox.Group options={moduleOptions} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} />
          </Form.Item>

          <Typography.Title level={5} style={{ marginTop: 8 }}>
            {t('fields.features')}
          </Typography.Title>
          {FEATURE_KEYS.map((key) => (
            <Form.Item
              key={key}
              name={['features', key]}
              label={tf(key, { defaultValue: key })}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          ))}

          {canEdit ? (
            <Button type="primary" htmlType="submit" loading={saving}>
              {t('actions.save')}
            </Button>
          ) : null}
        </Form>
      </Space>
    </Card>
  );
}
