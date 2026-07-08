-- KitPlatform 080: P1.2 workspace_id on pack_* + P1.5 RLS + dual-write backfill
-- Depends on: 079_kit_pack_registry_workspace_party_backfill.sql

-- =============================================================================
-- P1.2: workspace_id on pack_clinic + pack_crm
-- =============================================================================

ALTER TABLE pack_clinic.clinic_provider
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES kit_workspace.workspace_workspace(id);

ALTER TABLE pack_clinic.clinic_appointment
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES kit_workspace.workspace_workspace(id);

ALTER TABLE pack_clinic.clinic_visit
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES kit_workspace.workspace_workspace(id);

ALTER TABLE pack_clinic.clinic_visit_note
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES kit_workspace.workspace_workspace(id);

ALTER TABLE pack_crm.crm_lead
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES kit_workspace.workspace_workspace(id);

ALTER TABLE pack_crm.crm_opportunity
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES kit_workspace.workspace_workspace(id);

ALTER TABLE pack_crm.crm_activity
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES kit_workspace.workspace_workspace(id);

-- Backfill: clinic_crm workspace when present, else default workspace
UPDATE pack_clinic.clinic_provider t
SET workspace_id = COALESCE(
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.package_code = 'clinic_crm' AND w.deleted_at IS NULL LIMIT 1),
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.is_default = TRUE AND w.deleted_at IS NULL LIMIT 1)
)
WHERE t.workspace_id IS NULL;

UPDATE pack_clinic.clinic_appointment t
SET workspace_id = COALESCE(
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.package_code = 'clinic_crm' AND w.deleted_at IS NULL LIMIT 1),
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.is_default = TRUE AND w.deleted_at IS NULL LIMIT 1)
)
WHERE t.workspace_id IS NULL;

UPDATE pack_clinic.clinic_visit t
SET workspace_id = COALESCE(
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.package_code = 'clinic_crm' AND w.deleted_at IS NULL LIMIT 1),
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.is_default = TRUE AND w.deleted_at IS NULL LIMIT 1)
)
WHERE t.workspace_id IS NULL;

UPDATE pack_clinic.clinic_visit_note t
SET workspace_id = COALESCE(
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.package_code = 'clinic_crm' AND w.deleted_at IS NULL LIMIT 1),
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.is_default = TRUE AND w.deleted_at IS NULL LIMIT 1)
)
WHERE t.workspace_id IS NULL;

UPDATE pack_crm.crm_lead t
SET workspace_id = COALESCE(
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.package_code = 'clinic_crm' AND w.deleted_at IS NULL LIMIT 1),
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.is_default = TRUE AND w.deleted_at IS NULL LIMIT 1)
)
WHERE t.workspace_id IS NULL;

UPDATE pack_crm.crm_opportunity t
SET workspace_id = COALESCE(
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.package_code = 'clinic_crm' AND w.deleted_at IS NULL LIMIT 1),
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.is_default = TRUE AND w.deleted_at IS NULL LIMIT 1)
)
WHERE t.workspace_id IS NULL;

UPDATE pack_crm.crm_activity t
SET workspace_id = COALESCE(
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.package_code = 'clinic_crm' AND w.deleted_at IS NULL LIMIT 1),
    (SELECT w.id FROM kit_workspace.workspace_workspace w
     WHERE w.tenant_id = t.tenant_id AND w.is_default = TRUE AND w.deleted_at IS NULL LIMIT 1)
)
WHERE t.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS ix_clinic_appointment_workspace
    ON pack_clinic.clinic_appointment (tenant_id, workspace_id, appointment_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_crm_lead_workspace
    ON pack_crm.crm_lead (tenant_id, workspace_id, lead_status)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- Dual-write backfill: legacy events missing from event_outbox
-- =============================================================================

INSERT INTO kit_event.event_outbox (
    tenant_id, event_bus, event_type, event_version, aggregate_type, aggregate_id,
    source, payload, occurred_at, dispatched_at, dispatch_attempts, last_error,
    legacy_platform_event_id, created_at, updated_at
)
SELECT
    pe.tenant_id, 'platform', pe.event_type, pe.event_version, pe.aggregate_type, pe.aggregate_id,
    pe.source, pe.payload, pe.occurred_at, pe.dispatched_at, pe.dispatch_attempts, pe.last_error,
    pe.id, pe.occurred_at, COALESCE(pe.dispatched_at, pe.occurred_at)
FROM public.platform_events pe
WHERE NOT EXISTS (
    SELECT 1 FROM kit_event.event_outbox eo WHERE eo.legacy_platform_event_id = pe.id
);

INSERT INTO kit_event.event_outbox (
    tenant_id, event_bus, event_type, event_version, aggregate_type, aggregate_id,
    source, payload, occurred_at, dispatched_at, dispatch_attempts, last_error,
    legacy_outbox_id, created_at, updated_at
)
SELECT
    io.tenant_id, 'integration', io.event_type, io.event_version, io.aggregate_type, io.aggregate_id,
    'integration:cdp', io.payload, io.occurred_at, io.published_at, io.publish_attempts, io.last_error,
    io.id, io.occurred_at, COALESCE(io.published_at, io.occurred_at)
FROM public.integration_outbox io
WHERE NOT EXISTS (
    SELECT 1 FROM kit_event.event_outbox eo WHERE eo.legacy_outbox_id = io.id
);

-- =============================================================================
-- P1.5: RLS on pack tables (tenant isolation via app.tenant_id session var)
-- Workers without session var retain full access (pilot-safe).
-- =============================================================================

CREATE OR REPLACE FUNCTION kit_rls_tenant_match(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT
        NULLIF(current_setting('app.tenant_id', true), '') IS NULL
        OR p_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

DO $rls$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'pack_clinic.clinic_provider',
        'pack_clinic.clinic_appointment',
        'pack_clinic.clinic_visit',
        'pack_clinic.clinic_visit_note',
        'pack_crm.crm_lead',
        'pack_crm.crm_opportunity',
        'pack_crm.crm_activity'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', tbl);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %s FOR ALL USING (kit_rls_tenant_match(tenant_id)) WITH CHECK (kit_rls_tenant_match(tenant_id))',
            tbl
        );
    END LOOP;
END
$rls$;

COMMENT ON FUNCTION kit_rls_tenant_match IS
    'RLS helper: when app.tenant_id is set on connection, restrict to that tenant; else allow (workers/migrations).';
