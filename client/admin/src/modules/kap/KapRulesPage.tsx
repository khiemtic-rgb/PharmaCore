import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  createKapRule,
  deleteKapRule,
  fetchKapRules,
  fetchKapTemplates,
  updateKapRule,
  type KapRule,
  type KapTemplateListItem,
} from '@/shared/api/kap-admin.api';
import { apiErrorMessage } from '@/shared/api/api-error';

const DEFAULT_PAYLOAD = '{\n  "title": "Tiêu đề",\n  "body": "Nội dung",\n  "severity": "info"\n}';

export function KapRulesPage() {
  const [templates, setTemplates] = useState<KapTemplateListItem[]>([]);
  const [templateId, setTemplateId] = useState<string>();
  const [rules, setRules] = useState<KapRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KapRule | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    void fetchKapTemplates().then((items) => {
      setTemplates(items);
      if (items[0]) setTemplateId(items[0].id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    try {
      setRules(await fetchKapRules(templateId));
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được rules'));
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      actionType: 'insight',
      actionPayloadJson: DEFAULT_PAYLOAD,
      priority: 50,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEdit = (rule: KapRule) => {
    setEditing(rule);
    form.setFieldsValue(rule);
    setModalOpen(true);
  };

  const save = async () => {
    if (!templateId) return;
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateKapRule(editing.id, values);
      } else {
        await createKapRule({ templateId, code: values.code, ...values });
      }
      message.success('Đã lưu rule');
      setModalOpen(false);
      void load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không lưu được rule'));
    }
  };

  const remove = async (rule: KapRule) => {
    try {
      await deleteKapRule(rule.id);
      message.success('Đã xóa rule');
      void load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không xóa được'));
    }
  };

  const columns: ColumnsType<KapRule> = useMemo(
    () => [
      { title: 'Mã', dataIndex: 'code', width: 120 },
      { title: 'Tên', dataIndex: 'name', ellipsis: true },
      { title: 'Loại', dataIndex: 'actionType', width: 120 },
      { title: 'Ưu tiên', dataIndex: 'priority', width: 80 },
      {
        title: 'Active',
        dataIndex: 'isActive',
        width: 80,
        render: (v: boolean) => (v ? <Tag color="green">ON</Tag> : <Tag>OFF</Tag>),
      },
      {
        title: '',
        key: 'actions',
        width: 100,
        render: (_, row) => (
          <Space>
            <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(row)} />
            <Button type="link" danger icon={<DeleteOutlined />} onClick={() => void remove(row)} />
          </Space>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <Card
        title="Rules KAP"
        extra={
          <Space>
            <Select
              style={{ width: 260 }}
              value={templateId}
              options={templates.map((t) => ({
                value: t.id,
                label: `${t.code} v${t.version}`,
              }))}
              onChange={setTemplateId}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Thêm rule
            </Button>
          </Space>
        }
      >
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rules} pagination={false} />
      </Card>

      <Modal
        title={editing ? 'Sửa rule' : 'Thêm rule'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void save()}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {!editing ? (
            <Form.Item name="code" label="Mã rule" rules={[{ required: true }]}>
              <Input placeholder="RULE_CODE" />
            </Form.Item>
          ) : null}
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="expression" label="Biểu thức" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="category.CUSTOMER.score < 2.5" />
          </Form.Item>
          <Form.Item name="actionType" label="Loại" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'insight', label: 'insight' },
                { value: 'recommendation', label: 'recommendation' },
              ]}
            />
          </Form.Item>
          <Form.Item name="actionPayloadJson" label="Payload JSON" rules={[{ required: true }]}>
            <Input.TextArea rows={8} />
          </Form.Item>
          <Space>
            <Form.Item name="priority" label="Priority">
              <InputNumber min={0} max={999} />
            </Form.Item>
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
