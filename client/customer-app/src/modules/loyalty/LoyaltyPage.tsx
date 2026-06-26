import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  List,
  Progress,
  Segmented,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { BackToHomeButton } from '@/shared/components/BackToHomeButton';
import {
  fetchLoyaltySummary,
  fetchLoyaltyTransactions,
  fetchVouchers,
  getApiErrorMessage,
} from '@/shared/api/customer-app.api';
import type {
  CustomerVoucher,
  LoyaltyProgramSummary,
  LoyaltyTransaction,
} from '@/shared/api/customer-app.types';
import { LOYALTY_TX_LABELS } from '@/shared/api/customer-app.types';
import { formatPoints } from '@/shared/utils/points';

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export function LoyaltyPage() {
  const [tab, setTab] = useState<'overview' | 'history' | 'vouchers'>('overview');
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<LoyaltyProgramSummary | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [vouchers, setVouchers] = useState<CustomerVoucher[]>([]);

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [summary, tx, voucherList] = await Promise.all([
        fetchLoyaltySummary(),
        fetchLoyaltyTransactions(1, 20),
        fetchVouchers(true),
      ]);
      setProgram(summary.programs[0] ?? null);
      setTransactions(tx.items);
      setVouchers(voucherList.items);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Không tải được dữ liệu loyalty'));
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div>
        <BackToHomeButton />
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      </div>
    );
  }

  const tierProgress =
    program?.nextTier && program.currentTier
      ? Math.min(
          100,
          Math.round(
            ((program.pointsBalance - program.currentTier.minPoints) /
              (program.nextTier.minPoints - program.currentTier.minPoints)) *
              100,
          ),
        )
      : 100;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <BackToHomeButton />
        <Button icon={<ReloadOutlined />} onClick={() => void loadData(false)} loading={loading}>
          Làm mới
        </Button>
      </div>
      <Segmented
        block
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        options={[
          { label: 'Tổng quan', value: 'overview' },
          { label: 'Lịch sử', value: 'history' },
          { label: 'Voucher', value: 'vouchers' },
        ]}
        style={{ marginBottom: 16 }}
      />

      {tab === 'overview' && (
        program ? (
          <Card style={{ borderRadius: 12 }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              {program.programName}
            </Typography.Title>
            <Typography.Title level={2} style={{ margin: '8px 0', color: '#0f766e' }}>
              {formatPoints(program.pointsBalance)} điểm
            </Typography.Title>
            <Typography.Text type="secondary">
              Tích lũy: {formatPoints(program.lifetimePoints)} điểm
            </Typography.Text>
            {program.currentTier ? (
              <div style={{ marginTop: 16 }}>
                <Tag color="cyan">Hạng {program.currentTier.tierName}</Tag>
                {program.currentTier.discountPercent > 0 ? (
                  <Tag>Giảm {program.currentTier.discountPercent}%</Tag>
                ) : null}
              </div>
            ) : null}
            {program.nextTier ? (
              <div style={{ marginTop: 16 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Còn {program.nextTier.minPoints - program.pointsBalance} điểm để lên{' '}
                  {program.nextTier.tierName}
                </Typography.Text>
                <Progress percent={tierProgress} showInfo={false} strokeColor="#0f766e" />
              </div>
            ) : null}
          </Card>
        ) : (
          <Empty description="Chưa tham gia chương trình tích điểm" />
        )
      )}

      {tab === 'history' && (
        <List
          dataSource={transactions}
          locale={{ emptyText: 'Chưa có giao dịch điểm' }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <span>
                    {LOYALTY_TX_LABELS[item.transactionType] ?? 'Giao dịch'}{' '}
                    <Typography.Text strong style={{ color: item.points >= 0 ? '#0f766e' : '#dc2626' }}>
                      {item.points > 0 ? '+' : ''}
                      {formatPoints(item.points)}
                    </Typography.Text>
                  </span>
                }
                description={
                  <>
                    <div>{item.notes ?? item.programCode}</div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}
                    </Typography.Text>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}

      {tab === 'vouchers' && (
        <>
          <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
            Voucher trong ví — đưa mã cho dược sĩ khi thanh toán tại quầy (POS).
          </Typography.Paragraph>
          <List
          dataSource={vouchers}
          locale={{ emptyText: 'Chưa có voucher' }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <span>
                    {item.voucherName}{' '}
                    {item.isUsed ? <Tag>Đã dùng</Tag> : item.isExpired ? <Tag color="red">Hết hạn</Tag> : <Tag color="green">Khả dụng</Tag>}
                  </span>
                }
                description={
                  <>
                    <div>
                      Mã: <strong>{item.voucherCode}</strong>
                    </div>
                    <div>
                      Giảm{' '}
                      {item.discountType === 1
                        ? `${item.discountValue}%`
                        : `${formatMoney(item.discountValue)}đ`}
                      {item.minOrderAmount > 0
                        ? ` · Đơn từ ${formatMoney(item.minOrderAmount)}đ`
                        : ''}
                    </div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      HSD: {dayjs(item.validTo).format('DD/MM/YYYY')}
                    </Typography.Text>
                  </>
                }
              />
            </List.Item>
          )}
        />
        </>
      )}
    </div>
  );
}
