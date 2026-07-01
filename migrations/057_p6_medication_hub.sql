-- P6: medication adherence events for interactive reminders

CREATE TABLE IF NOT EXISTS medication_adherence_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID         NOT NULL REFERENCES tenants(id),
    customer_id             UUID         NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    medication_reminder_id  UUID         REFERENCES medication_reminders(id) ON DELETE SET NULL,
    product_id              UUID         NOT NULL REFERENCES products(id),
    family_member_id        UUID         REFERENCES family_members(id) ON DELETE SET NULL,
    scheduled_at            TIMESTAMPTZ  NOT NULL,
    response                VARCHAR(20)  NOT NULL,
    snooze_minutes          INT,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_medication_adherence_response CHECK (
        response IN ('taken', 'skipped', 'snoozed')
    )
);

CREATE INDEX IF NOT EXISTS ix_medication_adherence_customer
    ON medication_adherence_events (tenant_id, customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_medication_adherence_reminder
    ON medication_adherence_events (medication_reminder_id, created_at DESC)
    WHERE medication_reminder_id IS NOT NULL;
