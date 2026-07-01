import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Badge } from 'antd';
import { secondaryTabLabel } from '@/shared/components/module-tabs.ui';
import type { ProductNavTab } from '@/shared/product/product-phases';

export type ModuleSubnavTab = {
  key: string;
  label: ReactNode;
};

type ModuleSubnavState = {
  tabs: ModuleSubnavTab[];
  activeKey: string;
  onChange: (key: string) => void;
};

type ModuleSubnavContextValue = {
  subnav: ModuleSubnavState | null;
  setSubnav: (subnav: ModuleSubnavState | null) => void;
};

const ModuleSubnavContext = createContext<ModuleSubnavContextValue | null>(null);

export function ModuleSubnavProvider({ children }: { children: ReactNode }) {
  const [subnav, setSubnavState] = useState<ModuleSubnavState | null>(null);
  const setSubnav = useCallback((next: ModuleSubnavState | null) => {
    setSubnavState(next);
  }, []);

  const value = useMemo(() => ({ subnav, setSubnav }), [subnav, setSubnav]);

  return <ModuleSubnavContext.Provider value={value}>{children}</ModuleSubnavContext.Provider>;
}

export function useModuleSubnavState() {
  const ctx = useContext(ModuleSubnavContext);
  if (!ctx) {
    throw new Error('useModuleSubnavState must be used within ModuleSubnavProvider');
  }
  return ctx.subnav;
}

function useModuleSubnavContext() {
  const ctx = useContext(ModuleSubnavContext);
  if (!ctx) {
    throw new Error('useModuleSubnavContext must be used within ModuleSubnavProvider');
  }
  return ctx;
}

export function useRegisterModuleSubnav(
  tabs: ModuleSubnavTab[] | null,
  activeKey: string,
  onChange: (key: string) => void,
) {
  const { setSubnav } = useModuleSubnavContext();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const stableOnChange = useCallback((key: string) => {
    onChangeRef.current(key);
  }, []);

  useEffect(() => {
    if (!tabs?.length) {
      setSubnav(null);
      return;
    }
    setSubnav({ tabs, activeKey, onChange: stableOnChange });
    return () => setSubnav(null);
  }, [tabs, activeKey, stableOnChange, setSubnav]);
}

export function useRegisterProductNavSubnav(
  tabs: ProductNavTab[] | null,
  activeKey: string,
  onNavigate: (tab: ProductNavTab) => void,
  badges?: Partial<Record<string, number>>,
) {
  const subnavTabs = useMemo(() => {
    if (!tabs) return null;
    return tabs.map((tab) => {
      const label = secondaryTabLabel(tab.label, tab.icon!);
      const count = badges?.[tab.key];
      return {
        key: tab.key,
        label:
          count && count > 0 ? (
            <Badge count={count} size="small" offset={[6, 0]}>
              {label}
            </Badge>
          ) : (
            label
          ),
      };
    });
  }, [tabs, badges]);

  const onChange = useCallback(
    (key: string) => {
      const tab = tabs?.find((item) => item.key === key);
      if (tab) onNavigate(tab);
    },
    [tabs, onNavigate],
  );

  useRegisterModuleSubnav(subnavTabs, activeKey, onChange);
}

export function useRegisterSimpleModuleSubnav(
  tabs: Array<{ key: string; label: string; path: string; icon: ReactNode }> | null,
  activeKey: string,
  navigate: (path: string) => void,
) {
  const subnavTabs = useMemo(() => {
    if (!tabs) return null;
    return tabs.map((tab) => ({
      key: tab.key,
      label: secondaryTabLabel(tab.label, tab.icon),
    }));
  }, [tabs]);

  const onChange = useCallback(
    (key: string) => {
      const tab = tabs?.find((item) => item.key === key);
      if (tab) navigate(tab.path);
    },
    [tabs, navigate],
  );

  useRegisterModuleSubnav(subnavTabs, activeKey, onChange);
}
