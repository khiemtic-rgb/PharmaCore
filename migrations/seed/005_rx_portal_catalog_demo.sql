-- Rx portal demo catalog for pilot tenant NT_XUANHOA (idempotent).
-- Mục đích: BS chọn NT → gõ "Amox" / "Para" / "RXDEMO" thấy thuốc Rx + OTC.
-- Controlled (RXDEMO-CTRL) tồn tại để smoke D16 nhưng KHÔNG hiện trên portal search.
--
-- Chạy:
--   psql $CONN -f migrations/seed/005_rx_portal_catalog_demo.sql
--   .\scripts\smoke-rx2-catalog.ps1

DO $$
DECLARE
  v_tenant_id UUID;
  v_customer_id UUID := 'a1111111-1111-4111-8111-111111111101';
  v_otc_id UUID := 'a1111111-1111-4111-8111-111111111201';
  v_rx_id UUID := 'a1111111-1111-4111-8111-111111111202';
  v_rx2_id UUID := 'a1111111-1111-4111-8111-111111111203';
  v_ctrl_id UUID := 'a1111111-1111-4111-8111-111111111204';
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE tenant_code = 'NT_XUANHOA' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'NT_XUANHOA not found — skip 005_rx_portal_catalog_demo';
    RETURN;
  END IF;

  INSERT INTO customers (id, tenant_id, customer_code, full_name, phone, status)
  VALUES (
    v_customer_id, v_tenant_id, 'RXDEMO-KH',
    'BN Demo Portal Rx', '0908888001', 1
  )
  ON CONFLICT (tenant_id, customer_code) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      deleted_at = NULL,
      status = 1,
      updated_at = NOW();

  SELECT id INTO v_customer_id FROM customers
  WHERE tenant_id = v_tenant_id AND customer_code = 'RXDEMO-KH';

  -- OTC
  INSERT INTO products (
    id, tenant_id, product_code, product_name, generic_name,
    drug_type, dispensing_class, status
  )
  VALUES (
    v_otc_id, v_tenant_id, 'RXDEMO-PARA',
    'Paracetamol 500mg (Demo Portal)', 'Paracetamol',
    1, 'otc', 1
  )
  ON CONFLICT (tenant_id, product_code) DO UPDATE
  SET product_name = EXCLUDED.product_name,
      dispensing_class = 'otc',
      drug_type = 1,
      deleted_at = NULL,
      status = 1,
      updated_at = NOW();

  SELECT id INTO v_otc_id FROM products
  WHERE tenant_id = v_tenant_id AND product_code = 'RXDEMO-PARA';

  -- Prescription
  INSERT INTO products (
    id, tenant_id, product_code, product_name, generic_name,
    drug_type, dispensing_class, status
  )
  VALUES (
    v_rx_id, v_tenant_id, 'RXDEMO-AMOX',
    'Amoxicillin 500mg (Demo Portal)', 'Amoxicillin',
    2, 'prescription', 1
  )
  ON CONFLICT (tenant_id, product_code) DO UPDATE
  SET product_name = EXCLUDED.product_name,
      dispensing_class = 'prescription',
      drug_type = 2,
      deleted_at = NULL,
      status = 1,
      updated_at = NOW();

  SELECT id INTO v_rx_id FROM products
  WHERE tenant_id = v_tenant_id AND product_code = 'RXDEMO-AMOX';

  INSERT INTO products (
    id, tenant_id, product_code, product_name, generic_name,
    drug_type, dispensing_class, status
  )
  VALUES (
    v_rx2_id, v_tenant_id, 'RXDEMO-AMLO',
    'Amlodipine 5mg (Demo Portal)', 'Amlodipine',
    2, 'prescription', 1
  )
  ON CONFLICT (tenant_id, product_code) DO UPDATE
  SET product_name = EXCLUDED.product_name,
      dispensing_class = 'prescription',
      drug_type = 2,
      deleted_at = NULL,
      status = 1,
      updated_at = NOW();

  SELECT id INTO v_rx2_id FROM products
  WHERE tenant_id = v_tenant_id AND product_code = 'RXDEMO-AMLO';

  -- Controlled (D16 — seed for block test, hidden from portal search)
  INSERT INTO products (
    id, tenant_id, product_code, product_name, generic_name,
    drug_type, dispensing_class, status
  )
  VALUES (
    v_ctrl_id, v_tenant_id, 'RXDEMO-CTRL',
    'Codeine Demo (Controlled)', 'Codeine',
    3, 'controlled', 1
  )
  ON CONFLICT (tenant_id, product_code) DO UPDATE
  SET product_name = EXCLUDED.product_name,
      dispensing_class = 'controlled',
      drug_type = 3,
      deleted_at = NULL,
      status = 1,
      updated_at = NOW();

  SELECT id INTO v_ctrl_id FROM products
  WHERE tenant_id = v_tenant_id AND product_code = 'RXDEMO-CTRL';

  INSERT INTO product_units (tenant_id, product_id, unit_name, conversion_factor, is_base_unit, is_sale_unit, status)
  SELECT v_tenant_id, p.id, 'Viên', 1, TRUE, TRUE, 1
  FROM products p
  WHERE p.tenant_id = v_tenant_id
    AND p.product_code IN ('RXDEMO-PARA', 'RXDEMO-AMOX', 'RXDEMO-AMLO', 'RXDEMO-CTRL')
    AND NOT EXISTS (
      SELECT 1 FROM product_units pu
      WHERE pu.product_id = p.id AND pu.unit_name = 'Viên'
    );

  INSERT INTO product_prices (tenant_id, product_id, product_unit_id, price_type, price, status)
  SELECT
    v_tenant_id,
    pu.product_id,
    pu.id,
    1,
    CASE p.product_code
      WHEN 'RXDEMO-PARA' THEN 1500
      WHEN 'RXDEMO-AMOX' THEN 3500
      WHEN 'RXDEMO-AMLO' THEN 4200
      ELSE 99000
    END,
    1
  FROM product_units pu
  INNER JOIN products p ON p.id = pu.product_id
  WHERE p.tenant_id = v_tenant_id
    AND p.product_code IN ('RXDEMO-PARA', 'RXDEMO-AMOX', 'RXDEMO-AMLO', 'RXDEMO-CTRL')
    AND pu.is_base_unit = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM product_prices pp
      WHERE pp.product_unit_id = pu.id AND pp.price_type = 1 AND pp.status = 1
    );

  RAISE NOTICE '005_rx_portal_catalog_demo applied for NT_XUANHOA tenant=%', v_tenant_id;
END $$;
