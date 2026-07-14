-- KitPlatform 132: Success P2-02 — checklist mở/đóng ca (thin Process wedge)
-- Distinct from sales_shifts (cash register) and GPP settings checklist.

CREATE TABLE IF NOT EXISTS success_shift_checklist_template (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID         NOT NULL REFERENCES tenants(id),
    kind        VARCHAR(20)  NOT NULL,
    title       VARCHAR(120) NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_success_shift_checklist_template_kind CHECK (kind IN ('open', 'close'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_success_shift_checklist_template_tenant_kind
    ON success_shift_checklist_template (tenant_id, kind)
    WHERE is_active;

CREATE TABLE IF NOT EXISTS success_shift_checklist_template_item (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id  UUID         NOT NULL REFERENCES success_shift_checklist_template(id) ON DELETE CASCADE,
    sort_order   INT          NOT NULL DEFAULT 0,
    label        VARCHAR(255) NOT NULL,
    is_required  BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ix_success_shift_checklist_template_item_template
    ON success_shift_checklist_template_item (template_id, sort_order);

CREATE TABLE IF NOT EXISTS success_shift_checklist_run (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID         NOT NULL REFERENCES tenants(id),
    branch_id            UUID         NOT NULL REFERENCES branches(id),
    template_id          UUID         NOT NULL REFERENCES success_shift_checklist_template(id),
    kind                 VARCHAR(20)  NOT NULL,
    business_date        DATE         NOT NULL,
    status               VARCHAR(20)  NOT NULL DEFAULT 'in_progress',
    started_by_user_id   UUID         NOT NULL,
    started_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_by_user_id UUID,
    completed_at         TIMESTAMPTZ,
    CONSTRAINT ck_success_shift_checklist_run_kind CHECK (kind IN ('open', 'close')),
    CONSTRAINT ck_success_shift_checklist_run_status CHECK (status IN ('in_progress', 'completed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_success_shift_checklist_run_day
    ON success_shift_checklist_run (tenant_id, branch_id, kind, business_date);

CREATE INDEX IF NOT EXISTS ix_success_shift_checklist_run_branch_day
    ON success_shift_checklist_run (tenant_id, branch_id, business_date);

CREATE TABLE IF NOT EXISTS success_shift_checklist_run_item (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id              UUID         NOT NULL REFERENCES success_shift_checklist_run(id) ON DELETE CASCADE,
    template_item_id    UUID         REFERENCES success_shift_checklist_template_item(id) ON DELETE SET NULL,
    sort_order          INT          NOT NULL DEFAULT 0,
    label               VARCHAR(255) NOT NULL,
    is_required         BOOLEAN      NOT NULL DEFAULT TRUE,
    is_checked          BOOLEAN      NOT NULL DEFAULT FALSE,
    checked_by_user_id  UUID,
    checked_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_success_shift_checklist_run_item_run
    ON success_shift_checklist_run_item (run_id, sort_order);

COMMENT ON TABLE success_shift_checklist_run IS
    'Success P2-02: per-branch open/close ops checklist for a VN business day (not cash sales_shifts).';
