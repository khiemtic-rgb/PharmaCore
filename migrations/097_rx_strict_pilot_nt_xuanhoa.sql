-- Pilot NT_XUANHOA: bật strict Rx POS sau khi schema sẵn sàng
UPDATE public.tenants
SET settings = jsonb_set(
    jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{rx}',
        COALESCE(settings->'rx', '{}'::jsonb),
        true
    ),
    '{rx,enforcement_mode}',
    '"strict"'::jsonb,
    true
),
updated_at = NOW()
WHERE tenant_code = 'NT_XUANHOA';

UPDATE public.tenants
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{rx,prescription_validity_days}',
    '7'::jsonb,
    true
),
updated_at = NOW()
WHERE tenant_code = 'NT_XUANHOA';

UPDATE public.tenants
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{rx,pos_blocked_audit}',
    'true'::jsonb,
    true
),
updated_at = NOW()
WHERE tenant_code = 'NT_XUANHOA';
