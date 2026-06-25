ALTER TABLE loyalty_programs
    ADD COLUMN IF NOT EXISTS max_redeem_percent NUMERIC(5,2) NOT NULL DEFAULT 100;

UPDATE loyalty_programs
SET max_redeem_percent = 5,
    updated_at = NOW()
WHERE max_redeem_percent = 100;
