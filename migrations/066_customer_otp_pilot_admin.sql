-- KitPlatform 066: Pilot OTP visible in admin (Novixa pilot — tắt khi có SMS gateway thật)

ALTER TABLE customer_otp_challenges
    ADD COLUMN IF NOT EXISTS pilot_code VARCHAR(6);

COMMENT ON COLUMN customer_otp_challenges.pilot_code IS
    'Mã OTP plaintext tạm (chỉ khi CustomerAppAuth:ExposePilotOtpInAdmin=true). NULL sau khi dùng/hết hạn.';
