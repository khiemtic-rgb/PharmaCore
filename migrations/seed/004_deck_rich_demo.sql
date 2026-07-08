-- Novixa deck / demo: richer catalog, stock, sales revenue, product images
-- Idempotent: products ON CONFLICT; sales DECK-* refreshed on each run

-- Branding & contact (Novixa)
UPDATE tenants
SET tenant_name = 'Novixa Demo Pharmacy',
    settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
        'contact_hotline', '0984.660.399',
        'contact_email', 'khiemtic@gmail.com',
        'contact_address', 'KĐT Hồ Xương Rồng, phường Phan Đình Phùng, tỉnh Thái Nguyên'
    )
WHERE id = '11111111-1111-1111-1111-111111111101';

UPDATE branches
SET branch_name = 'Novixa — Thái Nguyên',
    address = 'KĐT Hồ Xương Rồng, phường Phan Đình Phùng, tỉnh Thái Nguyên',
    phone = '0984660399'
WHERE id = '11111111-1111-1111-1111-111111111201';

-- Extra categories & brands
INSERT INTO product_categories (id, tenant_id, category_code, category_name, sort_order)
VALUES
    ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111101', 'DA_DAY', 'Dạ dày — tiêu hóa', 4),
    ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111101', 'HO_HAP', 'Hô hấp — cảm cúm', 5),
    ('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111101', 'NGAO_DUOC', 'Ngâm — dầu gió', 6)
ON CONFLICT (tenant_id, category_code) DO NOTHING;

INSERT INTO product_brands (id, tenant_id, brand_code, brand_name)
VALUES
    ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111101', 'DOMESCO', 'Domesco'),
    ('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111101', 'OPC', 'OPC Pharma'),
    ('44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111101', 'TRAPHACO', 'Traphaco'),
    ('44444444-4444-4444-4444-444444444406', '11111111-1111-1111-1111-111111111101', 'IMEXPHARM', 'Imexpharm')
ON CONFLICT (tenant_id, brand_code) DO NOTHING;

-- Rich descriptions + images for original demo products
UPDATE products SET description = 'Paracetamol 500mg — giảm đau hạ sốt OTC. Hộp 10 vỉ x 10 viên. Bảo quản nơi khô ráo, tránh ánh nắng. Không dùng quá liều 4g/ngày.'
WHERE id = '66666666-6666-6666-6666-666666666601';

UPDATE products SET description = 'Paracetamol Extra kết hợp caffeine — giảm đau đau đầu, đau răng. Uống sau ăn. Hạn chế dùng liên tục quá 3 ngày.'
WHERE id = '66666666-6666-6666-6666-666666666602';

UPDATE products SET description = 'Amoxicillin 500mg — kháng sinh beta-lactam, kê đơn. Dùng đủ liệu trình theo bác sĩ. Theo dõi phản ứng dị ứng.'
WHERE id = '66666666-6666-6666-6666-666666666603';

UPDATE products SET description = 'Vitamin C 1000mg — bổ sung vitamin, tăng sức đề kháng. Uống 1 viên/ngày sau bữa sáng. Không thay thế thuốc chữa bệnh.'
WHERE id = '66666666-6666-6666-6666-666666666604';

INSERT INTO product_images (tenant_id, product_id, image_url, sort_order, is_primary, status)
SELECT '11111111-1111-1111-1111-111111111101', p.id, v.url, 0, TRUE, 1
FROM (VALUES
    ('66666666-6666-6666-6666-666666666601'::uuid, '/demo-products/pill-01.svg'),
    ('66666666-6666-6666-6666-666666666602'::uuid, '/demo-products/pill-02.svg'),
    ('66666666-6666-6666-6666-666666666603'::uuid, '/demo-products/pill-03.svg'),
    ('66666666-6666-6666-6666-666666666604'::uuid, '/demo-products/pill-04.svg')
) AS v(pid, url)
JOIN products p ON p.id = v.pid
WHERE NOT EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE AND pi.status = 1
);

-- Additional catalog (36 products)
INSERT INTO products (id, tenant_id, category_id, brand_id, product_code, product_name, generic_name, drug_type, description)
VALUES
    ('a0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444401', 'DECK001', 'Panadol Extra (H/24v)', 'Paracetamol + Caffeine', 1, 'Giảm đau hạ sốt mạnh, phù hợp đau đầu căng thẳng. Hộp 24 vỉ, bán lẻ theo vỉ/viên.'),
    ('a0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444402', 'DECK002', 'Efferalgan 500mg (H/16v)', 'Paracetamol', 1, 'Paracetamol dạng sủi — hấp thu nhanh. Pha với nước, uống khi sốt cao.'),
    ('a0000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444403', 'DECK003', 'Brufen 400mg (H/30v)', 'Ibuprofen', 1, 'Kháng viêm giảm đau NSAID. Uống sau ăn, tránh dùng lâu dài không chỉ định.'),
    ('a0000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444404', 'DECK004', 'Augmentin 625mg (H/14v)', 'Amoxicillin + Clavulanate', 2, 'Kháng sinh phổ rộng — kê đơn. Bảo quản lạnh, dùng đủ ngày theo toa.'),
    ('a0000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444406', 'DECK005', 'Klacid 500mg (H/14v)', 'Clarithromycin', 2, 'Macrolide — viêm họng, viêm xoang. Theo dõi tương tác thuốc.'),
    ('a0000000-0000-4000-8000-000000000006', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333303', '44444444-4444-4444-4444-444444444405', 'DECK006', 'Berocca Performance (H/15v)', 'Vitamin B + C + khoáng', 1, 'Bổ sung đa vitamin cho người bận rộn. Uống 1 viên sủi/ngày.'),
    ('a0000000-0000-4000-8000-000000000007', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333303', '44444444-4444-4444-4444-444444444401', 'DECK007', 'Calcium Corbiere (Chai)', 'Canxi + D3', 1, 'Bổ sung canxi cho trẻ em và phụ nữ mang thai. Lắc đều trước khi uống.'),
    ('a0000000-0000-4000-8000-000000000008', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333304', '44444444-4444-4444-4444-444444444405', 'DECK008', 'Gastropulgite (H/20gói)', 'Diosmectite', 1, 'Trị tiêu chảy cấp, bao bọc niêm mạc dạ dày. Pha với nước.'),
    ('a0000000-0000-4000-8000-000000000009', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333304', '44444444-4444-4444-4444-444444444403', 'DECK009', 'Smecta 3g (H/30gói)', 'Diosmectite', 1, 'Điều trị rối loạn tiêu hóa, an toàn cho trẻ nhỏ theo liều.'),
    ('a0000000-0000-4000-8000-000000000010', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333304', '44444444-4444-4444-4444-444444444402', 'DECK010', 'Omeprazole Stada 20mg (H/28v)', 'Omeprazole', 1, 'Ức chế bơm proton — trào ngược, loét dạ dày. Uống trước ăn sáng.'),
    ('a0000000-0000-4000-8000-000000000011', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333305', '44444444-4444-4444-4444-444444444405', 'DECK011', 'Decolgen Forte (H/24v)', 'Paracetamol + Phenylephrine', 1, 'Trị cảm cúm — giảm nghẹt mũi, hạ sốt. Không lái xe nếu buồn ngủ.'),
    ('a0000000-0000-4000-8000-000000000012', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333305', '44444444-4444-4444-4444-444444444401', 'DECK012', 'Terpin Codeine (Chai 60ml)', 'Terpin + Codeine', 2, 'Thuốc ho kê đơn. Bán theo quy định thuốc kiểm soát.'),
    ('a0000000-0000-4000-8000-000000000013', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333305', '44444444-4444-4444-4444-444444444404', 'DECK013', 'ACC 200mg (H/20gói)', 'Acetylcysteine', 1, 'Long đờm, viêm phế quản. Pha nước ấm, uống ngay sau khi pha.'),
    ('a0000000-0000-4000-8000-000000000014', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444405', 'DECK014', 'Dầu gió Xanh 24ml', 'Menthol + Eucalyptus', 1, 'Xoa bóp giảm nhức mỏi, cảm lạnh. Không bôi vùng da bị tổn thương.'),
    ('a0000000-0000-4000-8000-000000000015', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444403', 'DECK015', 'Salonpas (H/20miếng)', 'Methyl salicylate', 1, 'Miếng dán giảm đau cơ, vai gáy. Dán tối đa 8h/lần.'),
    ('a0000000-0000-4000-8000-000000000016', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444406', 'DECK016', 'Tatanol 500mg (H/10v)', 'Paracetamol', 1, 'Paracetamol giá bình dân, bán chạy quầy OTC.'),
    ('a0000000-0000-4000-8000-000000000017', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333303', '44444444-4444-4444-4444-444444444402', 'DECK017', 'Redoxon Double Action (H/15v)', 'Vitamin C + Zinc', 1, 'Tăng cường miễn dịch mùa dịch. Viên sủi hương cam.'),
    ('a0000000-0000-4000-8000-000000000018', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444401', 'DECK018', 'Cefixim 200mg (H/10v)', 'Cefixim', 2, 'Cephalosporin thế hệ 3 — nhiễm khuẩn đường hô hấp.'),
    ('a0000000-0000-4000-8000-000000000019', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333304', '44444444-4444-4444-4444-444444444404', 'DECK019', 'Motilium-M 10mg (H/30v)', 'Domperidone', 1, 'Chống nôn, tăng nhu động dạ dày. Uống trước bữa ăn 15 phút.'),
    ('a0000000-0000-4000-8000-000000000020', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333305', '44444444-4444-4444-4444-444444444403', 'DECK020', 'Prospan Siro 100ml', 'Ivy leaf extract', 1, 'Siro ho thảo dược, an toàn trẻ em từ 2 tuổi.')
ON CONFLICT (tenant_id, product_code) DO UPDATE SET
    description = EXCLUDED.description,
    product_name = EXCLUDED.product_name,
    generic_name = EXCLUDED.generic_name;

-- Units, barcodes, prices for DECK products (base unit only)
INSERT INTO product_units (id, tenant_id, product_id, unit_name, conversion_factor, is_base_unit, is_sale_unit)
SELECT
    ('b0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
    '11111111-1111-1111-1111-111111111101',
    ('a0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
    'Hộp', 1, TRUE, TRUE
FROM generate_series(1, 20) AS n
WHERE EXISTS (SELECT 1 FROM products WHERE product_code = 'DECK' || lpad(n::text, 3, '0'))
ON CONFLICT (product_id, unit_name) DO NOTHING;

INSERT INTO product_barcodes (tenant_id, product_id, barcode, barcode_type, is_primary)
SELECT
    '11111111-1111-1111-1111-111111111101',
    ('a0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
    '8934567891' || lpad(n::text, 3, '0'),
    1, TRUE
FROM generate_series(1, 20) AS n
WHERE EXISTS (SELECT 1 FROM products WHERE product_code = 'DECK' || lpad(n::text, 3, '0'))
ON CONFLICT (tenant_id, barcode) DO NOTHING;

INSERT INTO product_prices (tenant_id, product_id, product_unit_id, price_type, price)
SELECT
    '11111111-1111-1111-1111-111111111101',
    p.id,
    u.id,
    1,
    (15000 + n * 3500)::numeric(18,2)
FROM generate_series(1, 20) AS n
JOIN products p ON p.product_code = 'DECK' || lpad(n::text, 3, '0')
JOIN product_units u ON u.product_id = p.id AND u.unit_name = 'Hộp'
WHERE NOT EXISTS (
    SELECT 1 FROM product_prices pp
    WHERE pp.product_id = p.id AND pp.product_unit_id = u.id AND pp.price_type = 1 AND pp.status = 1
);

-- Product images for DECK catalog
INSERT INTO product_images (tenant_id, product_id, image_url, sort_order, is_primary, status)
SELECT
    '11111111-1111-1111-1111-111111111101',
    p.id,
    '/demo-products/pill-' || lpad(((n - 1) % 12 + 1)::text, 2, '0') || '.svg',
    0, TRUE, 1
FROM generate_series(1, 20) AS n
JOIN products p ON p.product_code = 'DECK' || lpad(n::text, 3, '0')
WHERE NOT EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE AND pi.status = 1
);

-- Extra stock batches (incl. near-expiry for dashboard alerts)
INSERT INTO inventory_batches (id, tenant_id, warehouse_id, product_id, batch_number, expiry_date, unit_cost, quantity_received, quantity_available, supplier_id)
SELECT
    ('c0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
    '11111111-1111-1111-1111-111111111101',
    '22222222-2222-2222-2222-222222222201',
    ('a0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
    'DECK-LOT-' || lpad(n::text, 4, '0'),
    CASE
        WHEN n <= 6 THEN (CURRENT_DATE + (5 + n))::date
        WHEN n <= 12 THEN (CURRENT_DATE + INTERVAL '180 days')::date
        ELSE (CURRENT_DATE + INTERVAL '720 days')::date
    END,
    (8000 + n * 200)::numeric(18,2),
    (80 + n * 15)::numeric(18,3),
    (80 + n * 15)::numeric(18,3),
    '88888888-8888-8888-8888-888888888801'
FROM generate_series(1, 20) AS n
WHERE EXISTS (SELECT 1 FROM products WHERE product_code = 'DECK' || lpad(n::text, 3, '0'))
ON CONFLICT (id) DO NOTHING;
UPDATE inventory_batches SET quantity_available = 2500, quantity_received = 2500
WHERE id = '99999999-9999-9999-9999-999999999901';
UPDATE inventory_batches SET quantity_available = 1800, quantity_received = 1800
WHERE id = '99999999-9999-9999-9999-999999999902';
UPDATE inventory_batches SET quantity_available = 950, quantity_received = 950
WHERE id = '99999999-9999-9999-9999-999999999903';

INSERT INTO inventory_batches (id, tenant_id, warehouse_id, product_id, batch_number, expiry_date, unit_cost, quantity_received, quantity_available, supplier_id)
VALUES
    ('c0000000-0000-4000-8000-000000000099', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201',
     '66666666-6666-6666-6666-666666666604', 'VITC-NEAR', (CURRENT_DATE + 12)::date, 5500, 120, 120, '88888888-8888-8888-8888-888888888801'),
    ('c0000000-0000-4000-8000-000000000098', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201',
     '66666666-6666-6666-6666-666666666603', 'AMOX-NEAR', (CURRENT_DATE + 18)::date, 1800, 85, 85, '88888888-8888-8888-8888-888888888801')
ON CONFLICT (id) DO NOTHING;

-- Refresh deck demo sales
DELETE FROM sales_order_batch_allocations
WHERE sales_order_item_id IN (
    SELECT i.id FROM sales_order_items i
    INNER JOIN sales_orders o ON o.id = i.sales_order_id
    WHERE o.order_number LIKE 'DECK-%'
);
DELETE FROM sales_order_items
WHERE sales_order_id IN (SELECT id FROM sales_orders WHERE order_number LIKE 'DECK-%');
DELETE FROM sales_payments
WHERE sales_order_id IN (SELECT id FROM sales_orders WHERE order_number LIKE 'DECK-%');
DELETE FROM sales_orders WHERE order_number LIKE 'DECK-%';

DO $$
DECLARE
    v_tenant UUID := '11111111-1111-1111-1111-111111111101';
    v_branch UUID := '11111111-1111-1111-1111-111111111201';
    v_wh UUID := '22222222-2222-2222-2222-222222222201';
    v_emp UUID := '11111111-1111-1111-1111-111111111301';
    v_customers UUID[] := ARRAY[
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01'::uuid,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02'::uuid,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03'::uuid,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa04'::uuid,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa05'::uuid,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa06'::uuid
    ];
    -- product, unit, batch tuples across categories (pain / antibiotic / vitamin / GI / cold)
    v_prod UUID;
    v_unit UUID;
    v_batch UUID;
    v_order_id UUID;
    v_item_id UUID;
    v_paid_at TIMESTAMPTZ;
    v_order_date TIMESTAMPTZ;
    v_amount NUMERIC(18,2);
    v_day INT;
    v_seq INT;
    v_cust UUID;
    v_prod_idx INT;
    v_today_orders INT := 85;
    v_today_target NUMERIC(18,2) := 52450000; -- ~52M VND hôm nay (banner ~12M, demo phải ấn tượng hơn)
    v_today_base NUMERIC(18,2);
BEGIN
    -- Hôm nay: 85 đơn, tổng ~52,45 triệu, phân bổ nhiều danh mục
    FOR v_seq IN 1..v_today_orders LOOP
        v_prod_idx := 1 + ((v_seq - 1) % 5);
        v_cust := v_customers[1 + ((v_seq - 1) % array_length(v_customers, 1))];

        SELECT p.id, u.id, b.id
        INTO v_prod, v_unit, v_batch
        FROM (VALUES
            (1, '66666666-6666-6666-6666-666666666601'::uuid, '77777777-7777-7777-7777-777777777701'::uuid, '99999999-9999-9999-9999-999999999901'::uuid),
            (2, '66666666-6666-6666-6666-666666666603'::uuid, '77777777-7777-7777-7777-777777777704'::uuid, 'c0000000-0000-4000-8000-000000000098'::uuid),
            (3, '66666666-6666-6666-6666-666666666604'::uuid, '77777777-7777-7777-7777-777777777705'::uuid, 'c0000000-0000-4000-8000-000000000099'::uuid),
            (4, 'a0000000-0000-4000-8000-000000000008'::uuid, 'b0000000-0000-4000-8000-000000000008'::uuid, 'c0000000-0000-4000-8000-000000000008'::uuid),
            (5, 'a0000000-0000-4000-8000-000000000011'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, 'c0000000-0000-4000-8000-000000000011'::uuid)
        ) AS m(idx, pid, uid, bid)
        JOIN products p ON p.id = m.pid
        JOIN product_units u ON u.id = m.uid
        JOIN inventory_batches b ON b.id = m.bid
        WHERE m.idx = v_prod_idx;

        -- Phân bổ đều quanh target + biến thiên theo giờ cao điểm
        v_today_base := v_today_target / v_today_orders;
        v_amount := (v_today_base * (0.75 + (v_seq % 11) * 0.05))::numeric(18,2);
        IF v_seq % 9 = 0 THEN v_amount := v_amount + 850000; END IF;
        IF v_seq % 13 = 0 THEN v_amount := v_amount + 1200000; END IF;

        v_paid_at := (
            date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')
            + make_interval(hours => 7 + (v_seq % 12), mins => (v_seq * 5) % 60)
        ) AT TIME ZONE 'Asia/Ho_Chi_Minh';
        v_order_date := v_paid_at;
        v_order_id := gen_random_uuid();
        v_item_id := gen_random_uuid();

        INSERT INTO sales_orders (id, tenant_id, order_number, branch_id, warehouse_id, customer_id, employee_id,
            order_date, subtotal, discount_amount, total_amount, status, notes)
        VALUES (v_order_id, v_tenant, 'DECK-T-' || lpad(v_seq::text, 4, '0'), v_branch, v_wh, v_cust, v_emp,
            v_order_date, v_amount, 0, v_amount, 2, 'Deck demo sales');

        INSERT INTO sales_order_items (id, sales_order_id, product_id, product_unit_id, batch_id, quantity, unit_price, line_total)
        VALUES (v_item_id, v_order_id, v_prod, v_unit, v_batch, 1, v_amount, v_amount);

        INSERT INTO sales_order_batch_allocations (sales_order_item_id, batch_id, quantity, unit_cost)
        VALUES (v_item_id, v_batch, 1, 350);

        INSERT INTO sales_payments (sales_order_id, payment_method, amount, paid_at)
        VALUES (v_order_id, CASE WHEN v_seq % 4 = 0 THEN 2 WHEN v_seq % 7 = 0 THEN 3 ELSE 1 END, v_amount, v_paid_at);
    END LOOP;

    -- 29 ngày trước: 10–18 đơn/ngày, doanh thu 18–35M/ngày
    FOR v_day IN 1..29 LOOP
        FOR v_seq IN 1..(10 + (v_day % 9)) LOOP
            v_prod_idx := 1 + ((v_day + v_seq) % 5);
            v_cust := v_customers[1 + ((v_day + v_seq) % array_length(v_customers, 1))];

            SELECT p.id, u.id, b.id
            INTO v_prod, v_unit, v_batch
            FROM (VALUES
                (1, '66666666-6666-6666-6666-666666666601'::uuid, '77777777-7777-7777-7777-777777777701'::uuid, '99999999-9999-9999-9999-999999999901'::uuid),
                (2, '66666666-6666-6666-6666-666666666603'::uuid, '77777777-7777-7777-7777-777777777704'::uuid, 'c0000000-0000-4000-8000-000000000098'::uuid),
                (3, '66666666-6666-6666-6666-666666666604'::uuid, '77777777-7777-7777-7777-777777777705'::uuid, 'c0000000-0000-4000-8000-000000000099'::uuid),
                (4, 'a0000000-0000-4000-8000-000000000008'::uuid, 'b0000000-0000-4000-8000-000000000008'::uuid, 'c0000000-0000-4000-8000-000000000008'::uuid),
                (5, 'a0000000-0000-4000-8000-000000000011'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, 'c0000000-0000-4000-8000-000000000011'::uuid)
            ) AS m(idx, pid, uid, bid)
            JOIN products p ON p.id = m.pid
            JOIN product_units u ON u.id = m.uid
            JOIN inventory_batches b ON b.id = m.bid
            WHERE m.idx = v_prod_idx;

            v_amount := (420000 + ((v_day * 23 + v_seq * 17) % 140) * 10000)::numeric(18,2);

            v_paid_at := (
                date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - make_interval(days => v_day)
                + make_interval(hours => 8 + (v_seq % 10), mins => (v_seq * 7) % 60)
            ) AT TIME ZONE 'Asia/Ho_Chi_Minh';
            v_order_date := v_paid_at;
            v_order_id := gen_random_uuid();
            v_item_id := gen_random_uuid();

            INSERT INTO sales_orders (id, tenant_id, order_number, branch_id, warehouse_id, customer_id, employee_id,
                order_date, subtotal, discount_amount, total_amount, status, notes)
            VALUES (v_order_id, v_tenant, 'DECK-H-' || v_day || '-' || v_seq, v_branch, v_wh, v_cust, v_emp,
                v_order_date, v_amount, 0, v_amount, 2, 'Deck demo history');

            INSERT INTO sales_order_items (id, sales_order_id, product_id, product_unit_id, batch_id, quantity, unit_price, line_total)
            VALUES (v_item_id, v_order_id, v_prod, v_unit, v_batch, 1, v_amount, v_amount);

            INSERT INTO sales_order_batch_allocations (sales_order_item_id, batch_id, quantity, unit_cost)
            VALUES (v_item_id, v_batch, 1, 350);

            INSERT INTO sales_payments (sales_order_id, payment_method, amount, paid_at)
            VALUES (v_order_id, 1, v_amount, v_paid_at);
        END LOOP;
    END LOOP;
END $$;
