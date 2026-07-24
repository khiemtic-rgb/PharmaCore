import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import {
  AuditOutlined,
  CheckOutlined,
  FileTextOutlined,
  ReadOutlined,
  SolutionOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { apiErrorMessage } from '@/shared/api/api-error';
import {
  assignLearningProgram,
  createLearningGateOverride,
  fetchLearningEnrollments,
  fetchLearningPrograms,
  fetchLearningRoster,
  type LearningCompetencyRosterItem,
  type LearningEnrollment,
  type LearningProgramListItem,
} from '@/shared/api/learning.api';
import { fetchEmployees } from '@/shared/api/identity-admin.api';
import type { EmployeeLookup } from '@/shared/api/identity-admin.types';
import { useCanLearningWrite } from '@/shared/auth/usePermission';
import { PeoplePageHint } from '@/modules/learning/PeopleModuleIntro';
import { PeopleTrainTabs } from '@/modules/learning/PeopleTrainTabs';
import { competencyLabelVi, enrollmentStatusVi } from '@/modules/learning/competency-labels';
import { LearningObservationsPanel } from '@/modules/learning/LearningObservationsPanel';
import { PEOPLE_CONTENT_MAX } from '@/modules/learning/people-ui';

const GATE_PERMISSION_OPTIONS = [
  { value: 'sales.pos', label: 'Cho phép bán hàng tại quầy' },
  { value: 'sales.write', label: 'Cho phép ghi nhận đơn bán' },
  { value: 'procurement.po', label: 'Cho phép đơn / nhập hàng' },
  { value: 'inventory.write', label: 'Cho phép thao tác kho' },
  { value: 'success.write', label: 'Cho phép quản lý checklist ca (chủ/QL)' },
  { value: 'success.checklist', label: 'Cho phép tick checklist ca (nhân viên)' },
];

export function LearningEnrollmentsPage() {
  const { message } = App.useApp();
  const canWrite = useCanLearningWrite();
  const [rows, setRows] = useState<LearningEnrollment[]>([]);
  const [roster, setRoster] = useState<LearningCompetencyRosterItem[]>([]);
  const [programs, setPrograms] = useState<LearningProgramListItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [overriding, setOverriding] = useState(false);

  const reload = async () => {
    if (!canWrite) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [e, r, p, emp] = await Promise.all([
        fetchLearningEnrollments(),
        fetchLearningRoster(),
        fetchLearningPrograms(),
        fetchEmployees(),
      ]);
      setRows(e);
      setRoster(r);
      setPrograms(p);
      setEmployees(emp);
    } catch (err) {
      message.error(apiErrorMessage(err, 'Không tải được tiến độ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWrite]);

  if (!canWrite) {
    return (
      <Typography.Text type="secondary">
        Trang này dành cho quản lý. Nhân viên học trên mục «Học bài» hoặc ứng dụng nhân viên.
      </Typography.Text>
    );
  }

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
          <Typography.Title level={3} style={{ margin: 0 }}>
            Giao đào tạo & tiến độ
          </Typography.Title>
          <PeoplePageHint>
            Chỉ quản lý gán lộ trình tại đây. Nhân viên học bài đã giao trên «Học bài» / app nhân viên —
            không tự ghi danh.
          </PeoplePageHint>
        </div>
        <PeopleTrainTabs />
      </div>

      <LearningObservationsPanel />

      <Card
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1677ff' }} />
            Nội dung bài L0–L6
          </Space>
        }
        size="small"
        extra={
          <Link to="/people/content">
            <Button type="link" size="small">
              Xem chi tiết ›
            </Button>
          </Link>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Sửa SOP theo từng level kỹ năng (L0 onboarding → L6 ca trưởng). Không nhầm với «Học bài».
        </Typography.Paragraph>
        <Link to="/people/content">
          <Button type="primary" icon={<ReadOutlined />}>
            Mở danh sách L0–L6
          </Button>
        </Link>
      </Card>

      <Card
        title={
          <Space>
            <UserAddOutlined style={{ color: '#1677ff' }} />
            Gán lộ trình
          </Space>
        }
        size="small"
      >
        <Form
          layout="inline"
          onFinish={async (v: { employeeId: string; programId: string }) => {
            setAssigning(true);
            try {
              await assignLearningProgram(v.employeeId, v.programId);
              message.success('Đã gán lộ trình');
              await reload();
            } catch (err) {
              message.error(apiErrorMessage(err, 'Gán thất bại'));
            } finally {
              setAssigning(false);
            }
          }}
        >
          <Form.Item name="employeeId" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
            <Select
              style={{ minWidth: 220 }}
              placeholder="Nhân viên"
              showSearch
              optionFilterProp="label"
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.fullName}${e.employeeCode ? ` (${e.employeeCode})` : ''}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="programId" rules={[{ required: true, message: 'Chọn lộ trình' }]}>
            <Select
              style={{ minWidth: 280 }}
              placeholder="Lộ trình"
              options={programs.map((p) => ({ value: p.id, label: p.title }))}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={assigning} icon={<CheckOutlined />}>
              Gán
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          <Space>
            <AuditOutlined style={{ color: '#faad14' }} />
            Duyệt ngoại lệ tạm
          </Space>
        }
        size="small"
        extra={
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Cho phép làm việc khi chưa đủ bài học — ghi lý do và hạn (không khóa bán hàng)
          </Typography.Text>
        }
      >
        <Form
          layout="vertical"
          onFinish={async (v: {
            employeeId: string;
            permissionCode: string;
            reason: string;
            expiresAt?: dayjs.Dayjs;
          }) => {
            setOverriding(true);
            try {
              await createLearningGateOverride({
                employeeId: v.employeeId,
                permissionCode: v.permissionCode,
                reason: v.reason,
                expiresAt: v.expiresAt ? v.expiresAt.toISOString() : null,
              });
              message.success('Đã cấp duyệt ngoại lệ');
            } catch (err) {
              message.error(apiErrorMessage(err, 'Không cấp được ngoại lệ'));
            } finally {
              setOverriding(false);
            }
          }}
        >
          <Space wrap align="start" size={12} style={{ width: '100%' }}>
            <Form.Item
              name="employeeId"
              label="Nhân viên"
              rules={[{ required: true }]}
              style={{ marginBottom: 0, minWidth: 200 }}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={employees.map((e) => ({
                  value: e.id,
                  label: e.fullName,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="permissionCode"
              label="Cho phép việc gì"
              rules={[{ required: true }]}
              style={{ marginBottom: 0, minWidth: 240 }}
            >
              <Select options={GATE_PERMISSION_OPTIONS} placeholder="Chọn việc được phép tạm" />
            </Form.Item>
            <Form.Item name="expiresAt" label="Hết hạn" style={{ marginBottom: 0 }}>
              <DatePicker showTime />
            </Form.Item>
            <Form.Item
              name="reason"
              label="Lý do"
              rules={[{ required: true, min: 5, message: 'Ít nhất 5 ký tự' }]}
              style={{ marginBottom: 0, minWidth: 260, flex: 1 }}
            >
              <Input placeholder="VD: ca thiếu người, sẽ học sau ca" />
            </Form.Item>
            <Form.Item label=" " style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={overriding}
                icon={<AuditOutlined />}
              >
                Cấp ngoại lệ
              </Button>
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Card
        title={
          <Space>
            <ReadOutlined style={{ color: '#1677ff' }} />
            Danh sách đăng ký học
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Nhân viên', dataIndex: 'employeeName' },
            { title: 'Lộ trình', dataIndex: 'programTitle' },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              render: (s: string) => <Tag color="blue">{enrollmentStatusVi(s)}</Tag>,
            },
            {
              title: 'Tiến độ',
              key: 'progress',
              render: (_, r) => (
                <Progress
                  percent={
                    r.modulesTotal > 0
                      ? Math.round((100 * r.modulesPassed) / r.modulesTotal)
                      : 0
                  }
                  size="small"
                  format={() => `${r.modulesPassed}/${r.modulesTotal}`}
                />
              ),
            },
          ]}
        />
      </Card>

      <Card
        title={
          <Space>
            <SolutionOutlined style={{ color: '#722ed1' }} />
            Hồ sơ năng lực
          </Space>
        }
      >
        <Table
          rowKey="employeeId"
          loading={loading}
          dataSource={roster}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Nhân viên', dataIndex: 'employeeName' },
            {
              title: 'Đăng ký học',
              dataIndex: 'enrollmentStatus',
              render: (s: string | null | undefined) =>
                s ? <Tag color="blue">{enrollmentStatusVi(s)}</Tag> : '—',
            },
            {
              title: 'Bài đạt',
              key: 'mods',
              render: (_, r) => `${r.modulesPassed}/${r.modulesTotal}`,
            },
            {
              title: 'Năng lực đã có',
              dataIndex: 'competencyCodes',
              render: (codes: string[]) =>
                codes?.length ? (
                  <Space size={[4, 4]} wrap>
                    {codes.map((c) => (
                      <Tag key={c} color="blue">
                        {competencyLabelVi(c)}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
