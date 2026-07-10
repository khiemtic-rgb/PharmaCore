import { useMemo, useState } from 'react';
import { Button, Input, Modal, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import {
  fetchPrescriptionPosLoad,
  fetchPrescriptions,
  type RxPrescriptionListItem,
  type RxPrescriptionPosLoad,
} from '@/shared/api/rx.api';
import { apiErrorMessage } from '@/shared/api/api-error';

const LOADABLE_STATUSES = new Set([
  'pending_verification',
  'verified',
  'signed',
  'partially_dispensed',
]);

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp',
  pending_verification: 'Chờ xác minh',
  verified: 'Đã xác minh',
  signed: 'Đã ký',
  partially_dispensed: 'Đã bán một phần',
  dispensed: 'Đã bán hết',
  expired: 'Hết hạn',
  cancelled: 'Đã hủy',
};

type Props = {
  open: boolean;
  warehouseId?: string;
  onCancel: () => void;
  onLoaded: (payload: RxPrescriptionPosLoad) => void;
};

export function LoadPrescriptionModal({ open, warehouseId, onCancel, onLoaded }: Props) {
  const [phoneSearch, setPhoneSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RxPrescriptionListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(() => items.find((row) => row.id === selectedId), [items, selectedId]);

  const columns: ColumnsType<RxPrescriptionListItem> = [
    {
      title: 'Mã đơn',
      dataIndex: 'prescriptionCode',
      width: 140,
    },
    {
      title: 'Bệnh nhân',
      key: 'patient',
      render: (_, row) => (
        <div>
          <div>{row.patientName || '—'}</div>
          <small>{row.patientPhone || '—'}</small>
        </div>
      ),
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'prescriberName',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (value: string) => (
        <Tag color={LOADABLE_STATUSES.has(value) ? 'green' : 'default'}>
          {STATUS_LABELS[value] || value}
        </Tag>
      ),
    },
  ];

  const search = async () => {
    const q = phoneSearch.trim();
    if (!q) {
      message.warning('Nhập số điện thoại bệnh nhân');
      return;
    }
    setLoading(true);
    try {
      const result = await fetchPrescriptions({
        phoneSearch: q,
        page: 1,
        pageSize: 50,
      });
      setItems(result.items.filter((row) => LOADABLE_STATUSES.has(row.status)));
      setSelectedId(undefined);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tìm được đơn thuốc'));
    } finally {
      setLoading(false);
    }
  };

  const loadToPos = async () => {
    if (!warehouseId) {
      message.warning('Chọn kho bán trước khi nạp đơn');
      return;
    }
    if (!selected) {
      message.warning('Chọn đơn cần nạp');
      return;
    }
    setSubmitting(true);
    try {
      const payload = await fetchPrescriptionPosLoad(selected.id, warehouseId);
      onLoaded(payload);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không nạp được đơn thuốc vào POS'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Bán theo đơn BS"
      width={860}
      onCancel={onCancel}
      onOk={() => void loadToPos()}
      okText="Nạp vào POS"
      cancelText="Đóng"
      okButtonProps={{ loading: submitting }}
    >
      <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
        <Input
          placeholder="SĐT bệnh nhân"
          value={phoneSearch}
          onChange={(event) => setPhoneSearch(event.target.value)}
          onPressEnter={() => void search()}
        />
        <Button icon={<SearchOutlined />} loading={loading} onClick={() => void search()}>
          Tìm
        </Button>
      </Space.Compact>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        size="small"
        pagination={{ pageSize: 8, showSizeChanger: false }}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedId ? [selectedId] : [],
          onChange: (keys) => setSelectedId(String(keys[0] ?? '')),
        }}
        onRow={(record) => ({
          onClick: () => setSelectedId(record.id),
          style: { cursor: 'pointer' },
        })}
      />
    </Modal>
  );
}
