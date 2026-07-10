-- P11b-S2: customer notification template translations (push + in-app)

INSERT INTO tenant_string_translations (tenant_id, translation_key, locale_code, translated_value)
SELECT
    t.id,
    v.key,
    v.locale,
    v.value
FROM tenants t
CROSS JOIN (
    VALUES
        ('customer.notify.medication_reminder.title', 'en-US', 'Medication reminder'),
        ('customer.notify.medication_reminder.family_title', 'en-US', '{name} — time for medication'),
        ('customer.notify.medication_reminder.body', 'en-US', '{productName}'),
        ('customer.notify.medication_reminder.body_with_note', 'en-US', '{productName} — {dosageNote}'),
        ('customer.notify.care_reminder.advance.title', 'en-US', 'Upcoming: {title}'),
        ('customer.notify.care_reminder.advance.family_title', 'en-US', 'Upcoming for {name}: {title}'),
        ('customer.notify.care_reminder.due.title', 'en-US', '{title}'),
        ('customer.notify.care_reminder.due.family_title', 'en-US', '{name} — {title}'),
        ('customer.notify.care_reminder.advance.body', 'en-US', 'Scheduled for {when}.{note}'),
        ('customer.notify.care_reminder.due.body', 'en-US', 'Due at {when}.{note}'),
        ('customer.notify.care_reminder.scheduled.title', 'en-US', 'Reminder scheduled'),
        ('customer.notify.care_reminder.scheduled.body', 'en-US', '{title} — {when}'),
        ('customer.notify.repurchase.title', 'en-US', 'Running low on medication'),
        ('customer.notify.repurchase.body', 'en-US', '{orderLabel} — refill expected around {dateLabel}.'),
        ('customer.notify.date.today', 'en-US', 'today'),
        ('customer.notify.adherence_missed.title', 'en-US', 'Missed doses recently'),
        ('customer.notify.adherence_missed.body', 'en-US', 'No doses logged for {days} days. Open Reminders to update.'),
        ('customer.notify.chat.staff_reply.title', 'en-US', 'Pharmacist replied'),
        ('customer.notify.chat.staff_reply.named_title', 'en-US', '{name} replied'),
        ('customer.notify.draft_order.title', 'en-US', 'New draft order'),
        ('customer.notify.draft_order.body', 'en-US', '{draftNumber} — subtotal {total}. Review and confirm in the app.')
) AS v(key, locale, value)
WHERE t.tenant_code = 'DEMO_PHARMACY'
  AND t.deleted_at IS NULL
ON CONFLICT (tenant_id, translation_key, locale_code)
DO UPDATE SET translated_value = EXCLUDED.translated_value, updated_at = NOW();

-- vi-VN overrides (optional — code defaults match; allows tenant customization)
INSERT INTO tenant_string_translations (tenant_id, translation_key, locale_code, translated_value)
SELECT
    t.id,
    v.key,
    'vi-VN',
    v.value
FROM tenants t
CROSS JOIN (
    VALUES
        ('customer.notify.medication_reminder.title', 'Nhắc uống thuốc'),
        ('customer.notify.medication_reminder.family_title', '{name} đến giờ uống thuốc'),
        ('customer.notify.medication_reminder.body', '{productName}'),
        ('customer.notify.medication_reminder.body_with_note', '{productName} — {dosageNote}'),
        ('customer.notify.care_reminder.advance.title', 'Nhắc trước: {title}'),
        ('customer.notify.care_reminder.advance.family_title', 'Nhắc trước cho {name}: {title}'),
        ('customer.notify.care_reminder.due.title', '{title}'),
        ('customer.notify.care_reminder.due.family_title', '{name} — {title}'),
        ('customer.notify.care_reminder.advance.body', 'Lịch vào {when}.{note}'),
        ('customer.notify.care_reminder.due.body', 'Đến giờ {when}.{note}'),
        ('customer.notify.care_reminder.scheduled.title', 'Đã lên lịch nhắc'),
        ('customer.notify.care_reminder.scheduled.body', '{title} — {when}'),
        ('customer.notify.repurchase.title', 'Đơn thuốc sắp hết'),
        ('customer.notify.repurchase.body', '{orderLabel} — dự kiến cần mua lại khoảng {dateLabel}.'),
        ('customer.notify.date.today', 'hôm nay'),
        ('customer.notify.adherence_missed.title', 'Bạn bỏ liều vài ngày gần đây'),
        ('customer.notify.adherence_missed.body', 'Đã {days} ngày không ghi nhận uống thuốc. Mở Nhắc thuốc để cập nhật.'),
        ('customer.notify.chat.staff_reply.title', 'Dược sĩ trả lời'),
        ('customer.notify.chat.staff_reply.named_title', '{name} trả lời'),
        ('customer.notify.draft_order.title', 'Đơn thuốc tạm mới'),
        ('customer.notify.draft_order.body', '{draftNumber} — tổng tạm tính {total}đ. Xem và xác nhận (tuỳ chọn) trên app.')
) AS v(key, value)
WHERE t.tenant_code = 'DEMO_PHARMACY'
  AND t.deleted_at IS NULL
ON CONFLICT (tenant_id, translation_key, locale_code)
DO UPDATE SET translated_value = EXCLUDED.translated_value, updated_at = NOW();
