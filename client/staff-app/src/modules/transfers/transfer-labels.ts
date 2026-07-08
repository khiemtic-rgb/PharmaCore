export const TRANSFER_STATUS_LABEL: Record<number, string> = {
  1: 'Chờ hoàn tất',
  2: 'Đang chuyển',
  3: 'Hoàn tất',
  4: 'Đã hủy',
};

export function transferStatusLabel(status: number): string {
  return TRANSFER_STATUS_LABEL[status] ?? `Trạng thái ${status}`;
}

export function transferStatusColor(status: number): string {
  if (status === 3) return 'green';
  if (status === 4) return 'default';
  if (status === 2) return 'processing';
  return 'gold';
}

export function canCompleteTransfer(status: number): boolean {
  return status !== 3 && status !== 4;
}

export function canCancelTransfer(status: number): boolean {
  return status !== 3 && status !== 4;
}
