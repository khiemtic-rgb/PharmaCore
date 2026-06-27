import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Switch,
  Table,
  Typography,
} from 'antd';
import { KeyOutlined, LoginOutlined, PlusOutlined, ShopOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import {
  createPlatformTenant,
  fetchPlatformSetupStatus,
  fetchPlatformTenants,
} from '@/shared/api/platform.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import type { CreatePlatformBranchRequest, PlatformTenantListItem } from '@/shared/api/platform.types';
import {
  APP_BRAND,
  APP_PRODUCT,
  loadStoredPlatformKey,
  saveStoredPlatformKey,
  saveStoredTenantCode,
} from '@/shared/config/app-brand';

type AdditionalBranchFormValues = {
  branchCode: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  warehouseCode: string;
  warehouseName: string;
};

type SetupFormValues = {
  platformKey?: string;
  tenantCode: string;
  tenantName: string;
  branchCode: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  warehouseCode: string;
  warehouseName: string;
  additionalBranches?: AdditionalBranchFormValues[];
  adminUsername: string;
  adminEmail: string;
  adminFullName: string;
  adminPassword: string;
  adminPasswordConfirm: string;
  loyaltyEnabled: boolean;
};

function padBranchCode(index: number): string {
  return `CN${String(index).padStart(2, '0')}`;
}

function buildAdditionalBranchRows(count: number): AdditionalBranchFormValues[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 2;
    const code = padBranchCode(n);
    return {
      branchCode: code,
      branchName: `Quầy ${n}`,
      warehouseCode: `WH_${code}`,
      warehouseName: `Kho ${code}`,
    };
  });
}

export function SetupPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<SetupFormValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantsCount, setTenantsCount] = useState(0);
  const [provisioningKeyRequired, setProvisioningKeyRequired] = useState(false);
  const [tenants, setTenants] = useState<PlatformTenantListItem[]>([]);
  const [extraBranchCount, setExtraBranchCount] = useState(0);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const status = await fetchPlatformSetupStatus();
      setTenantsCount(status.tenantsCount);
      setProvisioningKeyRequired(status.provisioningKeyRequired);

      const platformKey = form.getFieldValue('platformKey') || loadStoredPlatformKey();
      if (platformKey) {
        form.setFieldValue('platformKey', platformKey);
      }

      if (status.tenantsCount === 0 || platformKey) {
        try {
          const rows = await fetchPlatformTenants(platformKey || undefined);
          setTenants(rows);
        } catch {
          setTenants([]);
        }
      } else {
        setTenants([]);
      }
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được trạng thái hệ thống'));
    } finally {
      setLoading(false);
    }
  }, [form, message]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onFinish = async (values: SetupFormValues) => {
    if (values.adminPassword !== values.adminPasswordConfirm) {
      message.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setSaving(true);
    try {
      const platformKey = values.platformKey?.trim();
      if (platformKey) {
        saveStoredPlatformKey(platformKey);
      }

      const additionalBranches = (values.additionalBranches ?? [])
        .filter((b) => b.branchCode?.trim() && b.branchName?.trim())
        .map(
          (b): CreatePlatformBranchRequest => ({
            branchCode: b.branchCode.trim(),
            branchName: b.branchName.trim(),
            branchAddress: b.branchAddress?.trim(),
            branchPhone: b.branchPhone?.trim(),
            warehouseCode: b.warehouseCode.trim(),
            warehouseName: b.warehouseName.trim(),
          }),
        );

      const created = await createPlatformTenant(
        {
          tenantCode: values.tenantCode.trim(),
          tenantName: values.tenantName.trim(),
          branchCode: values.branchCode.trim(),
          branchName: values.branchName.trim(),
          branchAddress: values.branchAddress?.trim(),
          branchPhone: values.branchPhone?.trim(),
          warehouseCode: values.warehouseCode.trim(),
          warehouseName: values.warehouseName.trim(),
          adminUsername: values.adminUsername.trim(),
          adminEmail: values.adminEmail.trim(),
          adminFullName: values.adminFullName.trim(),
          adminPassword: values.adminPassword,
          loyaltyEnabled: values.loyaltyEnabled,
          additionalBranches: additionalBranches.length > 0 ? additionalBranches : undefined,
        },
        platformKey,
      );

      saveStoredTenantCode(created.tenantCode);
      const branchMsg =
        created.branchCount > 1 ? ` (${created.branchCount} chi nhánh)` : '';
      message.success(`Đã tạo nhà thuốc ${created.tenantCode}${branchMsg}. Đăng nhập bằng mã này.`);
      form.setFieldsValue({
        adminPassword: '',
        adminPasswordConfirm: '',
        additionalBranches: [],
      });
      setExtraBranchCount(0);
      await reload();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tạo được nhà thuốc'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 50%, #115e59 100%)',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', color: '#ecfdf5' }}>
            <Typography.Title level={2} style={{ color: '#ecfdf5', marginBottom: 4 }}>
              {APP_BRAND}
            </Typography.Title>
            <Typography.Text style={{ color: '#99f6e4' }}>
              Thiết lập nhà thuốc — {APP_PRODUCT}
            </Typography.Text>
          </div>

          <Card loading={loading}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {tenantsCount === 0 ? (
                <Alert
                  type="info"
                  showIcon
                  message="Lần đầu triển khai"
                  description="Chưa có nhà thuốc nào. Điền form bên dưới để tạo nhà thuốc đầu tiên — không cần mã thiết lập nền tảng."
                />
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message={`Đang có ${tenantsCount} nhà thuốc trên hệ thống`}
                  description="Thêm nhà thuốc mới cần Mã thiết lập nền tảng (Platform__ProvisioningKey trên server)."
                />
              )}

              {provisioningKeyRequired ? (
                <Form.Item
                  name="platformKey"
                  label="Mã thiết lập nền tảng"
                  tooltip="Giá trị Platform__ProvisioningKey trên server API"
                  rules={[{ required: true, message: 'Nhập mã thiết lập' }]}
                >
                  <Input.Password
                    prefix={<KeyOutlined />}
                    placeholder="Nhập mã từ cấu hình server"
                    onBlur={() => {
                      const key = form.getFieldValue('platformKey')?.trim();
                      if (key) saveStoredPlatformKey(key);
                      void reload();
                    }}
                  />
                </Form.Item>
              ) : null}

              {tenants.length > 0 ? (
                <>
                  <Typography.Title level={5}>Nhà thuốc đã tạo</Typography.Title>
                  <Table
                    size="small"
                    rowKey="id"
                    pagination={false}
                    dataSource={tenants}
                    columns={[
                      { title: 'Mã', dataIndex: 'tenantCode', width: 120 },
                      { title: 'Tên', dataIndex: 'tenantName' },
                      {
                        title: 'Ngày tạo',
                        dataIndex: 'createdAt',
                        width: 180,
                        render: (v: string) => new Date(v).toLocaleString('vi-VN'),
                      },
                    ]}
                  />
                  <Divider />
                </>
              ) : null}

              <Typography.Title level={5}>
                <ShopOutlined /> Tạo nhà thuốc mới
              </Typography.Title>

              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                  branchCode: 'CN01',
                  branchName: 'Quầy chính',
                  warehouseCode: 'WH_MAIN',
                  warehouseName: 'Kho chính',
                  adminUsername: 'admin',
                  adminFullName: 'Quản trị viên',
                  loyaltyEnabled: true,
                  platformKey: loadStoredPlatformKey(),
                }}
              >
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="tenantCode"
                      label="Mã nhà thuốc"
                      rules={[{ required: true, message: 'Nhập mã (vd. NT_A)' }]}
                      tooltip="Dùng khi đăng nhập admin và app khách"
                    >
                      <Input placeholder="NT_A" style={{ textTransform: 'uppercase' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={16}>
                    <Form.Item
                      name="tenantName"
                      label="Tên nhà thuốc"
                      rules={[{ required: true, message: 'Nhập tên hiển thị' }]}
                    >
                      <Input placeholder="Nhà Thuốc An" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item name="branchCode" label="Mã chi nhánh" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={16}>
                    <Form.Item name="branchName" label="Tên chi nhánh" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="branchAddress" label="Địa chỉ">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="branchPhone" label="SĐT chi nhánh">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item name="warehouseCode" label="Mã kho" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={16}>
                    <Form.Item name="warehouseName" label="Tên kho" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left">Chuỗi — chi nhánh bổ sung</Divider>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Chi nhánh đầu tiên ở trên (CN01 / Quầy chính)"
                  description="Nhập số chi nhánh thêm rồi bấm «Thêm vào form» — hệ thống điền mẫu CN02, CN03… Admin được gán quyền tất cả chi nhánh."
                />
                <Space wrap align="center" style={{ marginBottom: 16 }}>
                  <Typography.Text>Thêm</Typography.Text>
                  <InputNumber
                    min={0}
                    max={20}
                    value={extraBranchCount}
                    onChange={(v) => setExtraBranchCount(v ?? 0)}
                  />
                  <Typography.Text>chi nhánh</Typography.Text>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => {
                      if (extraBranchCount <= 0) {
                        message.info('Chọn số chi nhánh lớn hơn 0');
                        return;
                      }
                      form.setFieldValue('additionalBranches', buildAdditionalBranchRows(extraBranchCount));
                    }}
                  >
                    Thêm vào form
                  </Button>
                </Space>

                <Form.List name="additionalBranches">
                  {(fields, { remove }) => (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      {fields.map((field, index) => (
                        <Card
                          key={field.key}
                          size="small"
                          title={`Chi nhánh bổ sung ${index + 1}`}
                          extra={
                            <Button type="link" danger onClick={() => remove(field.name)}>
                              Xóa
                            </Button>
                          }
                        >
                          <Row gutter={16}>
                            <Col xs={24} md={8}>
                              <Form.Item
                                {...field}
                                name={[field.name, 'branchCode']}
                                label="Mã chi nhánh"
                                rules={[{ required: true }]}
                              >
                                <Input style={{ textTransform: 'uppercase' }} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={16}>
                              <Form.Item
                                {...field}
                                name={[field.name, 'branchName']}
                                label="Tên chi nhánh"
                                rules={[{ required: true }]}
                              >
                                <Input />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Form.Item {...field} name={[field.name, 'branchAddress']} label="Địa chỉ">
                                <Input />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item {...field} name={[field.name, 'branchPhone']} label="SĐT">
                                <Input />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16}>
                            <Col xs={24} md={8}>
                              <Form.Item
                                {...field}
                                name={[field.name, 'warehouseCode']}
                                label="Mã kho"
                                rules={[{ required: true }]}
                              >
                                <Input style={{ textTransform: 'uppercase' }} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={16}>
                              <Form.Item
                                {...field}
                                name={[field.name, 'warehouseName']}
                                label="Tên kho"
                                rules={[{ required: true }]}
                              >
                                <Input />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Card>
                      ))}
                    </Space>
                  )}
                </Form.List>

                <Divider orientation="left">Tài khoản quản trị</Divider>

                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item name="adminUsername" label="Tên đăng nhập" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={16}>
                    <Form.Item
                      name="adminEmail"
                      label="Email"
                      rules={[{ required: true, type: 'email' }]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="adminFullName" label="Họ tên">
                  <Input />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="adminPassword"
                      label="Mật khẩu"
                      rules={[{ required: true, min: 8, message: 'Tối thiểu 8 ký tự' }]}
                    >
                      <Input.Password />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="adminPasswordConfirm"
                      label="Xác nhận mật khẩu"
                      rules={[{ required: true }]}
                    >
                      <Input.Password />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="loyaltyEnabled" label="Bật tích điểm loyalty" valuePropName="checked">
                  <Switch />
                </Form.Item>

                <Space wrap>
                  <Button type="primary" htmlType="submit" loading={saving} icon={<ShopOutlined />}>
                    Tạo nhà thuốc
                  </Button>
                  <Link to="/login">
                    <Button icon={<LoginOutlined />}>Đi tới đăng nhập</Button>
                  </Link>
                </Space>
              </Form>
            </Space>
          </Card>
        </Space>
      </div>
    </div>
  );
}
