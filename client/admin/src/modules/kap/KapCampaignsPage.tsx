import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  archiveSurveyCampaign,
  createSurveyCampaign,
  fetchKapTemplates,
  fetchSurveyCampaigns,
  updateSurveyCampaign,
  type KapTemplateListItem,
  type SurveyCampaign,
} from '@/shared/api/kap-admin.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import { formatDisplayDateTime } from '@/shared/utils/date';

export function KapCampaignsPage() {
  const [templates, setTemplates] = useState<KapTemplateListItem[]>([]);
  const [items, setItems] = useState<SurveyCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SurveyCampaign | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campaigns, tpls] = await Promise.all([fetchSurveyCampaigns(), fetchKapTemplates()]);
      setItems(campaigns);
      setTemplates(tpls);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được campaign'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active', settingsJson: '{}' });
    setModalOpen(true);
  };

  const openEdit = (row: SurveyCampaign) => {
    setEditing(row);
    form.setFieldsValue({
      campaignName: row.campaignName,
      status: row.status,
      settingsJson: row.settingsJson,
    });
    setModalOpen(true);
  };

  const save = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateSurveyCampaign(editing.id, values);
      } else {
        await createSurveyCampaign(values);
      }
      message.success('Đã lưu campaign');
      setModalOpen(false);
      void load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không lưu được campaign'));
    }
  };

  const archive = async (row: SurveyCampaign) => {
    try {
      await archiveSurveyCampaign(row.id);
      message.success('Đã archive campaign');
      void load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không archive được'));
    }
  };

  const columns: ColumnsType<SurveyCampaign> = [
    { title: 'Mã', dataIndex: 'campaignCode', width: 140 },
    { title: 'Tên', dataIndex: 'campaignName', ellipsis: true },
    { title: 'Template', dataIndex: 'templateCode', width: 130 },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      width: 160,
      render: (v: string) => formatDisplayDateTime(v),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_, row) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => void archive(row)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="Campaign KAP"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Tạo campaign
            </Button>
          </Space>
        }
      >
        <Table rowKey="id" loading={loading} columns={columns} dataSource={items} pagination={false} />
      </Card>

      <Modal
        title={editing ? 'Sửa campaign' : 'Tạo campaign'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void save()}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {!editing ? (
            <>
              <Form.Item name="templateId" label="Template" rules={[{ required: true }]}>
                <Select
                  options={templates.map((t) => ({
                    value: t.id,
                    label: `${t.code} v${t.version}`,
                  }))}
                />
              </Form.Item>
              <Form.Item name="campaignCode" label="Mã campaign" rules={[{ required: true }]}>
                <Input placeholder="PHARMACY_Q1_2026" />
              </Form.Item>
            </>
          ) : null}
          <Form.Item name="campaignName" label="Tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'active', label: 'active' },
                { value: 'paused', label: 'paused' },
                { value: 'archived', label: 'archived' },
              ]}
            />
          </Form.Item>
          <Form.Item name="settingsJson" label="Settings JSON">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
