-- KitPlatform 101: Prescriber portal OTP challenges
-- Depends on: 100_rx_prescriber_network.sql

CREATE TABLE IF NOT EXISTS pack_pharmacy.prescriber_otp_challenges (
    id              UUID PRIMARY KEY DEFAULT kit_uuid_v7(),
    phone           VARCHAR(30)  NOT NULL,
    code_hash       VARCHAR(64)  NOT NULL,
    expires_at      TIMESTAMPTZ  NOT NULL,
    consumed_at     TIMESTAMPTZ,
    attempt_count   INT          NOT NULL DEFAULT 0,
    pilot_code      VARCHAR(10),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_prescriber_otp_active
    ON pack_pharmacy.prescriber_otp_challenges (phone, expires_at DESC)
    WHERE consumed_at IS NULL;

COMMENT ON TABLE pack_pharmacy.prescriber_otp_challenges IS
    'OTP đăng nhập portal bác sĩ — hash SHA-256, không lưu plaintext.';
