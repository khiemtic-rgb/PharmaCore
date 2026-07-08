-- KitPlatform 070: PHARMACY_V1 — Việt hóa nội dung (câu hỏi, đáp án, nhãn)
-- Chạy sau 069; idempotent UPDATE theo UUID cố định.

UPDATE assessment_template
SET name = 'Đánh giá năng lực nhà thuốc',
    description = 'Bộ 30 câu — 6 nhóm, thang trưởng thành 1–4. Kênh public web + lead gate.',
    updated_at = NOW()
WHERE id = 'a0000001-0000-4000-8000-000000000001';

UPDATE assessment_category SET name = 'Khách hàng' WHERE id = 'a0000001-0000-4000-8000-000000000011';
UPDATE assessment_category SET name = 'Vận hành' WHERE id = 'a0000001-0000-4000-8000-000000000012';
UPDATE assessment_category SET name = 'Kho' WHERE id = 'a0000001-0000-4000-8000-000000000013';
UPDATE assessment_category SET name = 'Kinh doanh' WHERE id = 'a0000001-0000-4000-8000-000000000014';
UPDATE assessment_category SET name = 'Dữ liệu & Công nghệ' WHERE id = 'a0000001-0000-4000-8000-000000000015';
UPDATE assessment_category SET name = 'Phát triển' WHERE id = 'a0000001-0000-4000-8000-000000000016';

UPDATE assessment_dimension SET name = 'Khách hàng (tổng)' WHERE id = 'a0000001-0000-4000-8000-000000000021';
UPDATE assessment_dimension SET name = 'Vận hành (tổng)' WHERE id = 'a0000001-0000-4000-8000-000000000022';
UPDATE assessment_dimension SET name = 'Kho (tổng)' WHERE id = 'a0000001-0000-4000-8000-000000000023';
UPDATE assessment_dimension SET name = 'Kinh doanh (tổng)' WHERE id = 'a0000001-0000-4000-8000-000000000024';
UPDATE assessment_dimension SET name = 'Dữ liệu & Công nghệ (tổng)' WHERE id = 'a0000001-0000-4000-8000-000000000025';
UPDATE assessment_dimension SET name = 'Phát triển (tổng)' WHERE id = 'a0000001-0000-4000-8000-000000000026';

-- Questions
UPDATE assessment_question SET title = 'Nhà thuốc hiện có lưu hồ sơ khách hàng không?' WHERE id = 'a0000001-0000-4000-8000-000000000101';
UPDATE assessment_question SET title = 'Khi khách quay lại, nhà thuốc có xem được lịch sử mua hàng không?' WHERE id = 'a0000001-0000-4000-8000-000000000102';
UPDATE assessment_question SET title = 'Nhà thuốc có phân loại khách hàng theo nhóm không?' WHERE id = 'a0000001-0000-4000-8000-000000000103';
UPDATE assessment_question SET title = 'Nhà thuốc có chủ động chăm sóc khách sau khi bán hàng không?' WHERE id = 'a0000001-0000-4000-8000-000000000104';
UPDATE assessment_question SET title = 'Nhà thuốc có biết tỷ lệ khách hàng quay lại mua hàng không?' WHERE id = 'a0000001-0000-4000-8000-000000000105';

UPDATE assessment_question SET title = 'Quy trình bán hàng giữa các nhân viên có thống nhất không?' WHERE id = 'a0000001-0000-4000-8000-000000000201';
UPDATE assessment_question SET title = 'Nhà thuốc có tài liệu hướng dẫn cho nhân viên mới không?' WHERE id = 'a0000001-0000-4000-8000-000000000202';
UPDATE assessment_question SET title = 'Các công việc hàng ngày có checklist hoặc SOP không?' WHERE id = 'a0000001-0000-4000-8000-000000000203';
UPDATE assessment_question SET title = 'Việc phân quyền giữa chủ và nhân viên có rõ ràng không?' WHERE id = 'a0000001-0000-4000-8000-000000000204';
UPDATE assessment_question SET title = 'Nhà thuốc có thường xuyên đánh giá hiệu quả làm việc của nhân viên không?' WHERE id = 'a0000001-0000-4000-8000-000000000205';

UPDATE assessment_question SET title = 'Nhà thuốc có theo dõi hàng cận hạn không?' WHERE id = 'a0000001-0000-4000-8000-000000000301';
UPDATE assessment_question SET title = 'Nhà thuốc có biết tỷ lệ hàng tồn lâu không?' WHERE id = 'a0000001-0000-4000-8000-000000000302';
UPDATE assessment_question SET title = 'Việc nhập hàng dựa trên dữ liệu hay kinh nghiệm?' WHERE id = 'a0000001-0000-4000-8000-000000000303';
UPDATE assessment_question SET title = 'Nhà thuốc có kiểm kê định kỳ không?' WHERE id = 'a0000001-0000-4000-8000-000000000304';
UPDATE assessment_question SET title = 'Nhà thuốc có biết sản phẩm nào bán chậm nhất không?' WHERE id = 'a0000001-0000-4000-8000-000000000305';

UPDATE assessment_question SET title = 'Nhà thuốc có theo dõi doanh thu theo từng nhóm sản phẩm không?' WHERE id = 'a0000001-0000-4000-8000-000000000401';
UPDATE assessment_question SET title = 'Nhà thuốc có biết nhóm khách hàng nào mang lại doanh thu cao nhất không?' WHERE id = 'a0000001-0000-4000-8000-000000000402';
UPDATE assessment_question SET title = 'Nhà thuốc có đo hiệu quả các chương trình khuyến mại không?' WHERE id = 'a0000001-0000-4000-8000-000000000403';
UPDATE assessment_question SET title = 'Nhà thuốc có đặt mục tiêu doanh thu theo tháng không?' WHERE id = 'a0000001-0000-4000-8000-000000000404';
UPDATE assessment_question SET title = 'Khi doanh thu giảm, nhà thuốc có xác định được nguyên nhân không?' WHERE id = 'a0000001-0000-4000-8000-000000000405';

UPDATE assessment_question SET title = 'Dữ liệu hoạt động của nhà thuốc hiện được quản lý như thế nào?' WHERE id = 'a0000001-0000-4000-8000-000000000501';
UPDATE assessment_question SET title = 'Chủ nhà thuốc có thể xem tình hình kinh doanh từ xa không?' WHERE id = 'a0000001-0000-4000-8000-000000000502';
UPDATE assessment_question SET title = 'Nhà thuốc có sử dụng Dashboard để theo dõi hoạt động không?' WHERE id = 'a0000001-0000-4000-8000-000000000503';
UPDATE assessment_question SET title = 'Các dữ liệu bán hàng, kho và khách hàng có được liên kết với nhau không?' WHERE id = 'a0000001-0000-4000-8000-000000000504';
UPDATE assessment_question SET title = 'Nhà thuốc có sử dụng AI hoặc tự động hóa trong quản lý không?' WHERE id = 'a0000001-0000-4000-8000-000000000505';

UPDATE assessment_question SET title = 'Nếu mở thêm một chi nhánh, quy trình hiện tại có thể áp dụng ngay không?' WHERE id = 'a0000001-0000-4000-8000-000000000601';
UPDATE assessment_question SET title = 'Nhà thuốc có kế hoạch phát triển trong 12 tháng tới không?' WHERE id = 'a0000001-0000-4000-8000-000000000602';
UPDATE assessment_question SET title = 'Nhà thuốc có thường xuyên xem lại dữ liệu để cải thiện hoạt động không?' WHERE id = 'a0000001-0000-4000-8000-000000000603';
UPDATE assessment_question SET title = 'Theo anh/chị, trở ngại lớn nhất hiện nay của nhà thuốc là gì?' WHERE id = 'a0000001-0000-4000-8000-000000000604';
UPDATE assessment_question SET title = 'Nếu có thể cải thiện ngay một vấn đề trong nhà thuốc, anh/chị sẽ ưu tiên điều gì nhất?' WHERE id = 'a0000001-0000-4000-8000-000000000605';

-- Options: C1–C5
UPDATE assessment_option o SET label = 'Không lưu' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C1' AND o.code = 'OPT1';
UPDATE assessment_option o SET label = 'Chỉ lưu số điện thoại' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C1' AND o.code = 'OPT2';
UPDATE assessment_option o SET label = 'Lưu thông tin cơ bản' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C1' AND o.code = 'OPT3';
UPDATE assessment_option o SET label = 'Lưu đầy đủ và cập nhật thường xuyên' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C1' AND o.code = 'OPT4';

UPDATE assessment_option o SET label = 'Không' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C2' AND o.code = 'OPT1';
UPDATE assessment_option o SET label = 'Chỉ một phần' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C2' AND o.code = 'OPT2';
UPDATE assessment_option o SET label = 'Có nhưng khó tra cứu' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C2' AND o.code = 'OPT3';
UPDATE assessment_option o SET label = 'Có đầy đủ và nhanh chóng' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C2' AND o.code = 'OPT4';

UPDATE assessment_option o SET label = 'Không' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C3' AND o.code = 'OPT1';
UPDATE assessment_option o SET label = 'Phân loại thủ công' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C3' AND o.code = 'OPT2';
UPDATE assessment_option o SET label = 'Có một số nhóm cơ bản' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C3' AND o.code = 'OPT3';
UPDATE assessment_option o SET label = 'Phân loại tự động và sử dụng thường xuyên' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C3' AND o.code = 'OPT4';

UPDATE assessment_option o SET label = 'Không' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C4' AND o.code = 'OPT1';
UPDATE assessment_option o SET label = 'Thỉnh thoảng' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C4' AND o.code = 'OPT2';
UPDATE assessment_option o SET label = 'Theo một số chương trình' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C4' AND o.code = 'OPT3';
UPDATE assessment_option o SET label = 'Có quy trình rõ ràng' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C4' AND o.code = 'OPT4';

UPDATE assessment_option o SET label = 'Không biết' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C5' AND o.code = 'OPT1';
UPDATE assessment_option o SET label = 'Ước lượng' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C5' AND o.code = 'OPT2';
UPDATE assessment_option o SET label = 'Có thống kê định kỳ' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C5' AND o.code = 'OPT3';
UPDATE assessment_option o SET label = 'Theo dõi thường xuyên' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'C5' AND o.code = 'OPT4';

-- I3
UPDATE assessment_option o SET label = 'Hoàn toàn theo cảm tính' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'I3' AND o.code = 'OPT1';
UPDATE assessment_option o SET label = 'Chủ yếu theo kinh nghiệm' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'I3' AND o.code = 'OPT2';
UPDATE assessment_option o SET label = 'Kết hợp dữ liệu và kinh nghiệm' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'I3' AND o.code = 'OPT3';
UPDATE assessment_option o SET label = 'Chủ yếu dựa trên dữ liệu' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'I3' AND o.code = 'OPT4';

-- T1
UPDATE assessment_option o SET label = 'Ghi chép thủ công' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'T1' AND o.code = 'OPT1';
UPDATE assessment_option o SET label = 'Excel' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'T1' AND o.code = 'OPT2';
UPDATE assessment_option o SET label = 'Phần mềm' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'T1' AND o.code = 'OPT3';
UPDATE assessment_option o SET label = 'Đồng bộ và phân tích tự động' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'T1' AND o.code = 'OPT4';

-- G4, G5
UPDATE assessment_option o SET label = 'Thu hút khách hàng' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'G4' AND o.code = 'PAIN_ATTRACT';
UPDATE assessment_option o SET label = 'Giữ chân khách hàng' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'G4' AND o.code = 'PAIN_RETENTION';
UPDATE assessment_option o SET label = 'Quản lý kho' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'G4' AND o.code = 'PAIN_INVENTORY';
UPDATE assessment_option o SET label = 'Quản lý nhân sự' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'G4' AND o.code = 'PAIN_STAFF';
UPDATE assessment_option o SET label = 'Tăng doanh thu' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'G4' AND o.code = 'PAIN_REVENUE';
UPDATE assessment_option o SET label = 'Khác' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'G4' AND o.code = 'PAIN_OTHER';

UPDATE assessment_option o SET label = 'Tăng doanh thu' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'G5' AND o.code = 'NEED_REVENUE';
UPDATE assessment_option o SET label = 'Giảm tồn kho' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'G5' AND o.code = 'NEED_INVENTORY';
UPDATE assessment_option o SET label = 'Giữ chân khách hàng' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'G5' AND o.code = 'NEED_CRM';
UPDATE assessment_option o SET label = 'Chuẩn hóa vận hành' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'G5' AND o.code = 'NEED_OPS';
UPDATE assessment_option o SET label = 'Tiết kiệm thời gian quản lý' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'G5' AND o.code = 'NEED_TIME';
UPDATE assessment_option o SET label = 'Khác' FROM assessment_question q WHERE o.question_id = q.id AND q.code = 'G5' AND o.code = 'NEED_OTHER';

-- Standard 4-tier options
UPDATE assessment_option SET label = 'Không / Không biết / Không có' WHERE code = 'OPT1' AND label = 'Khong / Khong biet / Khong co';
UPDATE assessment_option SET label = 'Một phần / Thủ công / Ước lượng' WHERE code = 'OPT2' AND label = 'Mot phan / Thu cong / Uoc luong';
UPDATE assessment_option SET label = 'Có nhưng chưa tốt / Theo chương trình' WHERE code = 'OPT3' AND label = 'Co nhung chua tot / Theo chuong trinh';
UPDATE assessment_option SET label = 'Đầy đủ / Tự động / Thường xuyên' WHERE code = 'OPT4' AND label = 'Day du / Tu dong / Thuong xuyen';

-- Rules (insight/recommendation copy)
UPDATE assessment_rule SET
    name = 'Điểm Khách hàng thấp',
    action_payload = '{"title":"Cơ hội cải thiện Khách hàng","body":"Điểm nhóm Khách hàng dưới mức trung bình. Cần tập trung hồ sơ KH, loyalty và chăm sóc sau bán.","severity":"warning","scopeType":"category","scopeCode":"CUSTOMER"}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000701';

UPDATE assessment_rule SET
    name = 'Ưu tiên giữ chân KH',
    action_payload = '{"title":"Triển khai Health Wallet + Loyalty","body":"Novixa hỗ trợ hồ sơ sức khỏe, nhắc thuốc, loyalty và app khách hàng để giữ chân.","productArea":"customer_app","estimateHint":"4-8 tuần pilot"}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000702';

UPDATE assessment_rule SET
    name = 'Vẫn dùng Excel',
    action_payload = '{"title":"Chuyển từ Excel sang hệ thống liên kết","body":"ERP Novixa đồng bộ bán hàng, kho, KH — giảm sai sót và xem từ xa.","productArea":"tech","estimateHint":"2-4 tuần onboarding"}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000703';

UPDATE assessment_rule SET
    name = 'Tổng điểm trung bình',
    action_payload = '{"title":"Nền có nền tảng tốt","body":"Nhà thuốc đã có nền tảng; cần chuẩn hóa vận hành và dữ liệu để tăng trưởng ổn định.","severity":"info","scopeType":"overall"}'::jsonb
WHERE id = 'a0000001-0000-4000-8000-000000000704';
