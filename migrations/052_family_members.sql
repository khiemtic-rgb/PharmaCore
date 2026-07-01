-- Health wallet: family members + medication reminder scope

CREATE TABLE IF NOT EXISTS family_members (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID         NOT NULL REFERENCES tenants(id),
    account_id          UUID         NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    linked_customer_id  UUID         REFERENCES customers(id),
    full_name           VARCHAR(255) NOT NULL,
    phone               VARCHAR(20),
    date_of_birth       DATE,
    gender              SMALLINT,
    relationship        VARCHAR(20)  NOT NULL,
    notes               VARCHAR(255),
    status              SMALLINT     NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_family_members_relationship CHECK (
        relationship IN ('parent', 'child', 'spouse', 'sibling', 'other')
    )
);

CREATE INDEX IF NOT EXISTS ix_family_members_account
    ON family_members (tenant_id, account_id, status, created_at DESC);

CREATE TRIGGER trg_family_members_updated
    BEFORE UPDATE ON family_members
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE medication_reminders
    ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES family_members(id);

CREATE INDEX IF NOT EXISTS ix_medication_reminders_family_member
    ON medication_reminders (tenant_id, family_member_id)
    WHERE family_member_id IS NOT NULL;

INSERT INTO family_members (
    tenant_id,
    account_id,
    linked_customer_id,
    full_name,
    phone,
    date_of_birth,
    relationship,
    notes,
    status
)
SELECT
    t.id,
    ca.id,
    NULL,
    'Nguyen Minh An',
    NULL,
    DATE '2018-09-01',
    'child',
    'Demo family member',
    1
FROM tenants t
INNER JOIN customer_accounts ca
    ON ca.tenant_id = t.id
   AND ca.phone = '0909123456'
WHERE t.tenant_code = 'DEMO_PHARMACY'
  AND t.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM family_members fm
      WHERE fm.account_id = ca.id
        AND fm.full_name = 'Nguyen Minh An'
        AND fm.relationship = 'child'
  );
