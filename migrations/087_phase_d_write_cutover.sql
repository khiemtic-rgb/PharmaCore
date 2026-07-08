-- KitPlatform 087: Phase D — write cutover extension tables (pharmacy sales + survey submission)
-- Depends on: 086_pack_pharmacy_report_read_views.sql, 083_pack_survey_schema.sql

-- =============================================================================
-- PACK: Pharmacy — sales order extension (dual-write on completed sale)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pack_pharmacy.pharmacy_sales_order (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    sales_order_id   UUID         NOT NULL REFERENCES public.sales_orders(id),
    customer_id      UUID         REFERENCES public.customers(id),
    order_number     VARCHAR(50)  NOT NULL,
    order_status     SMALLINT     NOT NULL,
    total_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
    completed_at     TIMESTAMPTZ,
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_pharmacy_sales_order_legacy UNIQUE (tenant_id, sales_order_id)
);

CREATE INDEX IF NOT EXISTS ix_pharmacy_sales_order_workspace
    ON pack_pharmacy.pharmacy_sales_order (workspace_id)
    WHERE workspace_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_pharmacy_sales_order_customer
    ON pack_pharmacy.pharmacy_sales_order (tenant_id, customer_id, completed_at DESC)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_pharmacy_sales_order_row_version ON pack_pharmacy.pharmacy_sales_order;
CREATE TRIGGER trg_pharmacy_sales_order_row_version
    BEFORE UPDATE ON pack_pharmacy.pharmacy_sales_order
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- Backfill completed sales orders (idempotent)
INSERT INTO pack_pharmacy.pharmacy_sales_order (
    tenant_id, workspace_id, sales_order_id, customer_id, order_number,
    order_status, total_amount, completed_at, metadata
)
SELECT
    so.tenant_id,
    w.id,
    so.id,
    so.customer_id,
    so.order_number,
    so.status,
    so.total_amount,
    so.order_date,
    jsonb_build_object('backfill', true, 'source', 'migration_087')
FROM public.sales_orders so
LEFT JOIN kit_workspace.workspace_workspace w
    ON w.tenant_id = so.tenant_id
   AND w.package_code = 'novixa_pharmacy'
   AND w.deleted_at IS NULL
   AND w.is_default = TRUE
WHERE so.status IN (2, 4) -- Completed, Refunded
  AND NOT EXISTS (
      SELECT 1 FROM pack_pharmacy.pharmacy_sales_order p
      WHERE p.sales_order_id = so.id AND p.tenant_id = so.tenant_id
  );

ALTER TABLE pack_pharmacy.pharmacy_sales_order ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON pack_pharmacy.pharmacy_sales_order;
CREATE POLICY tenant_isolation ON pack_pharmacy.pharmacy_sales_order
    FOR ALL
    USING (kit_rls_tenant_match(tenant_id))
    WITH CHECK (kit_rls_tenant_match(tenant_id));

COMMENT ON TABLE pack_pharmacy.pharmacy_sales_order IS
    'Pack extension — dual-write on completed sale; strangler link to public.sales_orders.';

-- =============================================================================
-- PACK: Survey — submission extension (dual-write on assessment lifecycle)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pack_survey.survey_submission (
    id                       UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id                UUID         REFERENCES public.tenants(id),
    workspace_id             UUID         REFERENCES kit_workspace.workspace_workspace(id),
    assessment_submission_id UUID         NOT NULL REFERENCES public.assessment_submission(id),
    template_id              UUID         NOT NULL REFERENCES public.assessment_template(id),
    submission_status        VARCHAR(30)  NOT NULL DEFAULT 'draft',
    session_source           VARCHAR(50),
    overall_score            NUMERIC(10,2),
    overall_pct              NUMERIC(5,2),
    lead_name                VARCHAR(255),
    lead_phone               VARCHAR(30),
    lead_email               VARCHAR(255),
    lead_company             VARCHAR(255),
    completed_at             TIMESTAMPTZ,
    lead_captured_at         TIMESTAMPTZ,
    metadata                 JSONB        NOT NULL DEFAULT '{}'::jsonb,
    row_version              INT          NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at               TIMESTAMPTZ,
    CONSTRAINT uq_survey_submission_legacy UNIQUE (assessment_submission_id)
);

CREATE INDEX IF NOT EXISTS ix_survey_submission_tenant
    ON pack_survey.survey_submission (tenant_id, submission_status)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_survey_submission_row_version ON pack_survey.survey_submission;
CREATE TRIGGER trg_survey_submission_row_version
    BEFORE UPDATE ON pack_survey.survey_submission
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

INSERT INTO pack_survey.survey_submission (
    tenant_id, workspace_id, assessment_submission_id, template_id,
    submission_status, session_source, overall_score, overall_pct,
    lead_name, lead_phone, lead_email, lead_company,
    completed_at, lead_captured_at, metadata
)
SELECT
    s.tenant_id,
    w.id,
    s.id,
    s.template_id,
    s.status,
    s.source,
    s.overall_score,
    s.overall_pct,
    s.respondent_name,
    s.respondent_phone,
    s.respondent_email,
    s.respondent_org_name,
    s.completed_at,
    s.lead_captured_at,
    jsonb_build_object('backfill', true, 'source', 'migration_087')
FROM public.assessment_submission s
LEFT JOIN kit_workspace.workspace_workspace w
    ON w.tenant_id = s.tenant_id
   AND w.package_code = 'pharmacy_survey'
   AND w.deleted_at IS NULL
   AND w.is_default = TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM pack_survey.survey_submission p
    WHERE p.assessment_submission_id = s.id
);

ALTER TABLE pack_survey.survey_submission ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON pack_survey.survey_submission;
CREATE POLICY tenant_isolation ON pack_survey.survey_submission
    FOR ALL
    USING (tenant_id IS NULL OR kit_rls_tenant_match(tenant_id))
    WITH CHECK (tenant_id IS NULL OR kit_rls_tenant_match(tenant_id));

COMMENT ON TABLE pack_survey.survey_submission IS
    'Pack extension — dual-write on assessment submission lifecycle.';

UPDATE kit_meta.meta_entity
SET pack_code = 'novixa_pharmacy',
    schema_name = 'pack_pharmacy',
    updated_at = NOW()
WHERE entity_code = 'sales_order'
  AND (pack_code IS DISTINCT FROM 'novixa_pharmacy' OR schema_name IS DISTINCT FROM 'pack_pharmacy');
