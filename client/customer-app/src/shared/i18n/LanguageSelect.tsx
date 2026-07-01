import { GlobalOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { useTranslation } from 'react-i18next';

type LanguageSelectProps = {
  value: string;
  options: readonly string[];
  loading?: boolean;
  disabled?: boolean;
  onChange: (locale: string) => void;
};

function localeLabel(t: (key: string) => string, code: string) {
  const key = `locale.${code}`;
  const label = t(key);
  return label === key ? code : label;
}

/** Dropdown ngôn ngữ — options từ branding/API, dễ thêm locale mới. */
export function LanguageSelect({
  value,
  options,
  loading,
  disabled,
  onChange,
}: LanguageSelectProps) {
  const { t } = useTranslation();

  const selectOptions = options.map((code) => ({
    value: code,
    label: localeLabel(t, code),
  }));

  return (
    <Select
      value={value}
      loading={loading}
      disabled={disabled}
      size="large"
      style={{ width: '100%' }}
      suffixIcon={<GlobalOutlined />}
      optionLabelProp="label"
      popupMatchSelectWidth
      listHeight={320}
      getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
      options={selectOptions}
      onChange={onChange}
    />
  );
}
