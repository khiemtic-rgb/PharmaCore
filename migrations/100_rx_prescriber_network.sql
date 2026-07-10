-- KitPlatform 100: Rx-2 foundation — prescriber identity, tenant links, pharmacy directory
-- Depends on: 096_rx_prescriptions.sql

-- =============================================================================
-- Tenant: opt-in pharmacy directory for prescriber search (D12)
-- =============================================================================
ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS rx_directory_discoverable BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.tenants.rx_directory_discoverable IS
    'When true, tenant appears in prescriber portal pharmacy directory (public metadata only)';

-- =============================================================================
-- Platform prescriber identity (one person, many pharmacies)
-- =============================================================================
CREATE TABLE IF NOT EXISTS pack_pharmacy.prescribers (
    id              UUID PRIMARY KEY DEFAULT kit_uuid_v7(),
    full_name       VARCHAR(200) NOT NULL,
    license_number  VARCHAR(50),
    phone           VARCHAR(30) NOT NULL,
    specialty       VARCHAR(120),
    status          VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
    verified_at     TIMESTAMPTZ,
    verified_by     UUID,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT ck_prescribers_status CHECK (
        status IN ('pending_verification', 'active', 'suspended')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_prescribers_phone_active
    ON pack_pharmacy.prescribers (phone)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_prescribers_license_active
    ON pack_pharmacy.prescribers (license_number)
    WHERE deleted_at IS NULL AND license_number IS NOT NULL AND license_number <> '';

CREATE INDEX IF NOT EXISTS ix_prescribers_status
    ON pack_pharmacy.prescribers (status)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- BS <-> NT link (D11 invite, D12 request)
-- =============================================================================
CREATE TABLE IF NOT EXISTS pack_pharmacy.prescriber_tenant_links (
    id                  UUID PRIMARY KEY DEFAULT kit_uuid_v7(),
    prescriber_id       UUID NOT NULL REFERENCES pack_pharmacy.prescribers(id),
    tenant_id           UUID NOT NULL REFERENCES public.tenants(id),
    linked_prescriber_id UUID REFERENCES pack_pharmacy.linked_prescribers(id),
    link_status         VARCHAR(30) NOT NULL,
    initiated_by        VARCHAR(20) NOT NULL,
    invited_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at        TIMESTAMPTZ,
    responded_by        UUID,
    revoked_at          TIMESTAMPTZ,
    revoked_by          UUID,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_prescriber_tenant_links_pair UNIQUE (prescriber_id, tenant_id),
    CONSTRAINT ck_prescriber_tenant_links_status CHECK (
        link_status IN (
            'pending_nt_invite',
            'pending_nt_approval',
            'active',
            'rejected',
            'revoked'
        )
    ),
    CONSTRAINT ck_prescriber_tenant_links_initiated_by CHECK (
        initiated_by IN ('tenant', 'prescriber', 'system')
    )
);

CREATE INDEX IF NOT EXISTS ix_prescriber_tenant_links_tenant_status
    ON pack_pharmacy.prescriber_tenant_links (tenant_id, link_status);

CREATE INDEX IF NOT EXISTS ix_prescriber_tenant_links_prescriber_status
    ON pack_pharmacy.prescriber_tenant_links (prescriber_id, link_status);

-- =============================================================================
-- Extend Rx-1 tables
-- =============================================================================
ALTER TABLE pack_pharmacy.linked_prescribers
    ADD COLUMN IF NOT EXISTS prescriber_id UUID REFERENCES pack_pharmacy.prescribers(id),
    ADD COLUMN IF NOT EXISTS link_id UUID REFERENCES pack_pharmacy.prescriber_tenant_links(id);

CREATE INDEX IF NOT EXISTS ix_linked_prescribers_prescriber
    ON pack_pharmacy.linked_prescribers (prescriber_id)
    WHERE prescriber_id IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE pack_pharmacy.electronic_prescriptions
    ADD COLUMN IF NOT EXISTS prescriber_id UUID REFERENCES pack_pharmacy.prescribers(id);

CREATE INDEX IF NOT EXISTS ix_electronic_prescriptions_prescriber
    ON pack_pharmacy.electronic_prescriptions (prescriber_id)
    WHERE prescriber_id IS NOT NULL;

-- =============================================================================
-- Backfill pilot NT_XUANHOA: linked_prescribers -> prescribers + active links
-- =============================================================================
INSERT INTO pack_pharmacy.prescribers (
    full_name, license_number, phone, specialty, status, verified_at, created_at, updated_at
)
SELECT DISTINCT ON (lp.phone)
    lp.full_name,
    NULLIF(TRIM(lp.license_number), ''),
    lp.phone,
    lp.specialty,
    'active',
    NOW(),
    lp.created_at,
    lp.updated_at
FROM pack_pharmacy.linked_prescribers lp
INNER JOIN public.tenants t ON t.id = lp.tenant_id
WHERE t.tenant_code = 'NT_XUANHOA'
  AND lp.deleted_at IS NULL
  AND lp.phone IS NOT NULL
  AND TRIM(lp.phone) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM pack_pharmacy.prescribers p
      WHERE p.phone = lp.phone AND p.deleted_at IS NULL
  )
ORDER BY lp.phone, lp.created_at;

INSERT INTO pack_pharmacy.prescriber_tenant_links (
    prescriber_id,
    tenant_id,
    linked_prescriber_id,
    link_status,
    initiated_by,
    invited_at,
    responded_at,
    created_at,
    updated_at
)
SELECT
    p.id,
    lp.tenant_id,
    lp.id,
    'active',
    'system',
    lp.created_at,
    lp.created_at,
    NOW(),
    NOW()
FROM pack_pharmacy.linked_prescribers lp
INNER JOIN pack_pharmacy.prescribers p
    ON p.phone = lp.phone AND p.deleted_at IS NULL
WHERE lp.deleted_at IS NULL
  AND lp.phone IS NOT NULL
  AND TRIM(lp.phone) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM pack_pharmacy.prescriber_tenant_links l
      WHERE l.prescriber_id = p.id AND l.tenant_id = lp.tenant_id
  );

UPDATE pack_pharmacy.linked_prescribers lp
SET
    prescriber_id = p.id,
    link_id = l.id,
    updated_at = NOW()
FROM pack_pharmacy.prescribers p
INNER JOIN pack_pharmacy.prescriber_tenant_links l
    ON l.prescriber_id = p.id
WHERE lp.phone = p.phone
  AND lp.tenant_id = l.tenant_id
  AND lp.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND lp.prescriber_id IS NULL;

UPDATE pack_pharmacy.electronic_prescriptions ep
SET prescriber_id = lp.prescriber_id
FROM pack_pharmacy.linked_prescribers lp
WHERE ep.linked_prescriber_id = lp.id
  AND ep.prescriber_id IS NULL
  AND lp.prescriber_id IS NOT NULL;

-- Pilot: allow directory demo for Xuân Hòa (opt-in; safe default false elsewhere)
UPDATE public.tenants
SET rx_directory_discoverable = TRUE
WHERE tenant_code = 'NT_XUANHOA';

COMMENT ON TABLE pack_pharmacy.prescribers IS 'Platform prescriber identity — Rx-2 network';
COMMENT ON TABLE pack_pharmacy.prescriber_tenant_links IS 'Many-to-many BS↔NT with D11/D12 link states';

-- Permission for Rx-2 link management (admin)
INSERT INTO public.permissions (permission_code, permission_name, module_name)
VALUES ('rx.prescriber.link.manage', 'Quản lý liên kết bác sĩ', 'Đơn thuốc')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_code IN ('ADMIN', 'MANAGER')
  AND p.permission_code = 'rx.prescriber.link.manage'
ON CONFLICT DO NOTHING;
