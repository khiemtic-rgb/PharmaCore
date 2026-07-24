import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { App, Button, Card, Collapse, Empty, Space, Tag, Typography } from 'antd';
import { EditOutlined, FileTextOutlined, ReadOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '@/shared/api/api-error';
import {
  fetchLearningProgram,
  fetchLearningPrograms,
  type LearningModuleListItem,
  type LearningProgramListItem,
} from '@/shared/api/learning.api';
import { PeoplePageHint } from '@/modules/learning/PeopleModuleIntro';
import { PeopleTrainTabs } from '@/modules/learning/PeopleTrainTabs';
import { resolveLessonMeta } from '@/modules/learning/learning-module-meta';
import { PEOPLE_CONTENT_MAX } from '@/modules/learning/people-ui';
import { competencyLabelVi } from '@/modules/learning/competency-labels';

const LEVEL_ORDER = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const;

const LEVEL_TITLE: Record<(typeof LEVEL_ORDER)[number], string> = {
  L0: 'Onboarding — sẵn sàng ca đầu',
  L1: 'Bán hàng tại quầy cơ bản',
  L2: 'Chăm sóc khách & CRM',
  L3: 'Xuất hàng / FEFO & kho',
  L4: 'Vận hành ca & checklist',
  L5: 'Tư vấn chuyên nghiệp',
  L6: 'Ca trưởng / điều phối',
};

type ModuleRow = LearningModuleListItem & { programId: string; programTitle: string };

export function LearningContentLevelsPage() {
  const { message } = App.useApp();
  const [programs, setPrograms] = useState<LearningProgramListItem[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchLearningPrograms();
        if (cancelled) return;
        setPrograms(list);
        const details = await Promise.all(list.map((p) => fetchLearningProgram(p.id)));
        if (cancelled) return;
        const rows: ModuleRow[] = [];
        for (const d of details) {
          for (const m of d.modules) {
            rows.push({ ...m, programId: d.id, programTitle: d.title });
          }
        }
        rows.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'vi'));
        setModules(rows);
      } catch (e) {
        message.error(apiErrorMessage(e, 'Không tải được nội dung bài'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [message]);

  const byLevel = useMemo(() => {
    const map = new Map<string, ModuleRow[]>();
    for (const code of LEVEL_ORDER) map.set(code, []);
    const other: ModuleRow[] = [];
    for (const m of modules) {
      const lv = (m.levelCode ?? '').toUpperCase();
      if (map.has(lv)) map.get(lv)!.push(m);
      else other.push(m);
    }
    return { map, other };
  }, [modules]);

  const defaultOpen = useMemo(() => {
    for (const code of LEVEL_ORDER) {
      if ((byLevel.map.get(code)?.length ?? 0) > 0) return [code];
    }
    return LEVEL_ORDER.slice(0, 1);
  }, [byLevel]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: PEOPLE_CONTENT_MAX }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <Space align="center" size={10} style={{ marginBottom: 4 }}>
            <FileTextOutlined style={{ fontSize: 24, color: '#1677ff' }} />
            <Typography.Title level={3} style={{ margin: 0 }}>
              Nội dung bài L0–L6
            </Typography.Title>
          </Space>
          <PeoplePageHint>
            Xem / sửa SOP theo từng level kỹ năng trên ca. Khác «Học bài» (làm quiz) và khác bậc nghề
            1–5.
          </PeoplePageHint>
        </div>
        <PeopleTrainTabs />
      </div>

      {programs.length > 0 ? (
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Lộ trình:{' '}
          {programs.map((p, i) => (
            <span key={p.id}>
              {i > 0 ? ' · ' : null}
              <Link to={`/people/programs/${p.id}`}>{p.title}</Link>
              <Typography.Text type="secondary"> ({p.moduleCount} bài)</Typography.Text>
            </span>
          ))}
        </Typography.Text>
      ) : null}

      <Card loading={loading} styles={{ body: { padding: modules.length ? 0 : 24 } }}>
        {!loading && modules.length === 0 ? (
          <Empty description="Chưa có bài học trong tenant" />
        ) : (
          <Collapse
            defaultActiveKey={defaultOpen}
            bordered={false}
            style={{ background: 'transparent' }}
            items={LEVEL_ORDER.map((code) => {
              const items = byLevel.map.get(code) ?? [];
              const meta = resolveLessonMeta({ levelCode: code });
              return {
                key: code,
                label: (
                  <Space wrap size={8}>
                    <Tag color="geekblue" style={{ margin: 0 }}>
                      {code}
                    </Tag>
                    <Typography.Text strong>{LEVEL_TITLE[code]}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {meta.kindLabel} · {items.length} bài
                    </Typography.Text>
                  </Space>
                ),
                children:
                  items.length === 0 ? (
                    <Typography.Text type="secondary">Chưa có bài ở {code}.</Typography.Text>
                  ) : (
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      {items.map((m) => {
                        const lesson = resolveLessonMeta({
                          moduleCode: m.code,
                          levelCode: m.levelCode,
                          title: m.title,
                          requireAck: m.requireAck,
                          questionCount: m.questionCount,
                          durationMinutes: m.durationMinutes,
                        });
                        return (
                          <div
                            key={m.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              flexWrap: 'wrap',
                              alignItems: 'flex-start',
                              padding: '12px 14px',
                              borderRadius: 10,
                              border: '1px solid #f0f0f0',
                              background: '#fafafa',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <Typography.Text strong style={{ display: 'block' }}>
                                {m.title}
                              </Typography.Text>
                              {m.summary ? (
                                <Typography.Paragraph
                                  type="secondary"
                                  style={{ margin: '4px 0 8px', fontSize: 13 }}
                                  ellipsis={{ rows: 2 }}
                                >
                                  {m.summary}
                                </Typography.Paragraph>
                              ) : null}
                              <Space wrap size={6}>
                                <Tag>{lesson.kindLabel}</Tag>
                                <Tag>{m.durationMinutes} phút</Tag>
                                {m.questionCount > 0 ? (
                                  <Tag>{m.questionCount} câu hỏi</Tag>
                                ) : null}
                                {m.requireAck ? <Tag color="purple">Cần xác nhận</Tag> : null}
                                {m.competencyCodes.slice(0, 3).map((c) => (
                                  <Tag key={c}>{competencyLabelVi(c)}</Tag>
                                ))}
                              </Space>
                            </div>
                            <Space wrap>
                              <Link to={`/people/modules/${m.id}`}>
                                <Button type="primary" size="small" icon={<EditOutlined />}>
                                  Xem / sửa SOP
                                </Button>
                              </Link>
                              <Link to={`/people/learn/modules/${m.id}`}>
                                <Button size="small" icon={<ReadOutlined />}>
                                  Học thử
                                </Button>
                              </Link>
                            </Space>
                          </div>
                        );
                      })}
                    </Space>
                  ),
              };
            })}
          />
        )}
      </Card>

      {byLevel.other.length > 0 ? (
        <Card size="small" title="Bài khác (không gắn L0–L6)">
          <Space direction="vertical" style={{ width: '100%' }}>
            {byLevel.other.map((m) => (
              <Link key={m.id} to={`/people/modules/${m.id}`}>
                {m.levelCode} · {m.title}
              </Link>
            ))}
          </Space>
        </Card>
      ) : null}
    </Space>
  );
}

export default LearningContentLevelsPage;
