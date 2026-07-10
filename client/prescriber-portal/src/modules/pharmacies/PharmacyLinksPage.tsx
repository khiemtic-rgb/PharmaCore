import { Card, Empty, List, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchMyPharmacies } from '@/shared/api/prescriber-portal.api';

export function PharmacyLinksPage() {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['prescriber', 'pharmacies'],
    queryFn: () => fetchMyPharmacies(true),
  });

  return (
    <div>
      <Typography.Title level={4}>{t('pharmacies.title')}</Typography.Title>
      <Card loading={query.isLoading}>
        {!query.data?.length ? (
          <Empty description={t('pharmacies.empty')} />
        ) : (
          <List
            dataSource={query.data}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <>
                      {item.tenantName}{' '}
                      <Tag color="blue">{item.tenantCode}</Tag>
                    </>
                  }
                  description={item.linkStatus}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
