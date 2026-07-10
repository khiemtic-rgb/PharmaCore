-- KitPlatform 090: KAP Decision Intelligence seed — PHARMACY_V1 maturity + root cause KB
-- Depends on: 089_kap_decision_intelligence_schema.sql, 069_assessment_pharmacy_v1_seed.sql

-- Maturity levels (overall score 1–4 mapped to 5 business maturity levels)
INSERT INTO assessment_maturity_level (
    id, template_id, vertical_code, level, code, name, description, score_min, score_max, sort_order
)
VALUES
    (
        'a0000001-0000-4000-8000-000000000801',
        'a0000001-0000-4000-8000-000000000001',
        'pharmacy',
        1, 'INIT', 'Khoi tao',
        'Van hanh chu yeu thu cong, thieu du lieu tap trung va quy trinh chua on dinh.',
        1.0000, 1.5999, 1
    ),
    (
        'a0000001-0000-4000-8000-000000000802',
        'a0000001-0000-4000-8000-000000000001',
        'pharmacy',
        2, 'BASIC', 'Co ban',
        'Da co mot so quy trinh nhung con phu thuoc kinh nghiem ca nhan.',
        1.6000, 2.1999, 2
    ),
    (
        'a0000001-0000-4000-8000-000000000803',
        'a0000001-0000-4000-8000-000000000001',
        'pharmacy',
        3, 'STANDARD', 'Chuan hoa',
        'Quy trinh va du lieu bat dau dong bo; co the mo rong voi giam sat co ban.',
        2.2000, 2.7999, 3
    ),
    (
        'a0000001-0000-4000-8000-000000000804',
        'a0000001-0000-4000-8000-000000000001',
        'pharmacy',
        4, 'EFFICIENT', 'Hieu qua',
        'Van hanh do luong duoc; quyet dinh dua tren bao cao dinh ky.',
        2.8000, 3.3999, 4
    ),
    (
        'a0000001-0000-4000-8000-000000000805',
        'a0000001-0000-4000-8000-000000000001',
        'pharmacy',
        5, 'SMART', 'Thong minh',
        'Du lieu lien thong, canh bao chu dong va cai tien lien tuc.',
        3.4000, 4.0000, 5
    )
ON CONFLICT (template_id, vertical_code, level) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    score_min = EXCLUDED.score_min,
    score_max = EXCLUDED.score_max;

-- Root cause KB — inventory cluster
INSERT INTO assessment_root_cause_kb (
    id, template_id, question_code, category_code, trigger_expression,
    cause_code, cause_title, cause_body, evidence_hint, sort_order
)
VALUES
    (
        'a0000001-0000-4000-8000-000000000811',
        'a0000001-0000-4000-8000-000000000001',
        'I1', 'INVENTORY', 'response.I1.score <= 2',
        'RC_INV_FEFO',
        'Chua theo doi hang can han',
        'Nguyen nhan chu yeu: chua ap dung FEFO/FEFO tu dong, thieu canh bao HSD va quy trinh uu tien xuat kho.',
        'Cau I1: Theo doi hang can han',
        10
    ),
    (
        'a0000001-0000-4000-8000-000000000812',
        'a0000001-0000-4000-8000-000000000001',
        'I4', 'INVENTORY', 'response.I4.score <= 2',
        'RC_INV_COUNT',
        'Kiem ke thu cong, thieu dinh ky',
        'Kiem ke khong deu dan hoac ghi nhan thu cong gay lech ton thuc te va kho phat hien mat mat.',
        'Cau I4: Kiem ke dinh ky',
        20
    ),
    (
        'a0000001-0000-4000-8000-000000000813',
        'a0000001-0000-4000-8000-000000000001',
        'I3', 'INVENTORY', 'response.I3.score <= 2',
        'RC_INV_REPLENISH',
        'Nhap hang theo cam tinh',
        'Quyet dinh nhap hang chua dua tren du lieu ban hang/toc do tieu thu — de ton dong va thieu hang dot bien.',
        'Cau I3: Du lieu vs kinh nghiem khi nhap hang',
        30
    ),
    (
        'a0000001-0000-4000-8000-000000000821',
        'a0000001-0000-4000-8000-000000000001',
        NULL, 'CUSTOMER', 'category.CUSTOMER.score < 2.5',
        'RC_CRM_PROFILE',
        'Thieu ho so khach hang tap trung',
        'Khong co ho so KH day du nen kho cham soc sau ban, loyalty va do luong ty le quay lai.',
        'Nhom Khach hang diem thap',
        40
    ),
    (
        'a0000001-0000-4000-8000-000000000822',
        'a0000001-0000-4000-8000-000000000001',
        NULL, 'TECH', 'category.TECH.score < 2.5',
        'RC_TECH_SILO',
        'Du lieu roi rac / Excel',
        'Ban hang, kho va KH khong lien ket — chu nha thuoc kho xem tinh hinh tu xa va ra quyet dinh nhanh.',
        'Nhom Du lieu & Cong nghe diem thap',
        50
    ),
    (
        'a0000001-0000-4000-8000-000000000823',
        'a0000001-0000-4000-8000-000000000001',
        NULL, 'OPERATIONS', 'category.OPERATIONS.score < 2.5',
        'RC_OPS_SOP',
        'Thieu SOP va phan quyen ro',
        'Quy trinh ban hang va giao ca chua thong nhat — phu thuoc nhan su chu chot.',
        'Nhom Van hanh diem thap',
        60
    )
ON CONFLICT (template_id, cause_code) DO UPDATE SET
    cause_title = EXCLUDED.cause_title,
    cause_body = EXCLUDED.cause_body,
    trigger_expression = EXCLUDED.trigger_expression;

-- Novixa internal benchmark placeholder (Phase 2 until real cohort data)
INSERT INTO assessment_benchmark_cohort (
    id, template_id, cohort_code, vertical_code, org_scale, sample_size, stats_json
)
VALUES (
    'a0000001-0000-4000-8000-000000000831',
    'a0000001-0000-4000-8000-000000000001',
    'PHARMACY_VN_BASELINE',
    'pharmacy',
    NULL,
    0,
    '{
        "overall": { "mean": 2.65, "p50": 2.70, "p90": 3.35 },
        "categories": {
            "CUSTOMER": { "mean": 2.55, "p50": 2.60 },
            "OPERATIONS": { "mean": 2.70, "p50": 2.75 },
            "INVENTORY": { "mean": 2.45, "p50": 2.50 },
            "BUSINESS": { "mean": 2.60, "p50": 2.65 },
            "TECH": { "mean": 2.35, "p50": 2.40 },
            "GROWTH": { "mean": 2.75, "p50": 2.80 }
        },
        "note": "Novixa internal baseline placeholder until cohort sample_size >= 100"
    }'::jsonb
)
ON CONFLICT (template_id, cohort_code) DO UPDATE SET
    stats_json = EXCLUDED.stats_json;

-- Additional rules for risk / SWOT (Phase 1 deterministic)
INSERT INTO assessment_rule (id, template_id, code, name, expression, action_type, action_payload, priority)
VALUES
    (
        'a0000001-0000-4000-8000-000000000841',
        'a0000001-0000-4000-8000-000000000001',
        'RISK_INVENTORY_HIGH',
        'Rui ro kho cao',
        'category.INVENTORY.score < 2.2',
        'risk',
        '{"area":"INVENTORY","level":"high","title":"Rui ro ton kho & HSD","body":"Diem Kho thap — nguy co ton dong, mat hang va vi pham GPP ve HSD."}'::jsonb,
        85
    ),
    (
        'a0000001-0000-4000-8000-000000000842',
        'a0000001-0000-4000-8000-000000000001',
        'RISK_TECH_HIGH',
        'Rui ro du lieu',
        'category.TECH.score < 2.2',
        'risk',
        '{"area":"TECH","level":"high","title":"Rui ro du lieu roi rac","body":"He thong phan tan — kho tong hop bao cao va quyet dinh nhap hang."}'::jsonb,
        84
    ),
    (
        'a0000001-0000-4000-8000-000000000843',
        'a0000001-0000-4000-8000-000000000001',
        'SWOT_STRENGTH_GROWTH',
        'Diem manh phat trien',
        'category.GROWTH.score >= 3.2',
        'swot_strength',
        '{"title":"Tam nhin phat trien ro","body":"Co ke hoach va y thuc cai tien — thuan loi cho mo rong chuoi hoac chuan hoa."}'::jsonb,
        60
    ),
    (
        'a0000001-0000-4000-8000-000000000844',
        'a0000001-0000-4000-8000-000000000001',
        'SWOT_WEAKNESS_TECH',
        'Diem yeu cong nghe',
        'category.TECH.score < 2.5',
        'swot_weakness',
        '{"title":"Cong nghe chua dong bo","body":"Du lieu ban hang, kho va KH chua lien ket — han che phan tich va tu dong hoa."}'::jsonb,
        70
    ),
    (
        'a0000001-0000-4000-8000-000000000845',
        'a0000001-0000-4000-8000-000000000001',
        'ROADMAP_30_INVENTORY',
        'Roadmap 30 ngay kho',
        'category.INVENTORY.score < 2.8',
        'roadmap_item',
        '{"horizonDays":30,"title":"Chuan hoa FEFO & canh bao HSD","body":"Bat buoc quet lo/HSD khi nhap; cau hinh canh bao 90/60/30 ngay."}'::jsonb,
        75
    ),
    (
        'a0000001-0000-4000-8000-000000000846',
        'a0000001-0000-4000-8000-000000000001',
        'KPI_INVENTORY_TURNOVER',
        'KPI van toc ton kho',
        'category.INVENTORY.score < 3.0',
        'kpi',
        '{"name":"Ty le hang can han xu ly dung han","target":">= 95%","deadlineDays":90,"area":"INVENTORY"}'::jsonb,
        65
    )
ON CONFLICT (template_id, code) DO UPDATE SET
    expression = EXCLUDED.expression,
    action_type = EXCLUDED.action_type,
    action_payload = EXCLUDED.action_payload,
    priority = EXCLUDED.priority;
