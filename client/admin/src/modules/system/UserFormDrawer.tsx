import { useCallback, useEffect, useState } from 'react';
import { Button, Col, Drawer, Form, Input, Row, Select, Space, Tooltip, message } from 'antd';
import { CloseOutlined, KeyOutlined, QuestionCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { createUser, fetchBranches, fetchEmployee, fetchEmployees, fetchRoles, updateUser } from '@/shared/api/identity-admin.api';
import type { BranchListItem, EmployeeLookup, UserDetail } from '@/shared/api/identity-admin.types';
import { USER_STATUS_OPTIONS } from '@/shared/api/identity-admin.types';
import { apiErrorMessage } from '@/shared/api/api-error';

interface UserFormValues {
  username?: string;
  email: string;
  password?: string;
  newPassword?: string;
  employeeFullName?: string;
  employeePhone?: string;
  status: number;
  roleIds: string[];
  employeeId?: string;
  branchIds?: string[];
  primaryBranchId?: string;
}

interface UserFormDrawerProps {
  open: boolean;
  editing: UserDetail | null;
  onClose: () => void;
  onSaved: () => void;
}

const employeeLinkLabel = (
  <Space size={4}>
    NV có sẵn
    <Tooltip title="Gắn tài khoản với hồ sơ EMP đã có (chưa có TK). Chọn sẽ điền họ tên và SĐT.">
      <QuestionCircleOutlined style={{ color: '#999', fontSize: 12 }} />
    </Tooltip>
  </Space>
);

function buildRoleOptions(
  roles: { id: string; roleCode: string; roleName: string }[],
  editing: UserDetail | null,
) {
  const options = roles.map((r) => ({ value: r.id, label: `${r.roleCode} — ${r.roleName}` }));
  if (!editing) return options;

  const known = new Set(options.map((o) => o.value));
  for (let i = 0; i < editing.roleIds.length; i++) {
    const id = editing.roleIds[i];
    if (!known.has(id)) {
      const code = editing.roleCodes[i];
      options.push({ value: id, label: code ?? id });
      known.add(id);
    }
  }
  return options;
}

function seedRoleOptionsFromEditing(editing: UserDetail | null) {
  if (!editing?.roleIds.length) return [];
  return editing.roleIds.map((id, i) => ({
    value: id,
    label: editing.roleCodes[i] ?? id,
  }));
}

export function UserFormDrawer({ open, editing, onClose, onSaved }: UserFormDrawerProps) {
  const [form] = Form.useForm<UserFormValues>();
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([]);
  const [employees, setEmployees] = useState<EmployeeLookup[]>([]);
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<
    { value: string; label: string; disabled?: boolean }[]
  >([]);

  const loadLookups = useCallback(async () => {
    const [roles, employeeRows, branchRows] = await Promise.all([
      fetchRoles().catch(() => [] as Awaited<ReturnType<typeof fetchRoles>>),
      fetchEmployees().catch(() => [] as EmployeeLookup[]),
      fetchBranches().catch(() => [] as BranchListItem[]),
    ]);
    const options = buildRoleOptions(roles, editing);
    setRoleOptions(options);
    setEmployees(employeeRows);
    setBranches(branchRows.filter((b) => b.status === 1));
    setEmployeeOptions(
      employeeRows.map((e) => ({
        value: e.id,
        label: `${e.employeeCode} — ${e.fullName}${e.hasUserAccount && e.id !== editing?.employeeId ? ' (đã có TK)' : ''}`,
        disabled: e.hasUserAccount && e.id !== editing?.employeeId,
      })),
    );
    return options;
  }, [editing]);

  const applyEmployeeBranches = useCallback(
    async (employeeId?: string) => {
      if (!employeeId) {
        form.setFieldsValue({ branchIds: [], primaryBranchId: undefined });
        return;
      }
      try {
        const detail = await fetchEmployee(employeeId);
        const branchIds = detail.branches.map((b) => b.branchId);
        const primary = detail.branches.find((b) => b.isPrimary)?.branchId ?? branchIds[0];
        form.setFieldsValue({ branchIds, primaryBranchId: primary });
      } catch {
        form.setFieldsValue({ branchIds: [], primaryBranchId: undefined });
      }
    },
    [form],
  );

  useEffect(() => {
    if (!open) return;

    setShowChangePassword(false);
    form.resetFields();
    setRoleOptions(seedRoleOptionsFromEditing(editing));

    if (editing) {
      form.setFieldsValue({
        username: editing.username,
        email: editing.email,
        employeeFullName: editing.employeeName,
        employeePhone: editing.employeePhone,
        status: editing.status,
        roleIds: editing.roleIds,
        employeeId: editing.employeeId,
        newPassword: undefined,
        password: undefined,
        branchIds: [],
        primaryBranchId: undefined,
      });
    } else {
      form.setFieldsValue({ status: 1, roleIds: [], branchIds: [], primaryBranchId: undefined });
    }

    let cancelled = false;
    void loadLookups()
      .then(async (options) => {
        if (cancelled) return;
        if (editing?.roleIds.length) {
          form.setFieldValue('roleIds', editing.roleIds);
        } else if (!editing && options.length === 1) {
          form.setFieldValue('roleIds', [options[0].value]);
        }
        if (editing?.employeeId) {
          await applyEmployeeBranches(editing.employeeId);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setRoleOptions(seedRoleOptionsFromEditing(editing));
        setEmployees([]);
        setEmployeeOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, editing, form, loadLookups, applyEmployeeBranches]);

  const branchIds = Form.useWatch('branchIds', form) ?? [];
  const branchOptions = branches.map((b) => ({
    value: b.id,
    label: `${b.branchCode} — ${b.branchName}`,
  }));
  const primaryBranchOptions = branchOptions.filter((o) => branchIds.includes(o.value));

  const editFieldNames = showChangePassword
    ? (['username', 'email', 'employeeFullName', 'employeePhone', 'status', 'roleIds', 'employeeId', 'branchIds', 'primaryBranchId', 'newPassword'] as const)
    : (['username', 'email', 'employeeFullName', 'employeePhone', 'status', 'roleIds', 'employeeId', 'branchIds', 'primaryBranchId'] as const);

  const createFieldNames = [
    'username',
    'email',
    'password',
    'employeeFullName',
    'employeePhone',
    'status',
    'roleIds',
    'employeeId',
    'branchIds',
    'primaryBranchId',
  ] as const;

  const handleEmployeeSelect = (employeeId?: string) => {
    if (!employeeId) {
      void applyEmployeeBranches(undefined);
      return;
    }
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;
    form.setFieldsValue({
      employeeFullName: employee.fullName,
      employeePhone: employee.phone,
    });
    void applyEmployeeBranches(employeeId);
  };

  const handleBranchIdsChange = (nextIds: string[]) => {
    const primary = form.getFieldValue('primaryBranchId') as string | undefined;
    const patch: Partial<UserFormValues> = { branchIds: nextIds };
    if (nextIds.length === 1) {
      patch.primaryBranchId = nextIds[0];
    } else if (primary && !nextIds.includes(primary)) {
      patch.primaryBranchId = nextIds[0];
    }
    form.setFieldsValue(patch);
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const handleSave = async () => {
    let values: UserFormValues;
    try {
      values = await form.validateFields([...(editing ? editFieldNames : createFieldNames)]);
    } catch (error) {
      const first = (error as { errorFields?: { errors: string[] }[] })?.errorFields?.[0]?.errors?.[0];
      if (first) message.warning(first);
      return;
    }

    const profile = {
      employeeId: values.employeeId || undefined,
      employeeFullName: values.employeeFullName?.trim() || undefined,
      employeePhone: values.employeePhone?.trim() || undefined,
    };
    const branchPayload = {
      branchIds: values.branchIds ?? [],
      primaryBranchId:
        values.primaryBranchId && (values.branchIds ?? []).includes(values.primaryBranchId)
          ? values.primaryBranchId
          : (values.branchIds ?? [])[0],
    };

    setSaving(true);
    try {
      if (editing) {
        await updateUser(editing.id, {
          username: values.username!.trim(),
          email: values.email.trim(),
          status: values.status,
          roleIds: values.roleIds,
          ...profile,
          ...branchPayload,
          newPassword: values.newPassword?.trim() || undefined,
        });
        message.success('Đã cập nhật tài khoản');
      } else {
        await createUser({
          username: values.username!.trim(),
          email: values.email.trim(),
          password: values.password!,
          status: values.status,
          roleIds: values.roleIds,
          ...profile,
          ...branchPayload,
        });
        message.success('Đã tạo tài khoản');
      }
      onSaved();
      handleClose();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không lưu được tài khoản'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={editing ? 'Sửa tài khoản' : 'Thêm tài khoản'}
      open={open}
      onClose={handleClose}
      width={480}
      extra={
        <Space>
          <Button icon={<CloseOutlined />} onClick={handleClose}>
            Hủy
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void handleSave()}>
            Lưu
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" size="middle">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="username"
              label="Tên đăng nhập"
              rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}
              style={{ marginBottom: 12 }}
            >
              <Input autoComplete="off" placeholder="username" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="employeeId" label={employeeLinkLabel} style={{ marginBottom: 12 }}>
              <Select
                allowClear
                options={employeeOptions}
                placeholder="Tuỳ chọn"
                onChange={(value) => handleEmployeeSelect(value)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={14}>
            <Form.Item name="employeeFullName" label="Họ và tên" style={{ marginBottom: 12 }}>
              <Input placeholder="Nguyễn Văn A" />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="employeePhone" label="SĐT" style={{ marginBottom: 12 }}>
              <Input placeholder="090..." />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={14}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
              style={{ marginBottom: 12 }}
            >
              <Input placeholder="email@..." />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="status" label="Trạng thái" style={{ marginBottom: 12 }}>
              <Select options={USER_STATUS_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>

        {!editing ? (
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Nhập mật khẩu' },
              { min: 8, message: 'Tối thiểu 8 ký tự' },
            ]}
            style={{ marginBottom: 12 }}
          >
            <Input.Password autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" />
          </Form.Item>
        ) : showChangePassword ? (
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Nhập mật khẩu mới' },
              { min: 8, message: 'Tối thiểu 8 ký tự' },
            ]}
            style={{ marginBottom: 12 }}
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Input.Password autoComplete="new-password" placeholder="Nhập mật khẩu mới" />
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: 'auto' }}
                onClick={() => {
                  setShowChangePassword(false);
                  form.setFieldValue('newPassword', undefined);
                }}
              >
                Hủy đổi mật khẩu
              </Button>
            </Space>
          </Form.Item>
        ) : (
          <Form.Item label="Mật khẩu" style={{ marginBottom: 12 }}>
            <Button
              size="small"
              icon={<KeyOutlined />}
              onClick={() => {
                setShowChangePassword(true);
                form.setFieldValue('newPassword', undefined);
              }}
            >
              Đổi mật khẩu
            </Button>
          </Form.Item>
        )}

        <Form.Item
          name="roleIds"
          label="Vai trò"
          rules={[{ required: true, message: 'Chọn ít nhất một vai trò' }]}
          style={{ marginBottom: 12 }}
        >
          <Select
            mode="multiple"
            options={roleOptions}
            placeholder="Chọn vai trò"
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item
          name="branchIds"
          label={
            <Space size={4}>
              Chi nhánh được phép
              <Tooltip title="Nhân viên chỉ thấy kho/POS/báo cáo thuộc các chi nhánh này. Để trống = không giới hạn (admin) hoặc không truy cập (nhân viên thường).">
                <QuestionCircleOutlined style={{ color: '#999', fontSize: 12 }} />
              </Tooltip>
            </Space>
          }
          style={{ marginBottom: 12 }}
        >
          <Select
            mode="multiple"
            allowClear
            options={branchOptions}
            placeholder="Chọn chi nhánh"
            optionFilterProp="label"
            onChange={(value) => handleBranchIdsChange(value as string[])}
          />
        </Form.Item>

        <Form.Item
          name="primaryBranchId"
          label="Chi nhánh chính"
          tooltip="Kho mặc định khi mở POS (nếu có nhiều chi nhánh)."
          style={{ marginBottom: 0 }}
        >
          <Select
            allowClear
            disabled={primaryBranchOptions.length === 0}
            options={primaryBranchOptions}
            placeholder={primaryBranchOptions.length ? 'Chọn chi nhánh chính' : 'Chọn chi nhánh trước'}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
