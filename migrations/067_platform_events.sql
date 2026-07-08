-- KitPlatform 067: KIT Platform — internal event bus (envelope v1)
-- Additive only. integration_outbox (CDP) unchanged.

CREATE TABLE IF NOT EXISTS platform_events (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES tenants(id),
    event_type       VARCHAR(120) NOT NULL,
    event_version    SMALLINT     NOT NULL DEFAULT 1,
    aggregate_type   VARCHAR(50)  NOT NULL,
    aggregate_id     UUID         NOT NULL,
    source           VARCHAR(50)  NOT NULL DEFAULT 'pack:pharmacy',
    payload          JSONB        NOT NULL,
    occurred_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    dispatched_at    TIMESTAMPTZ,
    dispatch_attempts INT         NOT NULL DEFAULT 0,
    last_error       TEXT,
    CONSTRAINT ck_platform_events_payload_object CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS ix_platform_events_undispatched
    ON platform_events (tenant_id, occurred_at)
    WHERE dispatched_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_platform_events_aggregate
    ON platform_events (tenant_id, aggregate_type, aggregate_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_platform_events_type_time
    ON platform_events (tenant_id, event_type, occurred_at DESC);

COMMENT ON TABLE platform_events IS 'KIT Platform event bus v1 — transactional store; in-process dispatcher (no Kafka yet).';
COMMENT ON COLUMN platform_events.event_type IS 'Dotted name e.g. sales.order.completed.v1';
COMMENT ON COLUMN platform_events.payload IS 'Envelope: eventId, eventType, tenantId, occurredAt, source, aggregateType, aggregateId, actorUserId, data';
