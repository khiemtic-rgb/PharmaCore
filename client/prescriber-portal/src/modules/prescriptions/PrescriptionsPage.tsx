import { Button, Card, Empty, List, Space, Tag, Typography, message } from 'antd';
import { LinkOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { fetchPortalPrescriptions, fetchPrescriptionShare } from '@/shared/api/prescriber-portal.api';

export function PrescriptionsPage() {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['prescriber', 'prescriptions'],
    queryFn: () => fetchPortalPrescriptions(),
  });

  const copyPosLink = async (prescriptionId: string) => {
    try {
      const share = await fetchPrescriptionShare(prescriptionId);
      await navigator.clipboard.writeText(share.posDeepLink);
      message.success(t('prescriptions.linkCopied'));
    } catch {
      message.error(t('prescriptions.linkCopyFailed'));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t('prescriptions.title')}
        </Typography.Title>
        <Link to="/prescriptions/new">
          <Button type="primary" icon={<PlusOutlined />}>
            {t('prescriptions.new')}
          </Button>
        </Link>
      </div>
      <Card loading={query.isLoading}>
        {!query.data?.length ? (
          <Empty description={t('prescriptions.empty')} />
        ) : (
          <List
            dataSource={query.data}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="share"
                    type="link"
                    icon={<LinkOutlined />}
                    onClick={() => void copyPosLink(item.id)}
                  >
                    {t('prescriptions.copyPosLink')}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      {item.prescriptionCode}
                      <Tag color={item.status === 'signed' ? 'green' : 'default'}>{item.status}</Tag>
                    </Space>
                  }
                  description={
                    <>
                      {item.tenantName} · {item.patientName ?? item.patientPhone ?? '—'} · {item.lineCount} dòng
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
