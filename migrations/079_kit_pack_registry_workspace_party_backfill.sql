-- KitPlatform 079: P0.3 pack registry + P0.4 workspace provision + P0.6 party backfill
-- Depends on: 078_pack_clinic_crm.sql
-- Pilot-safe: additive only.

-- =============================================================================
-- P0.3: tenant_package — Clinic + CRM pack (align ClinicPackDefinition.PackCode)
-- =============================================================================

INSERT INTO kit_tenant.tenant_package (
    package_code, package_name, description, verticals, module_codes, sort_order
)
VALUES (
    'clinic_crm',
    'Clinic + CRM Pack (pilot)',
    'Phòng khám (appointments, EMR-lite) + CRM leads — Pack 2',
    ARRAY['clinic', 'hybrid'],
    ARRAY['inventory', 'sales', 'customer_app', 'clinic_appointments', 'clinic_emr_lite', 'crm_leads', 'reports'],
    20
)
ON CONFLICT (package_code) DO UPDATE SET
    package_name = EXCLUDED.package_name,
    description = EXCLUDED.description,
    verticals = EXCLUDED.verticals,
    module_codes = EXCLUDED.module_codes,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Ensure platform_module_registry matches pack module codes (idempotent)
INSERT INTO platform_module_registry (module_code, module_name, description, verticals, sort_order)
SELECT v.code, v.name, v.description, v.verticals, v.sort_order
FROM (
    VALUES
        ('clinic_appointments', 'Lịch hẹn phòng khám', 'ClinicOS — appointments & check-in', ARRAY['clinic','hybrid'], 101),
        ('clinic_emr_lite', 'Hồ sơ khám (EMR-lite)', 'ClinicOS — visit notes', ARRAY['clinic','hybrid'], 102),
        ('crm_leads', 'CRM — Lead pipeline', 'Pack CRM — lead & opportunity', ARRAY['pharmacy','pharmacy_chain','clinic','hybrid'], 55)
) AS v(code, name, description, verticals, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM platform_module_registry m WHERE m.module_code = v.code
);

-- =============================================================================
-- P0.4: Provision workspace + subscription when a pack is enabled for a tenant
-- =============================================================================

CREATE OR REPLACE FUNCTION kit_provision_pack_workspace(
    p_tenant_id   UUID,
    p_package_code VARCHAR(50)
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_package_id   UUID;
    v_workspace_id UUID;
    v_workspace_code VARCHAR(50);
BEGIN
    SELECT id INTO v_package_id
    FROM kit_tenant.tenant_package
    WHERE package_code = p_package_code AND deleted_at IS NULL AND status = 1
    LIMIT 1;

    IF v_package_id IS NULL THEN
        RAISE EXCEPTION 'tenant_package not found: %', p_package_code;
    END IF;

    v_workspace_code := CASE p_package_code
        WHEN 'novixa_pharmacy' THEN 'default'
        ELSE p_package_code
    END;

    SELECT id INTO v_workspace_id
    FROM kit_workspace.workspace_workspace
    WHERE tenant_id = p_tenant_id
      AND workspace_code = v_workspace_code
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_workspace_id IS NULL THEN
        INSERT INTO kit_workspace.workspace_workspace (
            tenant_id, workspace_code, workspace_name, workspace_type,
            package_code, is_default, settings
        )
        SELECT
            p_tenant_id,
            v_workspace_code,
            COALESCE(t.tenant_name, t.tenant_code) || ' — ' || tp.package_name,
            CASE WHEN p_package_code = 'novixa_pharmacy' THEN 'default' ELSE 'solution' END,
            p_package_code,
            (p_package_code = 'novixa_pharmacy'),
            jsonb_build_object('schema_version', 1, 'source', '079_provision', 'package_code', p_package_code)
        FROM public.tenants t
        CROSS JOIN kit_tenant.tenant_package tp
        WHERE t.id = p_tenant_id AND tp.id = v_package_id
        RETURNING id INTO v_workspace_id;
    END IF;

    -- workspace_setting: enabled_modules from tenant settings for this pack
    INSERT INTO kit_workspace.workspace_setting (
        tenant_id, workspace_id, setting_key, setting_value
    )
    SELECT
        p_tenant_id,
        v_workspace_id,
        'enabled_modules',
        COALESCE(t.settings->'platform'->'enabled_modules', '[]'::jsonb)
    FROM public.tenants t
    WHERE t.id = p_tenant_id
    ON CONFLICT (workspace_id, setting_key) DO NOTHING;

    -- tenant_subscription (pilot plan) if missing
    INSERT INTO kit_tenant.tenant_subscription (
        tenant_id, package_id, plan_code, billing_cycle, status
    )
    SELECT p_tenant_id, v_package_id, 'pilot', 'monthly', 1
    WHERE NOT EXISTS (
        SELECT 1 FROM kit_tenant.tenant_subscription ts
        WHERE ts.tenant_id = p_tenant_id
          AND ts.package_id = v_package_id
          AND ts.status = 1
    );

    -- workspace members: copy active users into new workspace
    INSERT INTO kit_workspace.workspace_member (tenant_id, workspace_id, member_type, user_id, role_code)
    SELECT p_tenant_id, v_workspace_id, 'user', u.id, 'member'
    FROM public.users u
    WHERE u.tenant_id = p_tenant_id AND u.deleted_at IS NULL AND u.status = 1
      AND NOT EXISTS (
          SELECT 1 FROM kit_workspace.workspace_member wm
          WHERE wm.workspace_id = v_workspace_id AND wm.user_id = u.id AND wm.deleted_at IS NULL
      );

    RETURN v_workspace_id;
END;
$$;

COMMENT ON FUNCTION kit_provision_pack_workspace IS
    'Creates workspace + subscription for a pack on a tenant (idempotent).';

-- Ensure default pharmacy workspace exists for all active tenants
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.tenants WHERE deleted_at IS NULL LOOP
        PERFORM kit_provision_pack_workspace(r.id, 'novixa_pharmacy');
    END LOOP;
END $$;

-- =============================================================================
-- P0.6: Backfill party_party for customers missing party_id (idempotent)
-- =============================================================================

INSERT INTO kit_common.party_party (
    tenant_id, party_type, party_code, display_name, legacy_entity_type, legacy_entity_id, metadata
)
SELECT
    c.tenant_id,
    'person',
    c.customer_code,
    c.full_name,
    'customer',
    c.id,
    jsonb_build_object('phone', c.phone, 'email', c.email, 'source', '079_backfill')
FROM public.customers c
WHERE c.deleted_at IS NULL
  AND c.party_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_common.party_party p
      WHERE p.tenant_id = c.tenant_id
        AND p.legacy_entity_type = 'customer'
        AND p.legacy_entity_id = c.id
        AND p.deleted_at IS NULL
  );

UPDATE public.customers c
SET party_id = p.id, updated_at = NOW()
FROM kit_common.party_party p
WHERE p.legacy_entity_type = 'customer'
  AND p.legacy_entity_id = c.id
  AND p.tenant_id = c.tenant_id
  AND c.party_id IS NULL
  AND c.deleted_at IS NULL;

INSERT INTO kit_common.party_identifier (tenant_id, party_id, identifier_type, identifier_value, is_primary)
SELECT DISTINCT ON (c.tenant_id, c.phone)
    c.tenant_id, c.party_id, 'phone', c.phone, TRUE
FROM public.customers c
WHERE c.party_id IS NOT NULL AND c.phone IS NOT NULL AND c.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_common.party_identifier pi
      WHERE pi.tenant_id = c.tenant_id
        AND pi.identifier_type = 'phone'
        AND pi.identifier_value = c.phone
        AND pi.deleted_at IS NULL AND pi.status = 1
  )
ORDER BY c.tenant_id, c.phone, c.created_at ASC;

INSERT INTO kit_common.party_identifier (tenant_id, party_id, identifier_type, identifier_value, is_primary)
SELECT DISTINCT ON (c.tenant_id, trim(c.email::text))
    c.tenant_id, c.party_id, 'email', trim(c.email::text), FALSE
FROM public.customers c
WHERE c.party_id IS NOT NULL AND c.email IS NOT NULL AND trim(c.email::text) <> '' AND c.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_common.party_identifier pi
      WHERE pi.tenant_id = c.tenant_id
        AND pi.identifier_type = 'email'
        AND pi.identifier_value = trim(c.email::text)
        AND pi.deleted_at IS NULL AND pi.status = 1
  )
ORDER BY c.tenant_id, trim(c.email::text), c.created_at ASC;
