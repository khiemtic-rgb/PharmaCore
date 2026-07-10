-- KitPlatform 093: Chuẩn hóa tiếng Việt cho KAP maturity, root cause KB
-- Depends on: 090_kap_pharmacy_intelligence_seed.sql

UPDATE assessment_maturity_level SET
    name = 'Khởi tạo',
    description = 'Vận hành chủ yếu thủ công, thiếu dữ liệu tập trung và quy trình chưa ổn định.'
WHERE template_id = 'a0000001-0000-4000-8000-000000000001'
  AND vertical_code = 'pharmacy' AND code = 'INIT';

UPDATE assessment_maturity_level SET
    name = 'Cơ bản',
    description = 'Đã có một số quy trình nhưng còn phụ thuộc kinh nghiệm cá nhân.'
WHERE template_id = 'a0000001-0000-4000-8000-000000000001'
  AND vertical_code = 'pharmacy' AND code = 'BASIC';

UPDATE assessment_maturity_level SET
    name = 'Chuẩn hóa',
    description = 'Quy trình và dữ liệu bắt đầu đồng bộ; có thể mở rộng với giám sát cơ bản.'
WHERE template_id = 'a0000001-0000-4000-8000-000000000001'
  AND vertical_code = 'pharmacy' AND code = 'STANDARD';

UPDATE assessment_maturity_level SET
    name = 'Hiệu quả',
    description = 'Vận hành đo lường được; quyết định dựa trên báo cáo định kỳ.'
WHERE template_id = 'a0000001-0000-4000-8000-000000000001'
  AND vertical_code = 'pharmacy' AND code = 'EFFICIENT';

UPDATE assessment_maturity_level SET
    name = 'Thông minh',
    description = 'Dữ liệu liên thông, cảnh báo chủ động và cải tiến liên tục.'
WHERE template_id = 'a0000001-0000-4000-8000-000000000001'
  AND vertical_code = 'pharmacy' AND code = 'SMART';

UPDATE assessment_root_cause_kb SET
    cause_title = 'Chưa theo dõi hàng cận hạn',
    cause_body = 'Nguyên nhân chủ yếu: chưa áp dụng FEFO tự động, thiếu cảnh báo hạn dùng và quy trình ưu tiên xuất kho.',
    evidence_hint = 'Câu I1: Theo dõi hàng cận hạn'
WHERE cause_code = 'RC_INV_FEFO';

UPDATE assessment_root_cause_kb SET
    cause_title = 'Kiểm kê thủ công, thiếu định kỳ',
    cause_body = 'Kiểm kê không đều đặn hoặc ghi nhận thủ công gây lệch tồn thực tế và khó phát hiện mất mát.',
    evidence_hint = 'Câu I4: Kiểm kê định kỳ'
WHERE cause_code = 'RC_INV_COUNT';
