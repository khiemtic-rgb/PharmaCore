-- Phase 12: Identity Admin permissions

INSERT INTO permissions (permission_code, permission_name, module_name) VALUES
('system.read', 'Xem hệ thống', 'Hệ thống'),
('system.write', 'Quản trị hệ thống', 'Hệ thống')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_code = 'ADMIN'
  AND p.permission_code IN ('system.read', 'system.write')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
