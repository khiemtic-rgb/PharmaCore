-- KitPlatform 103: KAP Partner Portal — CTV/consultant accounts, referral attribution, lead pipeline
-- Depends on: 068

CREATE TABLE IF NOT EXISTS assessment_partner (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(32)  NOT NULL,
    name                VARCHAR(255) NOT NULL,
    partner_type        VARCHAR(30)  NOT NULL DEFAULT 'ctv',
    phone               VARCHAR(30),
    email               VARCHAR(255),
    password_hash       TEXT         NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'active',
    commission_rate_pct NUMERIC(5,2),
    notes               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login_at       TIMESTAMPTZ,
    CONSTRAINT uq_assessment_partner_code UNIQUE (code),
    CONSTRAINT ck_assessment_partner_type CHECK (
        partner_type IN ('ctv', 'consultant', 'tdv', 'agency')
    ),
    CONSTRAINT ck_assessment_partner_status CHECK (
        status IN ('active', 'suspended', 'archived')
    )
);

CREATE INDEX IF NOT EXISTS ix_assessment_partner_status
    ON assessment_partner (status, created_at DESC);

ALTER TABLE assessment_submission
    ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES assessment_partner(id);

ALTER TABLE assessment_submission
    ADD COLUMN IF NOT EXISTS lead_pipeline_status VARCHAR(30) NOT NULL DEFAULT 'new';

ALTER TABLE assessment_submission
    ADD COLUMN IF NOT EXISTS commission_status VARCHAR(30) NOT NULL DEFAULT 'none';

DO $$
BEGIN
    ALTER TABLE assessment_submission DROP CONSTRAINT IF EXISTS ck_assessment_submission_source;
    ALTER TABLE assessment_submission
        ADD CONSTRAINT ck_assessment_submission_source CHECK (
            source IN ('public_web', 'admin', 'embed', 'sales', 'partner')
        );
EXCEPTION WHEN others THEN
    RAISE NOTICE 'source constraint refresh skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
    ALTER TABLE assessment_submission DROP CONSTRAINT IF EXISTS ck_assessment_submission_lead_pipeline;
    ALTER TABLE assessment_submission
        ADD CONSTRAINT ck_assessment_submission_lead_pipeline CHECK (
            lead_pipeline_status IN (
                'new', 'contacted', 'demo_scheduled', 'demo_done', 'won', 'lost', 'nurturing'
            )
        );
EXCEPTION WHEN others THEN
    RAISE NOTICE 'lead_pipeline constraint skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
    ALTER TABLE assessment_submission DROP CONSTRAINT IF EXISTS ck_assessment_submission_commission;
    ALTER TABLE assessment_submission
        ADD CONSTRAINT ck_assessment_submission_commission CHECK (
            commission_status IN ('none', 'pending', 'approved', 'paid', 'void')
        );
EXCEPTION WHEN others THEN
    RAISE NOTICE 'commission constraint skipped: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS ix_assessment_submission_partner
    ON assessment_submission (partner_id, started_at DESC)
    WHERE partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_assessment_submission_pipeline
    ON assessment_submission (lead_pipeline_status, lead_captured_at DESC)
    WHERE respondent_phone IS NOT NULL;
