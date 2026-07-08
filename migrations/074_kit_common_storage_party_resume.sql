-- Resume 074 backfill only (idempotent) — run if 074 DDL succeeded but backfill failed mid-way.

INSERT INTO kit_common.party_identifier (tenant_id, party_id, identifier_type, identifier_value, is_primary)
SELECT DISTINCT ON (c.tenant_id, c.phone)
    c.tenant_id, c.party_id, 'phone', c.phone, TRUE
FROM public.customers c
WHERE c.party_id IS NOT NULL AND c.phone IS NOT NULL AND c.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_common.party_identifier i
      WHERE i.tenant_id = c.tenant_id AND i.identifier_type = 'phone' AND i.identifier_value = c.phone AND i.deleted_at IS NULL
  )
ORDER BY c.tenant_id, c.phone, c.created_at ASC;

INSERT INTO kit_common.party_identifier (tenant_id, party_id, identifier_type, identifier_value, is_primary)
SELECT DISTINCT ON (c.tenant_id, lower(trim(c.email::text)))
    c.tenant_id, c.party_id, 'email', c.email::text, FALSE
FROM public.customers c
WHERE c.party_id IS NOT NULL AND c.email IS NOT NULL AND trim(c.email::text) <> '' AND c.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_common.party_identifier i
      WHERE i.tenant_id = c.tenant_id AND i.identifier_type = 'email' AND i.identifier_value = c.email::text AND i.deleted_at IS NULL
  )
ORDER BY c.tenant_id, lower(trim(c.email::text)), c.created_at ASC;

INSERT INTO kit_common.common_address (
    tenant_id, party_id, address_label, recipient_name, phone,
    address_line1, ward_name, district_name, province_name,
    is_default, legacy_address_id, created_at
)
SELECT
    c.tenant_id, c.party_id, COALESCE(ca.label, 'default'), ca.recipient_name, ca.phone,
    ca.address_line, ca.ward, ca.district, ca.province, ca.is_default, ca.id, ca.created_at
FROM public.customer_addresses ca
JOIN public.customers c ON c.id = ca.customer_id
WHERE c.party_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM kit_common.common_address a WHERE a.legacy_address_id = ca.id);

INSERT INTO kit_common.common_category (
    tenant_id, category_scope, category_code, category_name, description, sort_order,
    legacy_entity_type, legacy_entity_id, status, created_at, updated_at
)
SELECT
    pc.tenant_id, 'product', pc.category_code, pc.category_name, pc.description,
    COALESCE(pc.sort_order, 0), 'product_category', pc.id, pc.status, pc.created_at, pc.updated_at
FROM public.product_categories pc
WHERE pc.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_common.common_category cc
      WHERE cc.tenant_id = pc.tenant_id AND cc.legacy_entity_type = 'product_category'
        AND cc.legacy_entity_id = pc.id AND cc.deleted_at IS NULL
  );

INSERT INTO kit_storage.storage_file (
    tenant_id, folder_id, file_name, mime_type, storage_provider, storage_path,
    legacy_image_id, status, created_at, updated_at
)
SELECT
    pi.tenant_id, sf.id,
    'product-' || pi.product_id::text || '-' || pi.sort_order::text,
    'image/*',
    CASE WHEN pi.image_url LIKE 'http%' THEN 'remote' ELSE 'local' END,
    pi.image_url, pi.id, pi.status, pi.created_at, pi.updated_at
FROM public.product_images pi
LEFT JOIN kit_storage.storage_folder sf ON sf.tenant_id = pi.tenant_id AND sf.folder_code = 'products'
WHERE NOT EXISTS (SELECT 1 FROM kit_storage.storage_file f WHERE f.legacy_image_id = pi.id);

INSERT INTO kit_storage.storage_attachment (
    tenant_id, file_id, entity_type, entity_id, attachment_role, sort_order, is_primary, status, legacy_image_id, created_at, updated_at
)
SELECT
    pi.tenant_id, f.id, 'product', pi.product_id, 'image', pi.sort_order, pi.is_primary, pi.status, pi.id, pi.created_at, pi.updated_at
FROM public.product_images pi
JOIN kit_storage.storage_file f ON f.legacy_image_id = pi.id
WHERE NOT EXISTS (SELECT 1 FROM kit_storage.storage_attachment a WHERE a.legacy_image_id = pi.id);

INSERT INTO kit_common.common_contact (
    tenant_id, party_id, contact_type, full_name, email, phone, is_primary, status
)
SELECT
    s.tenant_id, s.party_id, 'general', COALESCE(s.contact_name, s.supplier_name), s.email, s.phone, TRUE, 1
FROM public.suppliers s
WHERE s.party_id IS NOT NULL AND s.deleted_at IS NULL
  AND (s.contact_name IS NOT NULL OR s.phone IS NOT NULL OR s.email IS NOT NULL)
  AND NOT EXISTS (
      SELECT 1 FROM kit_common.common_contact cc
      WHERE cc.party_id = s.party_id AND cc.is_primary = TRUE AND cc.deleted_at IS NULL
  );

UPDATE kit_core.kernel_table_registry SET registry_status = 'EXISTS', updated_at = NOW()
WHERE table_name IN (
    'common_address', 'common_contact', 'common_document', 'common_comment',
    'common_tag', 'common_category', 'common_task', 'common_approval', 'common_note', 'common_label',
    'storage_file', 'storage_folder', 'storage_attachment', 'storage_blob'
);

UPDATE kit_core.platform_kernel_version SET
    kernel_phase = 'P3',
    last_migration = '074_kit_common_storage_party',
    schema_version = 4,
    notes = 'Phase 3: Party spine + Common 10 + Storage 4; strangler backfill customers/suppliers/addresses/images.',
    updated_at = NOW()
WHERE id = 1;
