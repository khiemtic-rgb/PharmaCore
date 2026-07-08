import { useCallback, useEffect, useState } from 'react';
import { App, Button, Input, Modal, Popconfirm, Spin, Tag, Typography } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  RESERVATION_STATUS,
  RESERVATION_STATUS_LABEL,
  confirmReservation,
  fetchReservations,
  loadReservationForPos,
  markReservationReady,
  rejectReservation,
  updateReservationStaffNotes,
  type ReservationListItem,
} from '@/shared/api/reservations.api';
import { fetchCustomerById } from '@/shared/api/customer.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import { buildReservationCartLines } from '@/modules/reservations/reservation-pos-load';
import { usePosSession } from '@/modules/pos/pos-session.store';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';

const ACTIVE = [RESERVATION_STATUS.Pending, RESERVATION_STATUS.Confirmed, RESERVATION_STATUS.Ready];

function formatReservationTime(value?: string | null): string {
  if (!value) return '—';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM HH:mm') : '—';
}

export function ReservationsPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { setWarehouseId, replaceCart, setCustomer, setLoadedReservation } = usePosSession();
  const [items, setItems] = useState<ReservationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPos, setLoadingPos] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesTarget, setNotesTarget] = useState<ReservationListItem | null>(null);
  const [staffNotes, setStaffNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchReservations(ACTIVE));
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được giữ hàng'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendToPos = async (id: string) => {
    setLoadingPos(id);
    try {
      const payload = await loadReservationForPos(id);
      const lines = await buildReservationCartLines(payload);
      setWarehouseId(payload.warehouseId);
      replaceCart(lines);
      const customer = await fetchCustomerById(payload.customerId);
      setCustomer({
        id: customer.id,
        customerCode: customer.customerCode,
        fullName: customer.fullName,
        phone: customer.phone,
        allowCredit: customer.allowCredit,
      });
      setLoadedReservation(payload.reservationId, payload.reservationNumber);
      message.success(`Đã nạp giữ hàng ${payload.reservationNumber} vào POS`);
      navigate('/pos');
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không đưa được vào POS'));
    } finally {
      setLoadingPos(null);
    }
  };

  const quickAction = async (item: ReservationListItem) => {
    try {
      if (item.status === RESERVATION_STATUS.Pending) {
        await confirmReservation(item.id);
        message.success('Đã xác nhận giữ hàng');
      } else if (item.status === RESERVATION_STATUS.Confirmed) {
        await markReservationReady(item.id);
        message.success('Đã đánh dấu sẵn sàng');
      }
      await load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không cập nhật được trạng thái'));
    }
  };

  const rejectItem = async (id: string) => {
    setRejectingId(id);
    try {
      await rejectReservation(id);
      message.success('Đã từ chối giữ hàng');
      await load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không từ chối được giữ hàng'));
    } finally {
      setRejectingId(null);
    }
  };

  const openNotes = (item: ReservationListItem) => {
    setNotesTarget(item);
    setStaffNotes('');
    setNotesOpen(true);
  };

  const saveNotes = async () => {
    if (!notesTarget) return;
    setSavingNotes(true);
    try {
      await updateReservationStaffNotes(notesTarget.id, staffNotes.trim() || undefined);
      message.success('Đã lưu ghi chú');
      setNotesOpen(false);
      setNotesTarget(null);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không lưu được ghi chú'));
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Giữ hàng" backTo="/" />
      <main className="staff-body">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          Đơn giữ từ app khách · xác nhận → sẵn sàng → đưa vào POS bán.
        </Typography.Text>
        {loading ? (
          <Spin />
        ) : items.length === 0 ? (
          <Typography.Text type="secondary">Không có đơn giữ đang chờ</Typography.Text>
        ) : (
          items.map((item) => (
            <div key={item.id} className="cart-line">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <Typography.Text strong>{item.reservationNumber}</Typography.Text>
                <Tag>{RESERVATION_STATUS_LABEL[item.status] ?? item.status}</Tag>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                {item.customerName}
                {item.customerPhone ? ` · ${item.customerPhone}` : ''} · {item.itemCount} SP ·{' '}
                {formatReservationTime(item.submittedAt)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {item.status === RESERVATION_STATUS.Pending || item.status === RESERVATION_STATUS.Confirmed ? (
                  <Button size="small" onClick={() => void quickAction(item)}>
                    {item.status === RESERVATION_STATUS.Pending ? 'Xác nhận' : 'Sẵn sàng'}
                  </Button>
                ) : null}
                <Button size="small" onClick={() => openNotes(item)}>
                  Ghi chú
                </Button>
                {item.status === RESERVATION_STATUS.Pending || item.status === RESERVATION_STATUS.Confirmed ? (
                  <Popconfirm
                    title="Từ chối đơn giữ hàng?"
                    description="Khách sẽ thấy trạng thái từ chối trên app."
                    onConfirm={() => void rejectItem(item.id)}
                  >
                    <Button size="small" danger loading={rejectingId === item.id}>
                      Từ chối
                    </Button>
                  </Popconfirm>
                ) : null}
                <Button
                  size="small"
                  type="primary"
                  icon={<ShoppingCartOutlined />}
                  loading={loadingPos === item.id}
                  disabled={item.status === RESERVATION_STATUS.Pending}
                  onClick={() => void sendToPos(item.id)}
                >
                  Vào POS
                </Button>
              </div>
            </div>
          ))
        )}
      </main>

      <Modal
        title={notesTarget ? `Ghi chú · ${notesTarget.reservationNumber}` : 'Ghi chú'}
        open={notesOpen}
        onCancel={() => setNotesOpen(false)}
        onOk={() => void saveNotes()}
        confirmLoading={savingNotes}
        okText="Lưu"
      >
        <Input.TextArea
          rows={3}
          value={staffNotes}
          onChange={(e) => setStaffNotes(e.target.value)}
          placeholder="Ghi chú nội bộ cho đơn giữ hàng"
        />
      </Modal>
    </div>
  );
}
