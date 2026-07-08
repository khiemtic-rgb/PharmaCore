-- KitPlatform 075: KIT Enterprise Platform Kernel — Phase 4 Metadata
-- Depends on: 074_kit_common_storage_party.sql
-- Pilot-safe: kit_meta.* only; public.entity_translations unchanged.
-- Assessment engine (068) remains runtime; registered here as pack metadata reference.

-- =============================================================================
-- meta_entity — logical entity registry
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_meta.meta_entity (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    entity_code      VARCHAR(80)  NOT NULL,
    entity_name      VARCHAR(255) NOT NULL,
    entity_kind      VARCHAR(30)  NOT NULL DEFAULT 'platform',
    pack_code        VARCHAR(50),
    schema_name      VARCHAR(50)  NOT NULL DEFAULT 'public',
    table_name       VARCHAR(100),
    primary_key_field VARCHAR(50) NOT NULL DEFAULT 'id',
    description      TEXT,
    is_system        BOOLEAN      NOT NULL DEFAULT FALSE,
    is_metadata_driven BOOLEAN    NOT NULL DEFAULT FALSE,
    settings         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_meta_entity_kind CHECK (
        entity_kind IN ('platform', 'kernel', 'pack', 'custom', 'virtual')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_meta_entity_scope_code
    ON kit_meta.meta_entity (
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid),
        entity_code
    )
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_meta_entity_tenant
    ON kit_meta.meta_entity (tenant_id, entity_kind, status)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_meta_entity_row_version ON kit_meta.meta_entity;
CREATE TRIGGER trg_meta_entity_row_version
    BEFORE UPDATE ON kit_meta.meta_entity
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

COMMENT ON TABLE kit_meta.meta_entity IS 'Metadata entity registry — maps logical entities to physical tables or virtual pack models.';

-- =============================================================================
-- meta_field — field definitions per entity
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_meta.meta_field (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    entity_id        UUID         NOT NULL REFERENCES kit_meta.meta_entity(id),
    field_code       VARCHAR(80)  NOT NULL,
    field_name       VARCHAR(255) NOT NULL,
    data_type        VARCHAR(30)  NOT NULL DEFAULT 'string',
    db_column        VARCHAR(100),
    is_required      BOOLEAN      NOT NULL DEFAULT FALSE,
    is_unique        BOOLEAN      NOT NULL DEFAULT FALSE,
    is_system        BOOLEAN      NOT NULL DEFAULT FALSE,
    is_translatable  BOOLEAN      NOT NULL DEFAULT FALSE,
    is_searchable    BOOLEAN      NOT NULL DEFAULT FALSE,
    default_value    JSONB,
    enum_id          UUID,
    sort_order       INT          NOT NULL DEFAULT 0,
    ui_hints         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_meta_field_data_type CHECK (
        data_type IN ('string', 'text', 'int', 'decimal', 'boolean', 'date', 'datetime', 'uuid', 'json', 'enum', 'reference')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_meta_field_entity_code
    ON kit_meta.meta_field (entity_id, field_code)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_meta_field_entity
    ON kit_meta.meta_field (entity_id, sort_order)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_meta_field_row_version ON kit_meta.meta_field;
CREATE TRIGGER trg_meta_field_row_version
    BEFORE UPDATE ON kit_meta.meta_field
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- =============================================================================
-- meta_enum + meta_enum_item
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_meta.meta_enum (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    enum_code        VARCHAR(80)  NOT NULL,
    enum_name        VARCHAR(255) NOT NULL,
    description      TEXT,
    is_system        BOOLEAN      NOT NULL DEFAULT FALSE,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_meta_enum_scope_code
    ON kit_meta.meta_enum (
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        enum_code
    )
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_meta_enum_row_version ON kit_meta.meta_enum;
CREATE TRIGGER trg_meta_enum_row_version
    BEFORE UPDATE ON kit_meta.meta_enum
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_meta.meta_enum_item (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    enum_id          UUID         NOT NULL REFERENCES kit_meta.meta_enum(id),
    item_code        VARCHAR(80)  NOT NULL,
    item_label       VARCHAR(255) NOT NULL,
    item_value       VARCHAR(255),
    sort_order       INT          NOT NULL DEFAULT 0,
    is_default       BOOLEAN      NOT NULL DEFAULT FALSE,
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_meta_enum_item_code UNIQUE (enum_id, item_code)
);

CREATE INDEX IF NOT EXISTS ix_meta_enum_item_enum
    ON kit_meta.meta_enum_item (enum_id, sort_order)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_meta_enum_item_row_version ON kit_meta.meta_enum_item;
CREATE TRIGGER trg_meta_enum_item_row_version
    BEFORE UPDATE ON kit_meta.meta_enum_item
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

ALTER TABLE kit_meta.meta_field
    DROP CONSTRAINT IF EXISTS fk_meta_field_enum;

ALTER TABLE kit_meta.meta_field
    ADD CONSTRAINT fk_meta_field_enum
    FOREIGN KEY (enum_id) REFERENCES kit_meta.meta_enum(id);

-- =============================================================================
-- meta_relationship
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_meta.meta_relationship (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    relationship_code VARCHAR(80) NOT NULL,
    relationship_name VARCHAR(255) NOT NULL,
    from_entity_id   UUID         NOT NULL REFERENCES kit_meta.meta_entity(id),
    to_entity_id     UUID         NOT NULL REFERENCES kit_meta.meta_entity(id),
    relationship_type VARCHAR(30) NOT NULL,
    foreign_key_field VARCHAR(100),
    inverse_code     VARCHAR(80),
    cascade_delete   BOOLEAN      NOT NULL DEFAULT FALSE,
    settings         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_meta_relationship_type CHECK (
        relationship_type IN ('one_to_one', 'one_to_many', 'many_to_one', 'many_to_many')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_meta_relationship_code
    ON kit_meta.meta_relationship (
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        relationship_code
    )
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_meta_relationship_row_version ON kit_meta.meta_relationship;
CREATE TRIGGER trg_meta_relationship_row_version
    BEFORE UPDATE ON kit_meta.meta_relationship
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- =============================================================================
-- meta_form — UI form layout metadata
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_meta.meta_form (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    entity_id        UUID         NOT NULL REFERENCES kit_meta.meta_entity(id),
    form_code        VARCHAR(80)  NOT NULL,
    form_name        VARCHAR(255) NOT NULL,
    form_mode        VARCHAR(30)  NOT NULL DEFAULT 'edit',
    layout           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    field_bindings   JSONB        NOT NULL DEFAULT '[]'::jsonb,
    settings         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_meta_form_mode CHECK (
        form_mode IN ('create', 'edit', 'view', 'search', 'wizard')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_meta_form_entity_code
    ON kit_meta.meta_form (entity_id, form_code)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_meta_form_row_version ON kit_meta.meta_form;
CREATE TRIGGER trg_meta_form_row_version
    BEFORE UPDATE ON kit_meta.meta_form
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- =============================================================================
-- meta_grid — list/grid view metadata
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_meta.meta_grid (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    entity_id        UUID         NOT NULL REFERENCES kit_meta.meta_entity(id),
    grid_code        VARCHAR(80)  NOT NULL,
    grid_name        VARCHAR(255) NOT NULL,
    default_sort     JSONB        NOT NULL DEFAULT '[]'::jsonb,
    column_defs      JSONB        NOT NULL DEFAULT '[]'::jsonb,
    filter_defs      JSONB        NOT NULL DEFAULT '[]'::jsonb,
    settings         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_meta_grid_entity_code UNIQUE (entity_id, grid_code)
);

DROP TRIGGER IF EXISTS trg_meta_grid_row_version ON kit_meta.meta_grid;
CREATE TRIGGER trg_meta_grid_row_version
    BEFORE UPDATE ON kit_meta.meta_grid
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- =============================================================================
-- meta_validation — field/entity validation rules
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_meta.meta_validation (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    entity_id        UUID         NOT NULL REFERENCES kit_meta.meta_entity(id),
    field_id         UUID         REFERENCES kit_meta.meta_field(id),
    rule_code        VARCHAR(80)  NOT NULL,
    rule_name        VARCHAR(255) NOT NULL,
    rule_type        VARCHAR(30)  NOT NULL DEFAULT 'expression',
    rule_expression  TEXT         NOT NULL,
    error_message    TEXT         NOT NULL,
    severity         VARCHAR(20)  NOT NULL DEFAULT 'error',
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order       INT          NOT NULL DEFAULT 0,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_meta_validation_type CHECK (
        rule_type IN ('required', 'regex', 'range', 'expression', 'unique', 'reference')
    ),
    CONSTRAINT ck_meta_validation_severity CHECK (
        severity IN ('error', 'warning', 'info')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_meta_validation_entity_rule
    ON kit_meta.meta_validation (entity_id, rule_code)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_meta_validation_row_version ON kit_meta.meta_validation;
CREATE TRIGGER trg_meta_validation_row_version
    BEFORE UPDATE ON kit_meta.meta_validation
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- =============================================================================
-- Strangler view: i18n translations (entity_translations → meta layer read)
-- =============================================================================

CREATE OR REPLACE VIEW kit_meta.meta_i18n_field_value AS
SELECT
    et.id,
    et.tenant_id,
    NULL::uuid        AS workspace_id,
    et.entity_type    AS entity_code,
    et.entity_id,
    et.locale_code,
    et.field_name     AS field_code,
    et.translated_value,
    et.created_at,
    et.updated_at
FROM public.entity_translations et;

-- =============================================================================
-- SEED: system enums
-- =============================================================================

INSERT INTO kit_meta.meta_enum (enum_code, enum_name, description, is_system)
SELECT v.code, v.name, v.descr, TRUE
FROM (
    VALUES
        ('field_data_type', 'Field Data Types', 'Kernel meta_field.data_type values'),
        ('entity_status', 'Entity Status', 'Generic active/inactive'),
        ('gender', 'Gender', 'Person gender')
) AS v(code, name, descr)
WHERE NOT EXISTS (
    SELECT 1 FROM kit_meta.meta_enum e
    WHERE e.enum_code = v.code AND e.tenant_id IS NULL AND e.deleted_at IS NULL
);

INSERT INTO kit_meta.meta_enum_item (enum_id, item_code, item_label, item_value, sort_order, is_default)
SELECT e.id, v.code, v.label, v.val, v.ord, v.is_def
FROM kit_meta.meta_enum e
CROSS JOIN (
    VALUES
        ('field_data_type', 'string', 'String', 'string', 10, TRUE),
        ('field_data_type', 'text', 'Text', 'text', 20, FALSE),
        ('field_data_type', 'int', 'Integer', 'int', 30, FALSE),
        ('field_data_type', 'decimal', 'Decimal', 'decimal', 40, FALSE),
        ('field_data_type', 'boolean', 'Boolean', 'boolean', 50, FALSE),
        ('field_data_type', 'date', 'Date', 'date', 60, FALSE),
        ('field_data_type', 'datetime', 'DateTime', 'datetime', 70, FALSE),
        ('field_data_type', 'uuid', 'UUID', 'uuid', 80, FALSE),
        ('field_data_type', 'json', 'JSON', 'json', 90, FALSE),
        ('field_data_type', 'enum', 'Enum', 'enum', 100, FALSE),
        ('field_data_type', 'reference', 'Reference', 'reference', 110, FALSE),
        ('entity_status', 'active', 'Active', '1', 10, TRUE),
        ('entity_status', 'inactive', 'Inactive', '2', 20, FALSE),
        ('gender', 'unknown', 'Unknown', '0', 10, TRUE),
        ('gender', 'male', 'Male', '1', 20, FALSE),
        ('gender', 'female', 'Female', '2', 30, FALSE)
) AS v(enum_code, code, label, val, ord, is_def)
WHERE e.enum_code = v.enum_code AND e.tenant_id IS NULL
ON CONFLICT (enum_id, item_code) DO NOTHING;

-- =============================================================================
-- SEED: platform entity registry (Novixa / ERP spine — read-only metadata)
-- =============================================================================

INSERT INTO kit_meta.meta_entity (
    entity_code, entity_name, entity_kind, pack_code, schema_name, table_name, is_system, description
)
SELECT v.code, v.name, v.kind, v.pack, v.schema, v.table_name, TRUE, v.descr
FROM (
    VALUES
        ('party', 'Party', 'kernel', NULL, 'kit_common', 'party_party', 'Universal party spine'),
        ('customer', 'Customer', 'platform', 'novixa_pharmacy', 'public', 'customers', 'Retail customer'),
        ('product', 'Product', 'platform', 'novixa_pharmacy', 'public', 'products', 'Catalog product'),
        ('supplier', 'Supplier', 'platform', 'novixa_pharmacy', 'public', 'suppliers', 'Procurement supplier'),
        ('sales_order', 'Sales Order', 'platform', 'novixa_pharmacy', 'public', 'sales_orders', 'POS / sales order'),
        ('branch', 'Branch', 'platform', NULL, 'public', 'branches', 'Store branch'),
        ('employee', 'Employee', 'platform', NULL, 'public', 'employees', 'Staff employee'),
        ('assessment_template', 'Assessment Template', 'pack', 'novixa_pharmacy', 'public', 'assessment_template', 'Assessment engine template (068)'),
        ('assessment_submission', 'Assessment Submission', 'pack', 'novixa_pharmacy', 'public', 'assessment_submission', 'Assessment runtime submission')
) AS v(code, name, kind, pack, schema, table_name, descr)
WHERE NOT EXISTS (
    SELECT 1 FROM kit_meta.meta_entity me
    WHERE me.tenant_id IS NULL AND me.workspace_id IS NULL AND me.entity_code = v.code AND me.deleted_at IS NULL
);

-- =============================================================================
-- SEED: core fields for customer + product (metadata catalog)
-- =============================================================================

INSERT INTO kit_meta.meta_field (
    entity_id, field_code, field_name, data_type, db_column, is_required, is_unique, is_system, is_translatable, is_searchable, sort_order
)
SELECT
    e.id, f.code, f.name, f.dtype, f.col, f.req, f.uniq, TRUE, f.i18n, f.search, f.ord
FROM kit_meta.meta_entity e
CROSS JOIN (
    VALUES
        ('customer', 'customer_code', 'Customer Code', 'string', 'customer_code', TRUE, TRUE, FALSE, TRUE, 10),
        ('customer', 'full_name', 'Full Name', 'string', 'full_name', TRUE, FALSE, TRUE, TRUE, 20),
        ('customer', 'phone', 'Phone', 'string', 'phone', TRUE, TRUE, FALSE, TRUE, 30),
        ('customer', 'email', 'Email', 'string', 'email', FALSE, FALSE, FALSE, TRUE, 40),
        ('customer', 'party_id', 'Party ID', 'uuid', 'party_id', FALSE, FALSE, FALSE, FALSE, 50),
        ('product', 'product_code', 'Product Code', 'string', 'product_code', TRUE, TRUE, FALSE, TRUE, 10),
        ('product', 'product_name', 'Product Name', 'string', 'product_name', TRUE, FALSE, TRUE, TRUE, 20),
        ('product', 'description', 'Description', 'text', 'description', FALSE, FALSE, TRUE, FALSE, 30),
        ('product', 'product_kind', 'Product Kind', 'string', 'product_kind', FALSE, FALSE, FALSE, TRUE, 40)
) AS f(entity_code, code, name, dtype, col, req, uniq, i18n, search, ord)
WHERE e.entity_code = f.entity_code AND e.tenant_id IS NULL AND e.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_meta.meta_field mf
      WHERE mf.entity_id = e.id AND mf.field_code = f.code AND mf.deleted_at IS NULL
  );

-- =============================================================================
-- SEED: relationships
-- =============================================================================

INSERT INTO kit_meta.meta_relationship (
    relationship_code, relationship_name, from_entity_id, to_entity_id, relationship_type, foreign_key_field
)
SELECT
    r.code, r.name, fe.id, te.id, r.rtype, r.fk
FROM (
    VALUES
        ('customer_party', 'Customer to Party', 'customer', 'party', 'many_to_one', 'party_id'),
        ('sales_order_customer', 'Sales Order to Customer', 'sales_order', 'customer', 'many_to_one', 'customer_id'),
        ('sales_order_branch', 'Sales Order to Branch', 'sales_order', 'branch', 'many_to_one', 'branch_id'),
        ('product_supplier', 'Product primary supplier', 'product', 'supplier', 'many_to_one', NULL)
) AS r(code, name, from_code, to_code, rtype, fk)
JOIN kit_meta.meta_entity fe ON fe.entity_code = r.from_code AND fe.tenant_id IS NULL AND fe.deleted_at IS NULL
JOIN kit_meta.meta_entity te ON te.entity_code = r.to_code AND te.tenant_id IS NULL AND te.deleted_at IS NULL
WHERE NOT EXISTS (
    SELECT 1 FROM kit_meta.meta_relationship mr
    WHERE mr.relationship_code = r.code AND mr.tenant_id IS NULL AND mr.deleted_at IS NULL
);

-- =============================================================================
-- SEED: default form + grid for customer
-- =============================================================================

INSERT INTO kit_meta.meta_form (entity_id, form_code, form_name, form_mode, layout, field_bindings)
SELECT
    e.id,
    'customer_default',
    'Customer Default Form',
    'edit',
    '{"sections":[{"code":"main","title":"Thông tin khách hàng"}]}'::jsonb,
    '[
        {"field":"customer_code","section":"main"},
        {"field":"full_name","section":"main"},
        {"field":"phone","section":"main"},
        {"field":"email","section":"main"}
    ]'::jsonb
FROM kit_meta.meta_entity e
WHERE e.entity_code = 'customer' AND e.tenant_id IS NULL AND e.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_meta.meta_form f
      WHERE f.entity_id = e.id AND f.form_code = 'customer_default' AND f.deleted_at IS NULL
  );

INSERT INTO kit_meta.meta_grid (entity_id, grid_code, grid_name, default_sort, column_defs)
SELECT
    e.id,
    'customer_list',
    'Customer List',
    '[{"field":"full_name","direction":"asc"}]'::jsonb,
    '[
        {"field":"customer_code","width":120},
        {"field":"full_name","width":220},
        {"field":"phone","width":140},
        {"field":"email","width":200}
    ]'::jsonb
FROM kit_meta.meta_entity e
WHERE e.entity_code = 'customer' AND e.tenant_id IS NULL AND e.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_meta.meta_grid g
      WHERE g.entity_id = e.id AND g.grid_code = 'customer_list' AND g.deleted_at IS NULL
  );

-- =============================================================================
-- SEED: validation rules
-- =============================================================================

INSERT INTO kit_meta.meta_validation (entity_id, field_id, rule_code, rule_name, rule_type, rule_expression, error_message, sort_order)
SELECT
    e.id,
    mf.id,
    'customer_phone_required',
    'Phone required',
    'required',
    'phone IS NOT NULL AND length(trim(phone)) >= 9',
    'Số điện thoại không hợp lệ',
    10
FROM kit_meta.meta_entity e
JOIN kit_meta.meta_field mf ON mf.entity_id = e.id AND mf.field_code = 'phone'
WHERE e.entity_code = 'customer' AND e.tenant_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_meta.meta_validation v
      WHERE v.entity_id = e.id AND v.rule_code = 'customer_phone_required' AND v.deleted_at IS NULL
  );

INSERT INTO kit_meta.meta_validation (entity_id, field_id, rule_code, rule_name, rule_type, rule_expression, error_message, sort_order)
SELECT
    e.id,
    mf.id,
    'product_code_required',
    'Product code required',
    'required',
    'product_code IS NOT NULL AND length(trim(product_code)) > 0',
    'Mã sản phẩm bắt buộc',
    10
FROM kit_meta.meta_entity e
JOIN kit_meta.meta_field mf ON mf.entity_id = e.id AND mf.field_code = 'product_code'
WHERE e.entity_code = 'product' AND e.tenant_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_meta.meta_validation v
      WHERE v.entity_id = e.id AND v.rule_code = 'product_code_required' AND v.deleted_at IS NULL
  );

-- =============================================================================
-- Post-apply: registry + kernel version
-- =============================================================================

UPDATE kit_core.kernel_table_registry SET registry_status = 'EXISTS', updated_at = NOW()
WHERE table_name IN (
    'meta_entity', 'meta_field', 'meta_relationship', 'meta_enum', 'meta_enum_item',
    'meta_form', 'meta_grid', 'meta_validation'
);

UPDATE kit_core.platform_kernel_version SET
    kernel_phase = 'P4',
    last_migration = '075_kit_metadata',
    schema_version = 5,
    notes = 'Phase 4: Metadata 8 tables + platform entity seed + assessment registry + i18n view.',
    updated_at = NOW()
WHERE id = 1;
