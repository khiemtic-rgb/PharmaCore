-- KitPlatform 076: KIT Enterprise Platform Kernel — Phase 5 Event + Audit + Notification
-- Depends on: 075_kit_metadata.sql
-- Pilot-safe: kit_event + kit_audit + kit_notify + kit_integration webhook;
-- strangler views/backfill from platform_events, integration_outbox, audit_logs, customer_notifications.

-- =============================================================================
-- DOMAIN: Event — unified outbox + subscriptions
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_event.event_outbox (
    id                    UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id             UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id          UUID         REFERENCES kit_workspace.workspace_workspace(id),
    event_bus             VARCHAR(30)  NOT NULL DEFAULT 'platform',
    event_type            VARCHAR(120) NOT NULL,
    event_version         SMALLINT     NOT NULL DEFAULT 1,
    aggregate_type        VARCHAR(50)  NOT NULL,
    aggregate_id          UUID         NOT NULL,
    source                VARCHAR(50)  NOT NULL DEFAULT 'kernel',
    payload               JSONB        NOT NULL,
    occurred_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    dispatched_at         TIMESTAMPTZ,
    dispatch_attempts     INT          NOT NULL DEFAULT 0,
    last_error            TEXT,
    legacy_platform_event_id UUID,
    legacy_outbox_id      UUID,
    row_version           INT          NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by            UUID,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by            UUID,
    deleted_at            TIMESTAMPTZ,
    CONSTRAINT ck_event_outbox_bus CHECK (
        event_bus IN ('platform', 'integration', 'unified')
    ),
    CONSTRAINT ck_event_outbox_payload CHECK (jsonb_typeof(payload) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_outbox_platform_legacy
    ON kit_event.event_outbox (legacy_platform_event_id)
    WHERE legacy_platform_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_outbox_integration_legacy
    ON kit_event.event_outbox (legacy_outbox_id)
    WHERE legacy_outbox_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_event_outbox_undispatched
    ON kit_event.event_outbox (tenant_id, occurred_at)
    WHERE dispatched_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_event_outbox_type
    ON kit_event.event_outbox (tenant_id, event_type, occurred_at DESC)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_event_outbox_row_version ON kit_event.event_outbox;
CREATE TRIGGER trg_event_outbox_row_version
    BEFORE UPDATE ON kit_event.event_outbox
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

COMMENT ON TABLE kit_event.event_outbox IS 'Unified platform event outbox — strangler target for platform_events + integration_outbox.';

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_event.event_subscription (
    id                    UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id             UUID         REFERENCES public.tenants(id),
    workspace_id          UUID         REFERENCES kit_workspace.workspace_workspace(id),
    subscription_code     VARCHAR(80)  NOT NULL,
    subscription_name     VARCHAR(255) NOT NULL,
    event_type_pattern    VARCHAR(120) NOT NULL,
    subscriber_type       VARCHAR(30)  NOT NULL DEFAULT 'in_process',
    subscriber_ref        VARCHAR(255) NOT NULL,
    handler_kind          VARCHAR(30)  NOT NULL DEFAULT 'handler',
    settings              JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status                SMALLINT     NOT NULL DEFAULT 1,
    row_version           INT          NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by            UUID,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by            UUID,
    deleted_at            TIMESTAMPTZ,
    CONSTRAINT ck_event_subscription_subscriber CHECK (
        subscriber_type IN ('in_process', 'webhook', 'queue', 'integration')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_subscription_code
    ON kit_event.event_subscription (
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        subscription_code
    )
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_event_subscription_row_version ON kit_event.event_subscription;
CREATE TRIGGER trg_event_subscription_row_version
    BEFORE UPDATE ON kit_event.event_subscription
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- Seed platform event subscriptions (in-process handlers)
INSERT INTO kit_event.event_subscription (
    subscription_code, subscription_name, event_type_pattern, subscriber_type, subscriber_ref, handler_kind
)
SELECT v.code, v.name, v.pattern, 'in_process', v.ref, 'handler'
FROM (
    VALUES
        ('pharmacy_sales_order_completed', 'Pharmacy pack — order completed', 'sales.order.completed.v1', 'PharmacySalesOrderCompletedHandler'),
        ('pharmacy_sales_return_completed', 'Pharmacy pack — return completed', 'sales.return.completed.v1', 'PharmacySalesReturnCompletedHandler'),
        ('integration_cdp_webhook', 'CDP outbound webhook', 'customer.consent.updated.v1', 'IntegrationOutboxWorker')
) AS v(code, name, pattern, ref)
WHERE NOT EXISTS (
    SELECT 1 FROM kit_event.event_subscription s
    WHERE s.tenant_id IS NULL AND s.subscription_code = v.code AND s.deleted_at IS NULL
);

-- Backfill platform_events → event_outbox
INSERT INTO kit_event.event_outbox (
    tenant_id, event_bus, event_type, event_version, aggregate_type, aggregate_id,
    source, payload, occurred_at, dispatched_at, dispatch_attempts, last_error,
    legacy_platform_event_id, created_at, updated_at
)
SELECT
    pe.tenant_id, 'platform', pe.event_type, pe.event_version, pe.aggregate_type, pe.aggregate_id,
    pe.source, pe.payload, pe.occurred_at, pe.dispatched_at, pe.dispatch_attempts, pe.last_error,
    pe.id, pe.occurred_at, COALESCE(pe.dispatched_at, pe.occurred_at)
FROM public.platform_events pe
WHERE NOT EXISTS (
    SELECT 1 FROM kit_event.event_outbox eo WHERE eo.legacy_platform_event_id = pe.id
);

-- Backfill integration_outbox → event_outbox
INSERT INTO kit_event.event_outbox (
    tenant_id, event_bus, event_type, event_version, aggregate_type, aggregate_id,
    source, payload, occurred_at, dispatched_at, dispatch_attempts, last_error,
    legacy_outbox_id, created_at, updated_at
)
SELECT
    io.tenant_id, 'integration', io.event_type, io.event_version, io.aggregate_type, io.aggregate_id,
    'integration:cdp', io.payload, io.occurred_at, io.published_at, io.publish_attempts, io.last_error,
    io.id, io.occurred_at, COALESCE(io.published_at, io.occurred_at)
FROM public.integration_outbox io
WHERE NOT EXISTS (
    SELECT 1 FROM kit_event.event_outbox eo WHERE eo.legacy_outbox_id = io.id
);

-- =============================================================================
-- DOMAIN: Audit — activity + change log + strangler view
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_audit.activity_log (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    actor_user_id    UUID         REFERENCES public.users(id),
    actor_type       VARCHAR(30)  NOT NULL DEFAULT 'user',
    activity_type    VARCHAR(50)  NOT NULL,
    activity_action  VARCHAR(50)  NOT NULL,
    entity_type      VARCHAR(100),
    entity_id        UUID,
    summary          TEXT,
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    ip_address       INET,
    user_agent       TEXT,
    occurred_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_activity_log_tenant_time
    ON kit_audit.activity_log (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_activity_log_actor
    ON kit_audit.activity_log (tenant_id, actor_user_id, occurred_at DESC)
    WHERE actor_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_activity_log_entity
    ON kit_audit.activity_log (tenant_id, entity_type, entity_id, occurred_at DESC)
    WHERE entity_type IS NOT NULL;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_audit.change_log (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    actor_user_id    UUID         REFERENCES public.users(id),
    entity_type      VARCHAR(100) NOT NULL,
    entity_id        UUID         NOT NULL,
    field_name       VARCHAR(100) NOT NULL,
    old_value        JSONB,
    new_value        JSONB,
    change_type      VARCHAR(20)  NOT NULL DEFAULT 'update',
    occurred_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    legacy_audit_id  UUID,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_change_log_type CHECK (
        change_type IN ('insert', 'update', 'delete', 'soft_delete', 'restore')
    )
);

CREATE INDEX IF NOT EXISTS ix_change_log_entity
    ON kit_audit.change_log (tenant_id, entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_change_log_field
    ON kit_audit.change_log (tenant_id, entity_type, field_name, occurred_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_change_log_legacy_audit
    ON kit_audit.change_log (legacy_audit_id, field_name)
    WHERE legacy_audit_id IS NOT NULL;

-- Strangler view: audit_logs
CREATE OR REPLACE VIEW kit_audit.audit_log AS
SELECT
    al.id,
    al.tenant_id,
    NULL::uuid        AS workspace_id,
    al.user_id        AS actor_user_id,
    al.entity_type,
    al.entity_id,
    al.action         AS activity_action,
    al.payload        AS metadata,
    al.ip_address,
    NULL::text        AS user_agent,
    al.created_at     AS occurred_at,
    al.created_at
FROM public.audit_logs al;

-- Backfill activity_log summary rows from audit_logs (idempotent)
INSERT INTO kit_audit.activity_log (
    tenant_id, actor_user_id, activity_type, activity_action, entity_type, entity_id,
    summary, metadata, ip_address, occurred_at
)
SELECT
    al.tenant_id,
    al.user_id,
    COALESCE(al.entity_type, 'system'),
    al.action,
    al.entity_type,
    al.entity_id,
    al.action || COALESCE(' ' || al.entity_type, ''),
    COALESCE(al.payload, '{}'::jsonb),
    al.ip_address,
    al.created_at
FROM public.audit_logs al
WHERE NOT EXISTS (
    SELECT 1 FROM kit_audit.activity_log act
    WHERE act.tenant_id = al.tenant_id
      AND act.entity_type IS NOT DISTINCT FROM al.entity_type
      AND act.entity_id IS NOT DISTINCT FROM al.entity_id
      AND act.activity_action = al.action
      AND act.occurred_at = al.created_at
);

-- =============================================================================
-- DOMAIN: Notification
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_notify.notify_template (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    template_code    VARCHAR(80)  NOT NULL,
    template_name    VARCHAR(255) NOT NULL,
    channel          VARCHAR(30)  NOT NULL,
    locale_code      VARCHAR(10)  NOT NULL DEFAULT 'vi-VN',
    subject          VARCHAR(255),
    body_template    TEXT         NOT NULL,
    variables        JSONB        NOT NULL DEFAULT '[]'::jsonb,
    is_system        BOOLEAN      NOT NULL DEFAULT FALSE,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_notify_template_channel CHECK (
        channel IN ('push', 'sms', 'email', 'in_app', 'zalo')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notify_template_code
    ON kit_notify.notify_template (
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        template_code,
        channel,
        locale_code
    )
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_notify_template_row_version ON kit_notify.notify_template;
CREATE TRIGGER trg_notify_template_row_version
    BEFORE UPDATE ON kit_notify.notify_template
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_notify.notify_notification (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    template_id      UUID         REFERENCES kit_notify.notify_template(id),
    channel          VARCHAR(30)  NOT NULL,
    title            VARCHAR(255) NOT NULL,
    body             TEXT         NOT NULL,
    payload          JSONB        NOT NULL DEFAULT '{}'::jsonb,
    priority         SMALLINT     NOT NULL DEFAULT 2,
    status           SMALLINT     NOT NULL DEFAULT 1,
    sent_at          TIMESTAMPTZ,
    legacy_customer_notification_id UUID,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_notify_notification_channel CHECK (
        channel IN ('push', 'sms', 'email', 'in_app', 'zalo')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notify_notification_legacy
    ON kit_notify.notify_notification (legacy_customer_notification_id)
    WHERE legacy_customer_notification_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_notify_notification_tenant
    ON kit_notify.notify_notification (tenant_id, created_at DESC)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_notify_notification_row_version ON kit_notify.notify_notification;
CREATE TRIGGER trg_notify_notification_row_version
    BEFORE UPDATE ON kit_notify.notify_notification
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_notify.notify_recipient (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    notification_id  UUID         NOT NULL REFERENCES kit_notify.notify_notification(id),
    recipient_type   VARCHAR(30)  NOT NULL,
    party_id         UUID         REFERENCES kit_common.party_party(id),
    user_id          UUID         REFERENCES public.users(id),
    customer_id      UUID         REFERENCES public.customers(id),
    destination      VARCHAR(255),
    read_at          TIMESTAMPTZ,
    delivered_at     TIMESTAMPTZ,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_notify_recipient_type CHECK (
        recipient_type IN ('party', 'user', 'customer', 'email', 'phone', 'device')
    )
);

CREATE INDEX IF NOT EXISTS ix_notify_recipient_notification
    ON kit_notify.notify_recipient (notification_id, status)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_notify_recipient_row_version ON kit_notify.notify_recipient;
CREATE TRIGGER trg_notify_recipient_row_version
    BEFORE UPDATE ON kit_notify.notify_recipient
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kit_notify.notify_queue (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    notification_id  UUID         NOT NULL REFERENCES kit_notify.notify_notification(id),
    recipient_id     UUID         REFERENCES kit_notify.notify_recipient(id),
    channel          VARCHAR(30)  NOT NULL,
    scheduled_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    processed_at     TIMESTAMPTZ,
    attempt_count    INT          NOT NULL DEFAULT 0,
    max_attempts     INT          NOT NULL DEFAULT 5,
    last_error       TEXT,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT ck_notify_queue_status CHECK (status IN (1, 2, 3, 4))
);

CREATE INDEX IF NOT EXISTS ix_notify_queue_pending
    ON kit_notify.notify_queue (tenant_id, scheduled_at)
    WHERE processed_at IS NULL AND deleted_at IS NULL AND status = 1;

DROP TRIGGER IF EXISTS trg_notify_queue_row_version ON kit_notify.notify_queue;
CREATE TRIGGER trg_notify_queue_row_version
    BEFORE UPDATE ON kit_notify.notify_queue
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

COMMENT ON COLUMN kit_notify.notify_queue.status IS '1=pending 2=processing 3=sent 4=failed';

-- =============================================================================
-- DOMAIN: Integration — formal webhook registry (strangler from outbox)
-- =============================================================================

CREATE TABLE IF NOT EXISTS kit_integration.integration_webhook (
    id               UUID         PRIMARY KEY DEFAULT kit_uuid_v7(),
    tenant_id        UUID         NOT NULL REFERENCES public.tenants(id),
    workspace_id     UUID         REFERENCES kit_workspace.workspace_workspace(id),
    webhook_code     VARCHAR(80)  NOT NULL,
    webhook_name     VARCHAR(255) NOT NULL,
    target_url       TEXT         NOT NULL,
    secret_ref       VARCHAR(255),
    event_types      TEXT[]       NOT NULL DEFAULT '{}',
    headers          JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    status           SMALLINT     NOT NULL DEFAULT 1,
    row_version      INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_integration_webhook_code UNIQUE (tenant_id, webhook_code)
);

DROP TRIGGER IF EXISTS trg_integration_webhook_row_version ON kit_integration.integration_webhook;
CREATE TRIGGER trg_integration_webhook_row_version
    BEFORE UPDATE ON kit_integration.integration_webhook
    FOR EACH ROW EXECUTE FUNCTION kit_bump_row_version();

CREATE OR REPLACE VIEW kit_integration.integration_outbox_legacy AS
SELECT
    io.id,
    io.tenant_id,
    NULL::uuid AS workspace_id,
    io.event_type,
    io.event_version,
    io.aggregate_type,
    io.aggregate_id,
    io.payload,
    io.occurred_at,
    io.published_at,
    io.publish_attempts,
    io.last_error
FROM public.integration_outbox io;

-- =============================================================================
-- SEED: system notification templates
-- =============================================================================

INSERT INTO kit_notify.notify_template (
    template_code, template_name, channel, locale_code, subject, body_template, variables, is_system
)
SELECT v.code, v.name, v.channel, 'vi-VN', v.subject, v.body, v.vars::jsonb, TRUE
FROM (
    VALUES
        ('medication_reminder', 'Nhắc uống thuốc', 'push', 'Nhắc uống thuốc', 'Đến giờ uống {{medicine_name}}', '["medicine_name","dosage"]'),
        ('order_completed', 'Đơn hàng hoàn tất', 'in_app', 'Đơn hàng {{order_number}}', 'Đơn hàng {{order_number}} đã hoàn tất.', '["order_number","total_amount"]'),
        ('low_stock_alert', 'Cảnh báo tồn thấp', 'in_app', 'Tồn thấp', 'Sản phẩm {{product_name}} sắp hết tồn.', '["product_name","quantity"]'),
        ('otp_login', 'OTP đăng nhập', 'sms', NULL, 'Ma OTP Novixa: {{otp_code}}. Hieu luc {{ttl_minutes}} phut.', '["otp_code","ttl_minutes"]')
) AS v(code, name, channel, subject, body, vars)
WHERE NOT EXISTS (
    SELECT 1 FROM kit_notify.notify_template t
    WHERE t.tenant_id IS NULL AND t.template_code = v.code AND t.channel = v.channel AND t.deleted_at IS NULL
);

-- =============================================================================
-- Backfill: customer_notifications → notify_notification + notify_recipient
-- =============================================================================

INSERT INTO kit_notify.notify_notification (
    tenant_id, channel, title, body, payload, sent_at, legacy_customer_notification_id, created_at, updated_at
)
SELECT
    cn.tenant_id,
    CASE cn.channel WHEN 1 THEN 'push' WHEN 2 THEN 'sms' WHEN 3 THEN 'email' ELSE 'in_app' END,
    cn.title,
    cn.body,
    COALESCE(cn.payload, '{}'::jsonb),
    cn.sent_at,
    cn.id,
    cn.created_at,
    cn.created_at
FROM public.customer_notifications cn
WHERE NOT EXISTS (
    SELECT 1 FROM kit_notify.notify_notification n WHERE n.legacy_customer_notification_id = cn.id
);

INSERT INTO kit_notify.notify_recipient (
    tenant_id, notification_id, recipient_type, customer_id, party_id, read_at, delivered_at, status, created_at, updated_at
)
SELECT
    cn.tenant_id,
    n.id,
    'customer',
    cn.customer_id,
    c.party_id,
    cn.read_at,
    cn.sent_at,
    1,
    cn.created_at,
    cn.created_at
FROM public.customer_notifications cn
JOIN kit_notify.notify_notification n ON n.legacy_customer_notification_id = cn.id
JOIN public.customers c ON c.id = cn.customer_id
WHERE NOT EXISTS (
    SELECT 1 FROM kit_notify.notify_recipient r
    WHERE r.notification_id = n.id AND r.customer_id = cn.customer_id
);

-- Queue backfill for unread / unsent
INSERT INTO kit_notify.notify_queue (
    tenant_id, notification_id, recipient_id, channel, scheduled_at, processed_at, status, created_at, updated_at
)
SELECT
    n.tenant_id,
    n.id,
    r.id,
    n.channel,
    n.created_at,
    CASE WHEN n.sent_at IS NOT NULL THEN n.sent_at ELSE NULL END,
    CASE WHEN n.sent_at IS NOT NULL THEN 3 ELSE 1 END,
    n.created_at,
    n.updated_at
FROM kit_notify.notify_notification n
JOIN kit_notify.notify_recipient r ON r.notification_id = n.id
WHERE NOT EXISTS (
    SELECT 1 FROM kit_notify.notify_queue q WHERE q.notification_id = n.id AND q.recipient_id = r.id
);

-- =============================================================================
-- Post-apply: registry + kernel version
-- =============================================================================

UPDATE kit_core.kernel_table_registry SET registry_status = 'EXISTS', updated_at = NOW()
WHERE table_name IN (
    'activity_log', 'change_log',
    'notify_template', 'notify_recipient', 'notify_queue'
);

UPDATE kit_core.kernel_table_registry SET registry_status = 'VIEW', updated_at = NOW()
WHERE table_name = 'audit_log';

UPDATE kit_core.kernel_table_registry SET registry_status = 'EXISTS', updated_at = NOW()
WHERE table_name = 'notify_notification';

UPDATE kit_core.kernel_table_registry SET registry_status = 'EXISTS', updated_at = NOW()
WHERE table_name = 'integration_webhook';

UPDATE kit_core.platform_kernel_version SET
    kernel_phase = 'P5',
    last_migration = '076_kit_event_audit_notify',
    schema_version = 6,
    notes = 'Phase 5: event_outbox unified + audit activity/change + notify kernel + integration_webhook.',
    updated_at = NOW()
WHERE id = 1;
