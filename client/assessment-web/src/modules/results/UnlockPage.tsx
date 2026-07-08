import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Checkbox, Form, Input, Typography, message } from 'antd';
import { captureLead } from '@/shared/api/assessment.api';

const { Title, Paragraph } = Typography;

type FormValues = {
  respondentName: string;
  respondentPhone: string;
  respondentEmail: string;
  respondentOrgName: string;
  respondentNote?: string;
  consentMarketing: boolean;
};

export function UnlockPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onFinish(values: FormValues) {
    setLoading(true);
    try {
      await captureLead(id, values);
      message.success('Cảm ơn! Báo cáo đã sẵn sàng.');
      navigate(`/report/${id}`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      message.error(msg ?? 'Gửi thông tin thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <Title level={3}>Nhận báo cáo chi tiết</Title>
      <Paragraph type="secondary">Thông tin giúp Novixa gửi báo cáo và tư vấn phù hợp.</Paragraph>

      <Form layout="vertical" onFinish={onFinish} requiredMark="optional">
        <Form.Item
          label="Họ tên"
          name="respondentName"
          rules={[{ required: true, min: 2, message: 'Nhập họ tên' }]}
        >
          <Input placeholder="Nguyễn Văn A" />
        </Form.Item>
        <Form.Item
          label="Số điện thoại"
          name="respondentPhone"
          rules={[{ required: true, pattern: /^0[0-9]{9}$/, message: 'SĐT 10 số, bắt đầu 0' }]}
        >
          <Input placeholder="0909123456" />
        </Form.Item>
        <Form.Item
          label="Email"
          name="respondentEmail"
          rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}
        >
          <Input placeholder="owner@example.com" />
        </Form.Item>
        <Form.Item
          label="Tên nhà thuốc / cơ sở"
          name="respondentOrgName"
          rules={[{ required: true, min: 2, message: 'Nhập tên cơ sở' }]}
        >
          <Input placeholder="Nhà thuốc ABC" />
        </Form.Item>
        <Form.Item label="Ghi chú (tuỳ chọn)" name="respondentNote">
          <Input.TextArea rows={3} placeholder="Muốn tư vấn phần mềm quản lý..." />
        </Form.Item>
        <Form.Item name="consentMarketing" valuePropName="checked" initialValue={true}>
          <Checkbox>Tôi đồng ý nhận thông tin tư vấn từ Novixa</Checkbox>
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Gửi &amp; xem báo cáo
        </Button>
      </Form>
    </div>
  );
}
