import type { CSSProperties, ReactNode } from 'react';
import { Space } from 'antd';

export const MODULE_PRIMARY_BG = '#f0f2f5';
export const MODULE_TAB_BORDER = '#e8e8e8';

export const primaryTabsBarStyle: CSSProperties = {
  background: MODULE_PRIMARY_BG,
  padding: '0 12px',
};

export const secondaryTabsBarStyle: CSSProperties = {
  background: '#fff',
  padding: '0 8px',
  borderTop: `1px solid ${MODULE_TAB_BORDER}`,
};

export const moduleTabsShellStyle: CSSProperties = {
  marginBottom: 16,
  border: `1px solid ${MODULE_TAB_BORDER}`,
  borderRadius: 8,
  overflow: 'hidden',
};

export function primaryTabLabel(text: string, icon?: ReactNode) {
  if (!icon) {
    return <span style={{ fontWeight: 600 }}>{text}</span>;
  }
  return (
    <Space size={6}>
      {icon}
      <span style={{ fontWeight: 600 }}>{text}</span>
    </Space>
  );
}

export function secondaryTabLabel(text: string, icon: ReactNode) {
  return (
    <Space size={6}>
      {icon}
      <span>{text}</span>
    </Space>
  );
}
