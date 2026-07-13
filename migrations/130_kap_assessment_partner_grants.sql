-- KitPlatform 130: GRANT assessment_partner to app role (fix permission denied 42501)
-- Depends on: 129_kap_partner_portal
-- Symptom: KAP leads list fails with "permission denied for table assessment_partner"
-- when the partner table was created as a different DB owner than the API user.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'assessment_partner'
    ) AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kitplatform') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE assessment_partner TO kitplatform;
    END IF;
END $$;
