import { useEffect, useState } from 'react';
import { App, Button, Drawer, InputNumber, Space, Switch, Typography } from 'antd';
import {
  fetchCustomerDetail,
  updateCustomerCreditSettings,
} from '@/shared/api/customer.api';
import type { CustomerAdminListItem } from '@/shared/api/customer.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { useCanSalesWrite } from '@/shared/auth/usePermission';
import { formatMoney } from '@/shared/utils/money';

type Props = {
  customer: CustomerAdminListItem | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (customer: CustomerAdminListItem) => void;
};

export function CustomerCreditSheet({ customer, open, onClose, onUpdated }: Props) {
  const { message } = App.useApp();
  const canEdit = useCanSalesWrite();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allowCredit, setAllowCredit] = useState(false);
  const [creditLimit, setCreditLimit] = useState<number | null>(null);
  const [outstanding, setOutstanding] = useState(0);

  useEffect(() => {
    if (!open || !customer?.id) return;
    setLoading(true);
    void fetchCustomerDetail(customer.id)
      .then((detail) => {
        setAllowCredit(Boolean(detail.allowCredit));
        setCreditLimit(detail.creditLimit ?? null);
        setOutstanding(detail.currentOutstanding ?? 0);
      })
      .catch(() => {
        setAllowCredit(Boolean(customer.allowCredit));
        setCreditLimit(customer.creditLimit ?? null);
        setOutstanding(customer.currentOutstanding ?? 0);
      })
      .finally(() => setLoading(false));
  }, [open, customer]);

  const save = async () => {
    if (!customer) return;
    setSaving(true);
    try {
      const updated = await updateCustomerCreditSettings(customer.id, {
        allowCredit,
        creditLimit: allowCredit ? creditLimit : null,
      });
      message.success(allowCredit ? 'Đã bật ghi nợ cho khách' : 'Đã tắt ghi nợ');
      onUpdated(updated);
      onClose();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không lưu được cài đặt nợ'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title="Ghi nợ khách hàng"
      open={open}
      onClose={onClose}
      height="auto"
      placement="bottom"
      styles={{ body: { paddingBottom: 24 } }}
    >
      {customer ? (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>{customer.fullName}</Typography.Text>
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
              {customer.phone} · {customer.customerCode}
            </Typography.Text>
          </div>

          {outstanding > 0 ? (
            <Typography.Text type="warning">
              Đang nợ: {formatMoney(outstanding)}
            </Typography.Text>
          ) : null}

          {!canEdit ? (
            <Typography.Text type="secondary">
              Chỉ quản lý (quyền bán hàng ghi) mới chỉnh được. Liên hệ admin nếu cần bật nợ tại quầy.
            </Typography.Text>
          ) : null}

          <Space align="center">
            <Typography.Text>Cho phép ghi nợ</Typography.Text>
            <Switch
              checked={allowCredit}
              disabled={!canEdit || loading || saving}
              onChange={setAllowCredit}
            />
          </Space>

          {allowCredit ? (
            <div>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                Hạn mức nợ (để trống = không giới hạn)
              </Typography.Text>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                disabled={!canEdit || loading || saving}
                value={creditLimit ?? undefined}
                placeholder="Không giới hạn"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={(v) => Number(String(v ?? '').replace(/\./g, ''))}
                onChange={(v) => setCreditLimit(v == null ? null : Number(v))}
              />
            </div>
          ) : null}

          {canEdit ? (
            <Button type="primary" block size="large" loading={saving} onClick={() => void save()}>
              Lưu
            </Button>
          ) : null}
        </Space>
      ) : null}
    </Drawer>
  );
}
