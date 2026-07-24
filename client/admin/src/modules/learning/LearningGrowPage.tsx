import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Drawer,
  Input,
  Modal,
  Progress,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CheckOutlined,
  EyeOutlined,
  FilterOutlined,
  RiseOutlined,
  RobotOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserAddOutlined,
  UserOutlined,
  CrownOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import { apiErrorMessage } from '@/shared/api/api-error';
import {
  fetchCareerLevels,
  fetchCareerPromotions,
  fetchCareerRoster,
  fetchEmployeeEvidence,
  promoteCareer,
  type LearningCareerLevel,
  type LearningCareerPromotion,
  type LearningCareerRosterItem,
  type LearningEmployeeEvidence,
} from '@/shared/api/learning.api';
import { useCanLearningWrite } from '@/shared/auth/usePermission';
import { PeoplePageHint } from '@/modules/learning/PeopleModuleIntro';
import {
  competencyLabelVi,
  competencyListVi,
  humanizeMissingReason,
} from '@/modules/learning/competency-labels';

const LEVEL_PALETTE = [
  { color: '#52c41a', icon: <UserAddOutlined /> },
  { color: '#1677ff', icon: <UserOutlined /> },
  { color: '#722ed1', icon: <SolutionOutlined /> },
  { color: '#faad14', icon: <TeamOutlined /> },
  { color: '#fa8c16', icon: <CrownOutlined /> },
] as const;

const LEVEL_BENEFITS: Record<string, string[]> = {
  default: ['Được ghi nhận trên lộ trình', 'Mở bài học / năng lực tương ứng', 'Cơ sở đánh giá tháng minh bạch'],
  L1: ['Làm quen ca bán', 'Học onboarding & bán hàng tại quầy cơ bản', 'Được kèm bởi đồng nghiệp'],
  L2: ['Chủ động bán tại quầy', 'Chăm sóc khách hàng / gắn khách', 'Ít cần nhắc từng bước'],
  L3: [
    'Trực ca ổn định',
    'An toàn thuốc / FEFO',
    'Chỉ số hiệu suất / trách nhiệm rõ hơn',
    'Nền tảng thu nhập theo bậc',
  ],
  L4: ['Làm chủ ca', 'Đóng–mở ca chuẩn', 'Checklist & bàn giao', 'Ứng viên ca trưởng'],
  L5: ['Tư vấn chuyên nghiệp', 'Giữ khách tin tưởng', 'CRM / nhắc thuốc', 'Doanh thu bền vững'],
  L6: ['Ca trưởng / điều phối quầy', 'Phân công & hỗ trợ đội', 'Chịu trách nhiệm chất lượng ca', 'Nền tảng Quản lý nhà thuốc (L7+)'],
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function levelStyle(index: number) {
  return LEVEL_PALETTE[Math.min(index, LEVEL_PALETTE.length - 1)];
}

function benefitsFor(level: LearningCareerLevel) {
  const code = level.code?.toUpperCase() ?? '';
  return LEVEL_BENEFITS[code] ?? LEVEL_BENEFITS.default;
}

type ConditionCheck = { key: string; label: string; done: boolean };

function buildConditionChecks(
  r: LearningCareerRosterItem,
  next: LearningCareerLevel | null,
): ConditionCheck[] {
  if (!next) return [];
  const missing = r.missingReasons ?? [];
  const miss = (re: RegExp) => missing.some((m) => re.test(m));

  const checks: ConditionCheck[] = [
    {
      key: 'tenure',
      label: `Thâm niên ≥ ${next.minMonthsTenure} tháng (hiện ${r.tenureMonths})`,
      done: r.tenureMonths >= next.minMonthsTenure && !miss(/thâm niên|tenure|tháng/i),
    },
    {
      key: 'eval',
      label: `Đánh giá ≥ ${next.minAvgEvaluate} (hiện ${r.latestAvgEvaluate ?? '—'})`,
      done:
        r.latestAvgEvaluate != null &&
        r.latestAvgEvaluate >= next.minAvgEvaluate &&
        !miss(/eval|đánh giá|chấm/i),
    },
  ];

  const codes = next.requiredCompetencyCodes ?? [];
  if (codes.length) {
    const learningGap = miss(/học|năng lực|competenc|credential|module|pos|crm|fefo|bài/i);
    checks.push({
      key: 'learning',
      label: `Học / năng lực cần có: ${competencyListVi(codes)}`,
      done:
        !learningGap &&
        (r.credentialCount >= codes.length ||
          codes.every(
            (code) => !miss(new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')),
          )),
    });
  }

  // Các lý do thiếu không khớp checklist trên
  missing.forEach((reason, i) => {
    const friendly = humanizeMissingReason(reason);
    if (checks.some((c) => friendly.toLowerCase().includes(c.label.slice(0, 12).toLowerCase()))) {
      return;
    }
    if (
      /thâm niên|tenure|tháng|eval|đánh giá|chấm/i.test(reason) ||
      (next.requiredCompetencyCodes ?? []).some((c) =>
        reason.toLowerCase().includes(c.toLowerCase()),
      )
    ) {
      return;
    }
    checks.push({ key: `miss-${i}`, label: friendly, done: false });
  });

  if (r.eligibleForNext) {
    return checks.map((c) => ({ ...c, done: true }));
  }
  return checks;
}

function progressToNext(
  r: LearningCareerRosterItem,
  next: LearningCareerLevel | null,
  checks: ConditionCheck[],
) {
  if (!r.nextLevelId) return 100;
  if (r.eligibleForNext) return 100;
  if (checks.length) {
    const done = checks.filter((c) => c.done).length;
    return Math.round((100 * done) / checks.length);
  }
  if (!next) return 50;
  const tenure = Math.min(1, r.tenureMonths / Math.max(1, next.minMonthsTenure));
  const evalPct =
    r.latestAvgEvaluate != null
      ? Math.min(1, r.latestAvgEvaluate / Math.max(1, next.minAvgEvaluate))
      : 0;
  const credNeed = Math.max(1, next.requiredCompetencyCodes?.length || 1);
  const cred = Math.min(1, r.credentialCount / credNeed);
  return Math.round(((tenure + evalPct + cred) / 3) * 100);
}

function buildAiCareerNote(
  r: LearningCareerRosterItem,
  next: LearningCareerLevel | null,
  checks: ConditionCheck[],
  evidence?: LearningEmployeeEvidence | null,
) {
  if (!next) {
    return 'Đã ở bậc cao nhất trên lộ trình hiện tại — giữ nhịp và ghi nhận thành tích.';
  }
  if (r.eligibleForNext) {
    return `Đủ năng lực. Nên lên «${r.nextLevelTitle}». Quản lý có thể duyệt khi sẵn sàng.`;
  }
  const pending = checks.filter((c) => !c.done);
  const onlyTenure =
    pending.length > 0 && pending.every((c) => /thâm niên|tháng/i.test(c.label));
  if (onlyTenure) {
    const need = next.minMonthsTenure;
    const leftMonths = Math.max(0, need - r.tenureMonths);
    const days = leftMonths <= 0 ? 0 : Math.max(1, Math.round(leftMonths * 30));
    return `Đã đáp ứng tốt về kiến thức / đánh giá. Còn thiếu điều kiện thâm niên để lên «${r.nextLevelTitle}». Dự kiến đủ điều kiện sau khoảng ${days} ngày.`;
  }
  const train =
    evidence && evidence.modulesTotal > 0
      ? Math.round((100 * evidence.modulesPassed) / evidence.modulesTotal)
      : null;
  const head =
    train != null
      ? `Đào tạo ~${train}% · Đánh giá ${r.latestAvgEvaluate ?? '—'} · Thâm niên ${r.tenureMonths} tháng. `
      : '';
  return `${head}Còn thiếu: ${pending
    .slice(0, 3)
    .map((p) => p.label)
    .join('; ')}. Tập trung hoàn tất các mục này trước khi duyệt.`;
}

function formatDecidedAt(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  };
}

function HistoryStatusTag({ row }: { row: LearningCareerPromotion }) {
  const status = (row.status || '').toLowerCase();
  if (status.includes('revok') || status.includes('thu')) {
    return <Tag color="error">Thu hồi</Tag>;
  }
  if (row.eligibilityOk) {
    return <Tag color="success">Đủ điều kiện</Tag>;
  }
  return <Tag color="warning">Duyệt ngoại lệ</Tag>;
}

export function LearningGrowPage() {
  const { message } = App.useApp();
  const canWrite = useCanLearningWrite();
  const [levels, setLevels] = useState<LearningCareerLevel[]>([]);
  const [roster, setRoster] = useState<LearningCareerRosterItem[]>([]);
  const [history, setHistory] = useState<LearningCareerPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [force, setForce] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [readyOnly, setReadyOnly] = useState(false);
  const [benefitLevel, setBenefitLevel] = useState<LearningCareerLevel | null>(null);
  const [profile, setProfile] = useState<LearningCareerRosterItem | null>(null);
  const [evidence, setEvidence] = useState<LearningEmployeeEvidence | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  const reload = async () => {
    if (!canWrite) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [lv, ro, hi] = await Promise.all([
        fetchCareerLevels(),
        fetchCareerRoster(),
        fetchCareerPromotions(30),
      ]);
      setLevels(lv);
      setRoster(ro);
      setHistory(hi);
    } catch (e) {
      message.error(apiErrorMessage(e, 'Không tải lộ trình phát triển'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWrite]);

  const levelById = useMemo(() => {
    const m = new Map<string, LearningCareerLevel>();
    levels.forEach((l) => m.set(l.id, l));
    return m;
  }, [levels]);

  const countsByCode = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of roster) {
      const code = r.currentLevelCode ?? '_none';
      m.set(code, (m.get(code) ?? 0) + 1);
    }
    return m;
  }, [roster]);

  const readyList = useMemo(
    () => roster.filter((r) => r.eligibleForNext && r.nextLevelId),
    [roster],
  );

  const displayedRoster = useMemo(
    () => (readyOnly ? readyList : roster),
    [readyOnly, readyList, roster],
  );

  const openProfile = async (r: LearningCareerRosterItem) => {
    setProfile(r);
    setEvidence(null);
    setEvidenceLoading(true);
    try {
      setEvidence(await fetchEmployeeEvidence(r.employeeId));
    } catch {
      setEvidence(null);
    } finally {
      setEvidenceLoading(false);
    }
  };

  const promote = async (r: LearningCareerRosterItem) => {
    if (!r.nextLevelId) return;
    setBusyId(r.employeeId);
    try {
      await promoteCareer({
        employeeId: r.employeeId,
        toLevelId: r.nextLevelId,
        comment: comment || undefined,
        force,
      });
      message.success(`Đã duyệt lên «${r.nextLevelTitle}»`);
      setProfile(null);
      await reload();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Duyệt thất bại'));
    } finally {
      setBusyId(null);
    }
  };

  if (!canWrite) {
    return (
      <Typography.Text type="secondary">
        Trang này dành cho chủ / quản lý. Bạn có thể học bài và xem hồ sơ năng lực ở menu bên trên.
      </Typography.Text>
    );
  }

  const profileNext = profile?.nextLevelId ? levelById.get(profile.nextLevelId) ?? null : null;
  const profileChecks = profile ? buildConditionChecks(profile, profileNext) : [];
  const profilePct = profile ? progressToNext(profile, profileNext, profileChecks) : 0;
  const profileAi = profile
    ? buildAiCareerNote(profile, profileNext, profileChecks, evidence)
    : '';

  return (
    <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 1100 }}>
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Phát triển nghề
        </Typography.Title>
        <PeoplePageHint>
          Theo dõi tiến độ theo bậc nhà thuốc — duyệt khi đủ điều kiện (không phải thăng chức hành
          chính).
        </PeoplePageHint>
      </div>

      <Alert
        type="info"
        showIcon
        message="Bậc 1–5 ≠ bài học L0–L6"
        description="Bậc là chức danh / trách nhiệm. Bài học L0–L6 là kỹ năng trên ca. Đủ kỹ năng + đánh giá tháng tốt + thời gian gắn bó mới xét lên bậc — không tự thăng chỉ vì làm quiz."
      />

      <Card
        loading={loading}
        title={
          <Space>
            <RiseOutlined style={{ color: '#1677ff' }} />
            <span>Lộ trình bậc</span>
          </Space>
        }
        styles={{ body: { paddingTop: 12 } }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'stretch',
            gap: 8,
          }}
        >
          {levels.map((l, idx) => {
            const style = levelStyle(idx);
            const count = countsByCode.get(l.code) ?? 0;
            const selected = benefitLevel?.id === l.id;
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 140px' }}>
                <button
                  type="button"
                  onClick={() => setBenefitLevel(l)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'left',
                    padding: '12px 12px',
                    borderRadius: 12,
                    border: selected ? `2px solid ${style.color}` : `1px solid ${style.color}44`,
                    background: selected ? `${style.color}14` : '#fff',
                    cursor: 'pointer',
                    boxShadow: `inset 3px 0 0 ${style.color}`,
                  }}
                >
                  <Space align="start" size={8} style={{ width: '100%' }}>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `${style.color}18`,
                        color: style.color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {style.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <Typography.Text
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: style.color,
                          display: 'block',
                        }}
                      >
                        Bậc {idx + 1}
                      </Typography.Text>
                      <Typography.Text strong ellipsis style={{ display: 'block', fontSize: 13 }}>
                        {l.title}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {count} người
                      </Typography.Text>
                    </div>
                  </Space>
                </button>
                {idx < levels.length - 1 ? (
                  <Typography.Text
                    type="secondary"
                    style={{
                      fontSize: 16,
                      flexShrink: 0,
                      display: 'none',
                    }}
                    className="career-path-arrow"
                  >
                    →
                  </Typography.Text>
                ) : null}
              </div>
            );
          })}
        </div>
        <Typography.Paragraph type="secondary" style={{ margin: '12px 0 0', fontSize: 12 }}>
          Bấm một bậc để xem quyền lợi / trách nhiệm.
        </Typography.Paragraph>

        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space size={8}>
            {readyList.length > 0 ? (
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
            ) : (
              <TrophyOutlined style={{ color: '#bfbfbf', fontSize: 18 }} />
            )}
            <Typography.Text>
              {readyList.length > 0 ? (
                <>
                  <Typography.Text strong style={{ color: '#389e0d' }}>
                    {readyList.length}
                  </Typography.Text>{' '}
                  người đủ điều kiện lên bậc
                </>
              ) : (
                <Typography.Text type="secondary">Chưa có ai đủ điều kiện lên bậc</Typography.Text>
              )}
            </Typography.Text>
          </Space>
          <Button
            type={readyOnly ? 'primary' : 'default'}
            icon={readyOnly ? <TeamOutlined /> : <FilterOutlined />}
            onClick={() => setReadyOnly((v) => !v)}
            style={
              readyOnly
                ? undefined
                : {
                    borderColor: '#52c41a',
                    color: '#389e0d',
                    background: '#f6ffed',
                  }
            }
          >
            {readyOnly ? 'Xem cả đội ngũ' : 'Chỉ hiện người sẵn sàng'}
          </Button>
        </div>
      </Card>

      <Card title="Đội ngũ">
        <Space wrap style={{ marginBottom: 12 }} size={12}>
          <Checkbox checked={force} onChange={(e) => setForce(e.target.checked)}>
            Duyệt ngoại lệ (bỏ qua điều kiện chưa đủ)
          </Checkbox>
          <Input
            placeholder="Ghi chú khi duyệt…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
        </Space>
        <Table
          rowKey="employeeId"
          loading={loading}
          dataSource={displayedRoster}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(r) => ({
            onClick: () => void openProfile(r),
            style: { cursor: 'pointer' },
          })}
          columns={[
            {
              title: 'Nhân viên',
              render: (_, r) => (
                <Space>
                  <Avatar style={{ background: '#1677ff' }}>{initials(r.employeeName)}</Avatar>
                  <div>
                    <Typography.Text strong>{r.employeeName}</Typography.Text>
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {r.currentLevelTitle ?? 'Chưa xếp bậc'}
                        {r.nextLevelTitle ? ` → ${r.nextLevelTitle}` : ''}
                      </Typography.Text>
                    </div>
                  </div>
                </Space>
              ),
            },
            {
              title: 'Tiến độ',
              width: 160,
              render: (_, r) => {
                const next = r.nextLevelId ? levelById.get(r.nextLevelId) ?? null : null;
                const checks = buildConditionChecks(r, next);
                const pct = progressToNext(r, next, checks);
                const done = checks.filter((c) => c.done).length;
                return (
                  <div>
                    <Typography.Text style={{ fontSize: 12 }}>
                      {pct}% · {done}/{checks.length || 0} điều kiện
                    </Typography.Text>
                    <Progress
                      percent={pct}
                      showInfo={false}
                      strokeColor={r.eligibleForNext ? '#52c41a' : '#1677ff'}
                      size="small"
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                );
              },
            },
            {
              title: 'Trạng thái',
              width: 150,
              render: (_, r) =>
                !r.nextLevelId ? (
                  <Tag color="purple" icon={<TrophyOutlined />}>
                    Đỉnh lộ trình
                  </Tag>
                ) : r.eligibleForNext ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    Sẵn sàng
                  </Tag>
                ) : (
                  <Tag color="processing" icon={<RiseOutlined />}>
                    Đang phấn đấu
                  </Tag>
                ),
            },
            {
              title: 'Thao tác',
              width: 200,
              align: 'right' as const,
              render: (_, r) => (
                <Space size={8} wrap>
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      void openProfile(r);
                    }}
                  >
                    Chi tiết
                  </Button>
                  {r.nextLevelId ? (
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckOutlined />}
                      disabled={!r.eligibleForNext && !force}
                      loading={busyId === r.employeeId}
                      style={
                        r.eligibleForNext || force
                          ? { background: '#52c41a', borderColor: '#52c41a' }
                          : undefined
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        void promote(r);
                      }}
                    >
                      Duyệt
                    </Button>
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
          Bấm hàng hoặc «Chi tiết» để xem điều kiện đầy đủ và hồ sơ phát triển.
        </Typography.Paragraph>
      </Card>

      {/* Lịch sử — bố cục chuyên nghiệp */}
      <Card
        title="Lịch sử phát triển"
        extra={
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {history.length} quyết định gần đây
          </Typography.Text>
        }
        loading={loading}
      >
        {!history.length ? (
          <Typography.Text type="secondary">
            Chưa có lần duyệt nào — khi có quyết định lên bậc sẽ hiện tại đây.
          </Typography.Text>
        ) : (
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            {history.map((r, idx) => {
              const when = formatDecidedAt(r.decidedAt);
              const ok = r.eligibilityOk;
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '88px 1fr auto',
                    gap: 16,
                    alignItems: 'start',
                    padding: '14px 4px',
                    borderBottom: idx < history.length - 1 ? '1px solid #f0f0f0' : undefined,
                  }}
                >
                  <div>
                    <Typography.Text strong style={{ display: 'block', fontSize: 13 }}>
                      {when.date}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {when.time}
                    </Typography.Text>
                  </div>
                  <div>
                    <Space align="start" size={12}>
                      <Avatar style={{ background: ok ? '#52c41a' : '#faad14' }}>
                        {initials(r.employeeName)}
                      </Avatar>
                      <div>
                        <Typography.Text strong>{r.employeeName}</Typography.Text>
                        <div style={{ marginTop: 6 }}>
                          <Space wrap size={[6, 6]}>
                            <Tag style={{ margin: 0 }}>{r.fromLevelTitle ?? '—'}</Tag>
                            <Typography.Text type="secondary">→</Typography.Text>
                            <Tag color="purple" style={{ margin: 0 }}>
                              {r.toLevelTitle}
                            </Tag>
                          </Space>
                        </div>
                        {r.comment ? (
                          <Typography.Paragraph
                            type="secondary"
                            style={{ margin: '8px 0 0', fontSize: 13 }}
                            ellipsis={{ rows: 2 }}
                          >
                            {r.comment}
                          </Typography.Paragraph>
                        ) : (
                          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                            Không có ghi chú
                          </Typography.Text>
                        )}
                      </div>
                    </Space>
                  </div>
                  <div style={{ textAlign: 'right', paddingTop: 4 }}>
                    <HistoryStatusTag row={r} />
                  </div>
                </div>
              );
            })}
          </Space>
        )}
      </Card>

      {/* Benefits modal */}
      <Modal
        open={!!benefitLevel}
        title={
          benefitLevel
            ? `Bậc ${levels.findIndex((l) => l.id === benefitLevel.id) + 1} · ${benefitLevel.title}`
            : ''
        }
        onCancel={() => setBenefitLevel(null)}
        footer={
          <Button type="primary" onClick={() => setBenefitLevel(null)}>
            Đóng
          </Button>
        }
      >
        {benefitLevel ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {benefitLevel.summary ||
                `Điều kiện: ≥${benefitLevel.minMonthsTenure} tháng · đánh giá ≥${benefitLevel.minAvgEvaluate}`}
            </Typography.Paragraph>
            <Typography.Text strong>Khi đạt bậc này, bạn sẽ được / cần:</Typography.Text>
            {benefitsFor(benefitLevel).map((b) => (
              <div key={b}>
                <Typography.Text>✓ {b}</Typography.Text>
              </div>
            ))}
            {(benefitLevel.requiredCompetencyCodes ?? []).length ? (
              <>
                <Typography.Text strong>Năng lực yêu cầu</Typography.Text>
                <Space wrap>
                  {benefitLevel.requiredCompetencyCodes.map((c) => (
                    <Tag key={c}>{competencyLabelVi(c)}</Tag>
                  ))}
                </Space>
              </>
            ) : null}
          </Space>
        ) : null}
      </Modal>

      {/* Career profile drawer */}
      <Drawer
        width={480}
        open={!!profile}
        onClose={() => setProfile(null)}
        title={
          profile ? (
            <Space>
              <UserOutlined />
              Hồ sơ phát triển nghề nghiệp
            </Space>
          ) : null
        }
      >
        {profile ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #722ed10f 0%, #1677ff0a 100%)',
                border: '1px solid #722ed133',
              }}
            >
              <Space align="start">
                <Avatar size={56} style={{ background: '#722ed1', fontSize: 20 }}>
                  {initials(profile.employeeName)}
                </Avatar>
                <div>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {profile.employeeName}
                  </Typography.Title>
                  <Tag color="purple">{profile.currentLevelTitle ?? 'Chưa xếp bậc'}</Tag>
                  {profile.nextLevelTitle ? (
                    <Tag color={profile.eligibleForNext ? 'success' : 'default'}>
                      Mục tiêu: {profile.nextLevelTitle}
                    </Tag>
                  ) : null}
                </div>
              </Space>
            </div>

            <Row gutter={[8, 8]}>
              {(
                [
                  {
                    label: 'Đào tạo',
                    value:
                      evidence && evidence.modulesTotal > 0
                        ? `${Math.round((100 * evidence.modulesPassed) / evidence.modulesTotal)}%`
                        : `${profile.credentialCount} năng lực`,
                  },
                  {
                    label: 'Đánh giá',
                    value: profile.latestAvgEvaluate != null ? `${profile.latestAvgEvaluate}` : '—',
                  },
                  { label: 'Chứng nhận', value: `${profile.credentialCount}` },
                  { label: 'Thâm niên', value: `${profile.tenureMonths} tháng` },
                  {
                    label: 'Tiến độ lên bậc',
                    value: `${profilePct}%`,
                  },
                  {
                    label: 'Checklist ca',
                    value:
                      evidence?.closeChecklistDaysThisMonth != null
                        ? `${evidence.closeChecklistDaysThisMonth} ngày`
                        : '—',
                  },
                ] as const
              ).map((t) => (
                <Col span={12} key={t.label}>
                  <Card size="small" styles={{ body: { padding: 10 } }}>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {t.label}
                    </Typography.Text>
                    <Typography.Title level={4} style={{ margin: '2px 0 0' }}>
                      {t.value}
                    </Typography.Title>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Personal roadmap */}
            <div>
              <Typography.Text strong>Lộ trình cá nhân</Typography.Text>
              <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                {levels.map((l, idx) => {
                  const style = levelStyle(idx);
                  const curIdx = levels.findIndex((x) => x.id === profile.currentLevelId);
                  const reached = curIdx >= 0 ? idx <= curIdx : false;
                  const isNext = l.id === profile.nextLevelId;
                  const pct = reached ? 100 : isNext ? profilePct : 0;
                  return (
                    <div key={l.id}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Typography.Text style={{ color: style.color, fontWeight: 600 }}>
                          Bậc {idx + 1} · {l.title}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {reached ? 'Đạt' : isNext ? `${pct}%` : 'Chưa'}
                        </Typography.Text>
                      </Space>
                      <Progress
                        percent={pct}
                        showInfo={false}
                        strokeColor={style.color}
                        size="small"
                        trailColor="#f0f0f0"
                      />
                    </div>
                  );
                })}
              </Space>
            </div>

            <div>
              <Typography.Text strong>Điều kiện lên bậc kế</Typography.Text>
              <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 8 }}>
                {profileChecks.length ? (
                  profileChecks.map((c) => (
                    <Typography.Text key={c.key} style={{ color: c.done ? '#52c41a' : undefined }}>
                      {c.done ? '☑' : '☐'} {c.label}
                    </Typography.Text>
                  ))
                ) : (
                  <Typography.Text type="secondary">Không còn bậc kế trên lộ trình.</Typography.Text>
                )}
              </Space>
            </div>

            <Alert
              type="info"
              showIcon
              icon={<RobotOutlined />}
              message="Gợi ý từ điều kiện + bằng chứng"
              description={evidenceLoading ? 'Đang tải bằng chứng…' : profileAi}
            />

            {profile.nextLevelId ? (
              <Button
                type="primary"
                size="large"
                block
                disabled={!profile.eligibleForNext && !force}
                loading={busyId === profile.employeeId}
                onClick={() => void promote(profile)}
              >
                {profile.eligibleForNext
                  ? `Duyệt lên «${profile.nextLevelTitle}»`
                  : force
                    ? `Duyệt ngoại lệ lên «${profile.nextLevelTitle}»`
                    : 'Chưa đủ điều kiện — bật «Duyệt ngoại lệ» nếu cần'}
              </Button>
            ) : null}
          </Space>
        ) : null}
      </Drawer>
    </Space>
  );
}
