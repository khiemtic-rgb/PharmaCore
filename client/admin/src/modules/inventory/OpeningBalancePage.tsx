import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Card,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import {
  DeleteOutlined,
  DownloadOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import {
  createOpeningBalance,
  fetchOpeningBalanceBatches,
  fetchStockBatches,
  fetchWarehouses,
  importOpeningBalanceBatched,
  voidOpeningBalanceBatch,
} from '@/shared/api/inventory.api';
import type { OpeningBalanceImportResult } from '@/shared/api/inventory.types';
import { fetchProducts } from '@/shared/api/catalog.api';
import { apiErrorMessage } from '@/shared/api/api-error';
import type { OpeningBalanceBatch, StockBatch, Warehouse } from '@/shared/api/inventory.types';
import type { ProductListItem } from '@/shared/api/catalog.types';
import { PharmaExpiryPicker } from '@/shared/ui/PharmaDatePicker';
import { formatDisplayDate } from '@/shared/utils/date';
import { formatDisplayMoney, moneyInputNumberPropsAllowZero, moneyInputNumberStyle } from '@/shared/utils/money';
import {
  OPENING_BALANCE_TEMPLATE_HEADERS,
  downloadCsvTemplate,
  parseDecimal,
  parseOptionalDate,
  parseSpreadsheetFile,
  pickRowValue,
} from '@/shared/utils/spreadsheet-import';
import type { ColumnsType } from 'antd/es/table';

type OpeningStatusFilter = 'all' | 'voidable' | 'locked';

interface LineRow {
  key: string;
  productId?: string;
  batchNumber?: string;
  expiryDate?: string;
  unitCost?: number;
  quantity?: number;
}

interface ExcelImportRow {
  rowNumber: number;
  productKey: string;
  batchNumber: string;
  expiryDate?: string;
  quantity: number;
  unitCost: number;
}

interface SavedImportLine {
  productCode: string;
  productName: string;
  saleUnitName?: string;
  batchNumber: string;
  expiryDate?: string;
  unitCost: number;
  quantity: number;
}

interface SavedImport {
  id: string;
  savedAt: string;
  warehouseName: string;
  notes?: string;
  lines: SavedImportLine[];
}

function renderProductCell(code: string, name: string) {
  return (
    <div>
      <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.3 }}>
        Mã SP: {code}
      </Typography.Text>
      <span>{name}</span>
    </div>
  );
}

function mapOpeningBalanceRows(rows: Record<string, string>[]): ExcelImportRow[] {
  return rows
    .map((row, index) => ({
      rowNumber: index + 2,
      productKey: pickRowValue(row, 'product_key', 'ma_sp', 'mã_sp', 'barcode', 'ma_vach'),
      batchNumber: pickRowValue(row, 'batch_number', 'so_lo', 'số_lô', 'lot'),
      expiryDate: parseOptionalDate(pickRowValue(row, 'expiry_date', 'hsd', 'han_dung')),
      quantity: parseDecimal(pickRowValue(row, 'quantity', 'so_luong', 'số_lượng', 'sl')) ?? 0,
      unitCost: Math.max(0, parseDecimal(pickRowValue(row, 'unit_cost', 'gia_von', 'giá_vốn', 'cost')) ?? 0),
    }))
    .filter((r) => r.productKey && r.batchNumber && r.quantity > 0);
}

export function OpeningBalancePage() {
  const { message } = App.useApp();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>();
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineRow[]>([{ key: '1' }]);
  const [saving, setSaving] = useState(false);
  const [recentImports, setRecentImports] = useState<SavedImport[]>([]);
  const [excelPreview, setExcelPreview] = useState<ExcelImportRow[]>([]);
  const [excelFileName, setExcelFileName] = useState<string>();
  const [excelImporting, setExcelImporting] = useState(false);
  const [excelImportError, setExcelImportError] = useState<string | null>(null);
  const [excelImportResult, setExcelImportResult] = useState<OpeningBalanceImportResult | null>(null);
  const [excelImportBatch, setExcelImportBatch] = useState<{ current: number; total: number } | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [openingBatches, setOpeningBatches] = useState<OpeningBalanceBatch[]>([]);
  const [openingLoading, setOpeningLoading] = useState(false);
  const [openingPage, setOpeningPage] = useState(1);
  const [openingPageSize, setOpeningPageSize] = useState(50);
  const [openingTotal, setOpeningTotal] = useState(0);
  const [openingSummaryTotal, setOpeningSummaryTotal] = useState(0);
  const [openingSummaryVoidable, setOpeningSummaryVoidable] = useState(0);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [stockBatches, setStockBatches] = useState<StockBatch[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockTotal, setStockTotal] = useState(0);
  const [listSearchInput, setListSearchInput] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OpeningStatusFilter>('all');
  const [productFilterId, setProductFilterId] = useState<string | undefined>();

  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);

  const loadStock = useCallback(async () => {
    if (!warehouseId) {
      setStockBatches([]);
      setStockTotal(0);
      return;
    }
    setStockLoading(true);
    try {
      const result = await fetchStockBatches({
        warehouseId,
        page: openingPage,
        pageSize: openingPageSize,
      });
      setStockBatches(result.items);
      setStockTotal(result.total);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được tồn kho'));
    } finally {
      setStockLoading(false);
    }
  }, [warehouseId, openingPage, openingPageSize]);

  const loadOpeningBatches = useCallback(async () => {
    if (!warehouseId) {
      setOpeningBatches([]);
      setOpeningTotal(0);
      setOpeningSummaryTotal(0);
      setOpeningSummaryVoidable(0);
      return;
    }
    setOpeningLoading(true);
    try {
      const result = await fetchOpeningBalanceBatches({
        warehouseId,
        productId: productFilterId,
        search: listSearch || undefined,
        status: statusFilter,
        page: openingPage,
        pageSize: openingPageSize,
      });
      setOpeningBatches(result.items);
      setOpeningTotal(result.total);
      setOpeningSummaryTotal(result.summaryTotal);
      setOpeningSummaryVoidable(result.summaryVoidableCount);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được danh sách tồn đầu kỳ'));
    } finally {
      setOpeningLoading(false);
    }
  }, [warehouseId, productFilterId, listSearch, statusFilter, openingPage, openingPageSize]);

  const loadLookups = useCallback(async () => {
    try {
      const [wh, prodPage] = await Promise.all([
        fetchWarehouses(),
        fetchProducts({ page: 1, pageSize: 100, status: 1 }),
      ]);
      setWarehouses(wh);
      setProducts(prodPage.items);
      if (!warehouseId && wh.length > 0) {
        const defaultWh = wh.find((w) => w.isDefault) ?? wh[0];
        setWarehouseId(defaultWh.id);
      }
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được dữ liệu tham chiếu'));
    }
  }, [warehouseId]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    setOpeningPage(1);
  }, [warehouseId]);

  useEffect(() => {
    void loadOpeningBatches();
  }, [loadOpeningBatches]);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const addLine = () => {
    setLines((prev) => [...prev, { key: String(Date.now()) }]);
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const updateLine = (key: string, patch: Partial<LineRow>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const handleVoid = async (batch: OpeningBalanceBatch) => {
    setVoidingId(batch.batchId);
    try {
      await voidOpeningBalanceBatch(batch.batchId);
      message.success(`Đã xóa lô ${batch.batchNumber}`);
      await Promise.all([loadOpeningBatches(), loadStock()]);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không xóa được lô tồn đầu kỳ'));
    } finally {
      setVoidingId(null);
    }
  };

  const handleSubmit = async () => {
    if (!warehouseId) {
      message.warning('Chọn kho nhập tồn');
      return;
    }

    const validLines = lines.filter(
      (l) => l.productId && l.batchNumber && l.quantity && l.quantity > 0,
    );
    if (validLines.length === 0) {
      message.warning('Thêm ít nhất một dòng hợp lệ');
      return;
    }

    for (const line of validLines) {
      if ((line.unitCost ?? 0) < 0) {
        message.warning('Giá vốn không hợp lệ');
        return;
      }
    }

    setSaving(true);
    try {
      const result = await createOpeningBalance({
        warehouseId,
        notes: notes || undefined,
        lines: validLines.map((l) => ({
          productId: l.productId!,
          batchNumber: l.batchNumber!.trim(),
          expiryDate: l.expiryDate,
          unitCost: l.unitCost ?? 0,
          quantity: l.quantity!,
        })),
      });

      const savedId = String(Date.now());
      const savedLines: SavedImportLine[] = validLines.map((l) => {
        const product = products.find((p) => p.id === l.productId);
        return {
          productCode: product?.productCode ?? '—',
          productName: product?.productName ?? '—',
          saleUnitName: product?.saleUnitName,
          batchNumber: l.batchNumber!.trim(),
          expiryDate: l.expiryDate,
          unitCost: l.unitCost ?? 0,
          quantity: l.quantity!,
        };
      });

      setRecentImports((prev) => [
        {
          id: savedId,
          savedAt: new Date().toISOString(),
          warehouseName: selectedWarehouse?.warehouseName ?? '—',
          notes: notes || undefined,
          lines: savedLines,
        },
        ...prev,
      ].slice(0, 10));
      setLastSavedId(savedId);

      message.success(`Đã lưu ${result.linesProcessed} dòng tồn đầu kỳ`);
      setLines([{ key: String(Date.now()) }]);
      setNotes('');
      await Promise.all([loadOpeningBatches(), loadStock()]);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không nhập được tồn đầu kỳ'));
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<LineRow> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productId',
      width: 260,
      render: (_, row) => (
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          placeholder="Chọn SP"
          value={row.productId}
          onChange={(v) => updateLine(row.key, { productId: v })}
          options={products.map((p) => ({
            value: p.id,
            label: `${p.productCode} — ${p.productName}`,
          }))}
        />
      ),
    },
    {
      title: 'Số lô',
      dataIndex: 'batchNumber',
      width: 130,
      render: (_, row) => (
        <Input
          value={row.batchNumber}
          onChange={(e) => updateLine(row.key, { batchNumber: e.target.value })}
        />
      ),
    },
    {
      title: 'HSD',
      dataIndex: 'expiryDate',
      width: 140,
      render: (_, row) => (
        <PharmaExpiryPicker
          style={{ width: 130 }}
          inTable
          value={row.expiryDate}
          onChange={(value) => updateLine(row.key, { expiryDate: value || undefined })}
        />
      ),
    },
    {
      title: 'Giá vốn',
      dataIndex: 'unitCost',
      width: 120,
      align: 'right',
      render: (_, row) => (
        <InputNumber
          {...moneyInputNumberPropsAllowZero}
          style={moneyInputNumberStyle}
          value={row.unitCost}
          onChange={(v) => updateLine(row.key, { unitCost: v ?? 0 })}
        />
      ),
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      width: 100,
      render: (_, row) => (
        <InputNumber
          min={0.001}
          style={{ width: '100%' }}
          value={row.quantity}
          onChange={(v) => updateLine(row.key, { quantity: v ?? 0 })}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, row) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeLine(row.key)} />
      ),
    },
  ];

  const savedLineColumns: ColumnsType<SavedImportLine> = [
    {
      title: 'Tên SP',
      key: 'productName',
      render: (_, row) => renderProductCell(row.productCode, row.productName),
    },
    { title: 'Số lô', dataIndex: 'batchNumber', width: 120 },
    {
      title: 'HSD',
      dataIndex: 'expiryDate',
      width: 110,
      render: (v?: string) => formatDisplayDate(v),
    },
    {
      title: 'ĐVT',
      dataIndex: 'saleUnitName',
      width: 64,
      render: (v?: string) => v ?? '—',
    },
    {
      title: 'Giá vốn',
      dataIndex: 'unitCost',
      width: 110,
      align: 'right',
      render: (v: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDisplayMoney(v)}</span>
      ),
    },
    {
      title: 'SL nhập',
      dataIndex: 'quantity',
      width: 90,
      align: 'right',
      render: (v: number) => v.toLocaleString('vi-VN'),
    },
  ];

  const openingBatchColumns: ColumnsType<OpeningBalanceBatch> = [
    {
      title: 'Tên SP',
      key: 'productName',
      render: (_, row) => renderProductCell(row.productCode, row.productName),
    },
    { title: 'Số lô', dataIndex: 'batchNumber', width: 120 },
    {
      title: 'HSD',
      dataIndex: 'expiryDate',
      width: 110,
      render: (v?: string) => (v ? formatDisplayDate(v) : '—'),
    },
    {
      title: 'ĐVT',
      dataIndex: 'saleUnitName',
      width: 64,
      render: (v?: string) => v ?? '—',
    },
    {
      title: 'Giá vốn',
      dataIndex: 'unitCost',
      width: 110,
      align: 'right',
      render: (v: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDisplayMoney(v)}</span>
      ),
    },
    {
      title: 'SL nhập',
      dataIndex: 'openingQuantity',
      width: 90,
      align: 'right',
      render: (v: number) => v.toLocaleString('vi-VN'),
    },
    {
      title: 'Tồn',
      dataIndex: 'quantityAvailable',
      width: 80,
      align: 'right',
      render: (v: number) => v.toLocaleString('vi-VN'),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 100,
      render: (_, row) =>
        row.canVoid ? (
          <Tag color="green" style={{ margin: 0, fontSize: 12 }}>
            Chưa phát sinh
          </Tag>
        ) : (
          <Tooltip title={row.voidBlockReason ?? 'Đã phát sinh giao dịch'}>
            <Tag color="orange" style={{ margin: 0, fontSize: 12 }}>
              Đã phát sinh
            </Tag>
          </Tooltip>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 44,
      align: 'center',
      render: (_, row) =>
        row.canVoid ? (
          <Popconfirm
            title="Xóa lô tồn đầu kỳ?"
            description={`${row.productCode} / ${row.batchNumber} · ${row.quantityAvailable.toLocaleString('vi-VN')} đơn vị tại ${row.warehouseName}`}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleVoid(row)}
          >
            <Button
              type="text"
              size="small"
              danger
              loading={voidingId === row.batchId}
              icon={<DeleteOutlined />}
              aria-label="Xóa lô"
            />
          </Popconfirm>
        ) : (
          <Tooltip title={row.voidBlockReason ?? 'Không thể xóa — dùng Kiểm kê để điều chỉnh'}>
            <Button type="text" size="small" disabled icon={<DeleteOutlined />} aria-label="Không thể xóa" />
          </Tooltip>
        ),
    },
  ];

  const stockColumns: ColumnsType<StockBatch> = [
    {
      title: 'Tên SP',
      key: 'productName',
      render: (_, row) => renderProductCell(row.productCode, row.productName),
    },
    { title: 'Số lô', dataIndex: 'batchNumber', width: 120 },
    {
      title: 'HSD',
      dataIndex: 'expiryDate',
      width: 110,
      render: (v?: string) => (v ? formatDisplayDate(v) : '—'),
    },
    {
      title: 'ĐVT',
      dataIndex: 'saleUnitName',
      width: 64,
      render: (v?: string) => v ?? '—',
    },
    {
      title: 'Giá vốn',
      dataIndex: 'unitCost',
      width: 110,
      align: 'right',
      render: (v: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDisplayMoney(v)}</span>
      ),
    },
    {
      title: 'Tồn',
      dataIndex: 'quantityAvailable',
      width: 90,
      align: 'right',
      render: (v: number) => v.toLocaleString('vi-VN'),
    },
  ];

  const latestImport = recentImports.find((item) => item.id === lastSavedId) ?? recentImports[0];

  const listSearchSuggestions = useMemo(() => {
    const q = listSearchInput.trim().toLowerCase();
    return products
      .filter((p) => {
        if (!q) return true;
        return (
          p.productCode.toLowerCase().includes(q) ||
          p.productName.toLowerCase().includes(q) ||
          (p.primaryBarcode?.toLowerCase().includes(q) ?? false)
        );
      })
      .slice(0, 15)
      .map((p) => ({
        value: p.productCode,
        label: `${p.productCode} — ${p.productName}`,
      }));
  }, [products, listSearchInput]);

  const applyListSearch = (value?: string) => {
    const text = (value ?? listSearchInput).trim();
    setListSearchInput(text);
    setListSearch(text);
    setOpeningPage(1);
  };

  const handleExcelFile = async (file: File) => {
    try {
      const rows = await parseSpreadsheetFile(file);
      const mapped = mapOpeningBalanceRows(rows);
      if (mapped.length === 0) {
        message.warning('Không có dòng hợp lệ trong file.');
        return;
      }
      setExcelPreview(mapped);
      setExcelFileName(file.name);
      setExcelImportError(null);
      setExcelImportResult(null);
      message.success(`Đã đọc ${mapped.length} dòng từ «${file.name}»`);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không đọc được file'));
    }
  };

  const runExcelImport = async () => {
    if (!warehouseId) {
      message.warning('Chọn kho trước khi import.');
      return;
    }
    if (excelPreview.length === 0) return;

    setExcelImporting(true);
    setExcelImportBatch(null);
    setExcelImportError(null);
    setExcelImportResult(null);
    try {
      const result = await importOpeningBalanceBatched(
        warehouseId,
        notes,
        excelPreview,
        (current, total) => setExcelImportBatch({ current, total }),
      );
      setExcelImportResult(result);
      message.success(`Import xong: ${result.linesProcessed} lô, ${result.errors.length} lỗi`);
      if (result.errors.length > 0) {
        message.warning(result.errors.slice(0, 3).map((e) => `Dòng ${e.rowNumber}: ${e.message}`).join(' · '));
      }
      setExcelPreview([]);
      setExcelFileName(undefined);
      await loadOpeningBatches();
    } catch (error) {
      const text = apiErrorMessage(error, 'Import thất bại');
      setExcelImportError(text);
      message.error(text);
    } finally {
      setExcelImporting(false);
      setExcelImportBatch(null);
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card
        size="small"
        title="Import Excel tồn đầu kỳ"
        extra={
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => downloadCsvTemplate('mau-ton-dau-ky.csv', OPENING_BALANCE_TEMPLATE_HEADERS)}
          >
            Tải mẫu
          </Button>
        }
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            Import file <code>ton-dau-CN1.csv</code> / <code>ton-dau-CN2.csv</code>. Cần import danh mục SP trước.
          </Typography.Text>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', maxWidth: 720 }}>
            <div style={{ flex: '0 0 260px' }}>
              <Typography.Text type="secondary">
                Kho nhập <Typography.Text type="danger">*</Typography.Text>
              </Typography.Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                value={warehouseId}
                onChange={setWarehouseId}
                placeholder="Chọn kho chi nhánh"
                options={warehouses.map((w) => ({ value: w.id, label: w.warehouseName }))}
              />
            </div>
          </div>
          <Space wrap>
            <Upload
              accept=".xlsx,.xls,.csv"
              showUploadList={false}
              disabled={excelImporting}
              customRequest={(options: UploadRequestOption) => {
                const file = options.file as File;
                void handleExcelFile(file).then(() => options.onSuccess?.({}, file));
              }}
            >
              <Button icon={<UploadOutlined />}>Chọn file Excel/CSV</Button>
            </Upload>
            <Button
              type="primary"
              icon={<InboxOutlined />}
              disabled={!warehouseId || excelPreview.length === 0}
              loading={excelImporting}
              onClick={() => void runExcelImport()}
            >
              Import {excelPreview.length > 0 ? `(${excelPreview.length} dòng)` : ''}
            </Button>
          </Space>
          {excelFileName && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              File: {excelFileName}
              {excelPreview.length > 0 ? ` · ${excelPreview.length} dòng sẵn sàng import` : ''}
            </Typography.Text>
          )}
          {!warehouseId && excelPreview.length > 0 && (
            <Alert type="warning" showIcon message="Chọn kho nhập trước khi bấm Import." />
          )}
          {excelImporting && !excelImportBatch && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Đang gửi {excelPreview.length} dòng lên server…
            </Typography.Text>
          )}
          {excelImportBatch && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Đang import lô {excelImportBatch.current}/{excelImportBatch.total}…
            </Typography.Text>
          )}
          {excelImportError && <Alert type="error" showIcon message={excelImportError} />}
          {excelImportResult && (
            <Alert
              type={excelImportResult.errors.length > 0 ? 'warning' : 'success'}
              showIcon
              message={`Đã nhập: ${excelImportResult.linesProcessed} lô · Lỗi: ${excelImportResult.errors.length}`}
              description={
                excelImportResult.errors.length > 0
                  ? excelImportResult.errors
                      .slice(0, 5)
                      .map((e) => `Dòng ${e.rowNumber}: ${e.message}`)
                      .join(' · ')
                  : undefined
              }
            />
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Cột: product_key (mã SP/barcode), batch_number, quantity, unit_cost, expiry_date
          </Typography.Text>
        </Space>
      </Card>

      <Card title="Nhập tồn đầu kỳ">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16, maxWidth: 960 }}>
          <div style={{ flex: '0 0 260px' }}>
            <Typography.Text type="secondary">
              Kho nhập <Typography.Text type="danger">*</Typography.Text>
            </Typography.Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              value={warehouseId}
              onChange={setWarehouseId}
              options={warehouses.map((w) => ({ value: w.id, label: w.warehouseName }))}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Typography.Text type="secondary">Ghi chú</Typography.Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="VD: Go-live chi nhánh mới..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              allowClear
            />
          </div>
        </div>

        <Table
          rowKey="key"
          className="grn-lines-table"
          columns={columns}
          dataSource={lines}
          pagination={false}
          scroll={{ x: 900 }}
          style={{ marginBottom: 16 }}
        />

        <Space>
          <Button icon={<PlusOutlined />} onClick={addLine}>
            Thêm dòng
          </Button>
          <Button type="primary" loading={saving} onClick={handleSubmit}>
            Lưu nhập tồn
          </Button>
        </Space>
      </Card>

      {latestImport && (
        <Card title="Kết quả lần nhập vừa lưu">
          <Alert
            type="success"
            showIcon
            message={`Đã lưu ${latestImport.lines.length} dòng vào kho «${latestImport.warehouseName}»`}
            description={
              <>
                Thời gian: {new Date(latestImport.savedAt).toLocaleString('vi-VN')}
                {latestImport.notes ? ` · Ghi chú: ${latestImport.notes}` : ''}
                {' · '}
                <Typography.Text type="success">Các lô vừa nhập: Chưa phát sinh — có thể xóa nếu nhập nhầm.</Typography.Text>
              </>
            }
            style={{ marginBottom: 16 }}
          />
          <Table
            rowKey={(row) => `${row.productCode}-${row.batchNumber}`}
            size="small"
            pagination={false}
            columns={savedLineColumns}
            dataSource={latestImport.lines}
          />
        </Card>
      )}

      <Card
        title={`Danh sách tồn đầu kỳ${selectedWarehouse ? `: ${selectedWarehouse.warehouseName}` : ''}`}
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Lọc sản phẩm"
            style={{ width: 240 }}
            value={productFilterId}
            onChange={(value) => {
              setProductFilterId(value);
              setOpeningPage(1);
            }}
            options={products.map((p) => ({
              value: p.id,
              label: `${p.productCode} — ${p.productName}`,
            }))}
          />
          <Select
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setOpeningPage(1);
            }}
            options={[
              { value: 'all', label: 'Mọi trạng thái' },
              { value: 'voidable', label: 'Chưa phát sinh' },
              { value: 'locked', label: 'Đã phát sinh' },
            ]}
          />
          <Space.Compact>
            <AutoComplete
              style={{ width: 260 }}
              options={listSearchSuggestions}
              value={listSearchInput}
              onSelect={(value) => applyListSearch(String(value))}
              onChange={(value) => {
                setListSearchInput(value);
                if (!value) setListSearch('');
              }}
            >
              <Input
                placeholder="Tìm SP / mã / số lô"
                prefix={<SearchOutlined />}
                allowClear
                onPressEnter={() => applyListSearch()}
              />
            </AutoComplete>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => applyListSearch()}>
              Lọc
            </Button>
          </Space.Compact>
          <Button
            type="primary"
            ghost
            icon={<ReloadOutlined />}
            onClick={() => void loadOpeningBatches()}
            loading={openingLoading}
          >
            Tải lại
          </Button>
        </Space>
        {openingSummaryTotal === 0 && !openingLoading && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Chưa có lô nhập từ màn này"
            description={
              <>
                Bảng dưới chỉ liệt kê hàng bạn <strong>Lưu nhập tồn</strong> tại đây (INV-008).
                Tồn demo từ seed (Paracetamol, …) <strong>không</strong> hiện ở đây — xem tab{' '}
                <Link to="/inventory/stock">Tồn kho</Link> hoặc bảng &quot;Tồn thực tế tại kho&quot; bên dưới.
                Sau khi bấm <strong>Lưu nhập tồn</strong>, lô mới sẽ xuất hiện trong bảng này.
              </>
            }
          />
        )}
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Chỉ hiển thị lô nhập từ <strong>Tồn đầu kỳ</strong> còn tồn &gt; 0.
          {openingSummaryTotal > 0 && (
            <>
              {' '}
              {openingSummaryVoidable} lô <Tag color="green">Chưa phát sinh</Tag> (có thể xóa) ·{' '}
              {openingSummaryTotal - openingSummaryVoidable} lô <Tag color="orange">Đã phát sinh</Tag>
            </>
          )}
        </Typography.Paragraph>
        <Table
          rowKey="batchId"
          size="small"
          loading={openingLoading}
          columns={openingBatchColumns}
          dataSource={openingBatches}
          pagination={{
            current: openingPage,
            pageSize: openingPageSize,
            total: openingTotal,
            showSizeChanger: true,
            pageSizeOptions: [25, 50, 100],
            showTotal: (total) => `${total.toLocaleString('vi-VN')} lô`,
            onChange: (page, pageSize) => {
              setOpeningPage(page);
              setOpeningPageSize(pageSize);
            },
          }}
          locale={{
            emptyText: warehouseId
              ? listSearch || statusFilter !== 'all' || productFilterId
                ? 'Không có lô khớp bộ lọc'
                : 'Chưa có lô tồn đầu kỳ — hãy nhập và bấm Lưu nhập tồn'
              : 'Chọn kho để xem danh sách',
          }}
        />
      </Card>

      <Card
        title={`Tồn thực tế tại kho${selectedWarehouse ? `: ${selectedWarehouse.warehouseName}` : ''}`}
        extra={
          <Space>
            <Link to="/inventory/stock">Mở tab Tồn kho</Link>
            <Button
              type="primary"
              ghost
              icon={<ReloadOutlined />}
              onClick={() => void loadStock()}
              loading={stockLoading}
            >
              Tải lại
            </Button>
          </Space>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Mọi lô còn tồn tại kho (gồm cả tồn demo seed và tồn vừa nhập đầu kỳ). Cùng thứ tự HSD → tên SP →
          số lô và cùng trang với bảng trên để đối chiếu.
        </Typography.Paragraph>
        <Table
          rowKey="id"
          size="small"
          loading={stockLoading}
          columns={stockColumns}
          dataSource={stockBatches}
          pagination={{
            current: openingPage,
            pageSize: openingPageSize,
            total: stockTotal,
            showSizeChanger: true,
            pageSizeOptions: [25, 50, 100],
            showTotal: (total) => `${total.toLocaleString('vi-VN')} lô`,
            onChange: (page, pageSize) => {
              setOpeningPage(page);
              setOpeningPageSize(pageSize);
            },
          }}
          locale={{
            emptyText: warehouseId
              ? 'Kho này chưa có tồn — kiểm tra API đã chạy và đã chạy migration/seed'
              : 'Chọn kho',
          }}
        />
      </Card>
    </Space>
  );
}
