-- KitPlatform 069: Assessment seed — PHARMACY_V1 (30 questions, score 1–4)
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING

-- Template
INSERT INTO assessment_template (id, code, name, version, description, verticals, status)
VALUES (
    'a0000001-0000-4000-8000-000000000001',
    'PHARMACY_V1',
    'Danh gia nang luc nha thuoc',
    '1.0',
    'Bo 30 cau — 6 category, maturity 1-4. Public web + lead gate.',
    ARRAY['pharmacy','pharmacy_chain'],
    'active'
)
ON CONFLICT (code, version) DO NOTHING;

-- Categories (weight equal = 1)
INSERT INTO assessment_category (id, template_id, code, name, sort_order, weight)
VALUES
    ('a0000001-0000-4000-8000-000000000011', 'a0000001-0000-4000-8000-000000000001', 'CUSTOMER',   'Khach hang',              1, 1),
    ('a0000001-0000-4000-8000-000000000012', 'a0000001-0000-4000-8000-000000000001', 'OPERATIONS', 'Van hanh',                2, 1),
    ('a0000001-0000-4000-8000-000000000013', 'a0000001-0000-4000-8000-000000000001', 'INVENTORY',  'Kho',                     3, 1),
    ('a0000001-0000-4000-8000-000000000014', 'a0000001-0000-4000-8000-000000000001', 'BUSINESS',   'Kinh doanh',              4, 1),
    ('a0000001-0000-4000-8000-000000000015', 'a0000001-0000-4000-8000-000000000001', 'TECH',       'Du lieu & Cong nghe',     5, 1),
    ('a0000001-0000-4000-8000-000000000016', 'a0000001-0000-4000-8000-000000000001', 'GROWTH',     'Phat trien',              6, 1)
ON CONFLICT (template_id, code) DO NOTHING;

-- Dimensions (v1: one per category)
INSERT INTO assessment_dimension (id, category_id, code, name, sort_order, weight)
VALUES
    ('a0000001-0000-4000-8000-000000000021', 'a0000001-0000-4000-8000-000000000011', 'CUSTOMER_OVERALL',   'Khach hang (tong)',           1, 1),
    ('a0000001-0000-4000-8000-000000000022', 'a0000001-0000-4000-8000-000000000012', 'OPERATIONS_OVERALL', 'Van hanh (tong)',             1, 1),
    ('a0000001-0000-4000-8000-000000000023', 'a0000001-0000-4000-8000-000000000013', 'INVENTORY_OVERALL',  'Kho (tong)',                  1, 1),
    ('a0000001-0000-4000-8000-000000000024', 'a0000001-0000-4000-8000-000000000014', 'BUSINESS_OVERALL',   'Kinh doanh (tong)',            1, 1),
    ('a0000001-0000-4000-8000-000000000025', 'a0000001-0000-4000-8000-000000000015', 'TECH_OVERALL',       'Du lieu & Cong nghe (tong)',  1, 1),
    ('a0000001-0000-4000-8000-000000000026', 'a0000001-0000-4000-8000-000000000016', 'GROWTH_OVERALL',     'Phat trien (tong)',           1, 1)
ON CONFLICT (category_id, code) DO NOTHING;

-- Questions
INSERT INTO assessment_question (id, dimension_id, code, title, question_type, scorable, required, sort_order, weight, metadata)
VALUES
    -- CUSTOMER
    ('a0000001-0000-4000-8000-000000000101', 'a0000001-0000-4000-8000-000000000021', 'C1', 'Nha thuoc hien co luu ho so khach hang khong?', 'single_choice', TRUE, TRUE, 1, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000102', 'a0000001-0000-4000-8000-000000000021', 'C2', 'Khi khach quay lai, nha thuoc co xem duoc lich su mua hang khong?', 'single_choice', TRUE, TRUE, 2, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000103', 'a0000001-0000-4000-8000-000000000021', 'C3', 'Nha thuoc co phan loai khach hang theo nhom khong?', 'single_choice', TRUE, TRUE, 3, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000104', 'a0000001-0000-4000-8000-000000000021', 'C4', 'Nha thuoc co chu dong cham soc khach sau khi ban hang khong?', 'single_choice', TRUE, TRUE, 4, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000105', 'a0000001-0000-4000-8000-000000000021', 'C5', 'Nha thuoc co biet ty le khach hang quay lai mua hang khong?', 'single_choice', TRUE, TRUE, 5, 1, '{}'),
    -- OPERATIONS
    ('a0000001-0000-4000-8000-000000000201', 'a0000001-0000-4000-8000-000000000022', 'O1', 'Quy trinh ban hang giua cac nhan vien co thong nhat khong?', 'single_choice', TRUE, TRUE, 1, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000202', 'a0000001-0000-4000-8000-000000000022', 'O2', 'Nha thuoc co tai lieu huong dan cho nhan vien moi khong?', 'single_choice', TRUE, TRUE, 2, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000203', 'a0000001-0000-4000-8000-000000000022', 'O3', 'Cac cong viec hang ngay co checklist hoac SOP khong?', 'single_choice', TRUE, TRUE, 3, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000204', 'a0000001-0000-4000-8000-000000000022', 'O4', 'Viec phan quyen giua chu va nhan vien co ro rang khong?', 'single_choice', TRUE, TRUE, 4, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000205', 'a0000001-0000-4000-8000-000000000022', 'O5', 'Nha thuoc co thuong xuyen danh gia hieu qua lam viec cua nhan vien khong?', 'single_choice', TRUE, TRUE, 5, 1, '{}'),
    -- INVENTORY
    ('a0000001-0000-4000-8000-000000000301', 'a0000001-0000-4000-8000-000000000023', 'I1', 'Nha thuoc co theo doi hang can han khong?', 'single_choice', TRUE, TRUE, 1, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000302', 'a0000001-0000-4000-8000-000000000023', 'I2', 'Nha thuoc co biet ty le hang ton lau khong?', 'single_choice', TRUE, TRUE, 2, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000303', 'a0000001-0000-4000-8000-000000000023', 'I3', 'Viec nhap hang dua tren du lieu hay kinh nghiem?', 'single_choice', TRUE, TRUE, 3, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000304', 'a0000001-0000-4000-8000-000000000023', 'I4', 'Nha thuoc co kiem ke dinh ky khong?', 'single_choice', TRUE, TRUE, 4, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000305', 'a0000001-0000-4000-8000-000000000023', 'I5', 'Nha thuoc co biet san pham nao ban cham nhat khong?', 'single_choice', TRUE, TRUE, 5, 1, '{}'),
    -- BUSINESS
    ('a0000001-0000-4000-8000-000000000401', 'a0000001-0000-4000-8000-000000000024', 'B1', 'Nha thuoc co theo doi doanh thu theo tung nhom san pham khong?', 'single_choice', TRUE, TRUE, 1, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000402', 'a0000001-0000-4000-8000-000000000024', 'B2', 'Nha thuoc co biet nhom khach hang nao mang lai doanh thu cao nhat khong?', 'single_choice', TRUE, TRUE, 2, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000403', 'a0000001-0000-4000-8000-000000000024', 'B3', 'Nha thuoc co do hieu qua cac chuong trinh khuyen mai khong?', 'single_choice', TRUE, TRUE, 3, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000404', 'a0000001-0000-4000-8000-000000000024', 'B4', 'Nha thuoc co dat muc tieu doanh thu theo thang khong?', 'single_choice', TRUE, TRUE, 4, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000405', 'a0000001-0000-4000-8000-000000000024', 'B5', 'Khi doanh thu giam, nha thuoc co xac dinh duoc nguyen nhan khong?', 'single_choice', TRUE, TRUE, 5, 1, '{}'),
    -- TECH
    ('a0000001-0000-4000-8000-000000000501', 'a0000001-0000-4000-8000-000000000025', 'T1', 'Du lieu hoat dong cua nha thuoc hien duoc quan ly nhu the nao?', 'single_choice', TRUE, TRUE, 1, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000502', 'a0000001-0000-4000-8000-000000000025', 'T2', 'Chu nha thuoc co the xem tinh hinh kinh doanh tu xa khong?', 'single_choice', TRUE, TRUE, 2, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000503', 'a0000001-0000-4000-8000-000000000025', 'T3', 'Nha thuoc co su dung Dashboard de theo doi hoat dong khong?', 'single_choice', TRUE, TRUE, 3, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000504', 'a0000001-0000-4000-8000-000000000025', 'T4', 'Cac du lieu ban hang, kho va khach hang co duoc lien ket voi nhau khong?', 'single_choice', TRUE, TRUE, 4, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000505', 'a0000001-0000-4000-8000-000000000025', 'T5', 'Nha thuoc co su dung AI hoac tu dong hoa trong quan ly khong?', 'single_choice', TRUE, TRUE, 5, 1, '{}'),
    -- GROWTH
    ('a0000001-0000-4000-8000-000000000601', 'a0000001-0000-4000-8000-000000000026', 'G1', 'Neu mo them mot chi nhanh, quy trinh hien tai co the ap dung ngay khong?', 'single_choice', TRUE, TRUE, 1, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000602', 'a0000001-0000-4000-8000-000000000026', 'G2', 'Nha thuoc co ke hoach phat trien trong 12 thang toi khong?', 'single_choice', TRUE, TRUE, 2, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000603', 'a0000001-0000-4000-8000-000000000026', 'G3', 'Nha thuoc co thuong xuyen xem lai du lieu de cai thien hoat dong khong?', 'single_choice', TRUE, TRUE, 3, 1, '{}'),
    ('a0000001-0000-4000-8000-000000000604', 'a0000001-0000-4000-8000-000000000026', 'G4', 'Theo anh/chi, tro ngai lon nhat hien nay cua nha thuoc la gi?', 'single_choice', FALSE, TRUE, 4, 0, '{"leadTag":"pain_point"}'),
    ('a0000001-0000-4000-8000-000000000605', 'a0000001-0000-4000-8000-000000000026', 'G5', 'Neu co the cai thien ngay mot van de trong nha thuoc, anh/chi se uu tien dieu gi nhat?', 'single_choice', FALSE, TRUE, 5, 0, '{"leadTag":"priority_need"}')
ON CONFLICT (dimension_id, code) DO NOTHING;

-- Options: CUSTOMER C1–C5 (custom labels)
INSERT INTO assessment_option (question_id, code, label, score, sort_order)
SELECT q.id, v.code, v.label, v.score, v.ord
FROM assessment_question q
CROSS JOIN (VALUES
    ('C1', 'OPT1', 'Khong luu', 1, 1),
    ('C1', 'OPT2', 'Chi luu so dien thoai', 2, 2),
    ('C1', 'OPT3', 'Luu thong tin co ban', 3, 3),
    ('C1', 'OPT4', 'Luu day du va cap nhat thuong xuyen', 4, 4),
    ('C2', 'OPT1', 'Khong', 1, 1),
    ('C2', 'OPT2', 'Chi mot phan', 2, 2),
    ('C2', 'OPT3', 'Co nhung kho tra cuu', 3, 3),
    ('C2', 'OPT4', 'Co day du va nhanh chong', 4, 4),
    ('C3', 'OPT1', 'Khong', 1, 1),
    ('C3', 'OPT2', 'Phan loai thu cong', 2, 2),
    ('C3', 'OPT3', 'Co mot so nhom co ban', 3, 3),
    ('C3', 'OPT4', 'Phan loai tu dong va su dung thuong xuyen', 4, 4),
    ('C4', 'OPT1', 'Khong', 1, 1),
    ('C4', 'OPT2', 'Thinh thoang', 2, 2),
    ('C4', 'OPT3', 'Theo mot so chuong trinh', 3, 3),
    ('C4', 'OPT4', 'Co quy trinh ro rang', 4, 4),
    ('C5', 'OPT1', 'Khong biet', 1, 1),
    ('C5', 'OPT2', 'Uoc luong', 2, 2),
    ('C5', 'OPT3', 'Co thong ke dinh ky', 3, 3),
    ('C5', 'OPT4', 'Theo doi thuong xuyen', 4, 4)
) AS v(qcode, code, label, score, ord)
WHERE q.code = v.qcode
ON CONFLICT (question_id, code) DO NOTHING;

-- INVENTORY I3 (custom)
INSERT INTO assessment_option (question_id, code, label, score, sort_order)
SELECT q.id, v.code, v.label, v.score, v.ord
FROM assessment_question q
CROSS JOIN (VALUES
    ('I3', 'OPT1', 'Hoan toan theo cam tinh', 1, 1),
    ('I3', 'OPT2', 'Chu yeu theo kinh nghiem', 2, 2),
    ('I3', 'OPT3', 'Ket hop du lieu va kinh nghiem', 3, 3),
    ('I3', 'OPT4', 'Chu yeu dua tren du lieu', 4, 4)
) AS v(qcode, code, label, score, ord)
WHERE q.code = v.qcode
ON CONFLICT (question_id, code) DO NOTHING;

-- TECH T1 (custom)
INSERT INTO assessment_option (question_id, code, label, score, sort_order)
SELECT q.id, v.code, v.label, v.score, v.ord
FROM assessment_question q
CROSS JOIN (VALUES
    ('T1', 'OPT1', 'Ghi chep thu cong', 1, 1),
    ('T1', 'OPT2', 'Excel', 2, 2),
    ('T1', 'OPT3', 'Phan mem', 3, 3),
    ('T1', 'OPT4', 'Dong bo va phan tich tu dong', 4, 4)
) AS v(qcode, code, label, score, ord)
WHERE q.code = v.qcode
ON CONFLICT (question_id, code) DO NOTHING;

-- G4, G5 qualitative (no score)
INSERT INTO assessment_option (question_id, code, label, score, sort_order, metadata)
SELECT q.id, v.code, v.label, NULL, v.ord, v.meta::jsonb
FROM assessment_question q
CROSS JOIN (VALUES
    ('G4', 'PAIN_ATTRACT',   'Thu hut khach hang', 1, '{"tag":"pain_attract"}'),
    ('G4', 'PAIN_RETENTION', 'Giu chan khach hang', 2, '{"tag":"pain_retention"}'),
    ('G4', 'PAIN_INVENTORY', 'Quan ly kho', 3, '{"tag":"pain_inventory"}'),
    ('G4', 'PAIN_STAFF',     'Quan ly nhan su', 4, '{"tag":"pain_staff"}'),
    ('G4', 'PAIN_REVENUE',   'Tang doanh thu', 5, '{"tag":"pain_revenue"}'),
    ('G4', 'PAIN_OTHER',     'Khac', 6, '{"tag":"pain_other"}'),
    ('G5', 'NEED_REVENUE',   'Tang doanh thu', 1, '{"tag":"need_revenue"}'),
    ('G5', 'NEED_INVENTORY', 'Giam ton kho', 2, '{"tag":"need_inventory"}'),
    ('G5', 'NEED_CRM',       'Giu chan khach hang', 3, '{"tag":"need_crm"}'),
    ('G5', 'NEED_OPS',       'Chuan hoa van hanh', 4, '{"tag":"need_ops"}'),
    ('G5', 'NEED_TIME',      'Tiet kiem thoi gian quan ly', 5, '{"tag":"need_time"}'),
    ('G5', 'NEED_OTHER',     'Khac', 6, '{"tag":"need_other"}')
) AS v(qcode, code, label, ord, meta)
WHERE q.code = v.qcode
ON CONFLICT (question_id, code) DO NOTHING;

-- Standard maturity 4-tier for remaining scored questions (O*, I1,I2,I4,I5, B*, T2-T5, G1-G3)
INSERT INTO assessment_option (question_id, code, label, score, sort_order)
SELECT q.id, 'OPT1', 'Khong / Khong biet / Khong co', 1, 1
FROM assessment_question q
WHERE q.scorable = TRUE
  AND q.code NOT IN ('C1','C2','C3','C4','C5','I3','T1')
  AND NOT EXISTS (SELECT 1 FROM assessment_option o WHERE o.question_id = q.id AND o.code = 'OPT1');

INSERT INTO assessment_option (question_id, code, label, score, sort_order)
SELECT q.id, 'OPT2', 'Mot phan / Thu cong / Uoc luong', 2, 2
FROM assessment_question q
WHERE q.scorable = TRUE
  AND q.code NOT IN ('C1','C2','C3','C4','C5','I3','T1')
  AND NOT EXISTS (SELECT 1 FROM assessment_option o WHERE o.question_id = q.id AND o.code = 'OPT2');

INSERT INTO assessment_option (question_id, code, label, score, sort_order)
SELECT q.id, 'OPT3', 'Co nhung chua tot / Theo chuong trinh', 3, 3
FROM assessment_question q
WHERE q.scorable = TRUE
  AND q.code NOT IN ('C1','C2','C3','C4','C5','I3','T1')
  AND NOT EXISTS (SELECT 1 FROM assessment_option o WHERE o.question_id = q.id AND o.code = 'OPT3');

INSERT INTO assessment_option (question_id, code, label, score, sort_order)
SELECT q.id, 'OPT4', 'Day du / Tu dong / Thuong xuyen', 4, 4
FROM assessment_question q
WHERE q.scorable = TRUE
  AND q.code NOT IN ('C1','C2','C3','C4','C5','I3','T1')
  AND NOT EXISTS (SELECT 1 FROM assessment_option o WHERE o.question_id = q.id AND o.code = 'OPT4');

-- Sample rules (evaluated at complete / lead capture)
INSERT INTO assessment_rule (id, template_id, code, name, expression, action_type, action_payload, priority)
VALUES
    (
        'a0000001-0000-4000-8000-000000000701',
        'a0000001-0000-4000-8000-000000000001',
        'INSIGHT_CUSTOMER_LOW',
        'Diem Khach hang thap',
        'category.CUSTOMER.score < 2.5',
        'insight',
        '{"title":"Co hoi cai thien Khach hang","body":"Diem nhom Khach hang duoi muc trung binh. Can tap trung ho so KH, loyalty va cham soc sau ban.","severity":"warning","scopeType":"category","scopeCode":"CUSTOMER"}'::jsonb,
        80
    ),
    (
        'a0000001-0000-4000-8000-000000000702',
        'a0000001-0000-4000-8000-000000000001',
        'REC_NEED_CRM',
        'Uu tien giu chan KH',
        'response.G5.option_code = ''NEED_CRM''',
        'recommendation',
        '{"title":"Trien khai Health Wallet + Loyalty","body":"Novixa ho tro ho so suc khoe, nhac thuoc, loyalty va app khach hang de giu chan.","productArea":"customer_app","estimateHint":"4-8 tuan pilot"}'::jsonb,
        90
    ),
    (
        'a0000001-0000-4000-8000-000000000703',
        'a0000001-0000-4000-8000-000000000001',
        'REC_TECH_EXCEL',
        'Van dung Excel',
        'category.TECH.score < 2.5',
        'recommendation',
        '{"title":"Chuyen tu Excel sang he thong lien ket","body":"ERP Novixa dong bo ban hang, kho, KH — giam sai sot va xem tu xa.","productArea":"tech","estimateHint":"2-4 tuan onboarding"}'::jsonb,
        70
    ),
    (
        'a0000001-0000-4000-8000-000000000704',
        'a0000001-0000-4000-8000-000000000001',
        'INSIGHT_OVERALL_MID',
        'Tong diem trung binh',
        'overall.score >= 2.5 AND overall.score < 3.5',
        'insight',
        '{"title":"Nen co nen tang tot","body":"Nha thuoc da co nen tang; can chuan hoa van hanh va du lieu de tang truong on dinh.","severity":"info","scopeType":"overall"}'::jsonb,
        50
    )
ON CONFLICT (template_id, code) DO NOTHING;
