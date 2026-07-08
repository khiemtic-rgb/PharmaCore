-- KitPlatform: Kernel dual-write / party consistency reconciliation
-- Run after cutover changes. Exit code 0 = all checks pass (via ps1 wrapper).

\echo '=== Kernel consistency reconciliation ==='

\echo ''
\echo '-- 1. platform_events missing from event_outbox'
SELECT
    pe.id AS platform_event_id,
    pe.event_type,
    pe.occurred_at
FROM public.platform_events pe
WHERE NOT EXISTS (
    SELECT 1 FROM kit_event.event_outbox eo
    WHERE eo.legacy_platform_event_id = pe.id
)
ORDER BY pe.occurred_at DESC
LIMIT 20;

\echo ''
\echo '-- 2. integration_outbox missing from event_outbox'
SELECT
    io.id AS integration_outbox_id,
    io.event_type,
    io.occurred_at
FROM public.integration_outbox io
WHERE NOT EXISTS (
    SELECT 1 FROM kit_event.event_outbox eo
    WHERE eo.legacy_outbox_id = io.id
)
ORDER BY io.occurred_at DESC
LIMIT 20;

\echo ''
\echo '-- 3. Dispatched status drift (platform_events vs event_outbox)'
SELECT
    pe.id,
    pe.dispatched_at AS legacy_dispatched,
    eo.dispatched_at AS kernel_dispatched
FROM public.platform_events pe
INNER JOIN kit_event.event_outbox eo ON eo.legacy_platform_event_id = pe.id
WHERE (pe.dispatched_at IS NULL) <> (eo.dispatched_at IS NULL)
LIMIT 20;

\echo ''
\echo '-- 4. customers without party_id'
SELECT COUNT(*)::bigint AS customers_missing_party
FROM public.customers c
WHERE c.deleted_at IS NULL AND c.party_id IS NULL;

\echo ''
\echo '-- 5. customers with party_id but no party row'
SELECT COUNT(*)::bigint AS orphan_party_refs
FROM public.customers c
LEFT JOIN kit_common.party_party p ON p.id = c.party_id AND p.deleted_at IS NULL
WHERE c.deleted_at IS NULL AND c.party_id IS NOT NULL AND p.id IS NULL;

\echo ''
\echo '-- 6. customer_notifications missing notify_notification'
SELECT COUNT(*)::bigint AS legacy_noti_missing_kernel
FROM public.customer_notifications cn
WHERE NOT EXISTS (
    SELECT 1 FROM kit_notify.notify_notification nn
    WHERE nn.legacy_customer_notification_id = cn.id
);

\echo ''
\echo '-- 7. Summary counts'
SELECT
    (SELECT COUNT(*) FROM kit_tenant.tenant_package WHERE deleted_at IS NULL) AS tenant_packages,
    (SELECT COUNT(*) FROM kit_workspace.workspace_workspace WHERE deleted_at IS NULL) AS workspaces,
    (SELECT COUNT(*) FROM kit_event.event_outbox WHERE event_bus = 'platform') AS platform_outbox_rows,
    (SELECT COUNT(*) FROM kit_common.party_party WHERE legacy_entity_type = 'customer' AND deleted_at IS NULL) AS customer_parties,
    (SELECT COUNT(*) FROM public.customers WHERE deleted_at IS NULL AND party_id IS NOT NULL) AS customers_with_party;

\echo ''
\echo '=== Done (review rows above; zero drift = healthy) ==='
