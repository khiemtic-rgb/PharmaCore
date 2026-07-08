-- KitPlatform 051: Nền tảng đa chi nhánh, đa vertical (NT/TBYT/TPCN/chuỗi) + i18n
-- Additive only — pilot 3 NT chạy y nguyên; thiếu cột mới = default an toàn.

-- ---------------------------------------------------------------------------
-- 1. Chuỗi / tổ chức (cross-tenant sau này; pilot để NULL)
-- ---------------------------------------------------------------------------
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_code        VARCHAR(50)  NOT NULL,
    org_name        VARCHAR(255) NOT NULL,
    country_code    CHAR(2)      NOT NULL DEFAULT 'VN',
    settings        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status          SMALLINT     NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uq_organizations_code UNIQUE (org_code)
);

CREATE TRIGGER trg_organizations_updated
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE organizations IS 'Tổ chức/chuỗi — gom nhiều tenant (mỗi NT = 1 tenant) hoặc 1 tenant nhiều chi nhánh.';

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
    ADD COLUMN IF NOT EXISTS business_vertical VARCHAR(30) NOT NULL DEFAULT 'pharmacy';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_tenants_business_vertical') THEN
        ALTER TABLE tenants
            ADD CONSTRAINT ck_tenants_business_vertical CHECK (
                business_vertical IN (
                    'pharmacy', 'pharmacy_chain', 'supplement_store',
                    'medical_equipment_store', 'clinic', 'lab', 'medical_spa', 'hybrid'
                )
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_tenants_organization
    ON tenants (organization_id)
    WHERE organization_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_tenants_vertical
    ON tenants (business_vertical)
    WHERE deleted_at IS NULL;

COMMENT ON COLUMN tenants.business_vertical IS 'Loại hình tenant; đồng bộ với settings.platform.vertical.';
COMMENT ON COLUMN tenants.organization_id IS 'NULL = độc lập; gán khi thuộc chuỗi enterprise.';

-- ---------------------------------------------------------------------------
-- 2. Chi nhánh — locale, loại cửa hàng, cấu hình cục bộ
-- ---------------------------------------------------------------------------
ALTER TABLE branches
    ADD COLUMN IF NOT EXISTS branch_type VARCHAR(20) NOT NULL DEFAULT 'retail',
    ADD COLUMN IF NOT EXISTS locale_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_branches_branch_type') THEN
        ALTER TABLE branches
            ADD CONSTRAINT ck_branches_branch_type CHECK (
                branch_type IN ('retail', 'headquarters', 'warehouse_hub', 'popup')
            );
    END IF;
END $$;

UPDATE branches SET branch_type = 'headquarters' WHERE is_head_office = TRUE AND branch_type = 'retail';

COMMENT ON COLUMN branches.branch_type IS 'retail | headquarters | warehouse_hub | popup';
COMMENT ON COLUMN branches.locale_code IS 'Override locale chi nhánh; NULL = kế thừa tenant.';
COMMENT ON COLUMN branches.settings IS 'JSON: receipt override, operating_hours, geo, ...';

-- ---------------------------------------------------------------------------
-- 3. Locale hệ thống + bản dịch entity
-- ---------------------------------------------------------------------------
CREATE TABLE platform_locales (
    locale_code     VARCHAR(10) PRIMARY KEY,
    language_code   CHAR(2)      NOT NULL,
    region_code     CHAR(2),
    display_name    VARCHAR(100) NOT NULL,
    is_rtl          BOOLEAN      NOT NULL DEFAULT FALSE,
    status          SMALLINT     NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO platform_locales (locale_code, language_code, region_code, display_name, status)
VALUES
    ('vi-VN', 'vi', 'VN', 'Tiếng Việt', 1),
    ('en-US', 'en', 'US', 'English (US)', 0)
ON CONFLICT (locale_code) DO NOTHING;

ALTER TABLE branches
    ADD CONSTRAINT fk_branches_locale
    FOREIGN KEY (locale_code) REFERENCES platform_locales(locale_code);

CREATE TABLE entity_translations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID         NOT NULL REFERENCES tenants(id),
    entity_type         VARCHAR(50)  NOT NULL,
    entity_id           UUID         NOT NULL,
    locale_code         VARCHAR(10)  NOT NULL REFERENCES platform_locales(locale_code),
    field_name          VARCHAR(50)  NOT NULL,
    translated_value    TEXT         NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_entity_translations UNIQUE (tenant_id, entity_type, entity_id, locale_code, field_name),
    CONSTRAINT ck_entity_translations_type CHECK (
        entity_type IN ('product', 'category', 'brand', 'branch', 'voucher', 'warehouse')
    ),
    CONSTRAINT ck_entity_translations_field CHECK (
        field_name IN ('name', 'description', 'tagline', 'generic_name', 'notes')
    )
);

CREATE INDEX ix_entity_translations_lookup
    ON entity_translations (tenant_id, entity_type, entity_id, locale_code);

CREATE TRIGGER trg_entity_translations_updated
    BEFORE UPDATE ON entity_translations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE entity_translations IS 'Bản dịch đa ngữ cho catalog/chi nhánh; locale gốc vẫn ở bảng chính.';

CREATE TABLE tenant_string_translations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID         NOT NULL REFERENCES tenants(id),
    translation_key     VARCHAR(120) NOT NULL,
    locale_code         VARCHAR(10)  NOT NULL REFERENCES platform_locales(locale_code),
    translated_value    TEXT         NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_string_translations UNIQUE (tenant_id, translation_key, locale_code)
);

CREATE TRIGGER trg_tenant_string_translations_updated
    BEFORE UPDATE ON tenant_string_translations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE tenant_string_translations IS 'Nhãn UI tenant (sales.order_reminder_default, ...); thay/thêm settings.platform.labels.';

ALTER TABLE customer_accounts
    ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(10) REFERENCES platform_locales(locale_code);

COMMENT ON COLUMN customer_accounts.preferred_locale IS 'Locale app khách; NULL = customer_app_default_locale của tenant.';

-- ---------------------------------------------------------------------------
-- 4. Catalog đa vertical — product_kind + attributes (TBYT/TPCN/NT)
-- ---------------------------------------------------------------------------
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS product_kind VARCHAR(30) NOT NULL DEFAULT 'pharmacy_drug',
    ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_products_product_kind') THEN
        ALTER TABLE products
            ADD CONSTRAINT ck_products_product_kind CHECK (
                product_kind IN (
                    'pharmacy_drug', 'supplement', 'medical_device',
                    'general_retail', 'service', 'bundle'
                )
            );
    END IF;
END $$;

UPDATE products
SET product_kind = 'pharmacy_drug'
WHERE product_kind IS NULL OR product_kind = '';

CREATE INDEX IF NOT EXISTS ix_products_kind
    ON products (tenant_id, product_kind)
    WHERE deleted_at IS NULL;

COMMENT ON COLUMN products.product_kind IS 'pharmacy_drug | supplement | medical_device | general_retail | service';
COMMENT ON COLUMN products.attributes IS 'JSON mở rộng theo vertical (TPCN: serving_size; TBYT: model_no; ...)';
COMMENT ON COLUMN products.drug_type IS 'Legacy NT: 1 OTC 2 Rx 3 Controlled — chỉ áp dụng pharmacy_drug.';

-- ---------------------------------------------------------------------------
-- 5. Giá theo chi nhánh (NULL branch_id = giá chung tenant)
-- ---------------------------------------------------------------------------
ALTER TABLE product_prices
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

CREATE INDEX IF NOT EXISTS ix_product_prices_branch_lookup
    ON product_prices (tenant_id, branch_id, product_id, price_type, effective_from DESC)
    WHERE status = 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_prices_tenant_default
    ON product_prices (tenant_id, product_id, product_unit_id, price_type, effective_from)
    WHERE branch_id IS NULL AND status = 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_prices_branch
    ON product_prices (tenant_id, branch_id, product_id, product_unit_id, price_type, effective_from)
    WHERE branch_id IS NOT NULL AND status = 1;

COMMENT ON COLUMN product_prices.branch_id IS 'NULL = giá áp dụng mọi chi nhánh; có giá trị = override chi nhánh.';

-- ---------------------------------------------------------------------------
-- 6. Assortment đa chi nhánh (chuỗi NT — SP không bán tại mọi cửa hàng)
-- ---------------------------------------------------------------------------
CREATE TABLE branch_product_listings (
    tenant_id       UUID         NOT NULL REFERENCES tenants(id),
    branch_id       UUID         NOT NULL REFERENCES branches(id),
    product_id      UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    is_available    BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (branch_id, product_id)
);

CREATE INDEX ix_branch_product_listings_tenant
    ON branch_product_listings (tenant_id, branch_id, is_available);

CREATE TRIGGER trg_branch_product_listings_updated
    BEFORE UPDATE ON branch_product_listings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE branch_product_listings IS 'Ràng buộc SP có bán tại chi nhánh; trống = mặc định tất cả SP tenant.';

-- ---------------------------------------------------------------------------
-- 7. Registry module platform (metadata; enabled thực tế ở settings.platform)
-- ---------------------------------------------------------------------------
CREATE TABLE platform_module_registry (
    module_code     VARCHAR(50)  PRIMARY KEY,
    module_name     VARCHAR(255) NOT NULL,
    description     TEXT,
    verticals       TEXT[]       NOT NULL DEFAULT '{}',
    sort_order      INT          NOT NULL DEFAULT 0,
    status          SMALLINT     NOT NULL DEFAULT 1
);

INSERT INTO platform_module_registry (module_code, module_name, description, verticals, sort_order)
VALUES
    ('inventory', 'Kho & tồn', 'Lô, FEFO, điều chuyển', ARRAY['pharmacy','pharmacy_chain','supplement_store','medical_equipment_store'], 10),
    ('procurement', 'Mua hàng', 'PO, GRN, công nợ NCC', ARRAY['pharmacy','pharmacy_chain','supplement_store','medical_equipment_store'], 20),
    ('sales', 'Bán hàng / POS', 'Đơn bán, ca, trả hàng', ARRAY['pharmacy','pharmacy_chain','supplement_store','medical_equipment_store'], 30),
    ('loyalty', 'Khách hàng thân thiết', 'Điểm, hạng, voucher', ARRAY['pharmacy','pharmacy_chain','supplement_store','medical_equipment_store'], 40),
    ('customer_app', 'App khách', 'OTP, white-label', ARRAY['pharmacy','pharmacy_chain','supplement_store','medical_equipment_store','clinic','lab','medical_spa'], 50),
    ('medication', 'Nhắc thuốc & tái mua', 'medication_reminders, repurchase', ARRAY['pharmacy','pharmacy_chain'], 60),
    ('health_wallet', 'Ví sức khỏe', 'family, health_records, care_reminders', ARRAY['pharmacy','pharmacy_chain','supplement_store','medical_equipment_store','clinic','lab','medical_spa'], 70),
    ('reservations', 'Đặt trước', 'customer_reservations', ARRAY['pharmacy','pharmacy_chain'], 80),
    ('reports', 'Báo cáo', 'Doanh thu, tồn, mua hàng', ARRAY['pharmacy','pharmacy_chain','supplement_store','medical_equipment_store'], 90),
    ('clinic', 'Phòng khám', 'Chưa triển khai', ARRAY['clinic','hybrid'], 100),
    ('lab', 'Xét nghiệm', 'Chưa triển khai', ARRAY['lab','hybrid'], 110),
    ('spa', 'Spa y khoa', 'Chưa triển khai', ARRAY['medical_spa','hybrid'], 120)
ON CONFLICT (module_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. settings.platform — backfill tenant hiện có (additive)
-- ---------------------------------------------------------------------------
UPDATE tenants
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{platform}',
    jsonb_build_object(
        'schema_version', 1,
        'vertical', 'pharmacy',
        'enabled_modules', jsonb_build_array(
            'inventory', 'procurement', 'sales', 'loyalty', 'customer_app',
            'medication', 'health_wallet', 'reservations', 'reports'
        ),
        'i18n', jsonb_build_object(
            'default_locale', 'vi-VN',
            'supported_locales', jsonb_build_array('vi-VN'),
            'fallback_locale', 'vi-VN',
            'admin_default_locale', 'vi-VN',
            'customer_app_default_locale', 'vi-VN'
        ),
        'features', jsonb_build_object(
            'batch_tracking', true,
            'national_drug_catalog', true,
            'order_level_repurchase', true,
            'family_members', true,
            'branch_price_overrides', true,
            'branch_product_listings', false
        )
    ),
    true
)
WHERE deleted_at IS NULL
  AND (settings->'platform') IS NULL;

UPDATE tenants
SET business_vertical = COALESCE(settings->'platform'->>'vertical', 'pharmacy')
WHERE deleted_at IS NULL;

-- Nhãn mặc định pilot (vi-VN) — có thể migrate sang tenant_string_translations sau
INSERT INTO tenant_string_translations (tenant_id, translation_key, locale_code, translated_value)
SELECT
    t.id,
    k.key,
    'vi-VN',
    k.val
FROM tenants t
CROSS JOIN (
    VALUES
        ('sales.order_reminder_default', 'Đơn thuốc ngày {{date}}'),
        ('customer.repurchase_section_title', 'Nhắc hết đơn thuốc'),
        ('customer.medication_reminders_title', 'Nhắc uống thuốc'),
        ('customer.health_wallet_title', 'Hồ sơ sức khỏe')
) AS k(key, val)
WHERE t.deleted_at IS NULL
ON CONFLICT (tenant_id, translation_key, locale_code) DO NOTHING;

COMMENT ON COLUMN tenants.settings IS 'JSON tenant; platform=vertical/modules/i18n; customer_app=branding; receipt, batch_mode, ... giữ nguyên root.';
