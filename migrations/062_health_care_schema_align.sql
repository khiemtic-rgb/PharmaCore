-- Align legacy health_records / care_reminders columns with P5 schema (053/054).
-- Safe when tables were created from an older pilot schema (CREATE TABLE IF NOT EXISTS skipped 053/054).

-- health_records: add P5 columns and backfill from legacy fields
ALTER TABLE health_records
    ADD COLUMN IF NOT EXISTS summary TEXT,
    ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'health_records'
          AND column_name = 'notes'
    ) THEN
        EXECUTE $sql$
            UPDATE health_records
            SET
                summary = COALESCE(summary, notes),
                provider_name = COALESCE(
                    provider_name,
                    NULLIF(BTRIM(COALESCE(facility_name, doctor_name, '')), '')
                ),
                recorded_at = COALESCE(
                    recorded_at,
                    CASE WHEN record_date IS NOT NULL THEN record_date::timestamptz ELSE NULL END,
                    created_at
                ),
                attachments = CASE
                    WHEN (attachments IS NULL OR attachments = '[]'::jsonb)
                         AND file_url IS NOT NULL
                         AND BTRIM(file_url) <> ''
                    THEN jsonb_build_array(
                        jsonb_build_object('url', BTRIM(file_url), 'name', 'file')
                    )
                    ELSE COALESCE(attachments, '[]'::jsonb)
                END,
                metadata = CASE
                    WHEN metadata IS NULL OR metadata = '{}'::jsonb THEN
                        jsonb_strip_nulls(jsonb_build_object(
                            'department', department,
                            'doctorName', doctor_name,
                            'followUpAt', follow_up_at,
                            'followUpFacility', follow_up_facility,
                            'followUpNotes', follow_up_notes
                        ))
                    ELSE metadata
                END
            WHERE summary IS NULL
               OR recorded_at IS NULL
               OR provider_name IS NULL
               OR attachments IS NULL
               OR metadata IS NULL
               OR notes IS NOT NULL
               OR file_url IS NOT NULL
        $sql$;
    END IF;
END $$;

UPDATE health_records SET recorded_at = created_at WHERE recorded_at IS NULL;

ALTER TABLE health_records
    ALTER COLUMN recorded_at SET DEFAULT NOW();

ALTER TABLE health_records DROP CONSTRAINT IF EXISTS ck_health_records_type;

ALTER TABLE health_records
    ADD CONSTRAINT ck_health_records_type CHECK (
        record_type IN (
            'visit', 'prescription', 'lab', 'allergy', 'diagnosis', 'note', 'other',
            'bmi', 'blood_pressure', 'blood_glucose', 'vaccination'
        )
    );

CREATE INDEX IF NOT EXISTS ix_health_records_lookup
    ON health_records (tenant_id, account_id, recorded_at DESC);

-- care_reminders: add P5 columns and backfill from legacy fields
ALTER TABLE care_reminders
    ADD COLUMN IF NOT EXISTS reminder_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS note VARCHAR(255),
    ADD COLUMN IF NOT EXISTS is_done BOOLEAN,
    ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'care_reminders'
          AND column_name = 'notes'
    ) THEN
        EXECUTE $sql$
            UPDATE care_reminders
            SET
                reminder_type = COALESCE(NULLIF(BTRIM(reminder_type), ''), 'other'),
                note = COALESCE(note, LEFT(notes, 255)),
                is_done = COALESCE(
                    is_done,
                    CASE WHEN is_active = FALSE THEN TRUE ELSE FALSE END
                ),
                done_at = COALESCE(
                    done_at,
                    CASE WHEN is_active = FALSE THEN updated_at ELSE NULL END
                )
            WHERE reminder_type IS NULL
               OR is_done IS NULL
               OR note IS NULL
               OR notes IS NOT NULL
        $sql$;
    END IF;
END $$;

UPDATE care_reminders SET reminder_type = 'other' WHERE reminder_type IS NULL;
UPDATE care_reminders SET is_done = FALSE WHERE is_done IS NULL;

ALTER TABLE care_reminders
    ALTER COLUMN reminder_type SET DEFAULT 'other',
    ALTER COLUMN is_done SET DEFAULT FALSE;

ALTER TABLE care_reminders DROP CONSTRAINT IF EXISTS ck_care_reminders_type;

ALTER TABLE care_reminders
    ADD CONSTRAINT ck_care_reminders_type CHECK (
        reminder_type IN ('medication', 'visit', 'lab', 'exercise', 'nutrition', 'other')
    );

CREATE INDEX IF NOT EXISTS ix_care_reminders_due_v2
    ON care_reminders (tenant_id, account_id, is_done, remind_at ASC);
