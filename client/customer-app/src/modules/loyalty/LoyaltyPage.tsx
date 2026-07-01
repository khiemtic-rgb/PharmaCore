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
import { useTranslation } from 'react-i18next';
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
import { useCustomerLabels } from '@/shared/i18n/useCustomerLabels';
import { formatMoney } from '@/shared/i18n/format-money';
import { formatPoints } from '@/shared/utils/points';

export function LoyaltyPage() {
  const { t } = useTranslation();
  const { loyaltyTx } = useCustomerLabels();
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
      message.error(getApiErrorMessage(error, t('loyalty.loadFailed')));
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [t]);

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
          {t('loyalty.refresh')}
        </Button>
      </div>
      <Segmented
        block
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        options={[
          { label: t('loyalty.tabOverview'), value: 'overview' },
          { label: t('loyalty.tabHistory'), value: 'history' },
          { label: t('loyalty.tabVouchers'), value: 'vouchers' },
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
              {t('loyalty.points', { value: formatPoints(program.pointsBalance) })}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t('loyalty.lifetimePoints', { value: formatPoints(program.lifetimePoints) })}
            </Typography.Text>
            {program.currentTier ? (
              <div style={{ marginTop: 16 }}>
                <Tag color="cyan">{t('loyalty.tier', { name: program.currentTier.tierName })}</Tag>
                {program.currentTier.discountPercent > 0 ? (
                  <Tag>{t('loyalty.discount', { percent: program.currentTier.discountPercent })}</Tag>
                ) : null}
              </div>
            ) : null}
            {program.nextTier ? (
              <div style={{ marginTop: 16 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t('loyalty.pointsToNext', {
                    points: program.nextTier.minPoints - program.pointsBalance,
                    tier: program.nextTier.tierName,
                  })}
                </Typography.Text>
                <Progress percent={tierProgress} showInfo={false} strokeColor="#0f766e" />
              </div>
            ) : null}
          </Card>
        ) : (
          <Empty description={t('loyalty.noProgram')} />
        )
      )}

      {tab === 'history' && (
        <List
          dataSource={transactions}
          locale={{ emptyText: t('loyalty.emptyHistory') }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <span>
                    {loyaltyTx(item.transactionType) ?? t('loyalty.transaction')}{' '}
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
            {t('loyalty.voucherIntro')}
          </Typography.Paragraph>
          <List
          dataSource={vouchers}
          locale={{ emptyText: t('loyalty.emptyVouchers') }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <span>
                    {item.voucherName}{' '}
                    {item.isUsed ? (
                      <Tag>{t('loyalty.used')}</Tag>
                    ) : item.isExpired ? (
                      <Tag color="red">{t('loyalty.expired')}</Tag>
                    ) : (
                      <Tag color="green">{t('loyalty.available')}</Tag>
                    )}
                  </span>
                }
                description={
                  <>
                    <div>
                      {t('loyalty.code')}: <strong>{item.voucherCode}</strong>
                    </div>
                    <div>
                      {t('loyalty.discountLabel')}{' '}
                      {item.discountType === 1
                        ? `${item.discountValue}%`
                        : formatMoney(item.discountValue)}
                      {item.minOrderAmount > 0
                        ? ` · ${t('loyalty.minOrder', { amount: formatMoney(item.minOrderAmount) })}`
                        : ''}
                    </div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t('loyalty.validTo')}: {dayjs(item.validTo).format('DD/MM/YYYY')}
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
