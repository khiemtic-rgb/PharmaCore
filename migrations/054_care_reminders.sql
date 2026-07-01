-- Health wallet: care reminders linked to optional health record

CREATE TABLE IF NOT EXISTS care_reminders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID         NOT NULL REFERENCES tenants(id),
    account_id          UUID         NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    family_member_id    UUID         REFERENCES family_members(id) ON DELETE SET NULL,
    health_record_id    UUID         REFERENCES health_records(id) ON DELETE SET NULL,
    reminder_type       VARCHAR(20)  NOT NULL DEFAULT 'other',
    title               VARCHAR(255) NOT NULL,
    note                VARCHAR(255),
    remind_at           TIMESTAMPTZ  NOT NULL,
    is_done             BOOLEAN      NOT NULL DEFAULT FALSE,
    done_at             TIMESTAMPTZ,
    snoozed_until       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_care_reminders_type CHECK (
        reminder_type IN ('medication', 'visit', 'lab', 'exercise', 'nutrition', 'other')
    )
);

CREATE INDEX IF NOT EXISTS ix_care_reminders_due
    ON care_reminders (tenant_id, account_id, is_done, remind_at ASC);

CREATE INDEX IF NOT EXISTS ix_care_reminders_health_record
    ON care_reminders (health_record_id)
    WHERE health_record_id IS NOT NULL;

CREATE TRIGGER trg_care_reminders_updated
    BEFORE UPDATE ON care_reminders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
