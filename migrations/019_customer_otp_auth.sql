-- KitPlatform 019: Customer App OTP login + refresh tokens (tách khỏi admin users)

CREATE TABLE customer_otp_challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id),
    phone           VARCHAR(20)  NOT NULL,
    code_hash       VARCHAR(64)  NOT NULL,
    expires_at      TIMESTAMPTZ  NOT NULL,
    consumed_at     TIMESTAMPTZ,
    attempt_count   INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_customer_otp_active
    ON customer_otp_challenges (tenant_id, phone, expires_at DESC)
    WHERE consumed_at IS NULL;

CREATE TABLE customer_refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID         NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64)  NOT NULL,
    expires_at      TIMESTAMPTZ  NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customer_refresh_tokens_hash UNIQUE (token_hash)
);

CREATE INDEX ix_customer_refresh_tokens_account ON customer_refresh_tokens(account_id);

COMMENT ON TABLE customer_otp_challenges IS 'OTP đăng nhập app khách; hash SHA-256, không lưu plaintext.';
COMMENT ON TABLE customer_refresh_tokens IS 'Refresh token app khách — tách bảng refresh_tokens của admin.';
