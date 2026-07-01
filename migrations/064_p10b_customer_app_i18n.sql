-- P10b: enable English locale + customer app label seeds

UPDATE platform_locales
SET status = 1
WHERE locale_code = 'en-US';

UPDATE tenants
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{platform,i18n,supported_locales}',
    '["vi-VN","en-US"]'::jsonb,
    true
)
WHERE tenant_code = 'DEMO_PHARMACY'
  AND deleted_at IS NULL;

INSERT INTO tenant_string_translations (tenant_id, translation_key, locale_code, translated_value)
SELECT
    t.id,
    v.key,
    'en-US',
    v.value
FROM tenants t
CROSS JOIN (
    VALUES
        ('customer.health_wallet_title', 'Health wallet'),
        ('customer.medication_reminders_title', 'Medication reminders'),
        ('customer.repurchase_section_title', 'Refill reminders'),
        ('customer.app.nav.home', 'Home'),
        ('customer.app.nav.orders', 'Orders'),
        ('customer.app.nav.reminders', 'Reminders'),
        ('customer.app.nav.chat', 'Chat'),
        ('customer.app.nav.account', 'Account')
) AS v(key, value)
WHERE t.tenant_code = 'DEMO_PHARMACY'
ON CONFLICT (tenant_id, translation_key, locale_code)
DO UPDATE SET translated_value = EXCLUDED.translated_value, updated_at = NOW();
