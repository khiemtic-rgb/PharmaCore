-- Chạy bằng user postgres (superuser)
-- Tạo user + database cho KitPlatform (local dev)

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kitplatform') THEN
        CREATE ROLE kitplatform WITH LOGIN PASSWORD 'kitplatform_dev_2026';
    END IF;
END $$;

ALTER ROLE kitplatform WITH LOGIN PASSWORD 'kitplatform_dev_2026';

SELECT 'CREATE DATABASE kitplatform OWNER kitplatform'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kitplatform')\gexec

GRANT ALL PRIVILEGES ON DATABASE kitplatform TO kitplatform;
