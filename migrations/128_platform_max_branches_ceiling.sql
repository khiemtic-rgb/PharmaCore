-- KitPlatform 128: Core entitlement — settings.platform.max_branches
-- Null / missing = unlimited active branches. Soft-deleted branches do not count.
-- Enforced on POST /api/system/branches and optional at platform tenant provision.
-- No backfill: existing tenants stay unlimited until Core sets a ceiling via entitlement.

SELECT 1;
