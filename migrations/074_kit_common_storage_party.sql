-- KitPlatform 074: KIT Enterprise Platform Kernel — Phase 3 Common + Storage + Party
-- Depends on: 073_kit_org_workspace.sql
-- Pilot-safe: kit_common + kit_storage tables; additive party_id on customers/suppliers/employees;
-- strangler backfill from customer_addresses, product_images.

-- =============================================================================
-- PARTY SPINE (Universal Party — shared across solutions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_common.party_party (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    party_type       VARCHAR(30)  NOT NULL,
    party_code       VARCHAR(50),
    display_name     VARCHAR(255) NOT NULL,
    legal_name       VARCHAR(255),
    status           SMALLINT     NOT NULL DEFAULT 1,
    legacy_entity_type VARCHAR(30),
    legacy_entity_id UUID,
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_party_party_type CHECK (
        party_type IN ('person', 'organization', 'group', 'system')
    ),
    CONSTRAINT ck_party_legacy_entity CHECK (
        (legacy_entity_type IS NULL AND legacy_entity_id IS NULL)
        OR (legacy_entity_type IS NOT NULL AND legacy_entity_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_party_party_legacy
    ON kit_common.party_party (tenant_id, legacy_entity_type, legacy_entity_id)
    WHERE legacy_entity_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX ix_party_party_tenant ON kit_common.party_party (tenant_id, party_type, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_party_party_row_version
    BEFORE UPDATE ON kit_common.party_party
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

COMMENT ON TABLE kit_common.party_party IS 'Universal party spine — strangler link to customers/suppliers/employees via legacy_entity_*';

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_common.party_identifier (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    party_id         UUID         NOT NULL REFERENCES kit_common.party_party(id),
    identifier_type  VARCHAR(30)  NOT NULL,
    identifier_value VARCHAR(255) NOT NULL,
    is_primary       BOOLEAN      NOT NULL DEFAULT FALSE,
    is_verified      BOOLEAN      NOT NULL DEFAULT FALSE,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_party_identifier_type CHECK (
        identifier_type IN ('phone', 'email', 'tax_id', 'national_id', 'external_ref')
    )
);

CREATE UNIQUE INDEX uq_party_identifier_value
    ON kit_common.party_identifier (tenant_id, identifier_type, identifier_value)
    WHERE deleted_at IS NULL AND status = 1;

CREATE INDEX ix_party_identifier_party ON kit_common.party_identifier (party_id, identifier_type)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_party_identifier_row_version
    BEFORE UPDATE ON kit_common.party_identifier
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_common.party_relationship (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    from_party_id    UUID         NOT NULL REFERENCES kit_common.party_party(id),
    to_party_id      UUID         NOT NULL REFERENCES kit_common.party_party(id),
    relationship_type VARCHAR(50) NOT NULL,
    valid_from       DATE,
    valid_to         DATE,
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_party_relationship_diff CHECK (from_party_id <> to_party_id),
    CONSTRAINT uq_party_relationship UNIQUE (tenant_id, from_party_id, to_party_id, relationship_type)
);

CREATE TRIGGER trg_party_relationship_row_version
    BEFORE UPDATE ON kit_common.party_relationship
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- Additive party_id on legacy tables (strangler — nullable, pilot-safe)
ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES kit_common.party_party(id);

ALTER TABLE public.suppliers
    ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES kit_common.party_party(id);

ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES kit_common.party_party(id);

CREATE INDEX IF NOT EXISTS ix_customers_party ON public.customers (party_id) WHERE party_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_suppliers_party ON public.suppliers (party_id) WHERE party_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_employees_party ON public.employees (party_id) WHERE party_id IS NOT NULL;

-- =============================================================================
-- DOMAIN: Common (10 tables)
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_common.common_address (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    party_id         UUID         REFERENCES kit_common.party_party(id),
    entity_type      VARCHAR(30),
    entity_id        UUID,
    address_label    VARCHAR(50)  NOT NULL DEFAULT 'default',
    recipient_name   VARCHAR(255),
    phone            VARCHAR(30),
    address_line1    TEXT         NOT NULL,
    address_line2    TEXT,
    ward_code        VARCHAR(20),
    ward_name        VARCHAR(150),
    district_code    VARCHAR(20),
    district_name    VARCHAR(150),
    province_code    VARCHAR(20),
    province_name    VARCHAR(150),
    country_code     CHAR(2)      NOT NULL DEFAULT 'VN',
    postal_code      VARCHAR(20),
    latitude         NUMERIC(10,7),
    longitude        NUMERIC(10,7),
    is_default       BOOLEAN      NOT NULL DEFAULT FALSE,
    status           SMALLINT     NOT NULL DEFAULT 1,
    legacy_address_id UUID,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_common_address_owner CHECK (
        party_id IS NOT NULL OR (entity_type IS NOT NULL AND entity_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_common_address_legacy
    ON kit_common.common_address (legacy_address_id)
    WHERE legacy_address_id IS NOT NULL;

CREATE INDEX ix_common_address_party ON kit_common.common_address (party_id)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_common_address_entity ON kit_common.common_address (tenant_id, entity_type, entity_id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_common_address_row_version
    BEFORE UPDATE ON kit_common.common_address
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_common.common_contact (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    party_id         UUID         REFERENCES kit_common.party_party(id),
    entity_type      VARCHAR(30),
    entity_id        UUID,
    contact_type     VARCHAR(30)  NOT NULL DEFAULT 'general',
    full_name        VARCHAR(255) NOT NULL,
    title            VARCHAR(100),
    email            CITEXT,
    phone            VARCHAR(30),
    is_primary       BOOLEAN      NOT NULL DEFAULT FALSE,
    notes            TEXT,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_common_contact_type CHECK (
        contact_type IN ('general', 'billing', 'shipping', 'technical', 'emergency')
    )
);

CREATE INDEX ix_common_contact_party ON kit_common.common_contact (party_id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_common_contact_row_version
    BEFORE UPDATE ON kit_common.common_contact
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_common.common_document (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    party_id         UUID         REFERENCES kit_common.party_party(id),
    entity_type      VARCHAR(50)  NOT NULL,
    entity_id        UUID         NOT NULL,
    document_type    VARCHAR(50)  NOT NULL,
    document_title   VARCHAR(255) NOT NULL,
    document_number  VARCHAR(100),
    issued_at        DATE,
    expires_at       DATE,
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ
);

CREATE INDEX ix_common_document_entity ON kit_common.common_document (tenant_id, entity_type, entity_id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_common_document_row_version
    BEFORE UPDATE ON kit_common.common_document
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_common.common_comment (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    entity_type      VARCHAR(50)  NOT NULL,
    entity_id        UUID         NOT NULL,
    parent_id        UUID         REFERENCES kit_common.common_comment(id),
    author_user_id   UUID         REFERENCES public.users(id),
    body             TEXT         NOT NULL,
    is_internal      BOOLEAN      NOT NULL DEFAULT FALSE,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ
);

CREATE INDEX ix_common_comment_entity ON kit_common.common_comment (tenant_id, entity_type, entity_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_common_comment_row_version
    BEFORE UPDATE ON kit_common.common_comment
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_common.common_tag (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    tag_code         VARCHAR(50)  NOT NULL,
    tag_name         VARCHAR(100) NOT NULL,
    color            VARCHAR(20),
    description      TEXT,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_common_tag_code UNIQUE (tenant_id, tag_code)
);

CREATE TRIGGER trg_common_tag_row_version
    BEFORE UPDATE ON kit_common.common_tag
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

CREATE TABLE IF NOT EXISTS kit_common.common_tag_assignment (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    tag_id           UUID         NOT NULL REFERENCES kit_common.common_tag(id),
    entity_type      VARCHAR(50)  NOT NULL,
    entity_id        UUID         NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_common_tag_assignment UNIQUE (tag_id, entity_type, entity_id)
);

CREATE INDEX ix_common_tag_assignment_entity
    ON kit_common.common_tag_assignment (tenant_id, entity_type, entity_id);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_common.common_category (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    parent_id        UUID         REFERENCES kit_common.common_category(id),
    category_scope   VARCHAR(50)  NOT NULL DEFAULT 'general',
    category_code    VARCHAR(50)  NOT NULL,
    category_name    VARCHAR(255) NOT NULL,
    description      TEXT,
    sort_order       INT          NOT NULL DEFAULT 0,
    legacy_entity_type VARCHAR(30),
    legacy_entity_id UUID,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_common_category_code UNIQUE (tenant_id, category_scope, category_code)
);

CREATE UNIQUE INDEX uq_common_category_legacy
    ON kit_common.common_category (tenant_id, legacy_entity_type, legacy_entity_id)
    WHERE legacy_entity_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_common_category_row_version
    BEFORE UPDATE ON kit_common.common_category
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_common.common_task (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    entity_type      VARCHAR(50),
    entity_id        UUID,
    task_code        VARCHAR(50),
    task_title       VARCHAR(255) NOT NULL,
    task_description TEXT,
    assigned_user_id UUID         REFERENCES public.users(id),
    assigned_employee_id UUID     REFERENCES public.employees(id),
    due_at           TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    priority         SMALLINT     NOT NULL DEFAULT 2,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_common_task_priority CHECK (priority BETWEEN 1 AND 4)
);

CREATE INDEX ix_common_task_assignee ON kit_common.common_task (tenant_id, assigned_user_id, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_common_task_row_version
    BEFORE UPDATE ON kit_common.common_task
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_common.common_approval (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    entity_type      VARCHAR(50)  NOT NULL,
    entity_id        UUID         NOT NULL,
    approval_type    VARCHAR(50)  NOT NULL DEFAULT 'general',
    requested_by     UUID         REFERENCES public.users(id),
    approver_user_id UUID         REFERENCES public.users(id),
    decision         VARCHAR(20),
    decision_at      TIMESTAMPTZ,
    decision_notes   TEXT,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_common_approval_decision CHECK (
        decision IS NULL OR decision IN ('pending', 'approved', 'rejected', 'cancelled')
    )
);

CREATE INDEX ix_common_approval_entity ON kit_common.common_approval (tenant_id, entity_type, entity_id, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_common_approval_row_version
    BEFORE UPDATE ON kit_common.common_approval
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_common.common_note (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    entity_type      VARCHAR(50)  NOT NULL,
    entity_id        UUID         NOT NULL,
    note_title       VARCHAR(255),
    note_body        TEXT         NOT NULL,
    is_pinned        BOOLEAN      NOT NULL DEFAULT FALSE,
    author_user_id   UUID         REFERENCES public.users(id),
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ
);

CREATE INDEX ix_common_note_entity ON kit_common.common_note (tenant_id, entity_type, entity_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_common_note_row_version
    BEFORE UPDATE ON kit_common.common_note
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_common.common_label (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    label_code       VARCHAR(50)  NOT NULL,
    label_name       VARCHAR(100) NOT NULL,
    label_group      VARCHAR(50)  NOT NULL DEFAULT 'general',
    color            VARCHAR(20),
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_common_label_code UNIQUE (tenant_id, label_group, label_code)
);

CREATE TRIGGER trg_common_label_row_version
    BEFORE UPDATE ON kit_common.common_label
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

CREATE TABLE IF NOT EXISTS kit_common.common_label_assignment (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    label_id         UUID         NOT NULL REFERENCES kit_common.common_label(id),
    entity_type      VARCHAR(50)  NOT NULL,
    entity_id        UUID         NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_common_label_assignment UNIQUE (label_id, entity_type, entity_id)
);

-- =============================================================================
-- DOMAIN: Storage (4 tables)
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_storage.storage_file (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    folder_id        UUID,
    file_name        VARCHAR(255) NOT NULL,
    mime_type        VARCHAR(120),
    file_size_bytes  BIGINT,
    storage_provider VARCHAR(30)  NOT NULL DEFAULT 'local',
    storage_path     TEXT         NOT NULL,
    checksum_sha256  VARCHAR(64),
    uploaded_by      UUID         REFERENCES public.users(id),
    status           SMALLINT     NOT NULL DEFAULT 1,
    legacy_image_id  UUID,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_storage_file_legacy_image
    ON kit_storage.storage_file (legacy_image_id)
    WHERE legacy_image_id IS NOT NULL;

CREATE INDEX ix_storage_file_tenant ON kit_storage.storage_file (tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_storage_file_row_version
    BEFORE UPDATE ON kit_storage.storage_file
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_storage.storage_folder (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    parent_id        UUID         REFERENCES kit_storage.storage_folder(id),
    folder_code      VARCHAR(100) NOT NULL,
    folder_name      VARCHAR(255) NOT NULL,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_storage_folder_code UNIQUE (tenant_id, folder_code)
);

CREATE TRIGGER trg_storage_folder_row_version
    BEFORE UPDATE ON kit_storage.storage_folder
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

ALTER TABLE kit_storage.storage_file
    ADD CONSTRAINT fk_storage_file_folder
    FOREIGN KEY (folder_id) REFERENCES kit_storage.storage_folder(id);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_storage.storage_blob (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    file_id          UUID         NOT NULL REFERENCES kit_storage.storage_file(id),
    blob_part_number INT          NOT NULL DEFAULT 1,
    blob_data        BYTEA,
    blob_url         TEXT,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_storage_blob_part UNIQUE (file_id, blob_part_number)
);

CREATE TRIGGER trg_storage_blob_row_version
    BEFORE UPDATE ON kit_storage.storage_blob
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_storage.storage_attachment (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    file_id          UUID         NOT NULL REFERENCES kit_storage.storage_file(id),
    entity_type      VARCHAR(50)  NOT NULL,
    entity_id        UUID         NOT NULL,
    attachment_role  VARCHAR(50)  NOT NULL DEFAULT 'attachment',
    sort_order       INT          NOT NULL DEFAULT 0,
    is_primary       BOOLEAN      NOT NULL DEFAULT FALSE,
    status           SMALLINT     NOT NULL DEFAULT 1,
    legacy_image_id  UUID,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_storage_attachment_legacy UNIQUE (legacy_image_id)
);

CREATE INDEX ix_storage_attachment_entity
    ON kit_storage.storage_attachment (tenant_id, entity_type, entity_id, sort_order)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_storage_attachment_row_version
    BEFORE UPDATE ON kit_storage.storage_attachment
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- Default product images folder per tenant
INSERT INTO kit_storage.storage_folder (tenant_id, folder_code, folder_name)
SELECT t.id, 'products', 'Product Images'
FROM public.tenants t
WHERE t.deleted_at IS NULL
ON CONFLICT (tenant_id, folder_code) DO NOTHING;

-- =============================================================================
-- STRANGLER BACKFILL
-- =============================================================================

-- 1. Customers → party_party (person)
INSERT INTO kit_common.party_party (
    tenant_id, party_type, party_code, display_name, legacy_entity_type, legacy_entity_id, metadata
)
SELECT
    c.tenant_id,
    'person',
    c.customer_code,
    c.full_name,
    'customer',
    c.id,
    jsonb_build_object('phone', c.phone, 'email', c.email, 'source', '074_backfill')
FROM public.customers c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_common.party_party p
      WHERE p.tenant_id = c.tenant_id
        AND p.legacy_entity_type = 'customer'
        AND p.legacy_entity_id = c.id
        AND p.deleted_at IS NULL
  );

UPDATE public.customers c
SET party_id = p.id
FROM kit_common.party_party p
WHERE p.legacy_entity_type = 'customer'
  AND p.legacy_entity_id = c.id
  AND p.tenant_id = c.tenant_id
  AND c.party_id IS NULL;

-- 2. Suppliers → party_party (organization)
INSERT INTO kit_common.party_party (
    tenant_id, party_type, party_code, display_name, legal_name, legacy_entity_type, legacy_entity_id, metadata
)
SELECT
    s.tenant_id,
    'organization',
    s.supplier_code,
    s.supplier_name,
    s.supplier_name,
    'supplier',
    s.id,
    jsonb_build_object('tax_code', s.tax_code, 'source', '074_backfill')
FROM public.suppliers s
WHERE s.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_common.party_party p
      WHERE p.tenant_id = s.tenant_id
        AND p.legacy_entity_type = 'supplier'
        AND p.legacy_entity_id = s.id
        AND p.deleted_at IS NULL
  );

UPDATE public.suppliers s
SET party_id = p.id
FROM kit_common.party_party p
WHERE p.legacy_entity_type = 'supplier'
  AND p.legacy_entity_id = s.id
  AND p.tenant_id = s.tenant_id
  AND s.party_id IS NULL;

-- 3. Employees → party_party (person)
INSERT INTO kit_common.party_party (
    tenant_id, party_type, party_code, display_name, legacy_entity_type, legacy_entity_id, metadata
)
SELECT
    e.tenant_id,
    'person',
    e.employee_code,
    e.full_name,
    'employee',
    e.id,
    jsonb_build_object('phone', e.phone, 'email', e.email, 'source', '074_backfill')
FROM public.employees e
WHERE e.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_common.party_party p
      WHERE p.tenant_id = e.tenant_id
        AND p.legacy_entity_type = 'employee'
        AND p.legacy_entity_id = e.id
        AND p.deleted_at IS NULL
  );

UPDATE public.employees e
SET party_id = p.id
FROM kit_common.party_party p
WHERE p.legacy_entity_type = 'employee'
  AND p.legacy_entity_id = e.id
  AND p.tenant_id = e.tenant_id
  AND e.party_id IS NULL;

-- 4. Party identifiers from customers (DISTINCT ON — skip duplicate phone/email per tenant in demo data)
INSERT INTO kit_common.party_identifier (tenant_id, party_id, identifier_type, identifier_value, is_primary)
SELECT DISTINCT ON (c.tenant_id, c.phone)
    c.tenant_id, c.party_id, 'phone', c.phone, TRUE
FROM public.customers c
WHERE c.party_id IS NOT NULL AND c.phone IS NOT NULL AND c.deleted_at IS NULL
ORDER BY c.tenant_id, c.phone, c.created_at ASC;

INSERT INTO kit_common.party_identifier (tenant_id, party_id, identifier_type, identifier_value, is_primary)
SELECT DISTINCT ON (c.tenant_id, lower(trim(c.email::text)))
    c.tenant_id, c.party_id, 'email', c.email::text, FALSE
FROM public.customers c
WHERE c.party_id IS NOT NULL AND c.email IS NOT NULL AND trim(c.email::text) <> '' AND c.deleted_at IS NULL
ORDER BY c.tenant_id, lower(trim(c.email::text)), c.created_at ASC;

-- 5. customer_addresses → common_address
INSERT INTO kit_common.common_address (
    tenant_id, party_id, address_label, recipient_name, phone,
    address_line1, ward_name, district_name, province_name,
    is_default, legacy_address_id, created_at
)
SELECT
    c.tenant_id,
    c.party_id,
    COALESCE(ca.label, 'default'),
    ca.recipient_name,
    ca.phone,
    ca.address_line,
    ca.ward,
    ca.district,
    ca.province,
    ca.is_default,
    ca.id,
    ca.created_at
FROM public.customer_addresses ca
JOIN public.customers c ON c.id = ca.customer_id
WHERE c.party_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_common.common_address a WHERE a.legacy_address_id = ca.id
  );

-- 6. product_categories → common_category
INSERT INTO kit_common.common_category (
    tenant_id, category_scope, category_code, category_name, description, sort_order,
    legacy_entity_type, legacy_entity_id, status, created_at, updated_at
)
SELECT
    pc.tenant_id,
    'product',
    pc.category_code,
    pc.category_name,
    pc.description,
    COALESCE(pc.sort_order, 0),
    'product_category',
    pc.id,
    pc.status,
    pc.created_at,
    pc.updated_at
FROM public.product_categories pc
WHERE pc.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_common.common_category cc
      WHERE cc.tenant_id = pc.tenant_id
        AND cc.legacy_entity_type = 'product_category'
        AND cc.legacy_entity_id = pc.id
        AND cc.deleted_at IS NULL
  );

-- 7. product_images → storage_file + storage_attachment
INSERT INTO kit_storage.storage_file (
    tenant_id, folder_id, file_name, mime_type, storage_provider, storage_path,
    legacy_image_id, status, created_at, updated_at
)
SELECT
    pi.tenant_id,
    sf.id,
    'product-' || pi.product_id::text || '-' || pi.sort_order::text,
    'image/*',
    CASE WHEN pi.image_url LIKE 'http%' THEN 'remote' ELSE 'local' END,
    pi.image_url,
    pi.id,
    pi.status,
    pi.created_at,
    pi.updated_at
FROM public.product_images pi
LEFT JOIN kit_storage.storage_folder sf
    ON sf.tenant_id = pi.tenant_id AND sf.folder_code = 'products'
WHERE NOT EXISTS (
    SELECT 1 FROM kit_storage.storage_file f WHERE f.legacy_image_id = pi.id
);

INSERT INTO kit_storage.storage_attachment (
    tenant_id, file_id, entity_type, entity_id, attachment_role, sort_order, is_primary, status, legacy_image_id, created_at, updated_at
)
SELECT
    pi.tenant_id,
    f.id,
    'product',
    pi.product_id,
    'image',
    pi.sort_order,
    pi.is_primary,
    pi.status,
    pi.id,
    pi.created_at,
    pi.updated_at
FROM public.product_images pi
JOIN kit_storage.storage_file f ON f.legacy_image_id = pi.id
WHERE NOT EXISTS (
    SELECT 1 FROM kit_storage.storage_attachment a WHERE a.legacy_image_id = pi.id
);

-- Supplier contacts → common_contact (primary)
INSERT INTO kit_common.common_contact (
    tenant_id, party_id, contact_type, full_name, email, phone, is_primary, status
)
SELECT
    s.tenant_id,
    s.party_id,
    'general',
    COALESCE(s.contact_name, s.supplier_name),
    s.email,
    s.phone,
    TRUE,
    1
FROM public.suppliers s
WHERE s.party_id IS NOT NULL AND s.deleted_at IS NULL
  AND (s.contact_name IS NOT NULL OR s.phone IS NOT NULL OR s.email IS NOT NULL)
  AND NOT EXISTS (
      SELECT 1 FROM kit_common.common_contact cc
      WHERE cc.party_id = s.party_id AND cc.is_primary = TRUE AND cc.deleted_at IS NULL
  );

-- =============================================================================
-- Post-apply: registry + kernel version
-- =============================================================================

UPDATE kit_core.kernel_table_registry SET registry_status = 'EXISTS', updated_at = NOW()
WHERE table_name IN (
    'common_address', 'common_contact', 'common_document', 'common_comment',
    'common_tag', 'common_category', 'common_task', 'common_approval', 'common_note', 'common_label',
    'storage_file', 'storage_folder', 'storage_attachment', 'storage_blob'
);

UPDATE kit_core.platform_kernel_version SET
    kernel_phase = 'P3',
    last_migration = '074_kit_common_storage_party',
    schema_version = 4,
    notes = 'Phase 3: Party spine + Common 10 + Storage 4; strangler backfill customers/suppliers/addresses/images.',
    updated_at = NOW()
WHERE id = 1;
