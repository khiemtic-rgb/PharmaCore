-- PharmaCore 028: Chat hai chiều khách hàng ↔ nhà thuốc

CREATE TABLE customer_chat_threads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID         NOT NULL REFERENCES tenants(id),
    customer_id         UUID         NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status              SMALLINT     NOT NULL DEFAULT 1,
    last_message_at     TIMESTAMPTZ,
    last_message_preview VARCHAR(200),
    customer_unread_count INT        NOT NULL DEFAULT 0,
    staff_unread_count  INT          NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customer_chat_threads UNIQUE (tenant_id, customer_id)
);

CREATE INDEX ix_customer_chat_threads_staff_inbox
    ON customer_chat_threads (tenant_id, staff_unread_count DESC, last_message_at DESC);

CREATE TABLE customer_chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       UUID         NOT NULL REFERENCES customer_chat_threads(id) ON DELETE CASCADE,
    tenant_id       UUID         NOT NULL REFERENCES tenants(id),
    sender_type     SMALLINT     NOT NULL,
    sender_id       UUID,
    body            TEXT         NOT NULL,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_customer_chat_messages_body CHECK (char_length(trim(body)) > 0)
);

CREATE INDEX ix_customer_chat_messages_thread
    ON customer_chat_messages (thread_id, created_at DESC);

CREATE TRIGGER trg_customer_chat_threads_updated
    BEFORE UPDATE ON customer_chat_threads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE customer_chat_threads IS 'Một luồng chat / khách / tenant.';
COMMENT ON COLUMN customer_chat_messages.sender_type IS '1=customer 2=staff';

INSERT INTO customer_consents (tenant_id, customer_id, channel, purpose, granted, granted_at, source)
VALUES
    ('11111111-1111-1111-1111-111111111101', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 5, 4, TRUE, NOW(), 3)
ON CONFLICT (tenant_id, customer_id, channel, purpose) DO UPDATE SET
    granted = EXCLUDED.granted,
    granted_at = EXCLUDED.granted_at,
    revoked_at = NULL,
    source = EXCLUDED.source,
    updated_at = NOW();
