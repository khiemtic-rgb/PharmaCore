-- KitPlatform 102: PHARMACY_V1 v1.1 — C6 (bác sĩ/khám online) + G5 NEED_TELEMED
-- Depends on: 069, 070, 090

UPDATE assessment_template
SET version = '1.1',
    description = 'Bộ 31 câu — 6 nhóm, thang trưởng thành 1–4. Bổ sung liên kết bác sĩ/khám online.',
    updated_at = NOW()
WHERE id = 'a0000001-0000-4000-8000-000000000001';

INSERT INTO assessment_question (id, dimension_id, code, title, question_type, scorable, required, sort_order, weight, metadata)
VALUES (
    'a0000001-0000-4000-8000-000000000106',
    'a0000001-0000-4000-8000-000000000021',
    'C6',
    'Nha thuoc co lien ket voi bac si hoac kenh kham online cho khach khong?',
    'single_choice',
    TRUE,
    TRUE,
    6,
    1,
    '{}'
)
ON CONFLICT (dimension_id, code) DO UPDATE SET
    title = EXCLUDED.title,
    sort_order = EXCLUDED.sort_order,
    scorable = EXCLUDED.scorable,
    required = EXCLUDED.required;

INSERT INTO assessment_option (question_id, code, label, score, sort_order)
SELECT q.id, v.code, v.label, v.score, v.ord
FROM assessment_question q
CROSS JOIN (VALUES
    ('C6', 'OPT1', 'Khong / chua tung lien ket', 1, 1),
    ('C6', 'OPT2', 'Biet vai bac si, giao dich thu cong', 2, 2),
    ('C6', 'OPT3', 'Co danh sach BS co dinh, chua quy trinh online', 3, 3),
    ('C6', 'OPT4', 'Co mang luoi BS + quy trinh don/kham online', 4, 4)
) AS v(qcode, code, label, score, ord)
WHERE q.code = v.qcode
ON CONFLICT (question_id, code) DO UPDATE SET
    label = EXCLUDED.label,
    score = EXCLUDED.score,
    sort_order = EXCLUDED.sort_order;

UPDATE assessment_option o
SET sort_order = 7
FROM assessment_question q
WHERE o.question_id = q.id AND q.code = 'G5' AND o.code = 'NEED_OTHER';

INSERT INTO assessment_option (question_id, code, label, score, sort_order, metadata)
SELECT q.id, 'NEED_TELEMED', 'Ket noi bac si kham online', NULL, 6, '{"tag":"need_telemed"}'::jsonb
FROM assessment_question q
WHERE q.code = 'G5'
ON CONFLICT (question_id, code) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

-- Việt hóa C6 + G5 (idempotent)
UPDATE assessment_question
SET title = 'Nhà thuốc có liên kết với bác sĩ hoặc kênh khám online cho khách không?'
WHERE id = 'a0000001-0000-4000-8000-000000000106';

UPDATE assessment_option o SET label = 'Không / chưa từng liên kết'
FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C6' AND o.code = 'OPT1';
UPDATE assessment_option o SET label = 'Biết vài bác sĩ, giao dịch thủ công'
FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C6' AND o.code = 'OPT2';
UPDATE assessment_option o SET label = 'Có danh sách BS cố định, chưa quy trình online'
FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C6' AND o.code = 'OPT3';
UPDATE assessment_option o SET label = 'Có mạng lưới BS + quy trình đơn/khám online'
FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C6' AND o.code = 'OPT4';
UPDATE assessment_option o SET label = 'Kết nối bác sĩ khám online'
FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'G5' AND o.code = 'NEED_TELEMED';

INSERT INTO assessment_rule (id, template_id, code, name, expression, action_type, action_payload, priority)
VALUES
    (
        'a0000001-0000-4000-8000-000000000705',
        'a0000001-0000-4000-8000-000000000001',
        'INSIGHT_C6_TELEMED',
        'Chua lien ket bac si',
        'response.C6.score <= 2',
        'insight',
        '{"title":"Co hoi ket noi bac si kham online","body":"Nha thuoc chua co mang luoi bac si hoac quy trinh don online ro rang — de bo lo doanh thu tu tu van va don dien tu.","severity":"info","scopeType":"category","scopeCode":"CUSTOMER"}'::jsonb,
        75
    ),
    (
        'a0000001-0000-4000-8000-000000000706',
        'a0000001-0000-4000-8000-000000000001',
        'REC_NEED_TELEMED',
        'Uu tien ket noi bac si',
        'response.G5.option_code = ''NEED_TELEMED''',
        'recommendation',
        '{"title":"Mang bac si & kham online","body":"Novixa ho tro lien ket bac si ke don, nhan don dien tu tu kenh online — khach tu van xong don ve quay, tang doanh thu dich vu.","productArea":"prescriber_network","estimateHint":"6-10 tuan pilot"}'::jsonb,
        88
    ),
    (
        'a0000001-0000-4000-8000-000000000707',
        'a0000001-0000-4000-8000-000000000001',
        'REC_C6_PRESCRIBER',
        'C6 thap — mang bac si',
        'response.C6.score <= 2',
        'recommendation',
        '{"title":"Xay dung mang bac si lien ket","body":"Bat dau voi 3-5 bac si quen thuoc, quy trinh nhan don dien tu va ban thuoc theo don — nen tang cho kham online sau nay.","productArea":"prescriber_network","estimateHint":"4-8 tuan"}'::jsonb,
        78
    ),
    (
        'a0000001-0000-4000-8000-000000000708',
        'a0000001-0000-4000-8000-000000000001',
        'OPP_TELEMED_C6',
        'Co hoi telemed (C6)',
        'response.C6.score <= 2',
        'opportunity',
        '{"area":"CUSTOMER","title":"Ket noi bac si kham online","body":"Khach can tu van truoc khi mua — lien ket bac si giup tang doanh thu dich vu va don ke don chuan.","impactHint":"impact_high"}'::jsonb,
        72
    ),
    (
        'a0000001-0000-4000-8000-000000000709',
        'a0000001-0000-4000-8000-000000000001',
        'OPP_TELEMED_G5',
        'Co hoi telemed (G5)',
        'response.G5.option_code = ''NEED_TELEMED''',
        'opportunity',
        '{"area":"GROWTH","title":"Uu tien mang bac si Novixa","body":"Ban chon ket noi bac si kham online — phu hop trien khai portal bac si va don dien tu tich hop POS.","impactHint":"impact_high"}'::jsonb,
        85
    )
ON CONFLICT (template_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    expression = EXCLUDED.expression,
    action_type = EXCLUDED.action_type,
    action_payload = EXCLUDED.action_payload,
    priority = EXCLUDED.priority;

UPDATE assessment_rule SET
    name = 'Chưa liên kết bác sĩ',
    action_payload = '{"title":"Cơ hội kết nối bác sĩ khám online","body":"Nhà thuốc chưa có mạng lưới bác sĩ hoặc quy trình đơn online rõ ràng — dễ bỏ lỡ doanh thu từ tư vấn và đơn điện tử.","severity":"info","scopeType":"category","scopeCode":"CUSTOMER"}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000705';

UPDATE assessment_rule SET
    name = 'Ưu tiên kết nối bác sĩ',
    action_payload = '{"title":"Mạng bác sĩ & khám online","body":"Novixa hỗ trợ liên kết bác sĩ kê đơn, nhận đơn điện tử từ kênh online — khách tư vấn xong đơn về quầy, tăng doanh thu dịch vụ.","productArea":"prescriber_network","estimateHint":"6–10 tuần pilot"}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000706';

UPDATE assessment_rule SET
    name = 'C6 thấp — mạng bác sĩ',
    action_payload = '{"title":"Xây dựng mạng bác sĩ liên kết","body":"Bắt đầu với 3–5 bác sĩ quen thuộc, quy trình nhận đơn điện tử và bán thuốc theo đơn — nền tảng cho khám online sau này.","productArea":"prescriber_network","estimateHint":"4–8 tuần"}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000707';

UPDATE assessment_rule SET
    action_payload = '{"area":"CUSTOMER","title":"Kết nối bác sĩ khám online","body":"Khách cần tư vấn trước khi mua — liên kết bác sĩ giúp tăng doanh thu dịch vụ và đơn kê đơn chuẩn.","impactHint":"impact_high"}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000708';

UPDATE assessment_rule SET
    action_payload = '{"area":"GROWTH","title":"Ưu tiên mạng bác sĩ Novixa","body":"Bạn chọn kết nối bác sĩ khám online — phù hợp triển khai portal bác sĩ và đơn điện tử tích hợp POS.","impactHint":"impact_high"}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000709';

INSERT INTO assessment_root_cause_kb (
    id, template_id, question_code, category_code, trigger_expression,
    cause_code, cause_title, cause_body, evidence_hint, sort_order
)
VALUES (
    'a0000001-0000-4000-8000-000000000824',
    'a0000001-0000-4000-8000-000000000001',
    'C6', 'CUSTOMER', 'response.C6.score <= 2',
    'RC_C6_TELEMED',
    'Chua ket noi bac si / kham online',
    'Nha thuoc chua co mang luoi bac si hoac quy trinh don online — khach can tu van thuoc thuong tim noi khac hoac mua thieu huong dan.',
    'Cau C6: Lien ket bac si / kham online',
    45
)
ON CONFLICT (id) DO UPDATE SET
    trigger_expression = EXCLUDED.trigger_expression,
    cause_title = EXCLUDED.cause_title,
    cause_body = EXCLUDED.cause_body,
    evidence_hint = EXCLUDED.evidence_hint;

UPDATE assessment_root_cause_kb SET
    cause_title = 'Chưa kết nối bác sĩ / khám online',
    cause_body = 'Nhà thuốc chưa có mạng lưới bác sĩ hoặc quy trình đơn online — khách cần tư vấn thuốc thường tìm nơi khác hoặc mua thiếu hướng dẫn.',
    evidence_hint = 'Câu C6: Liên kết bác sĩ / khám online'
WHERE id = 'a0000001-0000-4000-8000-000000000824';
