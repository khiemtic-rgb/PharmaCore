import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App, Button, Drawer, Popconfirm, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  decidePurchaseOrderWorkflowTask,
  fetchPendingPurchaseOrderWorkflowTasks,
  type WorkflowTaskListItem,
} from '@/shared/api/workflow.api';
import { apiErrorMessage } from '@/shared/api/api-error';

type PoWorkflowPendingDrawerProps = {
  open: boolean;
  onClose: () => void;
  onDecided?: () => void;
};

export function PoWorkflowPendingDrawer({ open, onClose, onDecided }: PoWorkflowPendingDrawerProps) {
  const { t } = useTranslation('procurement', { keyPrefix: 'purchaseOrders.workflow' });
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<WorkflowTaskListItem[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchPendingPurchaseOrderWorkflowTasks());
    } catch (error) {
      message.error(apiErrorMessage(error, t('loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const decide = async (taskId: string, approved: boolean) => {
    setDecidingId(taskId);
    try {
      await decidePurchaseOrderWorkflowTask(taskId, approved);
      message.success(approved ? t('approved') : t('rejected'));
      await load();
      onDecided?.();
    } catch (error) {
      message.error(apiErrorMessage(error, t('decideFailed')));
    } finally {
      setDecidingId(null);
    }
  };

  const columns: ColumnsType<WorkflowTaskListItem> = [
    {
      title: t('columns.poNumber'),
      dataIndex: 'summary',
      render: (v) => v ?? '—',
    },
    {
      title: t('columns.submittedAt'),
      dataIndex: 'createdAt',
      width: 170,
      render: (v) => new Date(String(v)).toLocaleString('vi-VN'),
    },
    {
      title: t('columns.actions'),
      key: 'actions',
      width: 200,
      render: (_, row) => (
        <Space>
          <Popconfirm title={t('approveConfirm')} onConfirm={() => void decide(row.taskId, true)}>
            <Button type="primary" size="small" loading={decidingId === row.taskId}>
              {t('approve')}
            </Button>
          </Popconfirm>
          <Popconfirm title={t('rejectConfirm')} onConfirm={() => void decide(row.taskId, false)}>
            <Button danger size="small" loading={decidingId === row.taskId}>
              {t('reject')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Drawer title={t('drawerTitle')} width={640} open={open} onClose={onClose}>
      <Typography.Paragraph type="secondary">{t('drawerIntro')}</Typography.Paragraph>
      <Table
        rowKey="taskId"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={false}
        locale={{ emptyText: t('empty') }}
      />
    </Drawer>
  );
}
