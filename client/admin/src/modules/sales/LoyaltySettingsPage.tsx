import { useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Table,
  Typography,
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { fetchLoyaltySettings, saveLoyaltySettings } from '@/shared/api/loyalty.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import {
  DEFAULT_LOYALTY_PROGRAM,
  type LoyaltyProgramAdmin,
  type LoyaltyTierAdmin,
} from '@/shared/api/loyalty.types';
import { useHasPermission } from '@/shared/auth/usePermission';
import {
  formatDisplayMoney,
  moneyInputNumberPropsAllowZero,
  moneyInputNumberPropsAllowZeroSuffix,
  moneyInputNumberStyle,
  percentInputNumberProps,
} from '@/shared/utils/money';

type LoyaltyForm = {
  loyaltyEnabled: boolean;
  program: LoyaltyProgramAdmin;
};

export function LoyaltySettingsPage() {
  const { message } = App.useApp();
  const canWrite = useHasPermission('sales.write');
  const [form] = Form.useForm<LoyaltyForm>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const programId = Form.useWatch(['program', 'id'], form);
  const pointsPerAmount = Form.useWatch(['program', 'pointsPerAmount'], form) ?? 10000;

  useEffect(() => {
    if (pointsPerAmount > 0) {
      form.setFieldValue(['program', 'amountPerPoint'], pointsPerAmount);
    }
  }, [form, pointsPerAmount]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const settings = await fetchLoyaltySettings();
        form.setFieldsValue({
          loyaltyEnabled: settings.loyaltyEnabled,
          program: normalizeProgramForForm(settings.program ?? DEFAULT_LOYALTY_PROGRAM),
        });
      } catch (error) {
        message.error(apiErrorMessage(error, 'Không tải được cài đặt tích điểm'));
      } finally {
        setLoading(false);
      }
    })();
  }, [form, message]);

  const onSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const saved = await saveLoyaltySettings({
        loyaltyEnabled: values.loyaltyEnabled,
        program: {
          ...values.program,
          status: values.loyaltyEnabled ? 1 : 0,
          amountPerPoint: values.program.pointsPerAmount,
          programCode: values.program.programCode.trim(),
          programName: values.program.programName.trim(),
          tiers: values.program.tiers.map((tier, index) => ({
            ...tier,
            tierCode: tier.tierCode.trim(),
            tierName: tier.tierName.trim(),
            sortOrder: tier.sortOrder || index + 1,
          })),
        },
      });
      form.setFieldsValue({
        loyaltyEnabled: saved.loyaltyEnabled,
        program: normalizeProgramForForm(saved.program ?? DEFAULT_LOYALTY_PROGRAM),
      });
      message.success('Đã lưu cài đặt tích điểm');
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không lưu được cài đặt tích điểm'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="Tích điểm khách hàng" loading={loading}>
        <Form form={form} layout="vertical" disabled={!canWrite} style={{ maxWidth: 720 }}>
          <Form.Item name="loyaltyEnabled" label="Bật tích điểm" valuePropName="checked">
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>

          <Typography.Title level={5} style={{ marginTop: 8 }}>
            Chương trình
          </Typography.Title>

          <Form.Item name={['program', 'id']} hidden>
            <Input />
          </Form.Item>
          <Form.Item name={['program', 'status']} hidden>
            <InputNumber />
          </Form.Item>

          <Space wrap style={{ width: '100%' }}>
            <Form.Item
              name={['program', 'programCode']}
              label="Mã chương trình"
              rules={[{ required: true, message: 'Nhập mã' }]}
              style={{ minWidth: 200 }}
            >
              <Input disabled={Boolean(programId)} />
            </Form.Item>
            <Form.Item
              name={['program', 'programName']}
              label="Tên hiển thị"
              rules={[{ required: true, message: 'Nhập tên' }]}
              style={{ flex: 1, minWidth: 240 }}
            >
              <Input />
            </Form.Item>
          </Space>

          <Form.Item name={['program', 'amountPerPoint']} hidden>
            <InputNumber />
          </Form.Item>

          <Space align="start" wrap style={{ width: '100%' }}>
            <Form.Item
              name={['program', 'pointsPerAmount']}
              label="Số tiền mua để được"
              rules={[{ required: true, type: 'number', min: 1 }]}
            >
              <InputNumber
                {...moneyInputNumberPropsAllowZeroSuffix}
                min={1}
                style={{ ...moneyInputNumberStyle, width: 200 }}
              />
            </Form.Item>
            <Typography.Text style={{ marginTop: 30, fontSize: 18 }}>→</Typography.Text>
            <Form.Item label="Điểm nhận được">
              <Input value="1 điểm" disabled style={{ width: 120, textAlign: 'center' }} />
            </Form.Item>
          </Space>

          <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
            Ví dụ: {formatDisplayMoney(pointsPerAmount)} → 1 điểm — tích điểm và đổi điểm trên POS dùng cùng quy tắc
            (mua {formatDisplayMoney(pointsPerAmount)} được +1 điểm; đổi 1 điểm giảm {formatDisplayMoney(pointsPerAmount)}).
          </Typography.Paragraph>

          <Form.Item
            name={['program', 'maxRedeemPercent']}
            label="Trừ tối đa trên một đơn bán (%)"
            rules={[{ required: true, type: 'number', min: 0, max: 100 }]}
          >
            <InputNumber
              {...percentInputNumberProps}
              min={0}
              max={100}
              style={{ ...moneyInputNumberStyle, width: 160 }}
            />
          </Form.Item>
          <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
            Ví dụ: khách có 100 điểm (= {formatDisplayMoney(pointsPerAmount * 100)}) nhưng đơn 50.000 đ với giới hạn 5%
            thì chỉ được giảm tối đa 2.500 đ bằng điểm, không trừ hết giá trị đơn.
          </Typography.Paragraph>

          <Typography.Title level={5}>Hạng thành viên</Typography.Title>

          <Form.List name={['program', 'tiers']}>
            {(fields, { add, remove }) => (
              <>
                <Table
                  size="small"
                  pagination={false}
                  rowKey="key"
                  dataSource={fields}
                  columns={[
                    {
                      title: 'Mã',
                      width: 110,
                      render: (_, field) => (
                        <>
                          <Form.Item name={[field.name, 'id']} hidden>
                            <Input />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'tierCode']}
                            rules={[{ required: true, message: 'Nhập mã' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input placeholder="BRONZE" />
                          </Form.Item>
                        </>
                      ),
                    },
                    {
                      title: 'Tên hạng',
                      render: (_, field) => (
                        <Form.Item
                          name={[field.name, 'tierName']}
                          rules={[{ required: true, message: 'Nhập tên' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="Đồng" />
                        </Form.Item>
                      ),
                    },
                    {
                      title: 'Từ (điểm)',
                      width: 110,
                      render: (_, field) => (
                        <Form.Item
                          name={[field.name, 'minPoints']}
                          rules={[{ required: true, type: 'number', min: 0 }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            {...moneyInputNumberPropsAllowZero}
                            style={{ ...moneyInputNumberStyle, width: '100%' }}
                          />
                        </Form.Item>
                      ),
                    },
                    {
                      title: 'Giảm %',
                      width: 100,
                      render: (_, field) => (
                        <Form.Item
                          name={[field.name, 'discountPercent']}
                          rules={[{ required: true, type: 'number', min: 0, max: 100 }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            {...percentInputNumberProps}
                            style={{ ...moneyInputNumberStyle, width: '100%' }}
                          />
                        </Form.Item>
                      ),
                    },
                    {
                      title: '',
                      width: 48,
                      render: (_, field) =>
                        fields.length > 1 ? (
                          <Button
                            type="text"
                            danger
                            icon={<MinusCircleOutlined />}
                            onClick={() => remove(field.name)}
                          />
                        ) : null,
                    },
                  ]}
                />
                <Button
                  type="dashed"
                  onClick={() =>
                    add({
                      tierCode: '',
                      tierName: '',
                      minPoints: 0,
                      discountPercent: 0,
                      sortOrder: fields.length + 1,
                    } satisfies LoyaltyTierAdmin)
                  }
                  icon={<PlusOutlined />}
                  style={{ marginTop: 12 }}
                >
                  Thêm hạng
                </Button>
              </>
            )}
          </Form.List>

          {canWrite ? (
            <Button type="primary" loading={saving} onClick={() => void onSave()} style={{ marginTop: 16 }}>
              Lưu cài đặt tích điểm
            </Button>
          ) : null}
        </Form>
      </Card>
    </Space>
  );
}

function normalizeProgramForForm(program: LoyaltyProgramAdmin): LoyaltyProgramAdmin {
  const pointsPerAmount =
    program.pointsPerAmount > 0 ? program.pointsPerAmount : DEFAULT_LOYALTY_PROGRAM.pointsPerAmount;
  return {
    ...program,
    pointsPerAmount,
    amountPerPoint: pointsPerAmount,
    maxRedeemPercent:
      program.maxRedeemPercent >= 0 ? program.maxRedeemPercent : DEFAULT_LOYALTY_PROGRAM.maxRedeemPercent,
  };
}
