-- KitPlatform 127: Core entitlement ceiling — settings.platform.allowed_modules
-- Tenant ADMIN may only enable modules within this set (Core assigns via /api/platform).

UPDATE public.tenants t
SET
    settings = jsonb_set(
        COALESCE(t.settings, '{}'::jsonb),
        '{platform,allowed_modules}',
        COALESCE(
            t.settings->'platform'->'enabled_modules',
            '[]'::jsonb
        ),
        true
    ),
    updated_at = NOW()
WHERE t.deleted_at IS NULL
  AND t.settings ? 'platform'
  AND (
      t.settings->'platform'->'allowed_modules' IS NULL
      OR jsonb_typeof(t.settings->'platform'->'allowed_modules') <> 'array'
  );
