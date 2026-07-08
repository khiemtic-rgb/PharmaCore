-- Việt hóa nhãn quyền và module — đồng bộ menu admin

UPDATE permissions SET permission_name = 'Xem danh mục', module_name = 'Danh mục'
WHERE permission_code = 'catalog.read';

UPDATE permissions SET permission_name = 'Sửa danh mục', module_name = 'Danh mục'
WHERE permission_code = 'catalog.write';

UPDATE permissions SET permission_name = 'Xem kho', module_name = 'Kho hàng'
WHERE permission_code = 'inventory.read';

UPDATE permissions SET permission_name = 'Sửa kho', module_name = 'Kho hàng'
WHERE permission_code = 'inventory.write';

UPDATE permissions SET permission_name = 'Xem mua hàng', module_name = 'Mua hàng'
WHERE permission_code = 'procurement.read';

UPDATE permissions SET permission_name = 'Mua hàng', module_name = 'Mua hàng'
WHERE permission_code = 'procurement.write';

UPDATE permissions SET permission_name = 'Xem bán hàng', module_name = 'Bán hàng'
WHERE permission_code = 'sales.read';

UPDATE permissions SET permission_name = 'Bán hàng', module_name = 'Bán hàng'
WHERE permission_code = 'sales.write';

UPDATE permissions SET permission_name = 'Chiết khấu bán hàng (tối đa 10%)', module_name = 'Bán hàng'
WHERE permission_code = 'sales.discount';

UPDATE permissions SET permission_name = 'Chiết khấu không giới hạn', module_name = 'Bán hàng'
WHERE permission_code = 'sales.discount.unlimited';

UPDATE permissions SET permission_name = 'Xóa vĩnh viễn', module_name = 'Hệ thống'
WHERE permission_code = 'system.delete_permanent';

UPDATE permissions SET permission_name = 'Xem hệ thống', module_name = 'Hệ thống'
WHERE permission_code = 'system.read';

UPDATE permissions SET permission_name = 'Quản trị hệ thống', module_name = 'Hệ thống'
WHERE permission_code = 'system.write';

INSERT INTO permissions (permission_code, permission_name, module_name) VALUES
('procurement.read', 'Xem mua hàng', 'Mua hàng')
ON CONFLICT (permission_code) DO UPDATE
SET permission_name = EXCLUDED.permission_name, module_name = EXCLUDED.module_name;

INSERT INTO permissions (permission_code, permission_name, module_name) VALUES
('system.read', 'Xem hệ thống', 'Hệ thống'),
('system.write', 'Quản trị hệ thống', 'Hệ thống')
ON CONFLICT (permission_code) DO UPDATE
SET permission_name = EXCLUDED.permission_name, module_name = EXCLUDED.module_name;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_code = 'ADMIN'
  AND p.permission_code IN ('procurement.read', 'system.read', 'system.write')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
