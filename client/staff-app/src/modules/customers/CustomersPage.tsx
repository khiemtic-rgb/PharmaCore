import { useCallback, useEffect, useState } from 'react';
import { App, Alert, Button, Drawer, Input, Space, Spin, Tag, Typography } from 'antd';
import { CopyOutlined, DollarOutlined, MobileOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { fetchCustomerList, fetchCustomerPilotOtp } from '@/shared/api/customer.api';
import type { CustomerAdminListItem, CustomerPilotOtpStatus } from '@/shared/api/customer.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';
import { CustomerCreditSheet } from '@/modules/customers/CustomerCreditSheet';

const OTP_POLL_MS = 4000;

function PilotOtpBlock({
  customerId,
  hasAppAccount,
}: {
  customerId: string;
  hasAppAccount?: boolean;
}) {
  const [status, setStatus] = useState<CustomerPilotOtpStatus | null>(null);
  const { message } = App.useApp();

  const load = useCallback(async () => {
    try {
      setStatus(await fetchCustomerPilotOtp(customerId));
    } catch {
      setStatus({ enabled: false, code: null, expiresAt: null, createdAt: null });
    }
  }, [customerId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), OTP_POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  if (!status?.enabled) {
    return (
      <Alert
        type="info"
        showIcon
        message="OTP pilot tắt"
        description="Bật ExposePilotOtpInAdmin trên server hoặc khách chưa yêu cầu OTP."
      />
    );
  }

  const copyCode = async () => {
    if (!status.code) return;
    try {
      await navigator.clipboard.writeText(status.code);
      message.success('Đã copy mã OTP');
    } catch {
      message.warning('Không copy được — đọc số trên màn hình');
    }
  };

  if (!status.code) {
    if (hasAppAccount) {
      return (
        <Alert
          type="success"
          showIcon
          message="Khách đã có tài khoản app"
          description="Khách đã đăng nhập app khách hàng. Không cần OTP tại quầy — chỉ cần OTP khi khách vừa bấm Gửi mã và chưa nhập."
        />
      );
    }

    return (
      <Alert
        type="warning"
        showIcon
        icon={<MobileOutlined />}
        message="Chờ khách bấm Gửi OTP"
        description="Yêu cầu khách mở app → nhập SĐT → Gửi mã. Màn này tự cập nhật trong vài giây."
      />
    );
  }

  return (
    <Alert
      type="success"
      showIcon
      message="Mã OTP đang hiệu lực"
      description={
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Typography.Title level={2} style={{ margin: 0, letterSpacing: 8, fontFamily: 'monospace' }}>
            {status.code}
          </Typography.Title>
          {status.expiresAt ? (
            <Typography.Text type="secondary">
              Hết hạn {dayjs(status.expiresAt).format('HH:mm:ss')}
            </Typography.Text>
          ) : null}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Đọc cho khách tại quầy — không gửi qua kênh khác.
          </Typography.Text>
        </Space>
      }
      action={
        <CopyOutlined onClick={() => void copyCode()} style={{ fontSize: 18, cursor: 'pointer' }} />
      }
    />
  );
}

export function CustomersPage() {
  const { message } = App.useApp();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<CustomerAdminListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CustomerAdminListItem | null>(null);
  const [creditOpen, setCreditOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length === 1) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const result = await fetchCustomerList(q || undefined);
          setHits(result.items);
        } catch (error) {
          message.error(apiErrorMessage(error, 'Không tải được danh sách khách'));
        } finally {
          setLoading(false);
        }
      })();
    }, q.length >= 2 ? 280 : 0);

    return () => window.clearTimeout(timer);
  }, [query, message]);

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Khách + OTP" backTo="/" />
      <main className="staff-body">
        <Input
          size="large"
          placeholder="SĐT hoặc tên khách..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          allowClear
        />
        <Typography.Text type="secondary" style={{ display: 'block', margin: '8px 0 12px', fontSize: 12 }}>
          Gõ ≥2 ký tự để tìm. Chọn khách để xem OTP pilot.
        </Typography.Text>

        {loading ? <Spin /> : null}

        {!loading && hits.length === 0 ? (
          <Typography.Text type="secondary">Không có kết quả</Typography.Text>
        ) : (
          hits.map((c) => (
            <div key={c.id} className="search-hit" onClick={() => setSelected(c)}>
              <Typography.Text strong>{c.fullName}</Typography.Text>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {c.phone} · {c.customerCode}
                {c.hasAppAccount ? ' · có app' : ''}
                {c.allowCredit ? ' · được nợ' : ''}
              </div>
            </div>
          ))
        )}
      </main>

      <Drawer
        title={selected ? selected.fullName : 'Khách hàng'}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        height="75%"
        placement="bottom"
      >
        {selected ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Typography.Text type="secondary">SĐT</Typography.Text>
              <div>
                <Typography.Text strong>{selected.phone}</Typography.Text>
              </div>
            </div>
            <div>
              <Typography.Text type="secondary">Ghi nợ</Typography.Text>
              <div style={{ marginTop: 4 }}>
                {selected.allowCredit ? (
                  <Tag color="gold">Được ghi nợ</Tag>
                ) : (
                  <Tag>Chưa cho nợ</Tag>
                )}
                <Button
                  type="link"
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => setCreditOpen(true)}
                >
                  Cài đặt
                </Button>
              </div>
            </div>
            <PilotOtpBlock customerId={selected.id} hasAppAccount={selected.hasAppAccount} />
          </Space>
        ) : null}
      </Drawer>

      <CustomerCreditSheet
        customer={selected}
        open={creditOpen}
        onClose={() => setCreditOpen(false)}
        onUpdated={(updated) => {
          setSelected(updated);
          setHits((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
        }}
      />
    </div>
  );
}
