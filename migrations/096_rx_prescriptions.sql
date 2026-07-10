-- KitPlatform 096: Rx-1 — e-prescriptions, prescribers, POS bind
-- Depends on: 095_rx_dispensing_class.sql, 006_sales.sql

-- =============================================================================
-- Prescribers
-- =============================================================================
CREATE TABLE IF NOT EXISTS pack_pharmacy.linked_prescribers (
    id              UUID PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
    full_name       VARCHAR(200) NOT NULL,
    license_number  VARCHAR(50),
    phone           VARCHAR(30),
    specialty       VARCHAR(120),
    status          SMALLINT NOT NULL DEFAULT 1,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_linked_prescribers_tenant
    ON pack_pharmacy.linked_prescribers (tenant_id)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- Prescriptions
-- =============================================================================
CREATE TABLE IF NOT EXISTS pack_pharmacy.electronic_prescriptions (
    id                  UUID PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id           UUID NOT NULL REFERENCES public.tenants(id),
    branch_id           UUID REFERENCES public.branches(id),
    prescription_code   VARCHAR(40) NOT NULL,
    linked_prescriber_id UUID NOT NULL REFERENCES pack_pharmacy.linked_prescribers(id),
    customer_id         UUID REFERENCES public.customers(id),
    patient_name        VARCHAR(200),
    patient_phone       VARCHAR(30),
    status              VARCHAR(30) NOT NULL DEFAULT 'draft',
    source              VARCHAR(30) NOT NULL DEFAULT 'staff_entry',
    verification_method VARCHAR(30),
    verified_by         UUID,
    verified_at         TIMESTAMPTZ,
    signed_at           TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    dispensed_at        TIMESTAMPTZ,
    notes               TEXT,
    created_by          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at        TIMESTAMPTZ,
    CONSTRAINT uq_electronic_prescriptions_code UNIQUE (tenant_id, prescription_code),
    CONSTRAINT ck_electronic_prescriptions_status CHECK (
        status IN (
            'draft', 'pending_verification', 'verified', 'signed',
            'partially_dispensed', 'dispensed', 'expired', 'cancelled'
        )
    ),
    CONSTRAINT ck_electronic_prescriptions_source CHECK (
        source IN ('staff_entry', 'prescriber_portal', 'customer_upload')
    )
);

CREATE INDEX IF NOT EXISTS ix_electronic_prescriptions_tenant_status
    ON pack_pharmacy.electronic_prescriptions (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_electronic_prescriptions_customer_phone
    ON pack_pharmacy.electronic_prescriptions (tenant_id, patient_phone)
    WHERE patient_phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS pack_pharmacy.electronic_prescription_lines (
    id                      UUID PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id               UUID NOT NULL REFERENCES public.tenants(id),
    prescription_id         UUID NOT NULL REFERENCES pack_pharmacy.electronic_prescriptions(id) ON DELETE CASCADE,
    product_id              UUID NOT NULL REFERENCES public.products(id),
    product_unit_id         UUID REFERENCES public.product_units(id),
    line_dispensing_class   VARCHAR(20) NOT NULL DEFAULT 'prescription',
    qty_prescribed          NUMERIC(18, 4) NOT NULL,
    qty_dispensed           NUMERIC(18, 4) NOT NULL DEFAULT 0,
    dosage_instruction      TEXT,
    sort_order              INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_rx_line_qty CHECK (qty_prescribed > 0 AND qty_dispensed >= 0),
    CONSTRAINT ck_rx_line_dispensing_class CHECK (
        line_dispensing_class IN ('otc', 'prescription', 'controlled')
    )
);

CREATE INDEX IF NOT EXISTS ix_electronic_prescription_lines_rx
    ON pack_pharmacy.electronic_prescription_lines (prescription_id);

CREATE TABLE IF NOT EXISTS pack_pharmacy.prescription_attachments (
    id              UUID PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
    prescription_id UUID NOT NULL REFERENCES pack_pharmacy.electronic_prescriptions(id) ON DELETE CASCADE,
    file_url        TEXT NOT NULL,
    file_name       VARCHAR(255),
    uploaded_by     UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_prescription_attachments_rx
    ON pack_pharmacy.prescription_attachments (prescription_id);

CREATE TABLE IF NOT EXISTS pack_pharmacy.prescription_audit_log (
    id              UUID PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
    prescription_id UUID NOT NULL REFERENCES pack_pharmacy.electronic_prescriptions(id) ON DELETE CASCADE,
    action          VARCHAR(40) NOT NULL,
    actor_id        UUID,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pack_pharmacy.prescription_dispense_events (
    id                      UUID PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id               UUID NOT NULL REFERENCES public.tenants(id),
    prescription_id         UUID NOT NULL REFERENCES pack_pharmacy.electronic_prescriptions(id),
    prescription_line_id    UUID NOT NULL REFERENCES pack_pharmacy.electronic_prescription_lines(id),
    sales_order_id          UUID NOT NULL REFERENCES public.sales_orders(id),
    sales_order_item_id     UUID REFERENCES public.sales_order_items(id),
    branch_id               UUID,
    qty                     NUMERIC(18, 4) NOT NULL,
    dispensed_by            UUID,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Sales bind
-- =============================================================================
ALTER TABLE public.sales_orders
    ADD COLUMN IF NOT EXISTS prescription_id UUID;

CREATE INDEX IF NOT EXISTS ix_sales_orders_prescription
    ON public.sales_orders (tenant_id, prescription_id)
    WHERE prescription_id IS NOT NULL;

ALTER TABLE public.sales_order_items
    ADD COLUMN IF NOT EXISTS prescription_line_id UUID;

-- =============================================================================
-- Permissions (pilot — ADMIN)
-- =============================================================================
INSERT INTO permissions (permission_code, permission_name, module_name) VALUES
    ('rx.prescriber.manage', 'Quản lý bác sĩ liên kết', 'Đơn thuốc'),
    ('rx.prescription.create', 'Tạo / sửa đơn thuốc', 'Đơn thuốc'),
    ('rx.prescription.verify', 'Xác nhận đơn thuốc', 'Đơn thuốc'),
    ('rx.prescription.dispense', 'Cấp phát đơn trên POS', 'Đơn thuốc'),
    ('rx.prescription.read', 'Xem đơn thuốc', 'Đơn thuốc')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_code = 'ADMIN'
  AND p.permission_code IN (
    'rx.prescriber.manage',
    'rx.prescription.create',
    'rx.prescription.verify',
    'rx.prescription.dispense',
    'rx.prescription.read'
  )
ON CONFLICT DO NOTHING;

COMMENT ON TABLE pack_pharmacy.linked_prescribers IS 'Bác sĩ liên kết tenant — Rx-1';
COMMENT ON TABLE pack_pharmacy.electronic_prescriptions IS 'Đơn thuốc điện tử — Rx-1';
