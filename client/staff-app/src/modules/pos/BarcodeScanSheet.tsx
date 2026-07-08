import { useEffect, useRef, useState } from 'react';
import { Button, Drawer, Typography } from 'antd';
import { Html5Qrcode } from 'html5-qrcode';

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
};

const SCANNER_ID = 'staff-pos-barcode-scanner';

export function BarcodeScanSheet({ open, onClose, onScan }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);

    void (async () => {
      try {
        const scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 120 }, aspectRatio: 1.5 },
          (decoded) => {
            const value = decoded.trim();
            if (!value) return;
            void scanner.stop().finally(() => {
              scannerRef.current = null;
              onScan(value);
              onClose();
            });
          },
          () => undefined,
        );
        if (cancelled) {
          await scanner.stop().catch(() => undefined);
          scannerRef.current = null;
        }
      } catch {
        if (!cancelled) setError('Không mở được camera. Gõ mã barcode thủ công.');
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) void scanner.stop().catch(() => undefined);
    };
  }, [open, onClose, onScan]);

  return (
    <Drawer
      title="Quét mã vạch"
      placement="bottom"
      open={open}
      onClose={onClose}
      height="72%"
      destroyOnClose
    >
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
        Hướng camera vào mã SP hoặc nhãn lô. Tự thêm vào giỏ hoặc gán lô.
      </Typography.Text>
      <div id={SCANNER_ID} className="barcode-scanner-view" />
      {error ? (
        <Typography.Text type="danger" style={{ display: 'block', marginTop: 12 }}>
          {error}
        </Typography.Text>
      ) : null}
      <Button block style={{ marginTop: 16 }} onClick={onClose}>
        Đóng
      </Button>
    </Drawer>
  );
}
