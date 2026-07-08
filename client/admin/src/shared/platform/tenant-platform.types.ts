export interface TenantPlatformSettings {
  schemaVersion: number;
  vertical: string;
  enabledModules: string[];
  i18n: {
    defaultLocale: string;
    supportedLocales: string[];
    fallbackLocale: string;
    adminDefaultLocale: string;
    customerAppDefaultLocale: string;
  };
  features: Record<string, boolean>;
  labels: Record<string, string>;
}

export function normalizeTenantPlatformSettings(raw: Record<string, unknown>): TenantPlatformSettings {
  const i18nRaw = (raw.i18n ?? raw.I18n ?? {}) as Record<string, unknown>;
  const featuresRaw = (raw.features ?? raw.Features ?? {}) as Record<string, unknown>;
  const labelsRaw = (raw.labels ?? raw.Labels ?? {}) as Record<string, unknown>;
  const modulesRaw = raw.enabledModules ?? raw.EnabledModules;

  const enabledModules = Array.isArray(modulesRaw)
    ? modulesRaw.map((m) => String(m).trim()).filter(Boolean)
    : [];

  const features: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(featuresRaw)) {
    if (typeof value === 'boolean') features[key] = value;
  }

  const labels: Record<string, string> = {};
  for (const [key, value] of Object.entries(labelsRaw)) {
    if (typeof value === 'string') labels[key] = value;
  }

  const supportedRaw = i18nRaw.supportedLocales ?? i18nRaw.SupportedLocales;
  const supportedLocales = Array.isArray(supportedRaw)
    ? supportedRaw.map((entry) => String(entry))
    : ['vi-VN'];

  return {
    schemaVersion: Number(raw.schemaVersion ?? raw.SchemaVersion ?? 1),
    vertical: String(raw.vertical ?? raw.Vertical ?? 'pharmacy'),
    enabledModules,
    i18n: {
      defaultLocale: String(i18nRaw.defaultLocale ?? i18nRaw.DefaultLocale ?? 'vi-VN'),
      supportedLocales,
      fallbackLocale: String(i18nRaw.fallbackLocale ?? i18nRaw.FallbackLocale ?? 'vi-VN'),
      adminDefaultLocale: String(i18nRaw.adminDefaultLocale ?? i18nRaw.AdminDefaultLocale ?? 'vi-VN'),
      customerAppDefaultLocale: String(
        i18nRaw.customerAppDefaultLocale ?? i18nRaw.CustomerAppDefaultLocale ?? 'vi-VN',
      ),
    },
    features,
    labels,
  };
}
