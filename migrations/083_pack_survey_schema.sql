-- KitPlatform 083: Pharmacy Survey Pack — pack_survey schema (strangler views)
-- Depends on: 082_pack_pharmacy_schema.sql
-- Assessment runtime tables remain in public.* until full cutover.

CREATE SCHEMA IF NOT EXISTS pack_survey;

COMMENT ON SCHEMA pack_survey IS
    'Pharmacy Survey Pack — strangler read views over public.assessment_* tables.';

-- =============================================================================
-- Strangler read views
-- =============================================================================

CREATE OR REPLACE VIEW pack_survey.v_template AS
SELECT
    t.id,
    t.code,
    t.name,
    t.version,
    t.description,
    t.verticals,
    t.status,
    t.created_at,
    t.updated_at
FROM public.assessment_template t;

CREATE OR REPLACE VIEW pack_survey.v_submission AS
SELECT
    s.id,
    s.tenant_id,
    s.template_id,
    s.session_token,
    s.status,
    s.respondent_name AS lead_name,
    s.respondent_phone AS lead_phone,
    s.respondent_email AS lead_email,
    s.respondent_org_name AS lead_company,
    s.completed_at,
    s.started_at AS created_at,
    s.completed_at AS updated_at
FROM public.assessment_submission s;

CREATE OR REPLACE VIEW pack_survey.v_report AS
SELECT
    r.id,
    r.submission_id,
    r.format AS report_version,
    r.generated_at,
    r.generated_at AS created_at
FROM public.assessment_report r;

COMMENT ON VIEW pack_survey.v_template IS 'Strangler — writes remain public.assessment_template.';
COMMENT ON VIEW pack_survey.v_submission IS 'Strangler — writes remain public.assessment_submission.';
COMMENT ON VIEW pack_survey.v_report IS 'Strangler — writes remain public.assessment_report.';

-- =============================================================================
-- Pack extension: survey campaign (per-tenant survey config overlay)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pack_survey.survey_campaign (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    template_id      UUID         NOT NULL REFERENCES public.assessment_template(id),
    campaign_code    VARCHAR(50)  NOT NULL,
    campaign_name    VARCHAR(255) NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'active',
    settings         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_survey_campaign_code UNIQUE (tenant_id, campaign_code),
    CONSTRAINT ck_survey_campaign_status CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE INDEX IF NOT EXISTS ix_survey_campaign_tenant
    ON pack_survey.survey_campaign (tenant_id, status)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_survey_campaign_row_version ON pack_survey.survey_campaign;
CREATE TRIGGER trg_survey_campaign_row_version
    BEFORE UPDATE ON pack_survey.survey_campaign
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

UPDATE pack_survey.survey_campaign t
SET workspace_id = w.id, updated_at = NOW()
FROM kit_workspace.workspace_workspace w
WHERE t.workspace_id IS NULL
  AND w.tenant_id = t.tenant_id
  AND w.is_default = TRUE
  AND w.deleted_at IS NULL;

ALTER TABLE pack_survey.survey_campaign ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON pack_survey.survey_campaign;
CREATE POLICY tenant_isolation ON pack_survey.survey_campaign
    FOR ALL
    USING (kit_rls_tenant_match(tenant_id))
    WITH CHECK (kit_rls_tenant_match(tenant_id));

-- =============================================================================
-- tenant_package + module registry
-- =============================================================================

INSERT INTO kit_tenant.tenant_package (
    package_code, package_name, description, verticals, module_codes, sort_order
)
VALUES (
    'pharmacy_survey',
    'Pharmacy Survey Pack',
    'Khảo sát / đánh giá nhà thuốc — Assessment Engine',
    ARRAY['pharmacy', 'pharmacy_chain'],
    ARRAY['assessment', 'pharmacy_survey', 'reports'],
    15
)
ON CONFLICT (package_code) DO UPDATE SET
    package_name = EXCLUDED.package_name,
    description = EXCLUDED.description,
    verticals = EXCLUDED.verticals,
    module_codes = EXCLUDED.module_codes,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

INSERT INTO platform_module_registry (module_code, module_name, description, verticals, sort_order)
SELECT v.code, v.name, v.description, v.verticals, v.sort_order
FROM (
    VALUES
        ('pharmacy_survey', 'Khảo sát nhà thuốc', 'Pack Survey — pharmacy assessment campaigns', ARRAY['pharmacy','pharmacy_chain'], 25)
) AS v(code, name, description, verticals, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM platform_module_registry m WHERE m.module_code = v.code
);

UPDATE kit_meta.meta_entity
SET pack_code = 'pharmacy_survey',
    schema_name = 'pack_survey',
    updated_at = NOW()
WHERE entity_code IN ('assessment_template', 'assessment_submission')
  AND (pack_code IS DISTINCT FROM 'pharmacy_survey' OR schema_name IS DISTINCT FROM 'pack_survey');
