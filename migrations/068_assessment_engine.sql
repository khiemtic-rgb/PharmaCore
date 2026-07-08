-- KitPlatform 068: KIT Platform — Assessment Engine (template tree + submission runtime)
-- Layer B capability. Public web first; tenant_id nullable on submission.

-- ---------------------------------------------------------------------------
-- Template definition (versioned content)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessment_template (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50)  NOT NULL,
    name            VARCHAR(255) NOT NULL,
    version         VARCHAR(20)  NOT NULL DEFAULT '1.0',
    description     TEXT,
    verticals       TEXT[]       NOT NULL DEFAULT '{}',
    status          VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assessment_template_code_version UNIQUE (code, version),
    CONSTRAINT ck_assessment_template_status CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE TABLE IF NOT EXISTS assessment_category (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID         NOT NULL REFERENCES assessment_template(id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    name            VARCHAR(255) NOT NULL,
    sort_order      INT          NOT NULL DEFAULT 0,
    weight          NUMERIC(8,4) NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assessment_category_template_code UNIQUE (template_id, code)
);

CREATE TABLE IF NOT EXISTS assessment_dimension (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     UUID         NOT NULL REFERENCES assessment_category(id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    name            VARCHAR(255) NOT NULL,
    sort_order      INT          NOT NULL DEFAULT 0,
    weight          NUMERIC(8,4) NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assessment_dimension_category_code UNIQUE (category_id, code)
);

CREATE TABLE IF NOT EXISTS assessment_question (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dimension_id    UUID         NOT NULL REFERENCES assessment_dimension(id) ON DELETE CASCADE,
    code            VARCHAR(20)  NOT NULL,
    title           TEXT         NOT NULL,
    help_text       TEXT,
    question_type   VARCHAR(30)  NOT NULL DEFAULT 'single_choice',
    scorable        BOOLEAN      NOT NULL DEFAULT TRUE,
    required        BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order      INT          NOT NULL DEFAULT 0,
    weight          NUMERIC(8,4) NOT NULL DEFAULT 1,
    metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assessment_question_dimension_code UNIQUE (dimension_id, code),
    CONSTRAINT ck_assessment_question_type CHECK (
        question_type IN ('single_choice', 'multi_choice', 'text', 'scale')
    )
);

CREATE TABLE IF NOT EXISTS assessment_option (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id     UUID         NOT NULL REFERENCES assessment_question(id) ON DELETE CASCADE,
    code            VARCHAR(30)  NOT NULL,
    label           TEXT         NOT NULL,
    score           SMALLINT,
    sort_order      INT          NOT NULL DEFAULT 0,
    metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT uq_assessment_option_question_code UNIQUE (question_id, code),
    CONSTRAINT ck_assessment_option_score CHECK (score IS NULL OR score BETWEEN 1 AND 4)
);

CREATE TABLE IF NOT EXISTS assessment_rule (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID         NOT NULL REFERENCES assessment_template(id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    name            VARCHAR(255) NOT NULL,
    expression      TEXT         NOT NULL,
    action_type     VARCHAR(30)  NOT NULL,
    action_payload  JSONB        NOT NULL DEFAULT '{}'::jsonb,
    priority        INT          NOT NULL DEFAULT 50,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assessment_rule_template_code UNIQUE (template_id, code),
    CONSTRAINT ck_assessment_rule_action CHECK (action_type IN ('insight', 'recommendation'))
);

-- ---------------------------------------------------------------------------
-- Runtime (submissions)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessment_submission (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id         UUID         NOT NULL REFERENCES assessment_template(id),
    template_version    VARCHAR(20)  NOT NULL,
    tenant_id           UUID         REFERENCES tenants(id),
    branch_id           UUID,
    status              VARCHAR(30)  NOT NULL DEFAULT 'draft',
    session_token       VARCHAR(64)  NOT NULL,
    source              VARCHAR(30)  NOT NULL DEFAULT 'public_web',
    overall_score       NUMERIC(8,4),
    overall_pct         NUMERIC(8,4),
    respondent_name     VARCHAR(255),
    respondent_phone    VARCHAR(30),
    respondent_email    VARCHAR(255),
    respondent_org_name VARCHAR(255),
    respondent_note     TEXT,
    consent_marketing   BOOLEAN      NOT NULL DEFAULT FALSE,
    started_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    lead_captured_at    TIMESTAMPTZ,
    report_ready_at     TIMESTAMPTZ,
    ip_address          INET,
    user_agent          TEXT,
    metadata            JSONB        NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT ck_assessment_submission_status CHECK (
        status IN ('draft', 'completed', 'lead_captured', 'report_ready')
    ),
    CONSTRAINT ck_assessment_submission_source CHECK (
        source IN ('public_web', 'admin', 'embed', 'sales')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_assessment_submission_session
    ON assessment_submission (session_token);

CREATE INDEX IF NOT EXISTS ix_assessment_submission_template_time
    ON assessment_submission (template_id, started_at DESC);

CREATE INDEX IF NOT EXISTS ix_assessment_submission_tenant_time
    ON assessment_submission (tenant_id, started_at DESC)
    WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_assessment_submission_lead_phone
    ON assessment_submission (respondent_phone, lead_captured_at DESC)
    WHERE respondent_phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS assessment_response (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID         NOT NULL REFERENCES assessment_submission(id) ON DELETE CASCADE,
    question_id     UUID         NOT NULL REFERENCES assessment_question(id),
    option_id       UUID         REFERENCES assessment_option(id),
    text_value      TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assessment_response_submission_question UNIQUE (submission_id, question_id)
);

CREATE TABLE IF NOT EXISTS assessment_dimension_score (
    submission_id   UUID         NOT NULL REFERENCES assessment_submission(id) ON DELETE CASCADE,
    dimension_id    UUID         NOT NULL REFERENCES assessment_dimension(id),
    score           NUMERIC(8,4) NOT NULL,
    score_pct       NUMERIC(8,4),
    PRIMARY KEY (submission_id, dimension_id)
);

CREATE TABLE IF NOT EXISTS assessment_category_score (
    submission_id   UUID         NOT NULL REFERENCES assessment_submission(id) ON DELETE CASCADE,
    category_id     UUID         NOT NULL REFERENCES assessment_category(id),
    score           NUMERIC(8,4) NOT NULL,
    score_pct       NUMERIC(8,4),
    PRIMARY KEY (submission_id, category_id)
);

CREATE TABLE IF NOT EXISTS assessment_insight (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID         NOT NULL REFERENCES assessment_submission(id) ON DELETE CASCADE,
    rule_id         UUID         REFERENCES assessment_rule(id) ON DELETE SET NULL,
    scope_type      VARCHAR(20),
    scope_code      VARCHAR(50),
    title           VARCHAR(255) NOT NULL,
    body            TEXT         NOT NULL,
    severity        VARCHAR(20)  NOT NULL DEFAULT 'info',
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_assessment_insight_scope CHECK (
        scope_type IS NULL OR scope_type IN ('overall', 'category', 'dimension', 'qualitative')
    )
);

CREATE TABLE IF NOT EXISTS assessment_recommendation (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID         NOT NULL REFERENCES assessment_submission(id) ON DELETE CASCADE,
    rule_id         UUID         REFERENCES assessment_rule(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT         NOT NULL,
    priority        SMALLINT     NOT NULL DEFAULT 50,
    product_area    VARCHAR(50),
    estimate_hint   VARCHAR(100),
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_report (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID         NOT NULL REFERENCES assessment_submission(id) ON DELETE CASCADE,
    format          VARCHAR(20)  NOT NULL DEFAULT 'pdf',
    storage_key     VARCHAR(500),
    file_name       VARCHAR(255),
    byte_size       BIGINT,
    generated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT ck_assessment_report_format CHECK (format IN ('pdf', 'html'))
);

CREATE INDEX IF NOT EXISTS ix_assessment_report_submission
    ON assessment_report (submission_id, generated_at DESC);

-- Module registry (platform capability)
INSERT INTO platform_module_registry (module_code, module_name, description, verticals, sort_order)
VALUES (
    'assessment',
    'Danh gia / Khao sat',
    'Assessment Engine — maturity survey, scoring, insight, lead capture',
    ARRAY['pharmacy','pharmacy_chain','clinic','supplement_store','medical_equipment_store','retail'],
    75
)
ON CONFLICT (module_code) DO UPDATE SET
    module_name = EXCLUDED.module_name,
    description = EXCLUDED.description,
    verticals = EXCLUDED.verticals,
    sort_order = EXCLUDED.sort_order;

COMMENT ON TABLE assessment_template IS 'Assessment content pack (PHARMACY_V1, CLINIC_V1, …).';
COMMENT ON TABLE assessment_submission IS 'One survey attempt; tenant_id NULL for anonymous public web.';
COMMENT ON COLUMN assessment_option.score IS 'Maturity score 1–4; NULL when question.scorable = false.';
COMMENT ON COLUMN assessment_submission.session_token IS 'Public resume token (cookie); not auth JWT.';
