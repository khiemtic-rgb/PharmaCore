-- KitPlatform 103: Healthcare network foundation — care episode spine, issuance channels, module registry
-- Depends on: 096_rx_prescriptions.sql, 100_rx_prescriber_network.sql, 101_prescriber_portal_otp.sql
-- Layer: Platform + Pack:Pharmacy (Rx-2 Phase A scaffold)

-- =============================================================================
-- E-prescription: optional care episode (telehealth Phase 2) + extended source channel
-- =============================================================================
ALTER TABLE pack_pharmacy.electronic_prescriptions
    ADD COLUMN IF NOT EXISTS care_episode_id UUID NULL;

COMMENT ON COLUMN pack_pharmacy.electronic_prescriptions.care_episode_id IS
    'Optional link to pack_clinic visit/appointment. FK added when Clinic pack is active (Phase 2 telehealth).';

COMMENT ON COLUMN pack_pharmacy.electronic_prescriptions.source IS
    'Issuance channel: staff_entry | prescriber_portal | customer_upload | telehealth';

ALTER TABLE pack_pharmacy.electronic_prescriptions
    DROP CONSTRAINT IF EXISTS ck_electronic_prescriptions_source;

ALTER TABLE pack_pharmacy.electronic_prescriptions
    ADD CONSTRAINT ck_electronic_prescriptions_source CHECK (
        source IN ('staff_entry', 'prescriber_portal', 'customer_upload', 'telehealth')
    );

CREATE INDEX IF NOT EXISTS ix_electronic_prescriptions_care_episode
    ON pack_pharmacy.electronic_prescriptions (care_episode_id)
    WHERE care_episode_id IS NOT NULL;

-- =============================================================================
-- Platform module registry — Healthcare network modules (Rx-2 Phase A)
-- =============================================================================
INSERT INTO platform_module_registry (module_code, module_name, description, verticals, sort_order)
SELECT v.code, v.name, v.description, v.verticals, v.sort_order
FROM (
    VALUES
        (
            'e_rx',
            'Đơn thuốc điện tử',
            'e-Rx strict POS, verify, dispense audit',
            ARRAY['pharmacy', 'pharmacy_chain', 'hybrid'],
            45
        ),
        (
            'prescriber_network',
            'Mạng bác sĩ',
            'N-N prescriber ↔ pharmacy links, directory, trust spine',
            ARRAY['pharmacy', 'pharmacy_chain', 'hybrid', 'clinic'],
            46
        ),
        (
            'prescriber_portal',
            'Portal bác sĩ',
            'Prescriber channel — OTP auth, link NT, kê đơn signed',
            ARRAY['pharmacy', 'pharmacy_chain', 'hybrid', 'clinic'],
            47
        ),
        (
            'telehealth',
            'Khám từ xa',
            'Video consult + care episode → e-Rx (Phase 2 — module gate only)',
            ARRAY['pharmacy', 'pharmacy_chain', 'hybrid', 'clinic'],
            48
        )
) AS v(code, name, description, verticals, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM platform_module_registry m WHERE m.module_code = v.code
);

-- Pilot pharmacy tenants: enable healthcare modules (additive to settings.platform.enabled_modules)
UPDATE public.tenants t
SET settings = jsonb_set(
    COALESCE(t.settings, '{}'::jsonb),
    '{platform,enabled_modules}',
    (
        SELECT jsonb_agg(DISTINCT elem ORDER BY elem)
        FROM (
            SELECT jsonb_array_elements_text(
                COALESCE(t.settings->'platform'->'enabled_modules', '[]'::jsonb)
            ) AS elem
            UNION ALL
            SELECT unnest(ARRAY['e_rx', 'prescriber_network', 'prescriber_portal']::text[])
        ) merged
    ),
    true
)
WHERE t.business_vertical IN ('pharmacy', 'pharmacy_chain', 'hybrid')
  AND t.deleted_at IS NULL;
