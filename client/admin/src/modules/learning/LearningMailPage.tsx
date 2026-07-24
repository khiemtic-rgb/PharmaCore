import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  App,
  Badge,
  Button,
  Card,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  FileTextOutlined,
  InboxOutlined,
  MailOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { apiErrorMessage } from '@/shared/api/api-error';
import {
  createLearningMailThread,
  fetchLearningMailThread,
  fetchLearningMailThreads,
  fetchLearningMailUnreadCount,
  fetchLearningRecognitions,
  fetchRecentCustomerFeedback,
  markLearningMailThreadRead,
  replyLearningMailThread,
  type LearningCustomerFeedback,
  type LearningMailThreadDetail,
  type LearningMailThreadListItem,
  type LearningRecognition,
} from '@/shared/api/learning.api';
import { fetchEmployees } from '@/shared/api/identity-admin.api';
import type { EmployeeLookup } from '@/shared/api/identity-admin.types';
import { useAuthStore } from '@/shared/auth/auth.store';
import { useCanLearningWrite } from '@/shared/auth/usePermission';
import { PeoplePageHint } from '@/modules/learning/PeopleModuleIntro';

type MailFolder = 'inbox' | 'sent' | 'drafts' | 'trash';

const FOLDER_META: {
  key: MailFolder;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
}[] = [
  { key: 'inbox', label: 'Hộp thư đến', icon: <InboxOutlined />, enabled: true },
  { key: 'sent', label: 'Đã gửi', icon: <SendOutlined />, enabled: true },
  { key: 'drafts', label: 'Thư nháp', icon: <FileTextOutlined />, enabled: false },
  { key: 'trash', label: 'Thùng rác', icon: <DeleteOutlined />, enabled: false },
];

export function LearningMailPage() {
  const { message } = App.useApp();
  const canWrite = useCanLearningWrite();
  const userId = useAuthStore((s) => s.user?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState<LearningMailThreadListItem[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LearningMailThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSaving, setComposeSaving] = useState(false);
  const [employees, setEmployees] = useState<EmployeeLookup[]>([]);
  const [recognitions, setRecognitions] = useState<LearningRecognition[]>([]);
  const [feedback, setFeedback] = useState<LearningCustomerFeedback[]>([]);
  const [form] = Form.useForm<{
    recipientEmployeeIds: string[];
    subject: string;
    body: string;
    relatedKey?: string;
  }>();

  const prefillEmployeeId = searchParams.get('employeeId');
  const prefillFeedbackId = searchParams.get('feedbackId');
  const prefillRecognitionId = searchParams.get('recognitionId');

  const reloadList = async () => {
    try {
      const [list, unread] = await Promise.all([
        fetchLearningMailThreads(),
        fetchLearningMailUnreadCount().catch(() => 0),
      ]);
      setThreads(list);
      setUnreadTotal(unread);
    } catch (e) {
      message.error(apiErrorMessage(e, 'Không tải được hộp thư'));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await reloadList();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    if (!canWrite) return;
    let cancelled = false;
    (async () => {
      try {
        const [emps, recs, fb] = await Promise.all([
          fetchEmployees().catch(() => [] as EmployeeLookup[]),
          fetchLearningRecognitions(40).catch(() => [] as LearningRecognition[]),
          fetchRecentCustomerFeedback(48, 30).catch(() => [] as LearningCustomerFeedback[]),
        ]);
        if (cancelled) return;
        setEmployees(emps);
        setRecognitions(recs);
        setFeedback(fb);
      } catch {
        /* optional for compose */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canWrite]);

  useEffect(() => {
    if (!canWrite) return;
    if (!prefillEmployeeId && !prefillFeedbackId && !prefillRecognitionId) return;
    setComposeOpen(true);
    const relatedKey = prefillFeedbackId
      ? `fb:${prefillFeedbackId}`
      : prefillRecognitionId
        ? `rec:${prefillRecognitionId}`
        : undefined;
    const fb = prefillFeedbackId
      ? feedback.find((f) => f.id === prefillFeedbackId)
      : undefined;
    const rec = prefillRecognitionId
      ? recognitions.find((r) => r.id === prefillRecognitionId)
      : undefined;
    form.setFieldsValue({
      recipientEmployeeIds: (() => {
        const id = prefillEmployeeId ?? fb?.employeeId ?? rec?.employeeId;
        return id ? [id] : undefined;
      })(),
      subject: fb
        ? `Về phản hồi khách ${fb.rating}★`
        : rec
          ? `Về: ${rec.title}`
          : undefined,
      relatedKey,
    });
  }, [
    canWrite,
    prefillEmployeeId,
    prefillFeedbackId,
    prefillRecognitionId,
    feedback,
    recognitions,
    form,
  ]);

  const folderCounts = useMemo(() => {
    if (!userId) {
      return { inbox: threads.length, sent: 0, drafts: 0, trash: 0 };
    }
    const sent = threads.filter((t) => t.createdByUserId === userId).length;
    const inbox = threads.filter((t) => t.createdByUserId !== userId).length;
    return {
      inbox: inbox > 0 ? inbox : threads.length,
      sent,
      drafts: 0,
      trash: 0,
    };
  }, [threads, userId]);

  const filteredThreads = useMemo(() => {
    if (folder === 'drafts' || folder === 'trash') return [];
    if (!userId) return threads;
    if (folder === 'sent') {
      return threads.filter((t) => t.createdByUserId === userId);
    }
    const received = threads.filter((t) => t.createdByUserId !== userId);
    return received.length > 0 ? received : threads;
  }, [folder, threads, userId]);

  const openThread = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setReplyBody('');
    try {
      const d = await fetchLearningMailThread(id);
      setDetail(d);
      await markLearningMailThreadRead(id).catch(() => undefined);
      await reloadList();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Không mở được thư'));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const relatedOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const r of recognitions.slice(0, 20)) {
      opts.push({
        value: `rec:${r.id}`,
        label: `Ghi nhận · ${r.employeeName}: ${r.title}`,
      });
    }
    for (const f of feedback) {
      opts.push({
        value: `fb:${f.id}`,
        label: `Phản hồi · ${f.employeeName}: ${f.rating}★`,
      });
    }
    return opts;
  }, [recognitions, feedback]);

  const onCompose = async () => {
    try {
      const values = await form.validateFields();
      setComposeSaving(true);
      let relatedRecognitionId: string | null = null;
      let relatedFeedbackId: string | null = null;
      const key = values.relatedKey;
      if (key?.startsWith('rec:')) relatedRecognitionId = key.slice(4);
      if (key?.startsWith('fb:')) relatedFeedbackId = key.slice(3);
      const ids = values.recipientEmployeeIds ?? [];
      const created = await createLearningMailThread({
        recipientEmployeeIds: ids,
        subject: values.subject.trim(),
        body: values.body.trim(),
        relatedRecognitionId,
        relatedFeedbackId,
      });
      message.success(
        created.createdCount > 1
          ? `Đã gửi ${created.createdCount} thư riêng`
          : 'Đã gửi thư riêng',
      );
      setComposeOpen(false);
      form.resetFields();
      setSearchParams({});
      setFolder('sent');
      await reloadList();
      const first = created.threads[0];
      if (first) await openThread(first.id);
    } catch (e) {
      if ((e as { errorFields?: unknown })?.errorFields) return;
      message.error(apiErrorMessage(e, 'Gửi thư thất bại'));
    } finally {
      setComposeSaving(false);
    }
  };

  const onReply = async () => {
    if (!selectedId || !replyBody.trim()) return;
    setReplying(true);
    try {
      await replyLearningMailThread(selectedId, replyBody.trim());
      setReplyBody('');
      message.success('Đã gửi trả lời');
      await openThread(selectedId);
    } catch (e) {
      message.error(apiErrorMessage(e, 'Trả lời thất bại'));
    } finally {
      setReplying(false);
    }
  };

  const selectFolder = (key: MailFolder, enabled: boolean) => {
    if (!enabled) {
      message.info(
        key === 'drafts'
          ? 'Thư nháp chưa hỗ trợ — soạn xong là gửi ngay.'
          : 'Thùng rác chưa hỗ trợ.',
      );
      return;
    }
    setFolder(key);
    setSelectedId(null);
    setDetail(null);
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        style={{
          borderRadius: 12,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <Space align="center" size={10} style={{ marginBottom: 4 }}>
              <MailOutlined style={{ fontSize: 22, color: '#1677ff' }} />
              <Typography.Title level={3} style={{ margin: 0 }}>
                Hộp thư
                {unreadTotal > 0 ? (
                  <Badge count={unreadTotal} style={{ marginLeft: 10 }} />
                ) : null}
              </Typography.Title>
            </Space>
            <PeoplePageHint>
              Gửi và nhận thư nhanh chóng, hỗ trợ trao đổi nội bộ và công việc hiệu quả.
            </PeoplePageHint>
          </div>
          {canWrite ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setComposeOpen(true)}>
              Soạn thư
            </Button>
          ) : null}
        </div>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 320px) 1fr',
          gap: 12,
          alignItems: 'stretch',
          minHeight: 520,
        }}
        className="people-mail-layout"
      >
        {/* Left: folders + thread list */}
        <Card
          size="small"
          title={<Typography.Text strong>Hộp thư</Typography.Text>}
          style={{ borderRadius: 12, height: '100%' }}
          styles={{ body: { padding: '8px 8px 12px' } }}
        >
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            {FOLDER_META.map((f) => {
              const active = folder === f.key;
              const count = folderCounts[f.key];
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => selectFolder(f.key, f.enabled)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 12px',
                    cursor: f.enabled ? 'pointer' : 'default',
                    background: active ? '#e6f4ff' : 'transparent',
                    color: f.enabled
                      ? active
                        ? '#1677ff'
                        : 'rgba(0,0,0,0.88)'
                      : 'rgba(0,0,0,0.35)',
                    fontWeight: active ? 600 : 400,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{f.icon}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{f.label}</span>
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 12, color: active ? '#1677ff' : undefined }}
                  >
                    {count}
                  </Typography.Text>
                </button>
              );
            })}
          </Space>

          <div
            style={{
              margin: '12px 4px 8px',
              borderTop: '1px solid #f0f0f0',
              paddingTop: 12,
            }}
          >
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, padding: '0 8px', display: 'block', marginBottom: 6 }}
            >
              Danh sách thư
            </Typography.Text>
            {folder === 'drafts' || folder === 'trash' ? (
              <Empty
                style={{ padding: 16 }}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  folder === 'drafts' ? 'Chưa hỗ trợ thư nháp' : 'Chưa hỗ trợ thùng rác'
                }
              />
            ) : (
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                <List
                  loading={loading}
                  dataSource={filteredThreads}
                  locale={{
                    emptyText: (
                      <Empty
                        style={{ padding: 12 }}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          canWrite
                            ? 'Chưa có thư. Bấm «Soạn thư» để gửi.'
                            : 'Chưa có thư từ quản lý.'
                        }
                      />
                    ),
                  }}
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      onClick={() => void openThread(item.id)}
                      style={{
                        cursor: 'pointer',
                        padding: '8px 10px',
                        background: selectedId === item.id ? '#e6f4ff' : undefined,
                        borderRadius: 8,
                        border: 'none',
                      }}
                    >
                      <List.Item.Meta
                        title={
                          <Space wrap size={6}>
                            <Typography.Text
                              strong={item.unreadCount > 0}
                              ellipsis
                              style={{ maxWidth: 180 }}
                            >
                              {item.subject}
                            </Typography.Text>
                            {item.unreadCount > 0 ? (
                              <Badge count={item.unreadCount} size="small" />
                            ) : null}
                          </Space>
                        }
                        description={
                          <Typography.Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                            {canWrite
                              ? item.recipientEmployeeName
                              : item.createdByName}
                            {' · '}
                            {new Date(item.updatedAt).toLocaleDateString('vi-VN')}
                          </Typography.Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 10,
              background: '#f5f9ff',
              border: '1px solid #e6f0ff',
            }}
          >
            <Space align="start" size={10}>
              <QuestionCircleOutlined style={{ color: '#1677ff', fontSize: 18, marginTop: 2 }} />
              <div>
                <Typography.Text strong style={{ fontSize: 13, display: 'block' }}>
                  Thư riêng nội bộ
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Chỉ hai bên thấy thư. Dùng để góp ý / động viên — không thay bảng tin ghi nhận công
                  khai.
                </Typography.Text>
              </div>
            </Space>
          </div>
        </Card>

        {/* Right: reading pane */}
        <Card
          size="small"
          loading={detailLoading}
          title={<Typography.Text strong>Danh sách thư</Typography.Text>}
          extra={
            detail?.relatedEventLabel ? <Tag color="blue">{detail.relatedEventLabel}</Tag> : null
          }
          style={{ borderRadius: 12, height: '100%', minHeight: 480 }}
        >
          {!detail ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 360,
                padding: 24,
              }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
                      Chưa có thư nào được chọn
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      Vui lòng chọn một thư từ danh sách bên trái để xem nội dung.
                    </Typography.Text>
                  </span>
                }
              />
            </div>
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  {detail.subject}
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {detail.createdByName} → {detail.recipientEmployeeName} · Chỉ hai bên thấy thư này
                </Typography.Text>
              </div>
              <div
                style={{
                  maxHeight: 420,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: '4px 0',
                }}
              >
                {detail.messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.isMine ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      background: m.isMine ? '#e6f4ff' : '#f5f5f5',
                      borderRadius: 10,
                      padding: '8px 12px',
                    }}
                  >
                    <Typography.Text strong style={{ fontSize: 12 }}>
                      {m.senderName}
                    </Typography.Text>
                    <Typography.Paragraph style={{ margin: '4px 0 2px', whiteSpace: 'pre-wrap' }}>
                      {m.body}
                    </Typography.Paragraph>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(m.createdAt).toLocaleString('vi-VN')}
                    </Typography.Text>
                  </div>
                ))}
              </div>
              <Input.TextArea
                rows={3}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Trả lời riêng…"
                maxLength={4000}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={replying}
                disabled={!replyBody.trim()}
                onClick={() => void onReply()}
              >
                Gửi trả lời
              </Button>
            </Space>
          )}
        </Card>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .people-mail-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <Modal
        title="Soạn thư riêng"
        open={composeOpen}
        onCancel={() => {
          setComposeOpen(false);
          setSearchParams({});
        }}
        onOk={() => void onCompose()}
        confirmLoading={composeSaving}
        okText="Gửi"
        destroyOnClose
        width={560}
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Chỉ bạn và từng nhân viên nhận thấy thư của họ — không hiện công khai. Gửi nhiều người =
          mỗi người một thư riêng.
        </Typography.Paragraph>
        <Form form={form} layout="vertical">
          <Form.Item
            name="recipientEmployeeIds"
            label="Nhân viên nhận"
            rules={[
              { required: true, type: 'array', min: 1, message: 'Chọn ít nhất một nhân viên' },
            ]}
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              placeholder="Chọn một hoặc nhiều nhân viên"
              maxTagCount="responsive"
              options={employees.map((e) => ({
                value: e.id,
                label: e.fullName || e.employeeCode || e.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="subject"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Nhập tiêu đề' }]}
          >
            <Input maxLength={200} placeholder="Ví dụ: Góp ý sau phản hồi khách" />
          </Form.Item>
          <Form.Item name="relatedKey" label="Gắn sự kiện (tuỳ chọn)">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Ghi nhận hoặc phản hồi khách gần đây"
              options={relatedOptions}
            />
          </Form.Item>
          <Form.Item
            name="body"
            label="Nội dung"
            rules={[{ required: true, message: 'Nhập nội dung' }]}
          >
            <Input.TextArea rows={5} maxLength={4000} placeholder="Viết ngắn, rõ, khích lệ…" />
          </Form.Item>
        </Form>
        <Link to="/people/recognize" style={{ fontSize: 12 }}>
          Quay lại Ghi nhận
        </Link>
      </Modal>
    </Space>
  );
}

export default LearningMailPage;
