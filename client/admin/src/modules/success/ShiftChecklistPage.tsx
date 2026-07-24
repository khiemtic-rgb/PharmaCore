import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '@/shared/api/api-error';
import {
  completeShiftChecklistRun,
  fetchShiftChecklistToday,
  setShiftChecklistItem,
  startShiftChecklistRun,
  type ShiftChecklistKind,
  type ShiftChecklistKindStatus,
  type ShiftChecklistRun,
  type ShiftChecklistToday,
} from '@/shared/api/success.api';
import { useCanAccessOwnerCockpit } from '@/shared/auth/usePermission';
function statusTag(status: string, t: (k: string) => string) {
  if (status === 'completed') return <Tag color="success">{t('checklist.status.completed')}</Tag>;
  if (status === 'in_progress') return <Tag color="processing">{t('checklist.status.inProgress')}</Tag>;
  return <Tag>{t('checklist.status.missing')}</Tag>;
}

function KindPanel({
  kind,
  status,
  run,
  loading,
  onStart,
  onToggle,
  onComplete,
}: {
  kind: ShiftChecklistKind;
  status: ShiftChecklistKindStatus;
  run: ShiftChecklistRun | null;
  loading: boolean;
  onStart: () => void;
  onToggle: (itemId: string, checked: boolean) => void;
  onComplete: () => void;
}) {
  const { t } = useTranslation('success');
  const title = kind === 'open' ? t('checklist.openTitle') : t('checklist.closeTitle');
  const showItems = run && run.kind === kind;

  return (
    <Card
      title={
        <Space>
          <span>{title}</span>
          {statusTag(status.status, t)}
        </Space>
      }
      extra={
        <Typography.Text type="secondary">
          {status.checkedCount}/{status.totalCount || '—'}
        </Typography.Text>
      }
    >
      {status.status === 'missing' ? (
        <Button type="primary" onClick={onStart} loading={loading}>
          {t('checklist.start')}
        </Button>
      ) : null}

      {status.status === 'in_progress' && !showItems ? (
        <Button onClick={onStart} loading={loading}>
          {t('checklist.continue')}
        </Button>
      ) : null}

      {showItems ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {run.items.map((item) => (
            <Checkbox
              key={item.id}
              checked={item.isChecked}
              disabled={run.status === 'completed' || loading}
              onChange={(e) => onToggle(item.id, e.target.checked)}
            >
              {item.label}
              {item.isRequired ? (
                <Typography.Text type="danger" style={{ marginLeft: 6 }}>
                  *
                </Typography.Text>
              ) : null}
            </Checkbox>
          ))}
          {run.status === 'in_progress' ? (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={onComplete}
              loading={loading}
              style={{ marginTop: 8, alignSelf: 'flex-start' }}
            >
              {t('checklist.complete')}
            </Button>
          ) : (
            <Alert type="success" showIcon message={t('checklist.completedHint')} />
          )}
        </div>
      ) : null}

      {status.status === 'completed' && !showItems ? (
        <Alert type="success" showIcon message={t('checklist.completedHint')} />
      ) : null}
    </Card>
  );
}

export function ShiftChecklistPage() {
  const { t } = useTranslation('success');
  const canOwnerCockpit = useCanAccessOwnerCockpit();
  const [today, setToday] = useState<ShiftChecklistToday | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>();
  const [openRun, setOpenRun] = useState<ShiftChecklistRun | null>(null);
  const [closeRun, setCloseRun] = useState<ShiftChecklistRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (selected?: string) => {
    setLoading(true);
    try {
      const data = await fetchShiftChecklistToday(selected);
      setToday(data);
      setBranchId(data.branchId ?? data.branches[0]?.id);
      setOpenRun(null);
      setCloseRun(null);
    } catch (error) {
      message.error(apiErrorMessage(error, t('checklist.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const start = async (kind: ShiftChecklistKind) => {
    if (!branchId) return;
    setBusy(true);
    try {
      const run = await startShiftChecklistRun(branchId, kind);
      if (kind === 'open') setOpenRun(run);
      else setCloseRun(run);
      await load(branchId);
      if (kind === 'open') setOpenRun(run);
      else setCloseRun(run);
    } catch (error) {
      message.error(apiErrorMessage(error, t('checklist.actionFailed')));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (kind: ShiftChecklistKind, itemId: string, checked: boolean) => {
    const run = kind === 'open' ? openRun : closeRun;
    if (!run) return;
    setBusy(true);
    try {
      const next = await setShiftChecklistItem(run.id, itemId, checked);
      if (kind === 'open') setOpenRun(next);
      else setCloseRun(next);
      await load(branchId);
      if (kind === 'open') setOpenRun(next);
      else setCloseRun(next);
    } catch (error) {
      message.error(apiErrorMessage(error, t('checklist.actionFailed')));
    } finally {
      setBusy(false);
    }
  };

  const complete = async (kind: ShiftChecklistKind) => {
    const run = kind === 'open' ? openRun : closeRun;
    if (!run) return;
    setBusy(true);
    try {
      const next = await completeShiftChecklistRun(run.id);
      if (kind === 'open') setOpenRun(next);
      else setCloseRun(next);
      message.success(t('checklist.completeSuccess'));
      await load(branchId);
      if (kind === 'open') setOpenRun(next);
      else setCloseRun(next);
    } catch (error) {
      message.error(apiErrorMessage(error, t('checklist.actionFailed')));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !today) {
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
            {t('checklist.title')}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('checklist.subtitle', { date: today?.businessDate ?? '—' })}
          </Typography.Text>
        </div>
        <Space>
          {canOwnerCockpit ? (
            <Link to="/success/cockpit">{t('checklist.backCockpit')}</Link>
          ) : null}
          <Button icon={<ReloadOutlined />} onClick={() => void load(branchId)} loading={loading}>
            {t('refresh')}
          </Button>
        </Space>
      </div>

      <Alert type="info" showIcon style={{ marginTop: 16 }} message={t('checklist.tip')} />

      <div style={{ marginTop: 16, maxWidth: 420 }}>
        <Typography.Text style={{ display: 'block', marginBottom: 6 }}>{t('checklist.branch')}</Typography.Text>
        <Select
          style={{ width: '100%' }}
          value={branchId}
          options={(today?.branches ?? []).map((b) => ({
            value: b.id,
            label: b.code ? `${b.name} (${b.code})` : b.name,
          }))}
          onChange={(value) => {
            setBranchId(value);
            void load(value);
          }}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={12}>
          <KindPanel
            kind="open"
            status={today?.open ?? { kind: 'open', status: 'missing', checkedCount: 0, totalCount: 0, requiredMissingCount: 0 }}
            run={openRun}
            loading={busy}
            onStart={() => void start('open')}
            onToggle={(id, checked) => void toggle('open', id, checked)}
            onComplete={() => void complete('open')}
          />
        </Col>
        <Col xs={24} lg={12}>
          <KindPanel
            kind="close"
            status={today?.close ?? { kind: 'close', status: 'missing', checkedCount: 0, totalCount: 0, requiredMissingCount: 0 }}
            run={closeRun}
            loading={busy}
            onStart={() => void start('close')}
            onToggle={(id, checked) => void toggle('close', id, checked)}
            onComplete={() => void complete('close')}
          />
        </Col>
      </Row>
    </div>
  );
}
