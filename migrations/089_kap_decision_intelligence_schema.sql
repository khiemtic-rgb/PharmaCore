-- KitPlatform 089: KAP Decision Intelligence — schema for phased analysis + canonical report artifact
-- Depends on: 068_assessment_engine.sql
-- Design: single JSON artifact (versioned) + supporting reference/runtime tables for all phases.

-- ---------------------------------------------------------------------------
-- Submission context (org profile, geo, history link)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessment_submission_context (
    submission_id       UUID PRIMARY KEY REFERENCES assessment_submission(id) ON DELETE CASCADE,
    vertical_code       VARCHAR(50),
    org_scale           VARCHAR(30),
    province_code       VARCHAR(20),
    district_code       VARCHAR(20),
    latitude            NUMERIC(10, 7),
    longitude           NUMERIC(10, 7),
    employee_count      INT,
    branch_count        INT,
    prior_submission_id UUID REFERENCES assessment_submission(id) ON DELETE SET NULL,
    context_json        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_assessment_submission_context_scale CHECK (
        org_scale IS NULL OR org_scale IN ('micro', 'small', 'medium', 'large', 'chain')
    )
);

CREATE INDEX IF NOT EXISTS ix_assessment_submission_context_prior
    ON assessment_submission_context (prior_submission_id)
    WHERE prior_submission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_assessment_submission_context_vertical
    ON assessment_submission_context (vertical_code, org_scale);

-- ---------------------------------------------------------------------------
-- Attachments (images, files — Phase 2+)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessment_attachment (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID         NOT NULL REFERENCES assessment_submission(id) ON DELETE CASCADE,
    question_id     UUID         REFERENCES assessment_question(id) ON DELETE SET NULL,
    attachment_type VARCHAR(20)  NOT NULL,
    storage_key     VARCHAR(500) NOT NULL,
    file_name       VARCHAR(255),
    mime_type       VARCHAR(100),
    byte_size       BIGINT,
    metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_assessment_attachment_type CHECK (
        attachment_type IN ('image', 'file', 'gps_snapshot')
    )
);

CREATE INDEX IF NOT EXISTS ix_assessment_attachment_submission
    ON assessment_attachment (submission_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Maturity model (5 levels per template / vertical)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessment_maturity_level (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID         NOT NULL REFERENCES assessment_template(id) ON DELETE CASCADE,
    vertical_code   VARCHAR(50),
    level           SMALLINT     NOT NULL,
    code            VARCHAR(30)  NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    score_min       NUMERIC(8, 4) NOT NULL,
    score_max       NUMERIC(8, 4) NOT NULL,
    sort_order      INT          NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assessment_maturity_level UNIQUE (template_id, vertical_code, level),
    CONSTRAINT ck_assessment_maturity_level_range CHECK (level BETWEEN 1 AND 5),
    CONSTRAINT ck_assessment_maturity_score_range CHECK (score_min <= score_max)
);

CREATE INDEX IF NOT EXISTS ix_assessment_maturity_level_template
    ON assessment_maturity_level (template_id, vertical_code, sort_order);

-- ---------------------------------------------------------------------------
-- Root cause knowledge base (deterministic RCA)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessment_root_cause_kb (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id         UUID         NOT NULL REFERENCES assessment_template(id) ON DELETE CASCADE,
    question_code       VARCHAR(20),
    category_code       VARCHAR(50),
    trigger_expression  TEXT         NOT NULL,
    cause_code          VARCHAR(50)  NOT NULL,
    cause_title         VARCHAR(255) NOT NULL,
    cause_body          TEXT         NOT NULL,
    evidence_hint       TEXT,
    sort_order          INT          NOT NULL DEFAULT 0,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assessment_root_cause_kb UNIQUE (template_id, cause_code)
);

CREATE INDEX IF NOT EXISTS ix_assessment_root_cause_kb_template_q
    ON assessment_root_cause_kb (template_id, question_code)
    WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- Benchmark cohort stats (Phase 3 — anon aggregated)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessment_benchmark_cohort (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID         NOT NULL REFERENCES assessment_template(id) ON DELETE CASCADE,
    cohort_code     VARCHAR(50)  NOT NULL,
    vertical_code   VARCHAR(50),
    org_scale       VARCHAR(30),
    province_code   VARCHAR(20),
    sample_size     INT          NOT NULL DEFAULT 0,
    stats_json      JSONB        NOT NULL DEFAULT '{}'::jsonb,
    computed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_assessment_benchmark_cohort UNIQUE (template_id, cohort_code)
);

-- ---------------------------------------------------------------------------
-- Canonical report artifact (single source of truth for web + PDF + CRM)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessment_report_artifact (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id    UUID         NOT NULL REFERENCES assessment_submission(id) ON DELETE CASCADE,
    schema_version   VARCHAR(20)  NOT NULL DEFAULT '1.0',
    artifact_json    JSONB        NOT NULL,
    pipeline_version VARCHAR(20)  NOT NULL DEFAULT '1.0',
    engine_mode      VARCHAR(20)  NOT NULL DEFAULT 'deterministic',
    phases_completed TEXT[]       NOT NULL DEFAULT '{}',
    generated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    is_current       BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_assessment_report_artifact_engine CHECK (
        engine_mode IN ('deterministic', 'hybrid', 'ai_full')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_assessment_report_artifact_current
    ON assessment_report_artifact (submission_id)
    WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS ix_assessment_report_artifact_submission_time
    ON assessment_report_artifact (submission_id, generated_at DESC);

-- ---------------------------------------------------------------------------
-- Analysis pipeline run log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessment_analysis_run (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id     UUID         NOT NULL REFERENCES assessment_submission(id) ON DELETE CASCADE,
    artifact_id       UUID         REFERENCES assessment_report_artifact(id) ON DELETE SET NULL,
    trigger_event     VARCHAR(30)  NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'running',
    pipeline_level    SMALLINT     NOT NULL DEFAULT 1,
    phases_requested  TEXT[]       NOT NULL DEFAULT '{}',
    phases_succeeded  TEXT[]       NOT NULL DEFAULT '{}',
    started_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMPTZ,
    error_message     TEXT,
    metadata          JSONB        NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT ck_assessment_analysis_run_status CHECK (
        status IN ('running', 'completed', 'failed', 'partial')
    ),
    CONSTRAINT ck_assessment_analysis_run_trigger CHECK (
        trigger_event IN ('complete', 'lead_captured', 'manual_refresh', 'scheduled')
    )
);

CREATE INDEX IF NOT EXISTS ix_assessment_analysis_run_submission
    ON assessment_analysis_run (submission_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- Extend rule action types for structured intelligence outputs
-- ---------------------------------------------------------------------------

ALTER TABLE assessment_rule DROP CONSTRAINT IF EXISTS ck_assessment_rule_action;
ALTER TABLE assessment_rule ADD CONSTRAINT ck_assessment_rule_action CHECK (
    action_type IN (
        'insight',
        'recommendation',
        'risk',
        'opportunity',
        'roadmap_item',
        'kpi',
        'swot_strength',
        'swot_weakness',
        'swot_opportunity',
        'swot_threat'
    )
);

-- ---------------------------------------------------------------------------
-- Strangler view (pack_survey)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW pack_survey.v_report_artifact AS
SELECT
    a.id,
    a.submission_id,
    a.schema_version,
    a.pipeline_version,
    a.engine_mode,
    a.phases_completed,
    a.generated_at,
    a.is_current
FROM public.assessment_report_artifact a;

COMMENT ON TABLE assessment_report_artifact IS
    'Canonical KAP report JSON — web, PDF, CRM read from here (versioned).';
COMMENT ON TABLE assessment_maturity_level IS
    'Maturity Level 1–5 mapping for overall/category scores.';
COMMENT ON TABLE assessment_root_cause_kb IS
    'Deterministic root-cause templates keyed by question/category triggers.';
COMMENT ON TABLE assessment_benchmark_cohort IS
    'Anonymized cohort stats for benchmark phase (Phase 3).';
