import { useCallback, useEffect, useState } from 'react';
import { App, Button, Input, InputNumber, Space, Spin, Typography } from 'antd';
import { CheckOutlined, ScanOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addCountEntries,
  approveAdjustment,
  fetchAdjustment,
  fetchCountEntries,
  resolveInventoryBarcode,
} from '@/shared/api/inventory.api';
import type { AdjustmentCountEntry } from '@/shared/api/inventory.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { useCanInventoryWrite } from '@/shared/auth/usePermission';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';

export function StocktakeCountPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const canWrite = useCanInventoryWrite();
  const [loading, setLoading] = useState(true);
  const [header, setHeader] = useState<{ number: string; warehouseName: string; warehouseId: string } | null>(null);
  const [entries, setEntries] = useState<AdjustmentCountEntry[]>([]);
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [resolvedLabel, setResolvedLabel] = useState('');
  const [resolvedBatchId, setResolvedBatchId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail = await fetchAdjustment(id);
      setHeader({
        number: detail.adjustmentNumber,
        warehouseName: detail.warehouseName,
        warehouseId: detail.warehouseId,
      });
      setEntries(await fetchCountEntries(id));
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được phiên kiểm'));
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolveBarcode = async () => {
    if (!header || !barcode.trim()) return;
    setSubmitting(true);
    try {
      const hit = await resolveInventoryBarcode(header.warehouseId, barcode.trim());
      if (!hit.suggestedBatchId) {
        message.warning('Không xác định được lô — chọn SP có tồn tại kho');
        return;
      }
      setResolvedBatchId(hit.suggestedBatchId);
      setResolvedLabel(`${hit.productName} · lô ${hit.suggestedBatchNumber ?? ''}`);
      message.success('Đã nhận mã');
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không đọc được mã'));
      setResolvedBatchId(undefined);
      setResolvedLabel('');
    } finally {
      setSubmitting(false);
    }
  };

  const addLine = async () => {
    if (!id || !resolvedBatchId || quantity <= 0) {
      message.warning('Quét mã và nhập số lượng');
      return;
    }
    setSubmitting(true);
    try {
      await addCountEntries(id, [
        {
          batchId: resolvedBatchId,
          quantity,
          scannedBarcode: barcode.trim() || undefined,
        },
      ]);
      setEntries(await fetchCountEntries(id));
      setBarcode('');
      setResolvedBatchId(undefined);
      setResolvedLabel('');
      setQuantity(1);
      message.success('Đã ghi nhận');
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không thêm được dòng đếm'));
    } finally {
      setSubmitting(false);
    }
  };

  const approve = async () => {
    if (!id) return;
    setApproving(true);
    try {
      await approveAdjustment(id);
      message.success('Đã duyệt kiểm kê');
      navigate('/stocktake', { replace: true });
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không duyệt được — kiểm tra đủ lô và quyền'));
    } finally {
      setApproving(false);
    }
  };

  if (!id) return null;

  return (
    <div className="staff-shell">
      <StaffPageHeader title={header?.number ?? 'Kiểm kê'} backTo="/stocktake" />
      <main className="staff-body" style={{ paddingBottom: 100 }}>
        {loading ? <Spin /> : null}
        {header ? (
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            {header.warehouseName}
          </Typography.Text>
        ) : null}

        {canWrite ? (
          <div className="checkout-panel" style={{ marginBottom: 16 }}>
            <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
              <Input
                size="large"
                placeholder="Quét / nhập mã vạch"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onPressEnter={() => void resolveBarcode()}
              />
              <Button size="large" icon={<ScanOutlined />} loading={submitting} onClick={() => void resolveBarcode()} />
            </Space.Compact>
            {resolvedLabel ? (
              <Typography.Text style={{ display: 'block', marginBottom: 8 }}>{resolvedLabel}</Typography.Text>
            ) : null}
            <InputNumber
              size="large"
              min={0.001}
              step={1}
              style={{ width: '100%', marginBottom: 8 }}
              value={quantity}
              onChange={(v) => setQuantity(Number(v ?? 1))}
            />
            <Button type="primary" block size="large" loading={submitting} onClick={() => void addLine()}>
              Ghi nhận đếm
            </Button>
          </div>
        ) : null}

        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          Đã đếm ({entries.length})
        </Typography.Text>
        {entries.length === 0 ? (
          <Typography.Text type="secondary">Chưa có dòng đếm.</Typography.Text>
        ) : (
          entries.slice(0, 50).map((row) => (
            <div key={row.id} className="search-hit" style={{ cursor: 'default' }}>
              <Typography.Text strong>{row.productName ?? row.productCode ?? '—'}</Typography.Text>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Lô {row.batchNumber ?? '—'} · SL {row.quantity}
              </div>
            </div>
          ))
        )}
      </main>

      {canWrite ? (
        <footer className="staff-footer">
          <Button
            type="primary"
            block
            size="large"
            icon={<CheckOutlined />}
            loading={approving}
            disabled={entries.length === 0}
            onClick={() => void approve()}
          >
            Duyệt kiểm kê
          </Button>
        </footer>
      ) : null}
    </div>
  );
}
