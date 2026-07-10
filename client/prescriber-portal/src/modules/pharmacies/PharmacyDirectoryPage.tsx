import { useState } from 'react';
import { Button, Card, Empty, Input, List, Space, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getApiErrorMessage,
  requestPharmacyLink,
  searchPharmacyDirectory,
} from '@/shared/api/prescriber-portal.api';

export function PharmacyDirectoryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');

  const directoryQuery = useQuery({
    queryKey: ['prescriber', 'directory', query],
    queryFn: () => searchPharmacyDirectory(query || undefined),
    enabled: query.trim().length >= 2,
  });

  const requestMutation = useMutation({
    mutationFn: (tenantCode: string) => requestPharmacyLink(tenantCode),
    onSuccess: async () => {
      message.success(t('directory.requestSuccess'));
      await queryClient.invalidateQueries({ queryKey: ['prescriber', 'pharmacies'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error, t('directory.requestFailed'))),
  });

  return (
    <div>
      <Typography.Title level={4}>{t('directory.title')}</Typography.Title>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Input.Search
          allowClear
          placeholder={t('directory.placeholder')}
          onSearch={(value) => setQuery(value.trim())}
        />
        <Card loading={directoryQuery.isFetching}>
          {query.trim().length < 2 ? (
            <Typography.Text type="secondary">{t('directory.placeholder')}</Typography.Text>
          ) : !directoryQuery.data?.length ? (
            <Empty description={t('common.empty')} />
          ) : (
            <List
              dataSource={directoryQuery.data}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="request"
                      type="link"
                      loading={requestMutation.isPending}
                      onClick={() => requestMutation.mutate(item.tenantCode)}
                    >
                      {t('directory.requestLink')}
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={`${item.tenantName} (${item.tenantCode})`}
                    description={[item.address, item.phone].filter(Boolean).join(' · ') || '—'}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Space>
    </div>
  );
}
