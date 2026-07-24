import { useState } from 'react';
import { Alert, Button, Card, Checkbox, Space, Typography, Upload } from 'antd';
import { CameraOutlined, EditOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

const COMMIT_ITEMS = [
  'Đã đọc và hiểu các điểm chính trong bài này.',
  'Đồng ý tuân thủ khi làm việc tại quầy.',
  'Biết hỏi quản lý / dược sĩ khi chưa chắc.',
] as const;

function formatAckAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Cam kết điện tử — L0 có thể kèm selfie tuỳ chọn. */
export function LearningCommitSignCard({
  acknowledgedAt,
  acknowledgeSelfieUrl,
  signerLabel,
  busy,
  allowSelfie,
  onSign,
}: {
  acknowledgedAt?: string | null;
  acknowledgeSelfieUrl?: string | null;
  signerLabel: string;
  busy?: boolean;
  allowSelfie?: boolean;
  onSign: (selfieFile?: File | null) => void | Promise<void>;
}) {
  const [checked, setChecked] = useState<boolean[]>(() => COMMIT_ITEMS.map(() => false));
  const [selfieList, setSelfieList] = useState<UploadFile[]>([]);
  const allChecked = checked.every(Boolean);
  const selfieFile = selfieList[0]?.originFileObj ?? null;

  if (acknowledgedAt) {
    return (
      <Alert
        type="success"
        showIcon
        icon={<SafetyCertificateOutlined />}
        style={{ borderRadius: 12 }}
        message="Đã ký cam kết điện tử"
        description={
          <Space direction="vertical" size={2}>
            <Typography.Text>
              Người ký: <strong>{signerLabel}</strong>
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Thời điểm: {formatAckAt(acknowledgedAt)} · Ghi nhận trên tài khoản Novixa
            </Typography.Text>
            {acknowledgeSelfieUrl ? (
              <Typography.Link href={acknowledgeSelfieUrl} target="_blank" rel="noreferrer">
                Xem ảnh xác nhận
              </Typography.Link>
            ) : null}
          </Space>
        }
      />
    );
  }

  return (
    <Card
      style={{
        borderRadius: 12,
        borderColor: '#91caff',
        background: 'linear-gradient(180deg, #f0f5ff 0%, #ffffff 55%)',
      }}
      title={
        <Space>
          <EditOutlined style={{ color: '#1677ff' }} />
          <span>Ký cam kết điện tử</span>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Tick đủ các mục rồi ký — hệ thống ghi nhận trên tài khoản của bạn.
        {allowSelfie ? ' Có thể thêm ảnh selfie (tuỳ chọn) để xác nhận chính bạn.' : ''}
      </Typography.Paragraph>
      <Space direction="vertical" size={10} style={{ width: '100%', marginBottom: 16 }}>
        {COMMIT_ITEMS.map((label, i) => (
          <Checkbox
            key={label}
            checked={checked[i]}
            onChange={(e) => {
              const next = [...checked];
              next[i] = e.target.checked;
              setChecked(next);
            }}
          >
            {label}
          </Checkbox>
        ))}
      </Space>
      {allowSelfie ? (
        <div style={{ marginBottom: 16 }}>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            Ảnh selfie xác nhận (tuỳ chọn)
          </Typography.Text>
          <Upload
            listType="picture-card"
            maxCount={1}
            accept="image/*"
            beforeUpload={() => false}
            fileList={selfieList}
            onChange={({ fileList }) => setSelfieList(fileList)}
          >
            {selfieList.length >= 1 ? null : (
              <div>
                <CameraOutlined />
                <div style={{ marginTop: 4 }}>Chụp / tải</div>
              </div>
            )}
          </Upload>
        </div>
      ) : null}
      <Typography.Text style={{ display: 'block', marginBottom: 12 }}>
        Người ký: <strong>{signerLabel}</strong>
      </Typography.Text>
      <Button
        type="primary"
        size="large"
        block
        icon={<SafetyCertificateOutlined />}
        disabled={!allChecked}
        loading={busy}
        onClick={() => void onSign(selfieFile)}
      >
        Ký cam kết điện tử
      </Button>
      {!allChecked ? (
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
          Cần tick đủ 3 mục trước khi ký.
        </Typography.Text>
      ) : null}
    </Card>
  );
}
