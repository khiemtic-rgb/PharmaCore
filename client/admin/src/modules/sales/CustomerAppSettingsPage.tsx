import { Space } from 'antd';
import { CustomerAppLinkQrCard } from '@/modules/sales/CustomerAppLinkQrCard';
import { CustomerAppSettingsCard } from '@/modules/sales/CustomerAppSettingsCard';

export function CustomerAppSettingsPage() {
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <CustomerAppLinkQrCard />
      <CustomerAppSettingsCard />
    </Space>
  );
}
