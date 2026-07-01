-- Health wallet: customer and family health records

CREATE TABLE IF NOT EXISTS health_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID         NOT NULL REFERENCES tenants(id),
    account_id          UUID         NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    family_member_id    UUID         REFERENCES family_members(id) ON DELETE SET NULL,
    record_type         VARCHAR(20)  NOT NULL,
    title               VARCHAR(255) NOT NULL,
    summary             TEXT,
    provider_name       VARCHAR(255),
    recorded_at         TIMESTAMPTZ  NOT NULL,
    attachments         JSONB        NOT NULL DEFAULT '[]'::jsonb,
    metadata            JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_health_records_type CHECK (
        record_type IN ('visit', 'prescription', 'lab', 'allergy', 'diagnosis', 'note', 'other')
    )
);

CREATE INDEX IF NOT EXISTS ix_health_records_lookup
    ON health_records (tenant_id, account_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS ix_health_records_family_member
    ON health_records (tenant_id, family_member_id, recorded_at DESC)
    WHERE family_member_id IS NOT NULL;

CREATE TRIGGER trg_health_records_updated
    BEFORE UPDATE ON health_records
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
