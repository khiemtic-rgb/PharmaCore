import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  fetchAssessmentSubmissionDetail,
  fetchAssessmentSubmissions,
  scoreTo100,
  type AssessmentSubmissionDetail,
  type AssessmentSubmissionListItem,
} from '@/shared/api/assessment-admin.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import { formatDisplayDateTime } from '@/shared/utils/date';

const { Text } = Typography;

type LeadFilter = 'all' | 'withLead';

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  completed: 'blue',
  lead_captured: 'green',
  report_ready: 'cyan',
};

export function AssessmentLeadsPage() {
  const { t } = useTranslation('system', { keyPrefix: 'assessmentLeads' });
  const [leadFilter, setLeadFilter] = useState<LeadFilter>('all');
  const [items, setItems] = useState<AssessmentSubmissionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<AssessmentSubmissionDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAssessmentSubmissions({
        page,
        pageSize,
        hasLead: leadFilter === 'withLead' ? true : undefined,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      message.error(apiErrorMessage(error, t('messages.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [leadFilter, page, pageSize, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [leadFilter]);

  const openDetail = useCallback(async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await fetchAssessmentSubmissionDetail(id));
    } catch (error) {
      message.error(apiErrorMessage(error, t('messages.detailFailed')));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }, [t]);

  const columns: ColumnsType<AssessmentSubmissionListItem> = useMemo(
    () => [
      {
        title: t('columns.startedAt'),
        dataIndex: 'startedAt',
        width: 160,
        render: (v: string) => formatDisplayDateTime(v),
      },
      {
        title: t('columns.status'),
        dataIndex: 'status',
        width: 130,
        render: (status: string) => (
          <Tag color={STATUS_COLORS[status] ?? 'default'}>{t(`status.${status}`, status)}</Tag>
        ),
      },
      {
        title: t('columns.org'),
        dataIndex: 'respondentOrgName',
        ellipsis: true,
        render: (v: string | null, row) =>
          v ?? (row.respondentPhone ? '—' : <Text type="secondary">{t('noLead')}</Text>),
      },
      {
        title: t('columns.contact'),
        key: 'contact',
        ellipsis: true,
        render: (_, row) =>
          row.respondentPhone ? (
            <span>
              {row.respondentName ?? '—'}
              <br />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {row.respondentPhone}
                {row.respondentEmail ? ` · ${row.respondentEmail}` : ''}
              </Typography.Text>
            </span>
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          ),
      },
      {
        title: t('columns.score'),
        key: 'score',
        width: 90,
        align: 'right',
        render: (_, row) => {
          const s = scoreTo100(row.overallPct);
          return s != null ? <strong>{s}/100</strong> : '—';
        },
      },
      {
        title: t('columns.progress'),
        key: 'progress',
        width: 90,
        align: 'center',
        render: (_, row) => `${row.responseCount}/30`,
      },
      {
        title: t('columns.actions'),
        key: 'actions',
        width: 80,
        render: (_, row) => (
          <Button type="link" icon={<EyeOutlined />} onClick={() => openDetail(row.id)} />
        ),
      },
    ],
    [t, openDetail],
  );

  return (
    <>
      <Card
        title={t('title')}
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            {t('refresh')}
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Segmented
            value={leadFilter}
            onChange={(v) => setLeadFilter(v as LeadFilter)}
            options={[
              { label: t('filters.all'), value: 'all' },
              { label: t('filters.withLead'), value: 'withLead' },
            ]}
          />
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            {t('hint')}
          </Typography.Paragraph>
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={items}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
          />
        </Space>
      </Card>

      <Drawer
        title={t('detailTitle')}
        width={560}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {detailLoading ? (
          <Spin style={{ display: 'block', margin: '48px auto' }} />
        ) : (
          detail && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={t('columns.status')}>
                <Tag color={STATUS_COLORS[detail.status] ?? 'default'}>
                  {t(`status.${detail.status}`, detail.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('detail.template')}>
                {detail.templateCode} v{detail.templateVersion}
              </Descriptions.Item>
              <Descriptions.Item label={t('columns.startedAt')}>
                {formatDisplayDateTime(detail.startedAt)}
              </Descriptions.Item>
              {detail.completedAt && (
                <Descriptions.Item label={t('detail.completedAt')}>
                  {formatDisplayDateTime(detail.completedAt)}
                </Descriptions.Item>
              )}
              <Descriptions.Item label={t('columns.score')}>
                {scoreTo100(detail.overallPct) != null
                  ? `${scoreTo100(detail.overallPct)}/100`
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label={t('columns.progress')}>
                {detail.responseCount}/{detail.requiredCount} {t('detail.answers')}
              </Descriptions.Item>
            </Descriptions>

            {detail.respondentPhone && (
              <>
                <Typography.Title level={5}>{t('detail.leadSection')}</Typography.Title>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label={t('detail.org')}>
                    {detail.respondentOrgName ?? '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('detail.name')}>
                    {detail.respondentName ?? '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('detail.phone')}>{detail.respondentPhone}</Descriptions.Item>
                  <Descriptions.Item label={t('detail.email')}>
                    {detail.respondentEmail ?? '—'}
                  </Descriptions.Item>
                  {detail.respondentNote && (
                    <Descriptions.Item label={t('detail.note')}>{detail.respondentNote}</Descriptions.Item>
                  )}
                  <Descriptions.Item label={t('detail.consent')}>
                    {detail.consentMarketing ? t('detail.consentYes') : t('detail.consentNo')}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {detail.categoryScores.length > 0 && (
              <>
                <Typography.Title level={5}>{t('detail.scores')}</Typography.Title>
                {detail.categoryScores.map((c) => (
                  <div key={c.code} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{c.name}</span>
                    <strong>{scoreTo100(c.scorePct)}/100</strong>
                  </div>
                ))}
              </>
            )}

            {detail.insights.length > 0 && (
              <>
                <Typography.Title level={5}>{t('detail.insights')}</Typography.Title>
                {detail.insights.map((i) => (
                  <Card key={i.title} size="small" type="inner">
                    <Text strong>{i.title}</Text>
                    <div>{i.body}</div>
                  </Card>
                ))}
              </>
            )}
          </Space>
        )
        )}
      </Drawer>
    </>
  );
}
