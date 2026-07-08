-- KitPlatform 073: KIT Enterprise Platform Kernel — Phase 2 Organization + Workspace
-- Depends on: 072_kit_core_iam_tenant.sql
-- Pilot-safe: new kit_org + kit_workspace tables + strangler views — public.* unchanged.

-- =============================================================================
-- DOMAIN: Organization — new tables + compatibility views
-- =============================================================================

CREATE TABLE kit_org.org_department (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID,
    branch_id        UUID         REFERENCES public.branches(id),
    parent_id        UUID         REFERENCES kit_org.org_department(id),
    department_code  VARCHAR(50)  NOT NULL,
    department_name  VARCHAR(255) NOT NULL,
    description      TEXT,
    sort_order       INT          NOT NULL DEFAULT 0,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_org_department_code UNIQUE (tenant_id, department_code)
);

CREATE INDEX ix_org_department_tenant ON kit_org.org_department (tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_org_department_branch ON kit_org.org_department (branch_id)
    WHERE branch_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_org_department_row_version
    BEFORE UPDATE ON kit_org.org_department
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

COMMENT ON TABLE kit_org.org_department IS 'Phòng ban — có thể gắn chi nhánh hoặc tenant-wide (branch_id NULL).';

-- ---------------------------------------------------------------------------

CREATE TABLE kit_org.org_position (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID,
    department_id    UUID         REFERENCES kit_org.org_department(id),
    position_code    VARCHAR(50)  NOT NULL,
    position_name    VARCHAR(255) NOT NULL,
    description      TEXT,
    level_rank       INT          NOT NULL DEFAULT 0,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_org_position_code UNIQUE (tenant_id, position_code)
);

CREATE INDEX ix_org_position_tenant ON kit_org.org_position (tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_org_position_row_version
    BEFORE UPDATE ON kit_org.org_position
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE kit_org.org_team (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID,
    department_id    UUID         REFERENCES kit_org.org_department(id),
    team_code        VARCHAR(50)  NOT NULL,
    team_name        VARCHAR(255) NOT NULL,
    description      TEXT,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_org_team_code UNIQUE (tenant_id, team_code)
);

CREATE INDEX ix_org_team_tenant ON kit_org.org_team (tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_org_team_row_version
    BEFORE UPDATE ON kit_org.org_team
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE kit_org.org_team_member (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID,
    team_id          UUID         NOT NULL REFERENCES kit_org.org_team(id),
    employee_id      UUID         NOT NULL REFERENCES public.employees(id),
    role_in_team     VARCHAR(50)  NOT NULL DEFAULT 'member',
    is_leader        BOOLEAN      NOT NULL DEFAULT FALSE,
    joined_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_org_team_member UNIQUE (team_id, employee_id)
);

CREATE INDEX ix_org_team_member_employee ON kit_org.org_team_member (employee_id, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_org_team_member_row_version
    BEFORE UPDATE ON kit_org.org_team_member
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE kit_org.org_contact (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID,
    entity_type      VARCHAR(30)  NOT NULL,
    entity_id        UUID         NOT NULL,
    contact_type     VARCHAR(30)  NOT NULL DEFAULT 'general',
    full_name        VARCHAR(255),
    email            CITEXT,
    phone            VARCHAR(30),
    title            VARCHAR(100),
    is_primary       BOOLEAN      NOT NULL DEFAULT FALSE,
    notes            TEXT,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_org_contact_entity_type CHECK (
        entity_type IN ('organization', 'branch', 'department', 'employee', 'team')
    ),
    CONSTRAINT ck_org_contact_type CHECK (
        contact_type IN ('general', 'billing', 'technical', 'emergency', 'sales')
    )
);

CREATE INDEX ix_org_contact_entity ON kit_org.org_contact (tenant_id, entity_type, entity_id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_org_contact_row_version
    BEFORE UPDATE ON kit_org.org_contact
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

COMMENT ON TABLE kit_org.org_contact IS 'Liên hệ gắn organization/branch/department/employee/team — kernel org spine.';

-- ---------------------------------------------------------------------------
-- Organization strangler views
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW kit_org.org_organization AS
SELECT
    o.id,
    NULL::uuid         AS tenant_id,
    NULL::uuid         AS workspace_id,
    o.org_code,
    o.org_name,
    o.country_code,
    o.settings,
    o.status,
    0                  AS row_version,
    o.created_at,
    NULL::uuid         AS created_by,
    o.updated_at,
    NULL::uuid         AS updated_by,
    o.deleted_at
FROM public.organizations o;

CREATE OR REPLACE VIEW kit_org.org_branch AS
SELECT
    b.id,
    b.tenant_id,
    NULL::uuid         AS workspace_id,
    b.branch_code,
    b.branch_name,
    b.address,
    b.phone,
    b.is_head_office,
    b.branch_type,
    b.locale_code,
    b.settings,
    b.status,
    0                  AS row_version,
    b.created_at,
    NULL::uuid         AS created_by,
    b.updated_at,
    NULL::uuid         AS updated_by,
    b.deleted_at
FROM public.branches b;

CREATE OR REPLACE VIEW kit_org.org_employee AS
SELECT
    e.id,
    e.tenant_id,
    NULL::uuid         AS workspace_id,
    e.employee_code,
    e.full_name,
    e.phone,
    e.email,
    e.hire_date,
    e.status,
    0                  AS row_version,
    e.created_at,
    NULL::uuid         AS created_by,
    e.updated_at,
    NULL::uuid         AS updated_by,
    e.deleted_at
FROM public.employees e;

-- =============================================================================
-- DOMAIN: Workspace (7 tables)
-- =============================================================================

CREATE TABLE kit_workspace.workspace_workspace (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_code   VARCHAR(50)  NOT NULL,
    workspace_name   VARCHAR(255) NOT NULL,
    workspace_type   VARCHAR(30)  NOT NULL DEFAULT 'solution',
    package_code     VARCHAR(50),
    description      TEXT,
    is_default       BOOLEAN      NOT NULL DEFAULT FALSE,
    settings         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_workspace_code UNIQUE (tenant_id, workspace_code),
    CONSTRAINT ck_workspace_type CHECK (
        workspace_type IN ('default', 'solution', 'sandbox', 'shared')
    )
);

CREATE UNIQUE INDEX uq_workspace_default_per_tenant
    ON kit_workspace.workspace_workspace (tenant_id)
    WHERE is_default = TRUE AND deleted_at IS NULL;

CREATE INDEX ix_workspace_tenant ON kit_workspace.workspace_workspace (tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_workspace_workspace_row_version
    BEFORE UPDATE ON kit_workspace.workspace_workspace
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

COMMENT ON TABLE kit_workspace.workspace_workspace IS 'Workspace trong tenant — tách Novixa/CRM/HRM; pilot có 1 default workspace.';

-- Backfill default workspace per active tenant (idempotent)
INSERT INTO kit_workspace.workspace_workspace (
    tenant_id, workspace_code, workspace_name, workspace_type, package_code, is_default, settings
)
SELECT
    t.id,
    'default',
    COALESCE(t.tenant_name, t.tenant_code) || ' — Default',
    'default',
    'novixa_pharmacy',
    TRUE,
    jsonb_build_object('schema_version', 1, 'source', '073_backfill')
FROM public.tenants t
WHERE t.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM kit_workspace.workspace_workspace w
      WHERE w.tenant_id = t.id
        AND w.workspace_code = 'default'
        AND w.deleted_at IS NULL
  );

-- ---------------------------------------------------------------------------

CREATE TABLE kit_workspace.workspace_member (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         NOT NULL REFERENCES kit_workspace.workspace_workspace(id),
    member_type      VARCHAR(20)  NOT NULL DEFAULT 'user',
    user_id          UUID         REFERENCES public.users(id),
    employee_id      UUID         REFERENCES public.employees(id),
    role_code        VARCHAR(50)  NOT NULL DEFAULT 'member',
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_workspace_member_type CHECK (member_type IN ('user', 'employee', 'service')),
    CONSTRAINT ck_workspace_member_ref CHECK (
        (member_type = 'user' AND user_id IS NOT NULL)
        OR (member_type = 'employee' AND employee_id IS NOT NULL)
        OR (member_type = 'service' AND user_id IS NULL AND employee_id IS NULL)
    )
);

CREATE UNIQUE INDEX uq_workspace_member_user
    ON kit_workspace.workspace_member (workspace_id, user_id)
    WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX uq_workspace_member_employee
    ON kit_workspace.workspace_member (workspace_id, employee_id)
    WHERE employee_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX ix_workspace_member_tenant ON kit_workspace.workspace_member (tenant_id, workspace_id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_workspace_member_row_version
    BEFORE UPDATE ON kit_workspace.workspace_member
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- Backfill: all active users → default workspace member
INSERT INTO kit_workspace.workspace_member (tenant_id, workspace_id, member_type, user_id, role_code)
SELECT
    u.tenant_id,
    w.id,
    'user',
    u.id,
    CASE WHEN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id AND r.role_code = 'ADMIN'
    ) THEN 'admin' ELSE 'member' END
FROM public.users u
JOIN kit_workspace.workspace_workspace w
    ON w.tenant_id = u.tenant_id AND w.workspace_code = 'default' AND w.deleted_at IS NULL
WHERE u.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM kit_workspace.workspace_member m
      WHERE m.workspace_id = w.id AND m.user_id = u.id AND m.deleted_at IS NULL
  );

-- ---------------------------------------------------------------------------

CREATE TABLE kit_workspace.workspace_group (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         NOT NULL REFERENCES kit_workspace.workspace_workspace(id),
    group_code       VARCHAR(50)  NOT NULL,
    group_name       VARCHAR(255) NOT NULL,
    description      TEXT,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_workspace_group_code UNIQUE (workspace_id, group_code)
);

CREATE INDEX ix_workspace_group_tenant ON kit_workspace.workspace_group (tenant_id, workspace_id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_workspace_group_row_version
    BEFORE UPDATE ON kit_workspace.workspace_group
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE kit_workspace.workspace_group_member (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         NOT NULL REFERENCES kit_workspace.workspace_workspace(id),
    group_id         UUID         NOT NULL REFERENCES kit_workspace.workspace_group(id),
    member_id        UUID         NOT NULL REFERENCES kit_workspace.workspace_member(id),
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_workspace_group_member UNIQUE (group_id, member_id)
);

CREATE TRIGGER trg_workspace_group_member_row_version
    BEFORE UPDATE ON kit_workspace.workspace_group_member
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE kit_workspace.workspace_setting (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         NOT NULL REFERENCES kit_workspace.workspace_workspace(id),
    setting_key      VARCHAR(150) NOT NULL,
    setting_value    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    value_type       VARCHAR(20)  NOT NULL DEFAULT 'json',
    is_encrypted     BOOLEAN      NOT NULL DEFAULT FALSE,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_workspace_setting_key UNIQUE (workspace_id, setting_key)
);

CREATE INDEX ix_workspace_setting_tenant ON kit_workspace.workspace_setting (tenant_id, workspace_id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_workspace_setting_row_version
    BEFORE UPDATE ON kit_workspace.workspace_setting
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- Seed default workspace settings from tenants.settings.platform (idempotent)
INSERT INTO kit_workspace.workspace_setting (tenant_id, workspace_id, setting_key, setting_value)
SELECT
    t.id,
    w.id,
    'platform.modules',
    COALESCE(t.settings->'platform'->'enabled_modules', '[]'::jsonb)
FROM public.tenants t
JOIN kit_workspace.workspace_workspace w
    ON w.tenant_id = t.id AND w.is_default = TRUE AND w.deleted_at IS NULL
WHERE t.deleted_at IS NULL
ON CONFLICT (workspace_id, setting_key) DO NOTHING;

-- ---------------------------------------------------------------------------

CREATE TABLE kit_workspace.workspace_sequence (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         NOT NULL REFERENCES kit_workspace.workspace_workspace(id),
    sequence_code    VARCHAR(50)  NOT NULL,
    sequence_name    VARCHAR(255) NOT NULL,
    prefix           VARCHAR(30),
    suffix           VARCHAR(30),
    padding_length   INT          NOT NULL DEFAULT 6,
    current_value    BIGINT       NOT NULL DEFAULT 0,
    increment_by     INT          NOT NULL DEFAULT 1,
    reset_policy     VARCHAR(20)  NOT NULL DEFAULT 'never',
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_workspace_sequence_code UNIQUE (workspace_id, sequence_code),
    CONSTRAINT ck_workspace_sequence_reset CHECK (
        reset_policy IN ('never', 'daily', 'monthly', 'yearly')
    )
);

CREATE TRIGGER trg_workspace_sequence_row_version
    BEFORE UPDATE ON kit_workspace.workspace_sequence
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- Default document sequences for pilot workspace
INSERT INTO kit_workspace.workspace_sequence (
    tenant_id, workspace_id, sequence_code, sequence_name, prefix, padding_length
)
SELECT
    w.tenant_id,
    w.id,
    seq.code,
    seq.name,
    seq.prefix,
    6
FROM kit_workspace.workspace_workspace w
CROSS JOIN (
    VALUES
        ('sales_order', 'Sales Order Number', 'SO'),
        ('purchase_order', 'Purchase Order Number', 'PO'),
        ('invoice', 'Invoice Number', 'INV')
) AS seq(code, name, prefix)
WHERE w.is_default = TRUE AND w.deleted_at IS NULL
ON CONFLICT (workspace_id, sequence_code) DO NOTHING;

-- ---------------------------------------------------------------------------

CREATE TABLE kit_workspace.workspace_calendar (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         NOT NULL REFERENCES kit_workspace.workspace_workspace(id),
    calendar_code    VARCHAR(50)  NOT NULL,
    calendar_name    VARCHAR(255) NOT NULL,
    timezone         VARCHAR(50)  NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    week_start       SMALLINT     NOT NULL DEFAULT 1,
    business_days    SMALLINT[]   NOT NULL DEFAULT ARRAY[1,2,3,4,5,6]::smallint[],
    holidays         JSONB        NOT NULL DEFAULT '[]'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_workspace_calendar_code UNIQUE (workspace_id, calendar_code),
    CONSTRAINT ck_workspace_calendar_week_start CHECK (week_start BETWEEN 0 AND 6)
);

CREATE TRIGGER trg_workspace_calendar_row_version
    BEFORE UPDATE ON kit_workspace.workspace_calendar
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

INSERT INTO kit_workspace.workspace_calendar (
    tenant_id, workspace_id, calendar_code, calendar_name, timezone, business_days
)
SELECT
    w.tenant_id,
    w.id,
    'default',
    'Business Calendar',
    COALESCE(t.timezone, 'Asia/Ho_Chi_Minh'),
    ARRAY[1,2,3,4,5,6]::smallint[]
FROM kit_workspace.workspace_workspace w
JOIN public.tenants t ON t.id = w.tenant_id
WHERE w.is_default = TRUE AND w.deleted_at IS NULL
ON CONFLICT (workspace_id, calendar_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Link org_department.workspace_id + org tables FK to workspace (deferred FK)
-- ---------------------------------------------------------------------------
ALTER TABLE kit_org.org_department
    ADD CONSTRAINT fk_org_department_workspace
    FOREIGN KEY (workspace_id) REFERENCES kit_workspace.workspace_workspace(id);

ALTER TABLE kit_org.org_position
    ADD CONSTRAINT fk_org_position_workspace
    FOREIGN KEY (workspace_id) REFERENCES kit_workspace.workspace_workspace(id);

ALTER TABLE kit_org.org_team
    ADD CONSTRAINT fk_org_team_workspace
    FOREIGN KEY (workspace_id) REFERENCES kit_workspace.workspace_workspace(id);

ALTER TABLE kit_org.org_team_member
    ADD CONSTRAINT fk_org_team_member_workspace
    FOREIGN KEY (workspace_id) REFERENCES kit_workspace.workspace_workspace(id);

ALTER TABLE kit_org.org_contact
    ADD CONSTRAINT fk_org_contact_workspace
    FOREIGN KEY (workspace_id) REFERENCES kit_workspace.workspace_workspace(id);

-- Backfill workspace_id on org tables where NULL → tenant default workspace
UPDATE kit_org.org_department d
SET workspace_id = w.id, updated_at = NOW()
FROM kit_workspace.workspace_workspace w
WHERE d.workspace_id IS NULL
  AND w.tenant_id = d.tenant_id
  AND w.is_default = TRUE
  AND w.deleted_at IS NULL;

-- =============================================================================
-- Post-apply: registry + kernel version
-- =============================================================================

UPDATE kit_core.kernel_table_registry SET registry_status = 'EXISTS', updated_at = NOW()
WHERE table_name IN (
    'org_department', 'org_position', 'org_team', 'org_team_member', 'org_contact',
    'workspace_workspace', 'workspace_member', 'workspace_group', 'workspace_group_member',
    'workspace_setting', 'workspace_sequence', 'workspace_calendar'
);

UPDATE kit_core.kernel_table_registry SET registry_status = 'VIEW', updated_at = NOW()
WHERE table_name IN ('org_organization', 'org_branch', 'org_employee');

UPDATE kit_core.platform_kernel_version SET
    kernel_phase = 'P2',
    last_migration = '073_kit_org_workspace',
    schema_version = 3,
    notes = 'Phase 2: Organization 5 new + 3 views; Workspace 7 tables; default workspace backfill.',
    updated_at = NOW()
WHERE id = 1;
