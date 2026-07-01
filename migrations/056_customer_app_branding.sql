-- Backfill customer app branding for demo tenant

UPDATE tenants
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{customer_app}',
    COALESCE(settings->'customer_app', '{}'::jsonb) || jsonb_build_object(
        'branding',
        jsonb_build_object(
            'app_name', 'PharmaCare Demo',
            'short_name', 'PharmaCare',
            'logo_url', '/customer-app/icon.svg',
            'primary_color', '#0F52BA',
            'secondary_color', '#3CB371',
            'support_phone', '0909123456',
            'tagline', 'Your digital health wallet'
        ),
        'features',
        jsonb_build_object(
            'health_wallet', true,
            'repurchase', true
        )
    ),
    true
)
WHERE tenant_code = 'DEMO_PHARMACY'
  AND deleted_at IS NULL;
