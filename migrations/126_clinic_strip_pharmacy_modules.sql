-- KitPlatform 126: Clinic tenants must not enable pharmacy-only modules (e.g. sales).
-- DEMO_CLINIC historically got "sales" from 112 — that surfaces POS/Bán hàng in admin
-- when the SPA lacks vertical sidebar filtering.

UPDATE public.tenants t
SET
    settings = jsonb_set(
        COALESCE(t.settings, '{}'::jsonb),
        '{platform,enabled_modules}',
        COALESCE(
            (
                SELECT jsonb_agg(to_jsonb(m) ORDER BY m)
                FROM jsonb_array_elements_text(
                    COALESCE(t.settings->'platform'->'enabled_modules', '[]'::jsonb)
                ) AS m
                WHERE lower(m) NOT IN (
                    'sales',
                    'inventory',
                    'procurement',
                    'catalog',
                    'reports',
                    'debt',
                    'rx'
                )
            ),
            '[]'::jsonb
        ),
        true
    ),
    updated_at = NOW()
WHERE t.deleted_at IS NULL
  AND (
      lower(COALESCE(t.settings->'platform'->>'vertical', '')) = 'clinic'
      OR t.tenant_code = 'DEMO_CLINIC'
      OR EXISTS (
          SELECT 1
          FROM pack_connect.org_profiles p
          WHERE p.tenant_id = t.id
            AND lower(p.org_kind) = 'clinic'
      )
  );
