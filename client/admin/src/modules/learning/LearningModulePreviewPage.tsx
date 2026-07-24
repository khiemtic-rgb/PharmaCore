import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, App, Button, Card, Form, Input, List, Space, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '@/shared/api/api-error';
import {
  fetchLearningModule,
  revertLearningModuleTenantContent,
  upsertLearningModuleTenantContent,
  type LearningModuleDetail,
} from '@/shared/api/learning.api';
import { useCanLearningWrite } from '@/shared/auth/usePermission';
import { PeoplePageHint } from '@/modules/learning/PeopleModuleIntro';
import { PeopleTrainTabs } from '@/modules/learning/PeopleTrainTabs';
import { competencyLabelVi } from '@/modules/learning/competency-labels';
import {
  resolveModuleNeighbors,
  type ModuleNeighbors,
} from '@/modules/learning/learning-module-nav';

function inlineMd(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function renderMarkdownLite(md: string) {
  return md.split('\n').map((line, i) => {
    if (/^---+$/.test(line.trim()))
      return <hr key={i} style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />;
    if (line.startsWith('### '))
      return (
        <Typography.Title level={5} key={i} style={{ marginTop: 10, color: '#8c8c8c' }}>
          {line.slice(4)}
        </Typography.Title>
      );
    if (line.startsWith('## '))
      return (
        <Typography.Title level={5} key={i} style={{ marginTop: 12 }}>
          {line.slice(3)}
        </Typography.Title>
      );
    if (line.startsWith('# '))
      return (
        <Typography.Title level={4} key={i} style={{ marginTop: 12 }}>
          {line.slice(2)}
        </Typography.Title>
      );
    if (line.startsWith('- '))
      return (
        <Typography.Paragraph key={i} style={{ marginBottom: 2, paddingLeft: 12 }}>
          • {inlineMd(line.slice(2))}
        </Typography.Paragraph>
      );
    if (!line.trim()) return <br key={i} />;
    return (
      <Typography.Paragraph key={i} style={{ marginBottom: 4 }}>
        {inlineMd(line)}
      </Typography.Paragraph>
    );
  });
}

/** Đọc + (QL) ghi đè nội dung theo SOP nhà thuốc. */
export function LearningModulePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const canWrite = useCanLearningWrite();
  const [detail, setDetail] = useState<LearningModuleDetail | null>(null);
  const [neighbors, setNeighbors] = useState<ModuleNeighbors | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const reload = async () => {
    if (!id) return;
    const data = await fetchLearningModule(id);
    setDetail(data);
    form.setFieldsValue({
      title: data.title,
      summary: data.summary ?? '',
      bodyMarkdown: data.bodyMarkdown,
    });
    try {
      setNeighbors(await resolveModuleNeighbors(data.programId, data.id));
    } catch {
      setNeighbors(null);
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setEditing(false);
      try {
        await reload();
      } catch (e) {
        if (!cancelled) message.error(apiErrorMessage(e, 'Không tải bài học'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, message]);

  const goModule = (moduleId: string) => navigate(`/people/modules/${moduleId}`);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%', paddingBottom: 72 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Nội dung bài
          </Typography.Title>
          <PeoplePageHint>
            Xem mẫu Novixa hoặc sửa thành SOP riêng nhà thuốc (chỉ tenant này). Khác «Học bài».
          </PeoplePageHint>
        </div>
        {canWrite ? <PeopleTrainTabs /> : null}
      </div>

      <Card loading={loading}>
        {detail ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="geekblue">{detail.levelCode}</Tag>
              <Tag>{detail.durationMinutes} phút</Tag>
              <Tag>Đạt ≥ {detail.passScorePct}%</Tag>
              {detail.isTenantCustomized ? (
                <Tag color="orange">SOP nhà thuốc (đã ghi đè)</Tag>
              ) : (
                <Tag>Mẫu Novixa</Tag>
              )}
              {detail.competencyCodes.map((c) => (
                <Tag key={c}>{competencyLabelVi(c)}</Tag>
              ))}
              {neighbors && neighbors.index >= 0 ? (
                <Tag>
                  Bài {neighbors.index + 1}/{neighbors.total}
                </Tag>
              ) : null}
            </Space>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {detail.title}
            </Typography.Title>
            {detail.summary ? (
              <Typography.Paragraph type="secondary">{detail.summary}</Typography.Paragraph>
            ) : null}

            {canWrite ? (
              <Space wrap>
                <Button type={editing ? 'default' : 'primary'} onClick={() => setEditing((v) => !v)}>
                  {editing ? 'Đóng form sửa' : 'Sửa theo SOP nhà thuốc'}
                </Button>
                {detail.isTenantCustomized ? (
                  <Button
                    danger
                    loading={saving}
                    onClick={async () => {
                      if (!id) return;
                      setSaving(true);
                      try {
                        const d = await revertLearningModuleTenantContent(id);
                        setDetail(d);
                        form.setFieldsValue({
                          title: d.title,
                          summary: d.summary ?? '',
                          bodyMarkdown: d.bodyMarkdown,
                        });
                        setEditing(false);
                        message.success('Đã khôi phục nội dung mẫu Novixa');
                      } catch (e) {
                        message.error(apiErrorMessage(e, 'Khôi phục thất bại'));
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    Khôi phục mẫu Novixa
                  </Button>
                ) : null}
              </Space>
            ) : null}

            {editing && canWrite ? (
              <Card type="inner" title="Ghi đè nội dung (tenant này)">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={async (v) => {
                    if (!id) return;
                    setSaving(true);
                    try {
                      const d = await upsertLearningModuleTenantContent(id, {
                        title: v.title,
                        summary: v.summary,
                        bodyMarkdown: v.bodyMarkdown,
                      });
                      setDetail(d);
                      setEditing(false);
                      message.success('Đã lưu SOP nhà thuốc');
                    } catch (e) {
                      message.error(apiErrorMessage(e, 'Lưu thất bại'));
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
                    <Input maxLength={200} />
                  </Form.Item>
                  <Form.Item name="summary" label="Tóm tắt">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Form.Item
                    name="bodyMarkdown"
                    label="Nội dung (markdown) — dán SOP / quy trình nội bộ"
                    rules={[{ required: true }]}
                  >
                    <Input.TextArea rows={16} style={{ fontFamily: 'ui-monospace, monospace' }} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={saving}>
                    Lưu SOP nhà thuốc
                  </Button>
                </Form>
              </Card>
            ) : (
              <>
                <Alert
                  type="success"
                  showIcon
                  message={
                    detail.isTenantCustomized
                      ? 'Đang dùng SOP nhà thuốc (ghi đè)'
                      : 'Nội dung bám tài liệu nhà thuốc Novixa'
                  }
                  description={
                    detail.isTenantCustomized
                      ? 'Nhân viên Staff app sẽ thấy bản này. Có thể khôi phục mẫu Novixa bất kỳ lúc nào.'
                      : 'GPP vận hành (NVX-CPL-01) · Go-live (NVX-CS-01/02). Bấm «Sửa theo SOP nhà thuốc» để thay bằng quy trình riêng.'
                  }
                />
                <div style={{ maxWidth: 720 }}>{renderMarkdownLite(detail.bodyMarkdown || '')}</div>
              </>
            )}

            <Card type="inner" title={`Câu hỏi quiz (${detail.questions.length}) — xem trước`}>
              <List
                dataSource={detail.questions}
                locale={{ emptyText: 'Bài này chưa có câu hỏi' }}
                renderItem={(q, idx) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${idx + 1}. ${q.prompt}`}
                      description={
                        <Space direction="vertical" size={0}>
                          {q.options.map((opt, oi) => (
                            <Typography.Text key={oi} type="secondary">
                              {String.fromCharCode(65 + oi)}. {opt}
                            </Typography.Text>
                          ))}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        ) : null}
      </Card>

      {detail && !editing ? (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            marginTop: 8,
            padding: '12px 16px',
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button
            icon={<ArrowLeftOutlined />}
            disabled={!neighbors?.prev}
            onClick={() => neighbors?.prev && goModule(neighbors.prev.id)}
          >
            {neighbors?.prev
              ? `Bài trước · ${neighbors.prev.levelCode}`
              : 'Bài trước'}
          </Button>
          <Link to="/people/content">
            <Button icon={<UnorderedListOutlined />}>Danh sách L0–L6</Button>
          </Link>
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            disabled={!neighbors?.next}
            onClick={() => neighbors?.next && goModule(neighbors.next.id)}
          >
            {neighbors?.next
              ? `Bài tiếp · ${neighbors.next.levelCode}`
              : 'Hết lộ trình'}
          </Button>
        </div>
      ) : null}
    </Space>
  );
}
