-- KitPlatform 078: Pack 2 pilot — Clinic + CRM (additive pack_* only, no kit_* changes)
-- Depends on: 077_kit_workflow_integration_ai.sql

CREATE SCHEMA IF NOT EXISTS pack_clinic;
CREATE SCHEMA IF NOT EXISTS pack_crm;

COMMENT ON SCHEMA pack_clinic IS 'ClinicOS pack tables — appointments, visits (EMR-lite).';
COMMENT ON SCHEMA pack_crm IS 'CRM pack extension tables — leads, opportunities, activities.';

-- =============================================================================
-- PACK: Clinic (4 tables)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pack_clinic.clinic_provider (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    employee_id      UUID         REFERENCES public.employees(id),
    party_id         UUID         REFERENCES kit_common.party_party(id),
    provider_code    VARCHAR(50)  NOT NULL,
    display_name     VARCHAR(255) NOT NULL,
    specialty        VARCHAR(120),
    license_no       VARCHAR(80),
    status           SMALLINT     NOT NULL DEFAULT 1,
    settings         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_clinic_provider_code UNIQUE (tenant_id, provider_code)
);

CREATE INDEX IF NOT EXISTS ix_clinic_provider_tenant
    ON pack_clinic.clinic_provider (tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS pack_clinic.clinic_appointment (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    customer_id      UUID         NOT NULL REFERENCES public.customers(id),
    provider_id      UUID         REFERENCES pack_clinic.clinic_provider(id),
    branch_id        UUID         REFERENCES public.branches(id),
    appointment_at   TIMESTAMPTZ  NOT NULL,
    duration_minutes INT          NOT NULL DEFAULT 30,
    appointment_status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    reason           TEXT,
    notes            TEXT,
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_clinic_appointment_status CHECK (
        appointment_status IN ('scheduled', 'checked_in', 'completed', 'cancelled', 'no_show')
    )
);

CREATE INDEX IF NOT EXISTS ix_clinic_appointment_schedule
    ON pack_clinic.clinic_appointment (tenant_id, appointment_at)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS pack_clinic.clinic_visit (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    appointment_id   UUID         REFERENCES pack_clinic.clinic_appointment(id),
    customer_id      UUID         NOT NULL REFERENCES public.customers(id),
    provider_id      UUID         REFERENCES pack_clinic.clinic_provider(id),
    visit_status     VARCHAR(30)  NOT NULL DEFAULT 'open',
    chief_complaint  TEXT,
    diagnosis_summary TEXT,
    started_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    closed_at        TIMESTAMPTZ,
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_clinic_visit_status CHECK (
        visit_status IN ('open', 'closed', 'cancelled')
    )
);

CREATE INDEX IF NOT EXISTS ix_clinic_visit_customer
    ON pack_clinic.clinic_visit (tenant_id, customer_id, started_at DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS pack_clinic.clinic_visit_note (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    visit_id         UUID         NOT NULL REFERENCES pack_clinic.clinic_visit(id),
    note_type        VARCHAR(30)  NOT NULL DEFAULT 'clinical',
    note_body        TEXT         NOT NULL,
    author_user_id   UUID         REFERENCES public.users(id),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_clinic_visit_note_type CHECK (
        note_type IN ('clinical', 'admin', 'follow_up')
    )
);

CREATE INDEX IF NOT EXISTS ix_clinic_visit_note_visit
    ON pack_clinic.clinic_visit_note (visit_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- PACK: CRM (3 tables)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pack_crm.crm_lead (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    customer_id      UUID         REFERENCES public.customers(id),
    party_id         UUID         REFERENCES kit_common.party_party(id),
    lead_code        VARCHAR(50)  NOT NULL,
    full_name        VARCHAR(255) NOT NULL,
    phone            VARCHAR(30),
    email            VARCHAR(255),
    source           VARCHAR(50)  NOT NULL DEFAULT 'walk_in',
    lead_status      VARCHAR(30)  NOT NULL DEFAULT 'new',
    assigned_user_id UUID         REFERENCES public.users(id),
    notes            TEXT,
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_crm_lead_code UNIQUE (tenant_id, lead_code),
    CONSTRAINT ck_crm_lead_status CHECK (
        lead_status IN ('new', 'contacted', 'qualified', 'converted', 'lost')
    )
);

CREATE INDEX IF NOT EXISTS ix_crm_lead_status
    ON pack_crm.crm_lead (tenant_id, lead_status, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS pack_crm.crm_opportunity (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    lead_id          UUID         REFERENCES pack_crm.crm_lead(id),
    customer_id      UUID         REFERENCES public.customers(id),
    opportunity_code VARCHAR(50)  NOT NULL,
    title            VARCHAR(255) NOT NULL,
    stage            VARCHAR(30)  NOT NULL DEFAULT 'prospect',
    expected_value   NUMERIC(18, 2),
    expected_close   DATE,
    owner_user_id    UUID         REFERENCES public.users(id),
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_crm_opportunity_code UNIQUE (tenant_id, opportunity_code),
    CONSTRAINT ck_crm_opportunity_stage CHECK (
        stage IN ('prospect', 'proposal', 'negotiation', 'won', 'lost')
    )
);

CREATE INDEX IF NOT EXISTS ix_crm_opportunity_stage
    ON pack_crm.crm_opportunity (tenant_id, stage, expected_close)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS pack_crm.crm_activity (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    lead_id          UUID         REFERENCES pack_crm.crm_lead(id),
    opportunity_id   UUID         REFERENCES pack_crm.crm_opportunity(id),
    customer_id      UUID         REFERENCES public.customers(id),
    activity_type    VARCHAR(30)  NOT NULL DEFAULT 'call',
    subject          VARCHAR(255) NOT NULL,
    body             TEXT,
    scheduled_at     TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    owner_user_id    UUID         REFERENCES public.users(id),
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_crm_activity_type CHECK (
        activity_type IN ('call', 'visit', 'email', 'sms', 'task', 'meeting')
    )
);

CREATE INDEX IF NOT EXISTS ix_crm_activity_schedule
    ON pack_crm.crm_activity (tenant_id, scheduled_at)
    WHERE deleted_at IS NULL AND completed_at IS NULL;

-- =============================================================================
-- Module registry — Pack 2 pilot modules (registry only, not enabled by default)
-- =============================================================================

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
