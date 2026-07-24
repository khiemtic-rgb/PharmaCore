import { Button, Space, Tag, Typography } from 'antd';
import {
  CheckCircleFilled,
  CheckSquareOutlined,
  FileTextOutlined,
  LockOutlined,
  PlayCircleFilled,
  QuestionCircleOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import {
  difficultyLabel,
  resolveLessonMeta,
  type LessonKind,
} from '@/modules/learning/learning-module-meta';

export type LearningPathStep = {
  moduleId: string;
  title: string;
  levelCode: string;
  status: string;
  moduleCode?: string;
  requireAck?: boolean;
  requireObservation?: boolean;
  observedAt?: string | null;
};

function stepState(status: string, isNext: boolean): 'done' | 'next' | 'locked' {
  if (status === 'passed') return 'done';
  if (isNext || status === 'in_progress' || status === 'failed') return 'next';
  return 'locked';
}

function kindIcon(kind: LessonKind) {
  if (kind === 'sop') return <FileTextOutlined />;
  if (kind === 'checklist' || kind === 'practice') return <CheckSquareOutlined />;
  if (kind === 'quiz') return <QuestionCircleOutlined />;
  return <ReadOutlined />;
}

/** Lộ trình từng bước — dễ hiểu với NV yếu công nghệ. */
export function LearningPathSteps({
  modules,
  nextModuleId,
  onOpen,
}: {
  modules: LearningPathStep[];
  nextModuleId?: string | null;
  onOpen: (moduleId: string) => void;
}) {
  if (!modules.length) return null;

  return (
    <Space direction="vertical" size={0} style={{ width: '100%' }}>
      {modules.map((m, idx) => {
        const isNext = m.moduleId === nextModuleId;
        const state = stepState(m.status, isNext);
        const meta = resolveLessonMeta({
          moduleCode: m.moduleCode,
          levelCode: m.levelCode,
          title: m.title,
          requireAck: m.requireAck,
        });
        return (
          <div key={m.moduleId} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <div
              style={{
                width: 28,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    state === 'done' ? '#52c41a' : state === 'next' ? '#1677ff' : '#f0f0f0',
                  color: state === 'locked' ? '#8c8c8c' : '#fff',
                  flexShrink: 0,
                }}
              >
                {state === 'done' ? (
                  <CheckCircleFilled />
                ) : state === 'next' ? (
                  <PlayCircleFilled />
                ) : (
                  <LockOutlined style={{ fontSize: 12 }} />
                )}
              </div>
              {idx < modules.length - 1 ? (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 28,
                    background: state === 'done' ? '#52c41a' : '#e8e8e8',
                    margin: '4px 0',
                  }}
                />
              ) : null}
            </div>
            <div style={{ flex: 1, paddingBottom: idx < modules.length - 1 ? 14 : 0 }}>
              <Space wrap size={6} align="center">
                <Tag>{m.levelCode}</Tag>
                <Tag icon={kindIcon(meta.kind)} color="blue">
                  {meta.kindLabel}
                </Tag>
                <Typography.Text
                  strong={state === 'next'}
                  style={{
                    color: state === 'done' ? '#595959' : state === 'next' ? '#0958d9' : '#8c8c8c',
                    fontSize: 14,
                  }}
                >
                  {m.title}
                </Typography.Text>
              </Space>
              <div style={{ marginTop: 4 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  ⏱ {meta.minutes} phút · {'★'.repeat(meta.difficulty)}
                  {'☆'.repeat(3 - meta.difficulty)} {difficultyLabel(meta.difficulty)}
                </Typography.Text>
              </div>
              {state === 'next' && meta.outcomes.length ? (
                <div style={{ marginTop: 6 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Sau bài này:
                  </Typography.Text>
                  {meta.outcomes.slice(0, 3).map((o) => (
                    <div key={o}>
                      <Typography.Text style={{ fontSize: 12 }}>✓ {o}</Typography.Text>
                    </div>
                  ))}
                </div>
              ) : null}
              <div style={{ marginTop: 10 }}>
                {state === 'done' ? (
                  <Space wrap>
                    {m.requireObservation ? (
                      m.observedAt ? (
                        <Tag color="purple">Đã áp dụng tại quầy</Tag>
                      ) : (
                        <Tag color="gold">Chờ quan sát tại quầy</Tag>
                      )
                    ) : null}
                    <Button
                      type="default"
                      size="middle"
                      icon={<ReadOutlined />}
                      onClick={() => onOpen(m.moduleId)}
                      style={{
                        borderColor: '#1677ff',
                        color: '#0958d9',
                        background: '#e6f4ff',
                        fontWeight: 600,
                      }}
                    >
                      Đọc lại bài này
                    </Button>
                  </Space>
                ) : state === 'next' ? (
                  <Button
                    type="primary"
                    size="middle"
                    icon={<PlayCircleFilled />}
                    onClick={() => onOpen(m.moduleId)}
                  >
                    Học bài này
                  </Button>
                ) : (
                  <Button size="middle" type="default" onClick={() => onOpen(m.moduleId)}>
                    Xem trước
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </Space>
  );
}
