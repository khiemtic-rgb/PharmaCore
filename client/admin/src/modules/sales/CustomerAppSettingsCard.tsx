import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App, Avatar, Button, Card, ColorPicker, Form, Input, Space, Typography, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import {
  fetchCustomerAppSettings,
  updateCustomerAppSettings,
} from '@/shared/api/sales.api';
import { uploadBrandingLogo } from '@/shared/api/files.api';
import type { CustomerAppStoreSettings } from '@/shared/api/sales.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { useHasPermission } from '@/shared/auth/usePermission';
import { withUploadAuth } from '@/shared/utils/upload-url';

type HexColorPickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
};

function HexColorPicker({ value, onChange, disabled }: HexColorPickerProps) {
  return (
    <ColorPicker
      disabled={disabled}
      value={value || '#0F52BA'}
      showText
      format="hex"
      onChange={(color) => onChange?.(color.toHexString())}
    />
  );
}

function resolveLogoPreview(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/')) return withUploadAuth(trimmed);
  return trimmed;
}

export function CustomerAppSettingsCard() {
  const { t } = useTranslation('sales', { keyPrefix: 'receiptSettings.customerAppCard' });
  const { t: tm } = useTranslation('sales', { keyPrefix: 'receiptSettings.messages' });
  const { message } = App.useApp();
  const canWrite = useHasPermission('sales.write');
  const [form] = Form.useForm<CustomerAppStoreSettings>();
  const logoUrl = Form.useWatch('logoUrl', form);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    void (async () => {
      setLoading(true);
      try {
        const settings = await fetchCustomerAppSettings();
        form.setFieldsValue(settings);
      } catch (error) {
        message.error(apiErrorMessage(error, tm('loadFailed')));
      } finally {
        setLoading(false);
      }
    })();
  }, [form, message, tm]);

  const onSave = async (values: CustomerAppStoreSettings) => {
    setSaving(true);
    try {
      const saved = await updateCustomerAppSettings({
        appName: values.appName.trim(),
        shortName: values.shortName.trim(),
        logoUrl: values.logoUrl?.trim() || '/customer-app/icon.svg',
        primaryColor: values.primaryColor?.trim() || '#0F52BA',
        secondaryColor: values.secondaryColor?.trim() || '#3CB371',
        supportPhone: values.supportPhone?.trim() || '',
        tagline: values.tagline?.trim() || '',
      });
      form.setFieldsValue(saved);
      message.success(tm('customerAppSaveSuccess'));
    } catch (error) {
      message.error(apiErrorMessage(error, tm('customerAppSaveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (options: UploadRequestOption) => {
    const file = options.file as File;
    setUploading(true);
    try {
      const url = await uploadBrandingLogo(file);
      form.setFieldValue('logoUrl', url);
      message.success(t('logoUploadSuccess'));
      options.onSuccess?.({});
    } catch (error) {
      const err = apiErrorMessage(error, t('logoUploadFailed'));
      message.error(err);
      options.onError?.(new Error(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card title={t('title')} loading={loading}>
      <Space direction="vertical" size={12} style={{ width: '100%', maxWidth: 520 }}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {t('intro')}
        </Typography.Text>
        <Form
          form={form}
          layout="vertical"
          disabled={!canWrite}
          onFinish={(values) => void onSave(values)}
        >
          <Form.Item
            name="appName"
            label={t('appName')}
            rules={[{ required: true, message: t('appNameRequired') }]}
          >
            <Input placeholder={t('placeholders.appName')} />
          </Form.Item>
          <Form.Item
            name="shortName"
            label={t('shortName')}
            rules={[{ required: true, message: t('shortNameRequired') }]}
          >
            <Input placeholder={t('placeholders.shortName')} />
          </Form.Item>
          <Form.Item name="tagline" label={t('tagline')}>
            <Input placeholder={t('placeholders.tagline')} />
          </Form.Item>
          <Form.Item name="supportPhone" label={t('supportPhone')}>
            <Input placeholder={t('placeholders.supportPhone')} />
          </Form.Item>

          <Form.Item label={t('logoUrl')} name="logoUrl" hidden>
            <Input />
          </Form.Item>
          <Form.Item label={t('logoUrl')}>
            <Space align="start" wrap>
              <Avatar shape="square" size={72} src={resolveLogoPreview(logoUrl)} alt="">
                APP
              </Avatar>
              <Space direction="vertical" size={8}>
                <Upload
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  showUploadList={false}
                  disabled={!canWrite || uploading}
                  customRequest={(options) => void handleLogoUpload(options)}
                >
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    {t('chooseLogo')}
                  </Button>
                </Upload>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t('logoHint')}
                </Typography.Text>
                {logoUrl ? (
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, height: 'auto' }}
                    onClick={() => form.setFieldValue('logoUrl', '/customer-app/icon.svg')}
                  >
                    {t('resetLogo')}
                  </Button>
                ) : null}
              </Space>
            </Space>
          </Form.Item>

          <Form.Item name="primaryColor" label={t('primaryColor')}>
            <HexColorPicker />
          </Form.Item>
          <Form.Item name="secondaryColor" label={t('secondaryColor')}>
            <HexColorPicker />
          </Form.Item>

          {canWrite ? (
            <Space direction="vertical" size={8}>
              <Button type="primary" htmlType="submit" loading={saving}>
                {t('save')}
              </Button>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('saveHint')}
              </Typography.Text>
            </Space>
          ) : null}
        </Form>
      </Space>
    </Card>
  );
}
