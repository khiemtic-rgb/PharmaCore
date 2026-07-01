-- P9: dispatch tracking for care reminders, repurchase, adherence alerts

ALTER TABLE care_reminders
    ADD COLUMN IF NOT EXISTS due_notified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS advance_notified_at TIMESTAMPTZ;

ALTER TABLE repurchase_suggestions
    ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS customer_adherence_alert_dispatches (
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    alert_date  DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, customer_id, alert_date)
);

CREATE INDEX IF NOT EXISTS ix_care_reminders_dispatch_due
    ON care_reminders (tenant_id, is_done, remind_at)
    WHERE is_done = FALSE;

CREATE INDEX IF NOT EXISTS ix_repurchase_suggestions_dispatch
    ON repurchase_suggestions (tenant_id, status, suggested_for_date)
    WHERE status IN ('pending', 'snoozed');
