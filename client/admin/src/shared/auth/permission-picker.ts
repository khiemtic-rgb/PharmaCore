import {
  comparePermissionModules,
  permissionLabel,
  permissionModuleLabel,
} from '@/shared/auth/permission-labels';

export type PermissionUiItem = { code: string; label: string };

export type PermissionUiGroup = {
  moduleLabel: string;
  hint?: string;
  items: PermissionUiItem[];
  discountCodes?: string[];
};

const PERMISSION_UI_GROUPS: PermissionUiGroup[] = [
  {
    moduleLabel: 'Danh mục',
    hint: 'Chọn «Sửa danh mục» sẽ tự bật «Xem danh mục». Bỏ «Xem» sẽ bỏ luôn «Sửa».',
    items: [
      { code: 'catalog.read', label: permissionLabel('catalog.read') },
      { code: 'catalog.write', label: permissionLabel('catalog.write') },
    ],
  },
  {
    moduleLabel: 'Kho hàng',
    hint: 'Chọn «Sửa kho» sẽ tự bật «Xem kho». Bỏ «Xem» sẽ bỏ luôn «Sửa».',
    items: [
      { code: 'inventory.read', label: permissionLabel('inventory.read') },
      { code: 'inventory.write', label: permissionLabel('inventory.write') },
    ],
  },
  {
    moduleLabel: 'Mua hàng',
    hint: 'Chọn «Mua hàng» sẽ tự bật «Xem mua hàng». Bỏ «Xem» sẽ bỏ luôn «Mua hàng».',
    items: [
      { code: 'procurement.read', label: permissionLabel('procurement.read') },
      { code: 'procurement.write', label: permissionLabel('procurement.write') },
    ],
  },
  {
    moduleLabel: 'Bán hàng',
    hint: 'Có thể chọn nhiều quyền. «Bán hàng» đã bao gồm xem POS trên hệ thống.',
    items: [
      { code: 'sales.read', label: permissionLabel('sales.read') },
      { code: 'sales.write', label: permissionLabel('sales.write') },
    ],
    discountCodes: ['sales.discount', 'sales.discount.unlimited'],
  },
  {
    moduleLabel: 'Hệ thống',
    hint: 'Có thể chọn nhiều quyền độc lập.',
    items: [
      { code: 'system.read', label: permissionLabel('system.read') },
      { code: 'system.write', label: permissionLabel('system.write') },
      { code: 'system.delete_permanent', label: permissionLabel('system.delete_permanent') },
    ],
  },
];

const WRITE_IMPLIES_READ_PREFIXES = new Set(['catalog', 'inventory', 'procurement']);
const DISCOUNT_EXCLUSIVE = ['sales.discount', 'sales.discount.unlimited'] as const;

export type DiscountLevel = 'none' | 'sales.discount' | 'sales.discount.unlimited';

export function getDiscountLevel(codes: string[]): DiscountLevel {
  if (codes.includes('sales.discount.unlimited')) return 'sales.discount.unlimited';
  if (codes.includes('sales.discount')) return 'sales.discount';
  return 'none';
}

export function setDiscountLevel(codes: string[], level: DiscountLevel): string[] {
  const next = codes.filter((c) => !DISCOUNT_EXCLUSIVE.includes(c as (typeof DISCOUNT_EXCLUSIVE)[number]));
  if (level !== 'none') next.push(level);
  return [...new Set(next)];
}

/** Bật/tắt một quyền — áp dụng quy tắc loại trừ và phụ thuộc. */
export function applyPermissionToggle(codes: string[], code: string, checked: boolean): string[] {
  let next = checked ? [...codes, code] : codes.filter((c) => c !== code);
  next = [...new Set(next)];

  if (checked && DISCOUNT_EXCLUSIVE.includes(code as (typeof DISCOUNT_EXCLUSIVE)[number])) {
    next = next.filter(
      (c) => c === code || !DISCOUNT_EXCLUSIVE.includes(c as (typeof DISCOUNT_EXCLUSIVE)[number]),
    );
  }

  const [prefix, action] = code.split('.');
  if (WRITE_IMPLIES_READ_PREFIXES.has(prefix) && action === 'write' && checked) {
    next.push(`${prefix}.read`);
  }
  if (WRITE_IMPLIES_READ_PREFIXES.has(prefix) && action === 'read' && !checked) {
    next = next.filter((c) => c !== `${prefix}.write`);
  }

  return [...new Set(next)];
}

/** Ghi DB: quyền sửa danh mục/kho/mua hàng luôn kèm quyền xem. */
export function normalizePermissionCodesForSave(codes: string[]): string[] {
  const set = new Set(codes);
  for (const prefix of WRITE_IMPLIES_READ_PREFIXES) {
    if (set.has(`${prefix}.write`)) set.add(`${prefix}.read`);
  }
  return [...set];
}

export function discountLevelLabel(level: DiscountLevel): string {
  if (level === 'none') return 'Không chiết khấu';
  return permissionLabel(level);
}

export type PermissionLookupLike = {
  permissionCode: string;
  permissionName?: string;
  moduleName: string;
};

/** Gom quyền từ API theo module (fallback nếu có quyền mới chưa khai báo UI). */
export function groupPermissionsForUi(permissions: PermissionLookupLike[]): PermissionUiGroup[] {
  const known = new Set(
    PERMISSION_UI_GROUPS.flatMap((g) => [
      ...g.items.map((i) => i.code),
      ...(g.discountCodes ?? []),
    ]),
  );
  const extras = new Map<string, PermissionUiItem[]>();

  for (const p of permissions) {
    if (known.has(p.permissionCode)) continue;
    const moduleLabel = permissionModuleLabel(p.moduleName);
    const list = extras.get(moduleLabel) ?? [];
    list.push({
      code: p.permissionCode,
      label: permissionLabel(p.permissionCode, p.permissionName),
    });
    extras.set(moduleLabel, list);
  }

  const groups: PermissionUiGroup[] = PERMISSION_UI_GROUPS.map((group) => ({ ...group }));

  for (const [moduleLabel, items] of extras.entries()) {
    groups.push({ moduleLabel, items });
  }

  return groups.sort((a, b) => comparePermissionModules(a.moduleLabel, b.moduleLabel));
}
