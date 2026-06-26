-- Demo CDP consent for customer app (care reminder via SMS + App push)
INSERT INTO customer_consents (tenant_id, customer_id, channel, purpose, granted, granted_at, source)
VALUES
    ('11111111-1111-1111-1111-111111111101', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 1, 2, TRUE, NOW(), 3),
    ('11111111-1111-1111-1111-111111111101', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 4, 2, TRUE, NOW(), 3)
ON CONFLICT (tenant_id, customer_id, channel, purpose) DO UPDATE SET
    granted = EXCLUDED.granted,
    granted_at = EXCLUDED.granted_at,
    revoked_at = NULL,
    source = EXCLUDED.source,
    updated_at = NOW();
