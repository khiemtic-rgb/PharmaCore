import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  DatePicker,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { apiErrorMessage } from '@/shared/api/api-error';
import { fetchBranches } from '@/shared/api/identity-admin.api';
import type { BranchListItem } from '@/shared/api/identity-admin.types';
import {
  fetchLossCashVarianceToday,
  fetchLossEmployeeReports,
  type LossCashVarianceToday,
  type LossEmployeeReports,
} from '@/shared/api/success.api';
import { formatDisplayMoney } from '@/shared/utils/money';

export function LossCashVariancePage() {
  const { t } = useTranslation('success');
  const [tab, setTab] = useState('cash');
  const [cash, setCash] = useState<LossCashVarianceToday | null>(null);
  const [reports, setReports] = useState<LossEmployeeReports | null>(null);
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [branchId, setBranchId] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCash = useCallback(async () => {
    setCash(await fetchLossCashVarianceToday());
  }, []);

  const loadReports = useCallback(async () => {
    const params =
      range != null
        ? {
            from: range[0].startOf('day').toISOString(),
            to: range[1].add(1, 'day').startOf('day').toISOString(),
            branchId,
          }
        : { branchId };
    setReports(await fetchLossEmployeeReports(params));
  }, [branchId, range]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCash(),
        loadReports(),
        fetchBranches()
          .then(setBranches)
          .catch(() => setBranches([])),
      ]);
    } catch (error) {
      message.error(apiErrorMessage(error, t('loss.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [loadCash, loadReports, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const reportRangeLabel = useMemo(() => {
    if (!reports) return '—';
    const from = dayjs(reports.fromUtc).format('DD/MM/YYYY');
    const to = dayjs(reports.toUtc).subtract(1, 'millisecond').format('DD/MM/YYYY');
    return `${from} – ${to}`;
  }, [reports]);

  if (loading && !cash && !reports) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {t('loss.title')}
          </Typography.Title>
          <Typography.Text type="secondary">{t('loss.pageSubtitle')}</Typography.Text>
        </div>
        <Space>
          <Link to="/success/cockpit">{t('loss.backCockpit')}</Link>
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            {t('refresh')}
          </Button>
        </Space>
      </div>

      <Tabs
        style={{ marginTop: 16 }}
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'cash',
            label: t('loss.tabs.cash'),
            children: (
              <>
                <Alert
                  type="info"
                  showIcon
                  message={t('loss.tip', { threshold: formatDisplayMoney(cash?.threshold ?? 0) })}
                />
                <Space wrap style={{ marginTop: 16 }}>
                  <Tag>
                    {t('loss.closedCount')}: {cash?.closedShiftCount ?? 0}
                  </Tag>
                  <Tag>
                    {t('loss.openCount')}: {cash?.openShiftCount ?? 0}
                  </Tag>
                  <Tag color={(cash?.alertCount ?? 0) > 0 ? 'error' : 'success'}>
                    {t('loss.alertCount')}: {cash?.alertCount ?? 0}
                  </Tag>
                  <Tag>
                    {t('loss.maxAbs')}: {formatDisplayMoney(cash?.maxAbsVariance ?? 0)}
                  </Tag>
                </Space>
                <Table
                  style={{ marginTop: 16 }}
                  rowKey="shiftId"
                  loading={loading}
                  dataSource={cash?.shifts ?? []}
                  pagination={false}
                  columns={[
                    {
                      title: t('loss.col.shift'),
                      dataIndex: 'shiftNumber',
                      render: (v: string, row) => (
                        <Space>
                          <span>{v}</span>
                          {row.isAlert ? <Tag color="error">{t('loss.alert')}</Tag> : null}
                          {row.status === 'open' ? <Tag>{t('loss.open')}</Tag> : null}
                        </Space>
                      ),
                    },
                    { title: t('loss.col.branch'), dataIndex: 'branchName' },
                    { title: t('loss.col.warehouse'), dataIndex: 'warehouseName' },
                    {
                      title: t('loss.col.expected'),
                      dataIndex: 'expectedCash',
                      align: 'right',
                      render: (v: number | null | undefined) => (v == null ? '—' : formatDisplayMoney(v)),
                    },
                    {
                      title: t('loss.col.closing'),
                      dataIndex: 'closingCash',
                      align: 'right',
                      render: (v: number | null | undefined) => (v == null ? '—' : formatDisplayMoney(v)),
                    },
                    {
                      title: t('loss.col.variance'),
                      dataIndex: 'cashVariance',
                      align: 'right',
                      render: (v: number | null | undefined, row) => {
                        if (row.status === 'open' || v == null) return '—';
                        return (
                          <Typography.Text type={row.isAlert ? 'danger' : undefined}>
                            {formatDisplayMoney(v)}
                          </Typography.Text>
                        );
                      },
                    },
                  ]}
                />
                <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
                  <Link to="/sales/shifts">{t('loss.linkShifts')}</Link>
                </Typography.Paragraph>
              </>
            ),
          },
          {
            key: 'by-employee',
            label: t('loss.tabs.byEmployee'),
            children: (
              <>
                <Alert type="info" showIcon message={reports?.attributionNotes ?? t('loss.reportsTip')} />
                <Space wrap style={{ marginTop: 16 }}>
                  <DatePicker.RangePicker
                    value={range}
                    onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
                    allowClear
                  />
                  <Select
                    allowClear
                    placeholder={t('loss.branchAll')}
                    style={{ minWidth: 220 }}
                    value={branchId}
                    options={branches.map((b) => ({
                      value: b.id,
                      label: b.branchCode ? `${b.branchName} (${b.branchCode})` : b.branchName,
                    }))}
                    onChange={(v) => setBranchId(v)}
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      void (async () => {
                        setLoading(true);
                        try {
                          await loadReports();
                        } catch (error) {
                          message.error(apiErrorMessage(error, t('loss.loadFailed')));
                        } finally {
                          setLoading(false);
                        }
                      })();
                    }}
                  >
                    {t('loss.applyFilter')}
                  </Button>
                  <Tag>{reportRangeLabel}</Tag>
                </Space>

                <Typography.Title level={5} style={{ marginTop: 24 }}>
                  {t('loss.reports.cancellations')}
                </Typography.Title>
                <Table
                  rowKey={(r) => r.employeeId ?? r.employeeName}
                  loading={loading}
                  dataSource={reports?.cancellations ?? []}
                  pagination={false}
                  columns={[
                    { title: t('loss.col.employee'), dataIndex: 'employeeName' },
                    { title: t('loss.col.cancelCount'), dataIndex: 'cancelCount', align: 'right' },
                    {
                      title: t('loss.col.cancelValue'),
                      dataIndex: 'cancelValue',
                      align: 'right',
                      render: (v: number) => formatDisplayMoney(v),
                    },
                  ]}
                />

                <Typography.Title level={5} style={{ marginTop: 24 }}>
                  {t('loss.reports.discounts')}
                </Typography.Title>
                <Table
                  rowKey={(r) => r.employeeId ?? r.employeeName}
                  loading={loading}
                  dataSource={reports?.discounts ?? []}
                  pagination={false}
                  columns={[
                    { title: t('loss.col.employee'), dataIndex: 'employeeName' },
                    { title: t('loss.col.orderCount'), dataIndex: 'orderCount', align: 'right' },
                    {
                      title: t('loss.col.orderDiscount'),
                      dataIndex: 'orderDiscountAmount',
                      align: 'right',
                      render: (v: number) => formatDisplayMoney(v),
                    },
                    {
                      title: t('loss.col.lineDiscount'),
                      dataIndex: 'lineDiscountAmount',
                      align: 'right',
                      render: (v: number) => formatDisplayMoney(v),
                    },
                    {
                      title: t('loss.col.totalDiscount'),
                      dataIndex: 'totalPosDiscount',
                      align: 'right',
                      render: (v: number) => formatDisplayMoney(v),
                    },
                  ]}
                />

                <Typography.Title level={5} style={{ marginTop: 24 }}>
                  {t('loss.reports.adjustments')}
                </Typography.Title>
                <Table
                  rowKey={(r) => r.employeeId ?? r.employeeName}
                  loading={loading}
                  dataSource={reports?.adjustments ?? []}
                  pagination={false}
                  columns={[
                    { title: t('loss.col.employee'), dataIndex: 'employeeName' },
                    { title: t('loss.col.adjustCount'), dataIndex: 'adjustmentCount', align: 'right' },
                    {
                      title: t('loss.col.absVariance'),
                      dataIndex: 'absVarianceValue',
                      align: 'right',
                      render: (v: number) => formatDisplayMoney(v),
                    },
                  ]}
                />
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
