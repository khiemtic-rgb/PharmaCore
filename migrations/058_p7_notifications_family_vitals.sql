-- P7: notification categories, family caregiver alerts, health vitals types

ALTER TABLE customer_notifications
    ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'system',
    ADD COLUMN IF NOT EXISTS href VARCHAR(255);

CREATE INDEX IF NOT EXISTS ix_customer_notifications_unread
    ON customer_notifications (tenant_id, customer_id, read_at, created_at DESC);

ALTER TABLE family_members
    ADD COLUMN IF NOT EXISTS notify_caregiver BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE health_records DROP CONSTRAINT IF EXISTS ck_health_records_type;

ALTER TABLE health_records
    ADD CONSTRAINT ck_health_records_type CHECK (
        record_type IN (
            'visit', 'prescription', 'lab', 'allergy', 'diagnosis', 'note', 'other',
            'bmi', 'blood_pressure', 'blood_glucose', 'vaccination'
        )
    );

UPDATE family_members fm
SET notify_caregiver = TRUE
FROM customer_accounts ca
INNER JOIN tenants t ON t.id = ca.tenant_id
WHERE fm.account_id = ca.id
  AND ca.phone = '0909123456'
  AND t.tenant_code = 'DEMO_PHARMACY'
  AND fm.relationship = 'parent';
