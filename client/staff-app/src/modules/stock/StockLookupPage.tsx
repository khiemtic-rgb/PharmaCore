import { useEffect, useMemo, useState } from 'react';
import { App, Input, Select, Spin, Typography } from 'antd';
import dayjs from 'dayjs';
import {
  fetchWarehouses,
  lookupPosProduct,
  searchPosProducts,
} from '@/shared/api/sales.api';
import type { PosProductLookup, PosProductSearchItem, Warehouse } from '@/shared/api/sales.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { formatMoney } from '@/shared/utils/money';
import { defaultBatchLabel } from '@/modules/sales/pos-batch';
import { StaffPageHeader } from '@/shared/layout/StaffPageHeader';
import { usePosSession } from '@/modules/pos/pos-session.store';

function warehouseOptionLabel(w: Warehouse) {
  return w.branchName ? `${w.warehouseName} · ${w.branchName}` : w.warehouseName;
}

export function StockLookupPage() {
  const { message } = App.useApp();
  const posWarehouseId = usePosSession((s) => s.warehouseId);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PosProductSearchItem[]>([]);
  const [detail, setDetail] = useState<PosProductLookup | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    void fetchWarehouses()
      .then((wh) => {
        setWarehouses(wh);
        const preferred =
          posWarehouseId && wh.some((w) => w.id === posWarehouseId) ? posWarehouseId : wh[0]?.id ?? null;
        setWarehouseId(preferred);
      })
      .catch(() => message.error('Không tải được kho'));
  }, [message, posWarehouseId]);

  const activeWarehouse = useMemo(
    () => warehouses.find((w) => w.id === warehouseId),
    [warehouses, warehouseId],
  );

  useEffect(() => {
    setDetail(null);
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        if (!warehouseId) return;
        setSearching(true);
        try {
          setHits(await searchPosProducts(query.trim(), warehouseId));
        } finally {
          setSearching(false);
        }
      })();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query, warehouseId]);

  const loadDetail = async (lookupCode: string) => {
    if (!warehouseId) return;
    try {
      setDetail(await lookupPosProduct(lookupCode, warehouseId));
      setQuery('');
      setHits([]);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tra được sản phẩm'));
    }
  };

  return (
    <div className="staff-shell">
      <StaffPageHeader title="Tra tồn" backTo="/" />
      <main className="staff-body">
        <Select
          size="large"
          className="stock-warehouse-select"
          placeholder="Chọn kho"
          value={warehouseId ?? undefined}
          onChange={(id) => setWarehouseId(id)}
          options={warehouses.map((w) => ({ value: w.id, label: warehouseOptionLabel(w) }))}
          style={{ width: '100%', marginBottom: 12 }}
        />
        <Input
          size="large"
          placeholder="Tên, mã SP, SKU..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          allowClear
        />
        <Typography.Text type="secondary" style={{ display: 'block', margin: '8px 0 12px', fontSize: 12 }}>
          {activeWarehouse
            ? `Đang xem tồn: ${warehouseOptionLabel(activeWarehouse)} · chỉ tra cứu, không thêm giỏ.`
            : 'Chọn kho để tra tồn các quầy khác (VD: quầy 2 xem tồn quầy 1).'}
        </Typography.Text>
        {searching ? <Spin /> : null}
        {hits.map((hit) => (
          <div key={hit.lookupCode} className="search-hit" onClick={() => void loadDetail(hit.lookupCode)}>
            <Typography.Text strong>{hit.productName}</Typography.Text>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {hit.productCode} · {formatMoney(hit.unitPrice)} · Tồn {hit.stockAvailable}
            </div>
          </div>
        ))}
        {detail ? (
          <div className="cart-line" style={{ marginTop: 16 }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              {detail.productName}
            </Typography.Title>
            <Typography.Text type="secondary">
              {detail.productCode} · {detail.unitName}
            </Typography.Text>
            <div style={{ marginTop: 12, fontSize: 15 }}>
              <strong>Tồn:</strong> {detail.stockAvailable} · <strong>Giá:</strong> {formatMoney(detail.unitPrice)}
            </div>
            {detail.batchHints?.length ? (
              <div style={{ marginTop: 12 }}>
                <Typography.Text strong style={{ fontSize: 13 }}>
                  Lô trong kho
                </Typography.Text>
                {detail.batchHints.map((h) => (
                  <div key={h.batchId} style={{ fontSize: 12, marginTop: 6, color: '#64748b' }}>
                    {h.batchNumber}
                    {h.isSuggested ? ' · FEFO' : ''}
                    {h.expiryDate ? ` · HSD ${dayjs(h.expiryDate).format('MM/YYYY')}` : ''} · {h.quantityAvailable}
                  </div>
                ))}
              </div>
            ) : null}
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 11 }}>
              Gợi ý lô: {defaultBatchLabel(detail.batchHints) ?? '—'}
            </Typography.Text>
          </div>
        ) : null}
      </main>
    </div>
  );
}
