import { useMemo } from 'react';
import { useAuthStore } from '@/shared/auth/auth.store';

export function useHasPermission(permission: string): boolean {
  const user = useAuthStore((s) => s.user);
  return useMemo(() => {
    if (!user) return false;
    if (user.roles?.includes('ADMIN')) return true;
    return user.permissions?.includes(permission) ?? false;
  }, [user, permission]);
}

export function useHasAnyPermission(...permissions: string[]): boolean {
  const user = useAuthStore((s) => s.user);
  return useMemo(() => {
    if (!user) return false;
    if (user.roles?.includes('ADMIN')) return true;
    return permissions.some((p) => user.permissions?.includes(p));
  }, [user, permissions]);
}

export function useCanSalesRead(): boolean {
  return useHasAnyPermission('sales.read', 'sales.write');
}

export function useCanSalesWrite(): boolean {
  return useHasPermission('sales.write');
}

export function useCanInventoryRead(): boolean {
  return useHasAnyPermission('inventory.read', 'inventory.write');
}

export function useCanInventoryWrite(): boolean {
  return useHasPermission('inventory.write');
}

export function useCanProcurementRead(): boolean {
  return useHasAnyPermission('procurement.read', 'procurement.write');
}

export function useCanProcurementWrite(): boolean {
  return useHasPermission('procurement.write');
}
