-- KitPlatform 072: KIT Enterprise Platform Kernel — Phase 1 Core + IAM + Tenant
-- Depends on: 071_kit_schemas_foundation.sql
-- Pilot-safe: new kit_* tables + READ-ONLY views over public.* — no rename/drop.
-- =============================================================================
-- DOMAIN: Core (8 tables)
-- =============================================================================

CREATE TABLE kit_core.core_platform (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    platform_code    VARCHAR(50)  NOT NULL,
    platform_name    VARCHAR(255) NOT NULL,
    platform_version VARCHAR(20)  NOT NULL DEFAULT '1.0.0',
    environment      VARCHAR(20)  NOT NULL DEFAULT 'production',
    settings         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_core_platform_code UNIQUE (platform_code),
    CONSTRAINT ck_core_platform_env CHECK (environment IN ('development', 'staging', 'production'))
);

CREATE TRIGGER trg_core_platform_row_version
    BEFORE UPDATE ON kit_core.core_platform
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

COMMENT ON TABLE kit_core.core_platform IS 'Platform instance metadata (global, no tenant_id).';

INSERT INTO kit_core.core_platform (platform_code, platform_name, platform_version, environment, settings)
VALUES ('kit_enterprise', 'KIT Enterprise Platform', '1.0.0', 'production', '{"kernel_phase":"P1"}'::jsonb)
ON CONFLICT (platform_code) DO NOTHING;

-- ---------------------------------------------------------------------------

CREATE TABLE kit_core.core_language (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    language_code    CHAR(2)      NOT NULL,
    locale_code      VARCHAR(10)  NOT NULL,
    display_name     VARCHAR(100) NOT NULL,
    native_name      VARCHAR(100),
    is_rtl           BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order       INT          NOT NULL DEFAULT 0,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_core_language_locale UNIQUE (locale_code)
);

CREATE TRIGGER trg_core_language_row_version
    BEFORE UPDATE ON kit_core.core_language
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- Seed from existing platform_locales (idempotent)
INSERT INTO kit_core.core_language (locale_code, language_code, display_name, is_rtl, status)
SELECT locale_code, language_code, display_name, is_rtl, status
FROM public.platform_locales
ON CONFLICT (locale_code) DO NOTHING;

-- ---------------------------------------------------------------------------

CREATE TABLE kit_core.core_currency (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    currency_code    CHAR(3)      NOT NULL,
    currency_name    VARCHAR(100) NOT NULL,
    symbol           VARCHAR(10),
    decimal_places   SMALLINT     NOT NULL DEFAULT 2,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_core_currency_code UNIQUE (currency_code)
);

CREATE TRIGGER trg_core_currency_row_version
    BEFORE UPDATE ON kit_core.core_currency
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

INSERT INTO kit_core.core_currency (currency_code, currency_name, symbol, decimal_places)
VALUES ('VND', 'Vietnamese Dong', '₫', 0)
ON CONFLICT (currency_code) DO NOTHING;

-- ---------------------------------------------------------------------------

CREATE TABLE kit_core.core_country (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    country_code     CHAR(2)      NOT NULL,
    country_name     VARCHAR(100) NOT NULL,
    iso3_code        CHAR(3),
    phone_prefix     VARCHAR(10),
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_core_country_code UNIQUE (country_code)
);

CREATE TRIGGER trg_core_country_row_version
    BEFORE UPDATE ON kit_core.core_country
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

INSERT INTO kit_core.core_country (country_code, country_name, iso3_code, phone_prefix)
VALUES ('VN', 'Viet Nam', 'VNM', '+84')
ON CONFLICT (country_code) DO NOTHING;

-- ---------------------------------------------------------------------------

CREATE TABLE kit_core.core_province (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    country_code     CHAR(2)      NOT NULL REFERENCES kit_core.core_country(country_code),
    province_code    VARCHAR(20)  NOT NULL,
    province_name    VARCHAR(150) NOT NULL,
    province_type    VARCHAR(30),
    sort_order       INT          NOT NULL DEFAULT 0,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_core_province_code UNIQUE (country_code, province_code)
);

CREATE INDEX ix_core_province_country ON kit_core.core_province (country_code, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_core_province_row_version
    BEFORE UPDATE ON kit_core.core_province
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE kit_core.core_district (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    province_id      UUID         NOT NULL REFERENCES kit_core.core_province(id),
    district_code    VARCHAR(20)  NOT NULL,
    district_name    VARCHAR(150) NOT NULL,
    district_type    VARCHAR(30),
    sort_order       INT          NOT NULL DEFAULT 0,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_core_district_code UNIQUE (province_id, district_code)
);

CREATE INDEX ix_core_district_province ON kit_core.core_district (province_id, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_core_district_row_version
    BEFORE UPDATE ON kit_core.core_district
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE kit_core.core_ward (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    district_id      UUID         NOT NULL REFERENCES kit_core.core_district(id),
    ward_code        VARCHAR(20)  NOT NULL,
    ward_name        VARCHAR(150) NOT NULL,
    ward_type        VARCHAR(30),
    sort_order       INT          NOT NULL DEFAULT 0,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_core_ward_code UNIQUE (district_id, ward_code)
);

CREATE INDEX ix_core_ward_district ON kit_core.core_ward (district_id, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_core_ward_row_version
    BEFORE UPDATE ON kit_core.core_ward
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE kit_core.core_setting (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID,
    setting_scope    VARCHAR(30)  NOT NULL DEFAULT 'tenant',
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
    CONSTRAINT uq_core_setting_key UNIQUE (tenant_id, workspace_id, setting_scope, setting_key),
    CONSTRAINT ck_core_setting_scope CHECK (setting_scope IN ('platform', 'tenant', 'workspace', 'branch'))
);

CREATE INDEX ix_core_setting_tenant ON kit_core.core_setting (tenant_id, setting_scope)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_core_setting_row_version
    BEFORE UPDATE ON kit_core.core_setting
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

COMMENT ON TABLE kit_core.core_setting IS 'Formal settings hierarchy — strangler from tenants.settings JSONB.';

-- =============================================================================
-- DOMAIN: IAM — new tables + compatibility views
-- =============================================================================

CREATE TABLE kit_iam.iam_api_key (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID,
    user_id          UUID         REFERENCES public.users(id),
    key_name         VARCHAR(100) NOT NULL,
    key_prefix       VARCHAR(16)  NOT NULL,
    key_hash         VARCHAR(255) NOT NULL,
    scopes           TEXT[]       NOT NULL DEFAULT '{}',
    expires_at       TIMESTAMPTZ,
    last_used_at     TIMESTAMPTZ,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_iam_api_key_prefix UNIQUE (key_prefix)
);

CREATE INDEX ix_iam_api_key_tenant ON kit_iam.iam_api_key (tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_iam_api_key_row_version
    BEFORE UPDATE ON kit_iam.iam_api_key
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE kit_iam.iam_device (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    user_id          UUID         NOT NULL REFERENCES public.users(id),
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name      VARCHAR(150),
    device_type      VARCHAR(30),
    last_ip          INET,
    last_seen_at     TIMESTAMPTZ,
    trusted          BOOLEAN      NOT NULL DEFAULT FALSE,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_iam_device_fingerprint UNIQUE (tenant_id, user_id, device_fingerprint)
);

CREATE TRIGGER trg_iam_device_row_version
    BEFORE UPDATE ON kit_iam.iam_device
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE kit_iam.iam_login_history (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    user_id          UUID         REFERENCES public.users(id),
    login_type       VARCHAR(30)  NOT NULL DEFAULT 'password',
    success          BOOLEAN      NOT NULL,
    failure_reason   VARCHAR(100),
    ip_address       INET,
    user_agent       TEXT,
    occurred_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_iam_login_history_tenant_time
    ON kit_iam.iam_login_history (tenant_id, occurred_at DESC);

CREATE INDEX ix_iam_login_history_user
    ON kit_iam.iam_login_history (user_id, occurred_at DESC)
    WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------

CREATE TABLE kit_iam.iam_claim (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    claim_type       VARCHAR(50)  NOT NULL,
    claim_value      VARCHAR(255) NOT NULL,
    subject_type     VARCHAR(30)  NOT NULL,
    subject_id       UUID         NOT NULL,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_iam_claim_subject UNIQUE (tenant_id, subject_type, subject_id, claim_type, claim_value)
);

CREATE TRIGGER trg_iam_claim_row_version
    BEFORE UPDATE ON kit_iam.iam_claim
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------
-- IAM strangler views (read-only — API continues using public.* until cutover)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW kit_iam.iam_user AS
SELECT
    u.id,
    u.tenant_id,
    NULL::uuid        AS workspace_id,
    u.employee_id,
    u.username,
    u.email,
    u.password_hash,
    u.status,
    u.last_login_at,
    0                 AS row_version,
    u.created_at,
    NULL::uuid        AS created_by,
    u.updated_at,
    NULL::uuid        AS updated_by,
    u.deleted_at
FROM public.users u;

CREATE OR REPLACE VIEW kit_iam.iam_role AS
SELECT
    r.id, r.tenant_id, NULL::uuid AS workspace_id,
    r.role_code, r.role_name, r.description, r.status,
    0 AS row_version, r.created_at, NULL::uuid AS created_by,
    r.updated_at, NULL::uuid AS updated_by, NULL::timestamptz AS deleted_at
FROM public.roles r;

CREATE OR REPLACE VIEW kit_iam.iam_permission AS
SELECT
    p.id, NULL::uuid AS tenant_id, NULL::uuid AS workspace_id,
    p.permission_code, p.permission_name, p.module_name, p.description,
    0 AS row_version, p.created_at, NULL::uuid AS created_by,
    p.created_at AS updated_at, NULL::uuid AS updated_by, NULL::timestamptz AS deleted_at
FROM public.permissions p;

CREATE OR REPLACE VIEW kit_iam.iam_user_role AS
SELECT id, NULL::uuid AS tenant_id, user_id, role_id, created_at
FROM public.user_roles;

CREATE OR REPLACE VIEW kit_iam.iam_role_permission AS
SELECT id, NULL::uuid AS tenant_id, role_id, permission_id, created_at
FROM public.role_permissions;

CREATE OR REPLACE VIEW kit_iam.iam_session AS
SELECT
    rt.id, u.tenant_id, NULL::uuid AS workspace_id, rt.user_id,
    rt.token_hash, rt.expires_at, rt.revoked_at AS revoked_at,
    rt.created_at, NULL::timestamptz AS last_activity_at
FROM public.refresh_tokens rt
JOIN public.users u ON u.id = rt.user_id;

-- =============================================================================
-- DOMAIN: Tenant (formal SaaS tables)
-- =============================================================================

CREATE TABLE kit_tenant.tenant_package (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    package_code     VARCHAR(50)  NOT NULL,
    package_name     VARCHAR(255) NOT NULL,
    description      TEXT,
    verticals        TEXT[]       NOT NULL DEFAULT '{}',
    module_codes     TEXT[]       NOT NULL DEFAULT '{}',
    sort_order       INT          NOT NULL DEFAULT 0,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_tenant_package_code UNIQUE (package_code)
);

CREATE TRIGGER trg_tenant_package_row_version
    BEFORE UPDATE ON kit_tenant.tenant_package
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- Seed Novixa Pharmacy pack from platform_module_registry
INSERT INTO kit_tenant.tenant_package (package_code, package_name, description, verticals, module_codes, sort_order)
VALUES (
    'novixa_pharmacy',
    'Novixa Pharmacy Pack',
    'ERP nhà thuốc + Care channel — pilot default',
    ARRAY['pharmacy', 'pharmacy_chain'],
    ARRAY['inventory','procurement','sales','loyalty','customer_app','medication','health_wallet','reservations','reports'],
    10
)
ON CONFLICT (package_code) DO NOTHING;

-- ---------------------------------------------------------------------------

CREATE TABLE kit_tenant.tenant_feature (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    feature_code     VARCHAR(80)  NOT NULL,
    feature_name     VARCHAR(255) NOT NULL,
    module_code      VARCHAR(50),
    description      TEXT,
    default_enabled  BOOLEAN      NOT NULL DEFAULT FALSE,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_tenant_feature_code UNIQUE (feature_code)
);

CREATE TRIGGER trg_tenant_feature_row_version
    BEFORE UPDATE ON kit_tenant.tenant_feature
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

INSERT INTO kit_tenant.tenant_feature (feature_code, feature_name, module_code, default_enabled)
VALUES
    ('batch_tracking', 'Theo dõi lô / HSD', 'inventory', TRUE),
    ('national_drug_catalog', 'Danh mục thuốc quốc gia', 'medication', TRUE),
    ('family_members', 'Quản lý người thân', 'health_wallet', TRUE),
    ('branch_price_overrides', 'Giá theo chi nhánh', 'sales', TRUE)
ON CONFLICT (feature_code) DO NOTHING;

-- ---------------------------------------------------------------------------

CREATE TABLE kit_tenant.tenant_subscription (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    package_id       UUID         NOT NULL REFERENCES kit_tenant.tenant_package(id),
    plan_code        VARCHAR(50)  NOT NULL DEFAULT 'pilot',
    billing_cycle    VARCHAR(20)  NOT NULL DEFAULT 'monthly',
    started_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at       TIMESTAMPTZ,
    trial_ends_at    TIMESTAMPTZ,
    status           SMALLINT     NOT NULL DEFAULT 1,
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_tenant_subscription_cycle CHECK (billing_cycle IN ('monthly', 'yearly', 'pilot', 'custom'))
);

CREATE INDEX ix_tenant_subscription_tenant ON kit_tenant.tenant_subscription (tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_tenant_subscription_row_version
    BEFORE UPDATE ON kit_tenant.tenant_subscription
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- Backfill pilot subscriptions (idempotent)
INSERT INTO kit_tenant.tenant_subscription (tenant_id, package_id, plan_code, billing_cycle, status)
SELECT t.id, p.id, 'pilot', 'pilot', 1
FROM public.tenants t
CROSS JOIN kit_tenant.tenant_package p
WHERE p.package_code = 'novixa_pharmacy'
  AND t.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM kit_tenant.tenant_subscription s
      WHERE s.tenant_id = t.id
        AND s.package_id = p.id
        AND s.deleted_at IS NULL
  );

-- ---------------------------------------------------------------------------

CREATE TABLE kit_tenant.tenant_license (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    subscription_id  UUID         REFERENCES kit_tenant.tenant_subscription(id),
    license_key      VARCHAR(255) NOT NULL,
    license_type     VARCHAR(30)  NOT NULL DEFAULT 'standard',
    max_users        INT,
    max_branches     INT,
    max_workspaces   INT,
    issued_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at       TIMESTAMPTZ,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_tenant_license_key UNIQUE (license_key)
);

CREATE INDEX ix_tenant_license_tenant ON kit_tenant.tenant_license (tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_tenant_license_row_version
    BEFORE UPDATE ON kit_tenant.tenant_license
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW kit_tenant.tenant_tenant AS
SELECT
    t.id, t.tenant_code, t.tenant_name, t.country_code, t.default_currency,
    t.timezone, t.settings, t.status, t.organization_id, t.business_vertical,
    0 AS row_version, t.created_at, NULL::uuid AS created_by,
    t.updated_at, NULL::uuid AS updated_by, t.deleted_at
FROM public.tenants t;

-- =============================================================================
-- Post-apply: update registry status (run after tables created)
-- =============================================================================

UPDATE kit_core.kernel_table_registry SET registry_status = 'EXISTS', updated_at = NOW()
WHERE table_name IN (
    'core_platform', 'core_language', 'core_currency', 'core_country',
    'core_province', 'core_district', 'core_ward', 'core_setting',
    'iam_api_key', 'iam_device', 'iam_login_history', 'iam_claim',
    'tenant_subscription', 'tenant_package', 'tenant_feature', 'tenant_license'
);

UPDATE kit_core.kernel_table_registry SET registry_status = 'VIEW', updated_at = NOW()
WHERE table_name IN (
    'iam_user', 'iam_role', 'iam_permission', 'iam_user_role', 'iam_role_permission',
    'iam_session', 'tenant_tenant'
);

UPDATE kit_core.platform_kernel_version SET
    kernel_phase = 'P1',
    last_migration = '072_kit_core_iam_tenant',
    schema_version = 2,
    notes = 'Phase 1 applied: Core 8 + IAM 4 new + Tenant 4 + strangler views.',
    updated_at = NOW()
WHERE id = 1;
