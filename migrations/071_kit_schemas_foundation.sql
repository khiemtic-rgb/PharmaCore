-- KitPlatform 071: KIT Enterprise Platform Kernel — Phase 0 foundation
-- Additive only — pilot Novixa unchanged; new kit_* schemas + registry + helpers.
-- Spec: KIT Enterprise Platform Core Database Architecture (82 kernel tables target)

-- ---------------------------------------------------------------------------
-- 1. Kernel schemas (empty shells — tables added in 072+)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS kit_core;
CREATE SCHEMA IF NOT EXISTS kit_iam;
CREATE SCHEMA IF NOT EXISTS kit_org;
CREATE SCHEMA IF NOT EXISTS kit_tenant;
CREATE SCHEMA IF NOT EXISTS kit_workspace;
CREATE SCHEMA IF NOT EXISTS kit_meta;
CREATE SCHEMA IF NOT EXISTS kit_common;
CREATE SCHEMA IF NOT EXISTS kit_workflow;
CREATE SCHEMA IF NOT EXISTS kit_storage;
CREATE SCHEMA IF NOT EXISTS kit_notify;
CREATE SCHEMA IF NOT EXISTS kit_audit;
CREATE SCHEMA IF NOT EXISTS kit_event;
CREATE SCHEMA IF NOT EXISTS kit_integration;
CREATE SCHEMA IF NOT EXISTS kit_ai;

COMMENT ON SCHEMA kit_core IS 'Core master data: platform, language, currency, geo, settings.';
COMMENT ON SCHEMA kit_iam IS 'Identity & access: users, roles, sessions, API keys.';
COMMENT ON SCHEMA kit_org IS 'Organization structure: org, branch, department, employee, team.';
COMMENT ON SCHEMA kit_tenant IS 'Tenant SaaS: subscription, package, feature, license.';
COMMENT ON SCHEMA kit_workspace IS 'Workspace isolation within tenant (multi-solution).';
COMMENT ON SCHEMA kit_meta IS 'Metadata-driven entity/field/form definitions.';
COMMENT ON SCHEMA kit_common IS 'Shared objects: address, contact, tag, task, approval.';
COMMENT ON SCHEMA kit_workflow IS 'Workflow engine definitions and instances.';
COMMENT ON SCHEMA kit_storage IS 'Generic file storage and attachments.';
COMMENT ON SCHEMA kit_notify IS 'Notification templates, queue, recipients.';
COMMENT ON SCHEMA kit_audit IS 'Audit, activity, change logs.';
COMMENT ON SCHEMA kit_event IS 'Unified platform event bus (future merge with platform_events).';
COMMENT ON SCHEMA kit_integration IS 'Connectors, webhooks, sync jobs.';
COMMENT ON SCHEMA kit_ai IS 'AI agents, prompts, conversations, tools.';

-- ---------------------------------------------------------------------------
-- 2. UUID v7 generator (no superuser extension required — uses pgcrypto)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kit_uuid_v7()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE PARALLEL SAFE
AS $$
DECLARE
    unix_ts_ms bytea;
    rand_a     bytea;
    rand_b     bytea;
    uuid_bytes bytea;
BEGIN
    unix_ts_ms := substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3);
    rand_a     := gen_random_bytes(2);
    rand_b     := gen_random_bytes(8);
    uuid_bytes := unix_ts_ms || rand_a || rand_b;
    uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
    uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
    RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$;

COMMENT ON FUNCTION kit_uuid_v7() IS 'RFC 9562 UUID v7 — time-sortable IDs for new kernel tables. Legacy public.* keeps gen_random_uuid().';

-- ---------------------------------------------------------------------------
-- 3. Kernel column standard — triggers for mutable tables (072+)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kit_bump_row_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.row_version := COALESCE(OLD.row_version, 0) + 1;
    NEW.updated_at  := NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION kit_bump_row_version() IS 'Optimistic lock trigger — attach BEFORE UPDATE on kit_* mutable tables.';

-- Standard columns for new kernel mutable tables:
--   id              UUID PRIMARY KEY DEFAULT kit_uuid_v7()
--   tenant_id       UUID NOT NULL REFERENCES public.tenants(id)
--   workspace_id    UUID NULL  (required from Phase 2 onward on tenant-scoped data)
--   row_version     INT  NOT NULL DEFAULT 0
--   created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
--   created_by      UUID NULL
--   updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
--   updated_by      UUID NULL
--   deleted_at      TIMESTAMPTZ NULL

-- ---------------------------------------------------------------------------
-- 4. Platform kernel version tracker
-- ---------------------------------------------------------------------------
CREATE TABLE kit_core.platform_kernel_version (
    id               SMALLINT     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    schema_version   INT          NOT NULL DEFAULT 1,
    kernel_phase     VARCHAR(10)  NOT NULL DEFAULT 'P0',
    last_migration   VARCHAR(100) NOT NULL DEFAULT '071_kit_schemas_foundation',
    excel_table_target INT        NOT NULL DEFAULT 82,
    notes            TEXT,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO kit_core.platform_kernel_version (schema_version, kernel_phase, last_migration, notes)
VALUES (
    1,
    'P0',
    '071_kit_schemas_foundation',
    'Phase 0: kit_* schemas, UUID v7, kernel_table_registry (82 rows). Pilot public.* unchanged.'
)
ON CONFLICT (id) DO UPDATE SET
    schema_version = EXCLUDED.schema_version,
    kernel_phase   = EXCLUDED.kernel_phase,
    last_migration = EXCLUDED.last_migration,
    notes          = EXCLUDED.notes,
    updated_at     = NOW();

-- ---------------------------------------------------------------------------
-- 5. Kernel table registry — 82 target tables (Excel KIT_Enterprise_Kernel)
-- ---------------------------------------------------------------------------
CREATE TABLE kit_core.kernel_table_registry (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    sort_order       INT          NOT NULL,
    domain_name      VARCHAR(50)  NOT NULL,
    table_name       VARCHAR(100) NOT NULL,
    schema_name      VARCHAR(50)  NOT NULL,
    registry_status  VARCHAR(20)  NOT NULL,
    legacy_schema    VARCHAR(50),
    legacy_table     VARCHAR(100),
    target_phase     VARCHAR(10)  NOT NULL,
    notes            TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_kernel_table_registry UNIQUE (domain_name, table_name),
    CONSTRAINT ck_kernel_table_registry_status CHECK (
        registry_status IN ('EXISTS', 'MAP', 'MISSING', 'VIEW', 'LEGACY', 'PARTIAL')
    )
);

CREATE INDEX ix_kernel_table_registry_phase
    ON kit_core.kernel_table_registry (target_phase, registry_status);

CREATE INDEX ix_kernel_table_registry_schema
    ON kit_core.kernel_table_registry (schema_name, table_name);

CREATE TRIGGER trg_kernel_table_registry_updated
    BEFORE UPDATE ON kit_core.kernel_table_registry
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE kit_core.kernel_table_registry IS 'Authoritative map: Excel 82 kernel tables → implementation status. Update when applying 072+.';

INSERT INTO kit_core.kernel_table_registry
    (sort_order, domain_name, table_name, schema_name, registry_status, legacy_schema, legacy_table, target_phase, notes)
VALUES
    ( 1, 'Core', 'core_platform', 'kit_core', 'MISSING', 'public', 'platform_module_registry', 'P1', 'Partial module registry metadata'),
    ( 2, 'Core', 'core_language', 'kit_core', 'MAP', 'public', 'platform_locales', 'P1', 'Locale master'),
    ( 3, 'Core', 'core_currency', 'kit_core', 'PARTIAL', 'public', 'tenants', 'P1', 'default_currency column only'),
    ( 4, 'Core', 'core_country', 'kit_core', 'PARTIAL', 'public', 'tenants', 'P1', 'country_code on tenants/orgs'),
    ( 5, 'Core', 'core_province', 'kit_core', 'MISSING', NULL, NULL, 'P1', 'VN geo hierarchy'),
    ( 6, 'Core', 'core_district', 'kit_core', 'MISSING', NULL, NULL, 'P1', 'VN geo hierarchy'),
    ( 7, 'Core', 'core_ward', 'kit_core', 'MISSING', NULL, NULL, 'P1', 'VN geo hierarchy'),
    ( 8, 'Core', 'core_setting', 'kit_core', 'MAP', 'public', 'tenants', 'P1', 'settings JSONB + branches.settings'),
    ( 9, 'IAM', 'iam_user', 'kit_iam', 'MAP', 'public', 'users', 'P1', 'Strangler view in 072'),
    (10, 'IAM', 'iam_role', 'kit_iam', 'MAP', 'public', 'roles', 'P1', NULL),
    (11, 'IAM', 'iam_permission', 'kit_iam', 'MAP', 'public', 'permissions', 'P1', 'Global permission catalog'),
    (12, 'IAM', 'iam_user_role', 'kit_iam', 'MAP', 'public', 'user_roles', 'P1', NULL),
    (13, 'IAM', 'iam_role_permission', 'kit_iam', 'MAP', 'public', 'role_permissions', 'P1', NULL),
    (14, 'IAM', 'iam_session', 'kit_iam', 'PARTIAL', 'public', 'refresh_tokens', 'P1', 'JWT refresh only'),
    (15, 'IAM', 'iam_api_key', 'kit_iam', 'MISSING', NULL, NULL, 'P1', 'Partner/integration keys'),
    (16, 'IAM', 'iam_device', 'kit_iam', 'MISSING', NULL, NULL, 'P1', 'Trusted devices'),
    (17, 'IAM', 'iam_login_history', 'kit_iam', 'MISSING', NULL, NULL, 'P1', 'Auth audit trail'),
    (18, 'IAM', 'iam_claim', 'kit_iam', 'MISSING', NULL, NULL, 'P1', 'ABAC claims'),
    (19, 'Organization', 'org_organization', 'kit_org', 'MAP', 'public', 'organizations', 'P2', NULL),
    (20, 'Organization', 'org_branch', 'kit_org', 'MAP', 'public', 'branches', 'P2', NULL),
    (21, 'Organization', 'org_department', 'kit_org', 'MISSING', NULL, NULL, 'P2', NULL),
    (22, 'Organization', 'org_position', 'kit_org', 'MISSING', NULL, NULL, 'P2', NULL),
    (23, 'Organization', 'org_employee', 'kit_org', 'MAP', 'public', 'employees', 'P2', NULL),
    (24, 'Organization', 'org_team', 'kit_org', 'MISSING', NULL, NULL, 'P2', NULL),
    (25, 'Organization', 'org_team_member', 'kit_org', 'MISSING', NULL, NULL, 'P2', NULL),
    (26, 'Organization', 'org_contact', 'kit_org', 'MISSING', NULL, NULL, 'P2', NULL),
    (27, 'Tenant', 'tenant_tenant', 'kit_tenant', 'MAP', 'public', 'tenants', 'P1', NULL),
    (28, 'Tenant', 'tenant_subscription', 'kit_tenant', 'MISSING', NULL, NULL, 'P1', 'SaaS billing cycle'),
    (29, 'Tenant', 'tenant_package', 'kit_tenant', 'PARTIAL', 'public', 'platform_module_registry', 'P1', 'Module pack metadata'),
    (30, 'Tenant', 'tenant_feature', 'kit_tenant', 'PARTIAL', 'public', 'tenants', 'P1', 'settings.platform.features JSONB'),
    (31, 'Tenant', 'tenant_license', 'kit_tenant', 'MISSING', NULL, NULL, 'P1', 'License keys/limits'),
    (32, 'Workspace', 'workspace_workspace', 'kit_workspace', 'MISSING', NULL, NULL, 'P2', 'Multi-solution within tenant'),
    (33, 'Workspace', 'workspace_member', 'kit_workspace', 'MISSING', NULL, NULL, 'P2', NULL),
    (34, 'Workspace', 'workspace_group', 'kit_workspace', 'MISSING', NULL, NULL, 'P2', NULL),
    (35, 'Workspace', 'workspace_group_member', 'kit_workspace', 'MISSING', NULL, NULL, 'P2', NULL),
    (36, 'Workspace', 'workspace_setting', 'kit_workspace', 'MISSING', NULL, NULL, 'P2', NULL),
    (37, 'Workspace', 'workspace_sequence', 'kit_workspace', 'MISSING', NULL, NULL, 'P2', 'Document numbering'),
    (38, 'Workspace', 'workspace_calendar', 'kit_workspace', 'MISSING', NULL, NULL, 'P2', 'Business calendar'),
    (39, 'Metadata', 'meta_entity', 'kit_meta', 'MISSING', NULL, NULL, 'P4', NULL),
    (40, 'Metadata', 'meta_field', 'kit_meta', 'MISSING', NULL, NULL, 'P4', NULL),
    (41, 'Metadata', 'meta_relationship', 'kit_meta', 'MISSING', NULL, NULL, 'P4', NULL),
    (42, 'Metadata', 'meta_enum', 'kit_meta', 'MISSING', NULL, NULL, 'P4', NULL),
    (43, 'Metadata', 'meta_enum_item', 'kit_meta', 'MISSING', NULL, NULL, 'P4', NULL),
    (44, 'Metadata', 'meta_form', 'kit_meta', 'MISSING', NULL, NULL, 'P4', NULL),
    (45, 'Metadata', 'meta_grid', 'kit_meta', 'MISSING', NULL, NULL, 'P4', NULL),
    (46, 'Metadata', 'meta_validation', 'kit_meta', 'MISSING', NULL, NULL, 'P4', NULL),
    (47, 'Workflow', 'workflow_definition', 'kit_workflow', 'MISSING', NULL, NULL, 'P6', NULL),
    (48, 'Workflow', 'workflow_step', 'kit_workflow', 'MISSING', NULL, NULL, 'P6', NULL),
    (49, 'Workflow', 'workflow_transition', 'kit_workflow', 'MISSING', NULL, NULL, 'P6', NULL),
    (50, 'Workflow', 'workflow_instance', 'kit_workflow', 'MISSING', NULL, NULL, 'P6', NULL),
    (51, 'Workflow', 'workflow_task', 'kit_workflow', 'MISSING', NULL, NULL, 'P6', NULL),
    (52, 'Workflow', 'workflow_history', 'kit_workflow', 'MISSING', NULL, NULL, 'P6', NULL),
    (53, 'Storage', 'storage_file', 'kit_storage', 'MISSING', NULL, NULL, 'P3', NULL),
    (54, 'Storage', 'storage_folder', 'kit_storage', 'MISSING', NULL, NULL, 'P3', NULL),
    (55, 'Storage', 'storage_attachment', 'kit_storage', 'PARTIAL', 'public', 'product_images', 'P3', 'Product-scoped only'),
    (56, 'Storage', 'storage_blob', 'kit_storage', 'MISSING', NULL, NULL, 'P3', NULL),
    (57, 'Notification', 'notify_template', 'kit_notify', 'MISSING', NULL, NULL, 'P5', NULL),
    (58, 'Notification', 'notify_notification', 'kit_notify', 'PARTIAL', 'public', 'customer_notifications', 'P5', 'Customer channel only'),
    (59, 'Notification', 'notify_recipient', 'kit_notify', 'MISSING', NULL, NULL, 'P5', NULL),
    (60, 'Notification', 'notify_queue', 'kit_notify', 'MISSING', NULL, NULL, 'P5', NULL),
    (61, 'Audit', 'audit_log', 'kit_audit', 'MAP', 'public', 'audit_logs', 'P5', NULL),
    (62, 'Audit', 'activity_log', 'kit_audit', 'MISSING', NULL, NULL, 'P5', 'User activity timeline'),
    (63, 'Audit', 'change_log', 'kit_audit', 'MISSING', NULL, NULL, 'P5', 'Field-level CDC'),
    (64, 'Integration', 'integration_connector', 'kit_integration', 'MISSING', NULL, NULL, 'P6', NULL),
    (65, 'Integration', 'integration_webhook', 'kit_integration', 'PARTIAL', 'public', 'integration_outbox', 'P5', 'Outbound CDP only'),
    (66, 'Integration', 'integration_api_client', 'kit_integration', 'MISSING', NULL, NULL, 'P6', NULL),
    (67, 'Integration', 'integration_sync_job', 'kit_integration', 'MISSING', NULL, NULL, 'P6', NULL),
    (68, 'AI', 'ai_agent', 'kit_ai', 'MISSING', NULL, NULL, 'P6', 'Code-only IAiOrchestrator'),
    (69, 'AI', 'ai_prompt', 'kit_ai', 'MISSING', NULL, NULL, 'P6', NULL),
    (70, 'AI', 'ai_conversation', 'kit_ai', 'MISSING', NULL, NULL, 'P6', NULL),
    (71, 'AI', 'ai_memory', 'kit_ai', 'MISSING', NULL, NULL, 'P6', NULL),
    (72, 'AI', 'ai_tool', 'kit_ai', 'MISSING', NULL, NULL, 'P6', NULL),
    (73, 'Common', 'common_address', 'kit_common', 'PARTIAL', 'public', 'customer_addresses', 'P3', 'Not generic party-linked'),
    (74, 'Common', 'common_contact', 'kit_common', 'MISSING', NULL, NULL, 'P3', 'Scattered phone/email columns'),
    (75, 'Common', 'common_document', 'kit_common', 'MISSING', NULL, NULL, 'P3', NULL),
    (76, 'Common', 'common_comment', 'kit_common', 'MISSING', NULL, NULL, 'P3', NULL),
    (77, 'Common', 'common_tag', 'kit_common', 'MISSING', NULL, NULL, 'P3', NULL),
    (78, 'Common', 'common_category', 'kit_common', 'PARTIAL', 'public', 'product_categories', 'P3', 'Catalog-scoped'),
    (79, 'Common', 'common_task', 'kit_common', 'MISSING', NULL, NULL, 'P3', NULL),
    (80, 'Common', 'common_approval', 'kit_common', 'MISSING', NULL, NULL, 'P3', NULL),
    (81, 'Common', 'common_note', 'kit_common', 'MISSING', NULL, NULL, 'P3', NULL),
    (82, 'Common', 'common_label', 'kit_common', 'MISSING', NULL, NULL, 'P3', NULL)
ON CONFLICT (domain_name, table_name) DO NOTHING;
