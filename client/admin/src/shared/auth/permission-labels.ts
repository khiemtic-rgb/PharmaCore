/** Nhãn module quyền — đồng bộ với menu sidebar (registry.tsx) */
const MODULE_LABELS: Record<string, string> = {
  catalog: 'Danh mục',
  Catalog: 'Danh mục',
  'Danh mục': 'Danh mục',
  inventory: 'Kho hàng',
  Inventory: 'Kho hàng',
  'Kho hàng': 'Kho hàng',
  procurement: 'Mua hàng',
  Procurement: 'Mua hàng',
  'Mua hàng': 'Mua hàng',
  sales: 'Bán hàng',
  Sales: 'Bán hàng',
  'Bán hàng': 'Bán hàng',
  customer: 'Khách hàng',
  Customer: 'Khách hàng',
  'Khách hàng': 'Khách hàng',
  system: 'Hệ thống',
  System: 'Hệ thống',
  'Hệ thống': 'Hệ thống',
};

/** Thứ tự nhóm quyền theo menu admin */
export const PERMISSION_MODULE_ORDER = [
  'Danh mục',
  'Kho hàng',
  'Mua hàng',
  'Bán hàng',
  'Khách hàng',
  'Hệ thống',
] as const;

/** Nhãn quyền chuẩn (fallback khi DB chưa migrate) */
const PERMISSION_LABELS: Record<string, string> = {
  'catalog.read': 'Xem danh mục',
  'catalog.write': 'Sửa danh mục',
  'inventory.read': 'Xem kho',
  'inventory.write': 'Sửa kho',
  'procurement.read': 'Xem mua hàng',
  'procurement.write': 'Mua hàng',
  'sales.read': 'Xem bán hàng',
  'sales.write': 'Bán hàng',
  'sales.discount': 'Chiết khấu bán hàng (tối đa 10%)',
  'sales.discount.unlimited': 'Chiết khấu không giới hạn',
  'system.read': 'Xem hệ thống',
  'system.write': 'Quản trị hệ thống',
  'system.delete_permanent': 'Xóa vĩnh viễn',
};

export function permissionModuleLabel(moduleName: string): string {
  return MODULE_LABELS[moduleName] ?? moduleName;
}

export function permissionLabel(permissionCode: string, permissionName?: string): string {
  return PERMISSION_LABELS[permissionCode] ?? permissionName ?? permissionCode;
}

export function comparePermissionModules(a: string, b: string): number {
  const ai = PERMISSION_MODULE_ORDER.indexOf(a as (typeof PERMISSION_MODULE_ORDER)[number]);
  const bi = PERMISSION_MODULE_ORDER.indexOf(b as (typeof PERMISSION_MODULE_ORDER)[number]);
  const aRank = ai === -1 ? PERMISSION_MODULE_ORDER.length : ai;
  const bRank = bi === -1 ? PERMISSION_MODULE_ORDER.length : bi;
  if (aRank !== bRank) return aRank - bRank;
  return a.localeCompare(b, 'vi');
}
