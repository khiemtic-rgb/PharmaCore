-- Privileged merge gates: duplicate products + customers.
-- Not implied by catalog.write / sales.customers — assign only to trusted roles.

INSERT INTO permissions (permission_code, permission_name, module_name)
VALUES
    ('catalog.merge', 'Gộp sản phẩm trùng', 'Danh mục'),
    ('sales.customers.merge', 'Gộp khách hàng trùng', 'Bán hàng')
ON CONFLICT (permission_code) DO UPDATE
SET permission_name = EXCLUDED.permission_name,
    module_name = EXCLUDED.module_name;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_code IN ('ADMIN', 'MANAGER')
  AND p.permission_code IN ('catalog.merge', 'sales.customers.merge')
ON CONFLICT DO NOTHING;
