-- KitPlatform 084: Provision pharmacy_survey workspace for active tenants
-- Depends on: 083_pack_survey_schema.sql

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.tenants WHERE deleted_at IS NULL LOOP
        BEGIN
            PERFORM kit_provision_pack_workspace(r.id, 'pharmacy_survey');
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Skip tenant %: %', r.id, SQLERRM;
        END;
    END LOOP;
END
$$;
