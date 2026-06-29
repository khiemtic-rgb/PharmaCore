import type { ReactNode } from 'react';
import { AutoComplete, Button, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { filterBarStyle } from '@/modules/sales/sales-ui-styles';
import type { SearchSuggestion } from '@/modules/sales/sales-list-customer-search';

export type SalesListSearchApplyValues = {
  customer: string;
  document: string;
};

export type SalesListDualSearchBarProps = {
  customerValue: string;
  documentValue: string;
  onCustomerChange: (value: string) => void;
  onDocumentChange: (value: string) => void;
  onApply: (values: SalesListSearchApplyValues) => void;
  onClear?: () => void;
  customerSuggestions?: SearchSuggestion[];
  documentSuggestions?: SearchSuggestion[];
  documentPlaceholder?: string;
  /** Lọc ngay khi gõ (danh sách client-side). */
  liveFilter?: boolean;
  showApplyButton?: boolean;
};

export function SalesListDualSearchBar({
  customerValue,
  documentValue,
  onCustomerChange,
  onDocumentChange,
  onApply,
  onClear,
  customerSuggestions = [],
  documentSuggestions = [],
  documentPlaceholder = 'Số đơn',
  liveFilter = false,
  showApplyButton = true,
}: SalesListDualSearchBarProps) {
  const currentValues = (): SalesListSearchApplyValues => ({
    customer: customerValue,
    document: documentValue,
  });

  const handleCustomerChange = (value: string) => {
    onCustomerChange(value);
    if (liveFilter) onApply({ customer: value, document: documentValue });
  };

  const handleDocumentChange = (value: string) => {
    onDocumentChange(value);
    if (liveFilter) onApply({ customer: customerValue, document: value });
  };

  return (
    <>
      <AutoComplete
        style={{ width: 240 }}
        options={customerSuggestions}
        value={customerValue}
        filterOption={false}
        onSelect={(value) => {
          const customer = String(value);
          onCustomerChange(customer);
          if (!liveFilter) onApply({ customer, document: documentValue });
        }}
        onChange={handleCustomerChange}
      >
        <Input allowClear placeholder="Tên khách hoặc SĐT" prefix={<SearchOutlined />} />
      </AutoComplete>
      <AutoComplete
        style={{ width: 180 }}
        options={documentSuggestions}
        value={documentValue}
        filterOption={false}
        onSelect={(value) => {
          const document = String(value);
          onDocumentChange(document);
          if (!liveFilter) onApply({ customer: customerValue, document });
        }}
        onChange={handleDocumentChange}
      >
        <Input
          allowClear
          placeholder={documentPlaceholder}
          onPressEnter={() => onApply(currentValues())}
        />
      </AutoComplete>
      {showApplyButton && !liveFilter ? (
        <Button type="primary" icon={<SearchOutlined />} onClick={() => onApply(currentValues())}>
          Lọc
        </Button>
      ) : null}
      {onClear && (customerValue || documentValue) ? (
        <Button onClick={onClear}>Xóa lọc</Button>
      ) : null}
    </>
  );
}

export function SalesListDualSearchWrap({ children }: { children: ReactNode }) {
  return <div style={filterBarStyle}>{children}</div>;
}