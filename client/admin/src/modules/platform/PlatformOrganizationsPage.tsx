import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  Space,
  Table,
  Typography,
} from 'antd';
import { ArrowLeftOutlined, KeyOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import {
  fetchPlatformSetupStatus,
  fetchPlatformTenants,
} from '@/shared/api/platform.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import type { PlatformTenantListItem } from '@/shared/api/platform.types';
import {
  APP_BRAND,
  loadStoredPlatformKey,
  saveStoredPlatformKey,
} from '@/shared/config/app-brand';
import { PlatformTenantEntitlementDrawer } from '@/modules/platform/PlatformTenantEntitlementDrawer';

type KeyForm = { platformKey?: string };

export function PlatformOrganizationsPage() {
  const { t } = useTranslation('auth', { keyPrefix: 'setup' });
  const { t: tc } = useTranslation('common');
  const { message } = App.useApp();
  const [form] = Form.useForm<KeyForm>();
  const [loading, setLoading] = useState(true);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantsCount, setTenantsCount] = useState(0);
  const [provisioningKeyRequired, setProvisioningKeyRequired] = useState(false);
  const [tenants, setTenants] = useState<PlatformTenantListItem[]>([]);
  const [tenantsLoadError, setTenantsLoadError] = useState<string | null>(null);
  const [entitlementTenant, setEntitlementTenant] = useState<PlatformTenantListItem | null>(null);

  const resolvePlatformKey = useCallback(() => {
    return form.getFieldValue('platformKey')?.trim() || loadStoredPlatformKey() || undefined;
  }, [form]);

  const refreshTenantList = useCallback(
    async (platformKey?: string) => {
      const key = platformKey?.trim() || resolvePlatformKey();
      if (key) {
        saveStoredPlatformKey(key);
        form.setFieldValue('platformKey', key);
      }

      if (tenantsCount > 0 && !key && provisioningKeyRequired) {
        setTenants([]);
        setTenantsLoadError(t('entitlement.needPlatformKey'));
        return;
      }

      setTenantsLoading(true);
      setTenantsLoadError(null);
      try {
        setTenants(await fetchPlatformTenants(key || undefined));
      } catch (error) {
        setTenants([]);
        setTenantsLoadError(apiErrorMessage(error, t('messages.loadTenantsFailed')));
      } finally {
        setTenantsLoading(false);
      }
    },
    [form, provisioningKeyRequired, resolvePlatformKey, t, tenantsCount],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const status = await fetchPlatformSetupStatus();
      setTenantsCount(status.tenantsCount);
      setProvisioningKeyRequired(status.provisioningKeyRequired);

      const storedKey =
        loadStoredPlatformKey() ||
        (import.meta.env.DEV ? 'dev-platform-key-for-local-setup-only' : '');
      if (storedKey) {
        form.setFieldValue('platformKey', storedKey);
        saveStoredPlatformKey(storedKey);
      }

      if (status.tenantsCount === 0) {
        setTenants([]);
        setTenantsLoadError(null);
      } else if (storedKey || !status.provisioningKeyRequired) {
        setTenantsLoading(true);
        try {
          setTenants(await fetchPlatformTenants(storedKey || undefined));
          setTenantsLoadError(null);
        } catch (error) {
          setTenants([]);
          setTenantsLoadError(apiErrorMessage(error, t('messages.loadTenantsFailed')));
        } finally {
          setTenantsLoading(false);
        }
      } else {
        setTenants([]);
        setTenantsLoadError(t('entitlement.needPlatformKey'));
      }
    } catch (error) {
      message.error(apiErrorMessage(error, t('messages.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [form, message, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openEntitlement = (tenant: PlatformTenantListItem) => {
    const key = resolvePlatformKey();
    if (provisioningKeyRequired && !key) {
      message.warning(t('entitlement.needPlatformKey'));
      return;
    }
    setEntitlementTenant(tenant);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 50%, #115e59 100%)',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', color: '#ecfdf5' }}>
            <Typography.Title level={2} style={{ color: '#ecfdf5', marginBottom: 4 }}>
              {APP_BRAND}
            </Typography.Title>
            <Typography.Text style={{ color: '#99f6e4' }}>
              {t('organizations.subtitle', { product: tc('appLayout.productName') })}
            </Typography.Text>
          </div>

          <Card loading={loading}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                <Link to="/setup">
                  <Button icon={<ArrowLeftOutlined />}>{t('organizations.backToSetup')}</Button>
                </Link>
                <Link to="/setup">
                  <Button type="primary" icon={<PlusOutlined />}>
                    {t('organizations.createNew')}
                  </Button>
                </Link>
              </Space>

              <Alert
                type="info"
                showIcon
                message={t('organizations.introTitle')}
                description={t('organizations.introDetail')}
              />

              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  platformKey: loadStoredPlatformKey(),
                }}
              >
                {provisioningKeyRequired ? (
                  <Form.Item label={t('platformKey')} tooltip={t('platformKeyTooltip')} required>
                    <Space.Compact style={{ width: '100%', maxWidth: 560 }}>
                      <Form.Item
                        name="platformKey"
                        noStyle
                        rules={[{ required: true, message: t('platformKeyRequired') }]}
                      >
                        <Input.Password
                          prefix={<KeyOutlined />}
                          placeholder={t('platformKeyPlaceholder')}
                          onBlur={() => void refreshTenantList()}
                          onPressEnter={() => void refreshTenantList()}
                        />
                      </Form.Item>
                      <Button loading={tenantsLoading} onClick={() => void refreshTenantList()}>
                        {t('loadTenants')}
                      </Button>
                    </Space.Compact>
                  </Form.Item>
                ) : null}
              </Form>

              <Typography.Title level={5} style={{ marginBottom: 0 }}>
                {t('existingTenantsTitle')}
                {tenantsCount > 0 ? ` (${tenantsCount})` : ''}
              </Typography.Title>

              {tenantsLoadError ? (
                <Alert
                  type="warning"
                  showIcon
                  message={tenantsLoadError}
                  action={
                    <Button size="small" onClick={() => void refreshTenantList()}>
                      {t('loadTenants')}
                    </Button>
                  }
                />
              ) : null}

              <Table
                size="middle"
                rowKey="id"
                loading={tenantsLoading}
                pagination={false}
                locale={{ emptyText: t('tenantsEmpty') }}
                dataSource={tenants}
                columns={[
                  { title: t('columns.code'), dataIndex: 'tenantCode', width: 140 },
                  { title: t('columns.name'), dataIndex: 'tenantName' },
                  {
                    title: t('columns.vertical'),
                    dataIndex: 'vertical',
                    width: 140,
                    render: (v: string) => t(`verticals.${v}`, { defaultValue: v }),
                  },
                  {
                    title: t('columns.modules'),
                    width: 110,
                    render: (_: unknown, row: PlatformTenantListItem) =>
                      `${row.enabledModuleCount}/${row.allowedModuleCount}`,
                  },
                  {
                    title: t('columns.createdAt'),
                    dataIndex: 'createdAt',
                    width: 180,
                    render: (v: string) => new Date(v).toLocaleString('vi-VN'),
                  },
                  {
                    title: t('columns.actions'),
                    width: 140,
                    fixed: 'right',
                    render: (_: unknown, row: PlatformTenantListItem) => (
                      <Button
                        type="link"
                        size="small"
                        icon={<SettingOutlined />}
                        onClick={() => openEntitlement(row)}
                      >
                        {t('entitlement.configure')}
                      </Button>
                    ),
                  },
                ]}
              />
            </Space>
          </Card>
        </Space>
      </div>

      <PlatformTenantEntitlementDrawer
        open={entitlementTenant != null}
        tenant={entitlementTenant}
        platformKey={resolvePlatformKey()}
        onClose={() => setEntitlementTenant(null)}
        onSaved={() => void refreshTenantList()}
      />
    </div>
  );
}
