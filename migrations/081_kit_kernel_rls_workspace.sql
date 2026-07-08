-- KitPlatform 081: P1.5b RLS on kernel dual-write tables + workspace backfill on outbox
-- Depends on: 080_kit_workspace_pack_rls.sql

-- Backfill workspace_id on event_outbox from tenant default workspace
UPDATE kit_event.event_outbox eo
SET workspace_id = w.id, updated_at = NOW()
FROM kit_workspace.workspace_workspace w
WHERE eo.workspace_id IS NULL
  AND w.tenant_id = eo.tenant_id
  AND w.is_default = TRUE
  AND w.deleted_at IS NULL;

UPDATE kit_notify.notify_notification n
SET workspace_id = w.id, updated_at = NOW()
FROM kit_workspace.workspace_workspace w
WHERE n.workspace_id IS NULL
  AND w.tenant_id = n.tenant_id
  AND w.is_default = TRUE
  AND w.deleted_at IS NULL;

UPDATE kit_notify.notify_queue q
SET workspace_id = n.workspace_id, updated_at = NOW()
FROM kit_notify.notify_notification n
WHERE q.workspace_id IS NULL
  AND q.notification_id = n.id
  AND n.workspace_id IS NOT NULL;

UPDATE kit_audit.activity_log al
SET workspace_id = w.id
FROM kit_workspace.workspace_workspace w
WHERE al.workspace_id IS NULL
  AND w.tenant_id = al.tenant_id
  AND w.is_default = TRUE
  AND w.deleted_at IS NULL;

UPDATE kit_common.party_party p
SET workspace_id = w.id, updated_at = NOW()
FROM kit_workspace.workspace_workspace w
WHERE p.workspace_id IS NULL
  AND w.tenant_id = p.tenant_id
  AND w.is_default = TRUE
  AND w.deleted_at IS NULL;

-- RLS on kernel tables used by dual-write runtime
DO $rls$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'kit_event.event_outbox',
        'kit_notify.notify_notification',
        'kit_notify.notify_recipient',
        'kit_notify.notify_queue',
        'kit_audit.activity_log',
        'kit_audit.change_log',
        'kit_common.party_party',
        'kit_common.party_identifier'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', tbl);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %s FOR ALL USING (kit_rls_tenant_match(tenant_id)) WITH CHECK (kit_rls_tenant_match(tenant_id))',
            tbl
        );
    END LOOP;
END
$rls$;
