-- KitPlatform 094: Chuẩn hóa tiếng Việt cho rules KAP (rủi ro, SWOT, lộ trình, KPI)
-- Depends on: 090_kap_pharmacy_intelligence_seed.sql

UPDATE assessment_rule SET
    name = 'Rủi ro kho cao',
    action_payload = '{"area":"INVENTORY","level":"high","title":"Rủi ro tồn kho & hạn sử dụng","body":"Điểm nhóm Kho thấp — nguy cơ tồn đọng, mất hàng và vi phạm quy định GPP về hạn dùng."}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000841';

UPDATE assessment_rule SET
    name = 'Rủi ro dữ liệu',
    action_payload = '{"area":"TECH","level":"high","title":"Rủi ro dữ liệu rời rạc","body":"Hệ thống phân tán — khó tổng hợp báo cáo và ra quyết định nhập hàng."}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000842';

UPDATE assessment_rule SET
    name = 'Điểm mạnh phát triển',
    action_payload = '{"title":"Tầm nhìn phát triển rõ","body":"Có kế hoạch và ý thức cải tiến — thuận lợi cho mở rộng chuỗi hoặc chuẩn hóa vận hành."}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000843';

UPDATE assessment_rule SET
    name = 'Điểm yếu công nghệ',
    action_payload = '{"title":"Công nghệ chưa đồng bộ","body":"Dữ liệu bán hàng, kho và khách hàng chưa liên kết — hạn chế phân tích và tự động hóa."}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000844';

UPDATE assessment_rule SET
    name = 'Lộ trình 30 ngày — kho',
    action_payload = '{"horizonDays":30,"title":"Chuẩn hóa xuất kho theo hạn dùng & cảnh báo hạn sử dụng","body":"Bắt buộc ghi nhận lô và hạn dùng khi nhập; thiết lập cảnh báo 90/60/30 ngày."}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000845';

UPDATE assessment_rule SET
    name = 'Chỉ số tỷ lệ hàng cận hạn',
    action_payload = '{"name":"Tỷ lệ hàng cận hạn xử lý đúng hạn","target":">= 95%","deadlineDays":90,"area":"INVENTORY"}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000846';

UPDATE assessment_question SET title = 'Nhà thuốc có sử dụng bảng điều khiển để theo dõi hoạt động không?'
WHERE id = 'a0000001-0000-4000-8000-000000000503';

UPDATE assessment_root_cause_kb SET
    cause_title = 'Nhập hàng theo cảm tính',
    cause_body = 'Quyết định nhập hàng chưa dựa trên dữ liệu bán hàng/tốc độ tiêu thụ — dễ tồn đọng và thiếu hàng đột biến.',
    evidence_hint = 'Câu I3: Dữ liệu hay kinh nghiệm khi nhập hàng'
WHERE cause_code = 'RC_INV_REPLENISH';

UPDATE assessment_root_cause_kb SET
    cause_title = 'Thiếu hồ sơ khách hàng tập trung',
    cause_body = 'Không có hồ sơ khách hàng đầy đủ nên khó chăm sóc sau bán, giữ chân và đo tỷ lệ quay lại.',
    evidence_hint = 'Nhóm Khách hàng điểm thấp'
WHERE cause_code = 'RC_CRM_PROFILE';

UPDATE assessment_root_cause_kb SET
    cause_title = 'Dữ liệu rời rạc / Excel',
    cause_body = 'Bán hàng, kho và khách hàng chưa liên kết — chủ nhà thuốc khó xem tình hình từ xa và ra quyết định nhanh.',
    evidence_hint = 'Nhóm Dữ liệu & Công nghệ điểm thấp'
WHERE cause_code = 'RC_TECH_SILO';

UPDATE assessment_root_cause_kb SET
    cause_title = 'Thiếu quy trình chuẩn và phân quyền rõ',
    cause_body = 'Quy trình bán hàng và giao ca chưa thống nhất — phụ thuộc nhân sự chủ chốt.',
    evidence_hint = 'Nhóm Vận hành điểm thấp'
WHERE cause_code = 'RC_OPS_SOP';
