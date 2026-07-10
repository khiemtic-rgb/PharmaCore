import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Dropdown,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  canViewAssessmentReport,
  fetchAssessmentReportPdf,
  fetchAssessmentSubmissionDetail,
  fetchAssessmentSubmissions,
  scoreTo100,
  updateAssessmentLeadPipeline,
  type AssessmentSubmissionDetail,
  type AssessmentSubmissionListItem,
  type KapReportPdfKind,
} from '@/shared/api/assessment-admin.api';
import { fetchKapPartners, type KapPartnerListItem } from '@/shared/api/kap-admin.api';
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

const PIPELINE_OPTIONS = [
  { value: 'new', label: 'new' },
  { value: 'contacted', label: 'contacted' },
  { value: 'demo_scheduled', label: 'demo' },
  { value: 'demo_done', label: 'demo_done' },
  { value: 'won', label: 'won' },
  { value: 'lost', label: 'lost' },
  { value: 'nurturing', label: 'nurturing' },
];

const COMMISSION_OPTIONS = [
  { value: 'none', label: 'none' },
  { value: 'pending', label: 'pending' },
  { value: 'approved', label: 'approved' },
  { value: 'paid', label: 'paid' },
  { value: 'void', label: 'void' },
];

export function AssessmentLeadsPage() {
  const { t } = useTranslation('system', { keyPrefix: 'assessmentLeads' });
  const [leadFilter, setLeadFilter] = useState<LeadFilter>('all');
  const [partnerId, setPartnerId] = useState<string | undefined>();
  const [pipelineFilter, setPipelineFilter] = useState<string | undefined>();
  const [partners, setPartners] = useState<KapPartnerListItem[]>([]);
  const [items, setItems] = useState<AssessmentSubmissionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<AssessmentSubmissionDetail | null>(null);
  const [reportLoadingId, setReportLoadingId] = useState<string | null>(null);

  const openReportPdf = useCallback(async (id: string, kind: KapReportPdfKind = 'consulting') => {
    setReportLoadingId(id);
    try {
      const blob = await fetchAssessmentReportPdf(id, kind);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      message.error(apiErrorMessage(error, t('messages.reportFailed')));
    } finally {
      setReportLoadingId(null);
    }
  }, [t]);

  const reportMenuItems: MenuProps['items'] = useMemo(
    () => [
      { key: 'consulting', label: t('actions.reportConsulting') },
      { key: 'executive', label: t('actions.reportExecutive') },
      { key: 'appendix', label: t('actions.reportAppendix') },
    ],
    [t],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAssessmentSubmissions({
        page,
        pageSize,
        hasLead: leadFilter === 'withLead' ? true : undefined,
        partnerId,
        leadPipelineStatus: pipelineFilter,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      message.error(apiErrorMessage(error, t('messages.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [leadFilter, partnerId, pipelineFilter, page, pageSize, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchKapPartners()
      .then(setPartners)
      .catch(() => setPartners([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [leadFilter, partnerId, pipelineFilter]);

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
        render: (_, row) => String(row.responseCount),
      },
      {
        title: 'Đối tác',
        dataIndex: 'partnerCode',
        width: 100,
        render: (v: string | null | undefined) => v || '—',
      },
      {
        title: 'Pipeline',
        dataIndex: 'leadPipelineStatus',
        width: 150,
        render: (v: string | undefined, row) => (
          <Select
            size="small"
            style={{ width: 140 }}
            value={v || 'new'}
            options={PIPELINE_OPTIONS}
            onChange={async (next) => {
              try {
                await updateAssessmentLeadPipeline(row.id, {
                  leadPipelineStatus: next,
                  commissionStatus: row.commissionStatus,
                });
                message.success('Đã cập nhật pipeline');
                void load();
              } catch (error) {
                message.error(apiErrorMessage(error, 'Không cập nhật được pipeline'));
              }
            }}
          />
        ),
      },
      {
        title: 'Hoa hồng',
        dataIndex: 'commissionStatus',
        width: 130,
        render: (v: string | undefined, row) => (
          <Select
            size="small"
            style={{ width: 120 }}
            value={v || 'none'}
            options={COMMISSION_OPTIONS}
            onChange={async (next) => {
              try {
                await updateAssessmentLeadPipeline(row.id, {
                  leadPipelineStatus: row.leadPipelineStatus || 'new',
                  commissionStatus: next,
                });
                message.success('Đã cập nhật hoa hồng');
                void load();
              } catch (error) {
                message.error(apiErrorMessage(error, 'Không cập nhật được hoa hồng'));
              }
            }}
          />
        ),
      },
      {
        title: t('columns.actions'),
        key: 'actions',
        width: 220,
        render: (_, row) => (
          <Space size={4} wrap>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(row.id)}>
              {t('actions.detail')}
            </Button>
            {canViewAssessmentReport(row.status) && (
              <Dropdown.Button
                type="link"
                size="small"
                icon={<DownOutlined />}
                loading={reportLoadingId === row.id}
                menu={{
                  items: reportMenuItems,
                  onClick: ({ key }) => void openReportPdf(row.id, key as KapReportPdfKind),
                }}
                onClick={() => void openReportPdf(row.id, 'consulting')}
              >
                {t('actions.viewReport')}
              </Dropdown.Button>
            )}
          </Space>
        ),
      },
    ],
    [t, openDetail, openReportPdf, reportLoadingId, reportMenuItems, load],
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
          <Space wrap size="middle">
            <Segmented
              value={leadFilter}
              onChange={(v) => setLeadFilter(v as LeadFilter)}
              options={[
                { label: t('filters.all'), value: 'all' },
                { label: t('filters.withLead'), value: 'withLead' },
              ]}
            />
            <Select
              allowClear
              placeholder="Đối tác"
              style={{ minWidth: 200 }}
              value={partnerId}
              options={partners.map((p) => ({
                value: p.id,
                label: `${p.code} — ${p.name}`,
              }))}
              onChange={(v) => setPartnerId(v)}
              showSearch
              optionFilterProp="label"
            />
            <Select
              allowClear
              placeholder="Pipeline"
              style={{ minWidth: 160 }}
              value={pipelineFilter}
              options={PIPELINE_OPTIONS}
              onChange={(v) => setPipelineFilter(v)}
            />
          </Space>
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
        extra={
          detail && canViewAssessmentReport(detail.status) ? (
            <Dropdown.Button
              type="primary"
              loading={reportLoadingId === detail.id}
              icon={<DownOutlined />}
              menu={{
                items: reportMenuItems,
                onClick: ({ key }) => void openReportPdf(detail.id, key as KapReportPdfKind),
              }}
              onClick={() => void openReportPdf(detail.id, 'consulting')}
            >
              {t('actions.viewReport')}
            </Dropdown.Button>
          ) : null
        }
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

            {detail.recommendations.length > 0 && (
              <>
                <Typography.Title level={5}>Đề xuất</Typography.Title>
                {detail.recommendations.map((r) => (
                  <Card key={r.title} size="small" type="inner">
                    <Text strong>{r.title}</Text>
                    <div>{r.body}</div>
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
