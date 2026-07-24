/** Meta UX cho bài học — nội dung gợi ý theo code/level (không gọi AI). */

export type LessonKind = 'sop' | 'lesson' | 'checklist' | 'quiz' | 'practice';

export type LessonMeta = {
  kind: LessonKind;
  kindLabel: string;
  minutes: number;
  difficulty: 1 | 2 | 3;
  outcomes: string[];
  applyMission?: string;
  coachHint?: string;
};

const DEFAULT: LessonMeta = {
  kind: 'lesson',
  kindLabel: 'Bài đọc',
  minutes: 8,
  difficulty: 1,
  outcomes: ['Hiểu đúng việc cần làm trên ca', 'Tránh sai sót thường gặp'],
};

const BY_CODE: Record<string, Partial<LessonMeta>> = {
  l0_noi_quy: {
    kind: 'sop',
    kindLabel: 'Onboarding',
    minutes: 20,
    difficulty: 1,
    outcomes: [
      'Hiểu văn hóa, nội quy cơ bản & vai trò Novixa',
      'Đăng nhập đúng · Dashboard/Hub · checklist đầu ca',
      'Bảo mật tài khoản — sẵn sàng sang L1',
    ],
    applyMission:
      'Ca đầu: đăng nhập tài khoản mình → xem Hub → làm checklist đầu ca → hết ca đăng xuất.',
    coachHint: 'Hay sai: dùng chung tài khoản · bỏ checklist · quên đăng xuất.',
  },
  l0_welcome: {
    kind: 'lesson',
    kindLabel: 'Thực hành',
    minutes: 5,
    difficulty: 1,
    outcomes: ['Mở Hub / thông báo', 'Làm checklist đầu ca', 'Đăng xuất đúng'],
    applyMission: 'Hôm nay: hoàn thành checklist đầu ca và đăng xuất hết ca.',
    coachHint: 'Chưa thấy checklist — hỏi quản lý quyền success.checklist.',
  },
  l1_pos_basic: {
    kind: 'lesson',
    kindLabel: 'Bài đọc + câu hỏi kiểm tra',
    minutes: 15,
    difficulty: 1,
    outcomes: [
      'Tiếp đón & xác định nhu cầu đúng cách',
      'Bán POS đúng FEFO + thanh toán chính xác',
      'Hướng dẫn dùng & kết thúc lịch sự',
    ],
    applyMission:
      'Hôm nay: phục vụ ≥3 khách — chào đúng, bán FEFO, hướng dẫn dùng ngắn, cảm ơn. QL có thể quan sát.',
    coachHint: 'Hay sai: bỏ qua chào khi đông · quên FEFO · không hướng dẫn dùng sau bán.',
  },
  l2_customer_care: {
    kind: 'lesson',
    kindLabel: 'Bài đọc + câu hỏi kiểm tra',
    minutes: 15,
    difficulty: 1,
    outcomes: [
      'Dùng CRM / lịch sử mua đúng cách',
      'Tích điểm & nhắc thuốc khi phù hợp (không ép)',
      'Gợi ý đúng mực — giữ khách quay lại',
    ],
    applyMission:
      'Hôm nay: gắn ≥3 khách vào đơn (khi đồng ý), xem lịch sử ≥1 lần, đặt nhắc nếu có khách liệu trình.',
    coachHint: 'Hay quên lưu SĐT / xem lịch sử / đặt nhắc cho khách mua định kỳ.',
  },
  l2_crm_care: {
    kind: 'lesson',
    kindLabel: 'Bài đọc + câu hỏi kiểm tra',
    minutes: 15,
    difficulty: 1,
    outcomes: [
      'Dùng CRM / lịch sử mua đúng cách',
      'Tích điểm & nhắc thuốc khi phù hợp (không ép)',
      'Gợi ý đúng mực — giữ khách quay lại',
    ],
    applyMission:
      'Hôm nay: gắn ≥3 khách vào đơn (khi đồng ý), xem lịch sử ≥1 lần, đặt nhắc nếu có khách liệu trình.',
    coachHint: 'Hay quên lưu SĐT / xem lịch sử / đặt nhắc cho khách mua định kỳ.',
  },
  l3_stock_grn: {
    kind: 'lesson',
    kindLabel: 'Bài đọc + câu hỏi kiểm tra',
    minutes: 20,
    difficulty: 2,
    outcomes: [
      'Nhập / kiểm lô·HSD đúng — báo lệch',
      'Bán theo FEFO · xử lý cận hạn & hàng lỗi',
      'Hiểu quản lý hàng = an toàn thuốc',
    ],
    applyMission:
      'Hôm nay: kiểm FEFO ≥5 mặt khi lấy hàng; xem cảnh báo cận hạn; báo ngay nếu thấy hàng lỗi.',
    coachHint: 'Hay sai: bỏ gợi ý FEFO · nhập lệch không báo · vẫn bán hàng móp/hỏng.',
  },
  l3_fefo_stock: {
    kind: 'lesson',
    kindLabel: 'Bài đọc + câu hỏi kiểm tra',
    minutes: 20,
    difficulty: 2,
    outcomes: [
      'Nhập / kiểm lô·HSD đúng — báo lệch',
      'Bán theo FEFO · xử lý cận hạn & hàng lỗi',
      'Hiểu quản lý hàng = an toàn thuốc',
    ],
    applyMission:
      'Hôm nay: kiểm FEFO ≥5 mặt khi lấy hàng; xem cảnh báo cận hạn; báo ngay nếu thấy hàng lỗi.',
    coachHint: 'Hay sai: bỏ gợi ý FEFO · nhập lệch không báo · vẫn bán hàng móp/hỏng.',
  },
  l4_own_shift: {
    kind: 'checklist',
    kindLabel: 'Checklist / Vận hành ca',
    minutes: 20,
    difficulty: 2,
    outcomes: [
      'Nhận ca + checklist đầu đủ bước',
      'Giữ nhịp giữa ca + bàn giao rõ',
      'Checklist cuối + đóng ca + đăng xuất',
    ],
    applyMission:
      'Hôm nay: làm đủ một vòng ca — checklist đầu, giữa (nếu có), cuối + bàn giao + đăng xuất.',
    coachHint: 'Hay thiếu: bỏ Hub · quên bàn giao · quên đăng xuất · lệch quỹ không báo.',
  },
  l5_solo_ready: {
    kind: 'practice',
    kindLabel: 'Tư vấn chuyên nghiệp',
    minutes: 25,
    difficulty: 3,
    outcomes: [
      'Tư vấn đúng nhu cầu (không ép bán)',
      'Hướng dẫn dùng + CRM / nhắc thuốc',
      'Khách tin → quay lại → DT bền vững',
    ],
    applyMission:
      'Hôm nay: ≥3 lần tư vấn đủ bước (nghe → đề xuất → hướng dẫn dùng) + CRM; mời DS khi vượt quyền.',
    coachHint: 'Hay sai: bán theo quảng cáo · ép bổ trợ · không hướng dẫn dùng · tư vấn vượt quyền.',
  },
  l5_lead_shift: {
    kind: 'practice',
    kindLabel: 'Tư vấn chuyên nghiệp',
    minutes: 25,
    difficulty: 3,
    outcomes: [
      'Tư vấn đúng nhu cầu (không ép bán)',
      'Hướng dẫn dùng + CRM / nhắc thuốc',
      'Khách tin → quay lại → DT bền vững',
    ],
    applyMission:
      'Hôm nay: ≥3 lần tư vấn đủ bước (nghe → đề xuất → hướng dẫn dùng) + CRM; mời DS khi vượt quyền.',
    coachHint: 'Hay sai: bán theo quảng cáo · ép bổ trợ · không hướng dẫn dùng · tư vấn vượt quyền.',
  },
  l6_shift_lead: {
    kind: 'practice',
    kindLabel: 'Ca trưởng / Leadership',
    minutes: 30,
    difficulty: 3,
    outcomes: [
      'Phân công & điều phối ca hiệu quả',
      'Hỗ trợ nhân viên · xử lý sự cố · kiểm soát chất lượng',
      'Báo cáo / bàn giao cuối ca rõ ràng',
    ],
    applyMission:
      'Hôm nay: điều phối hoặc hỗ trợ điều phối 1 ca — phân công rõ, theo dõi Hub, bàn giao cuối ca.',
    coachHint: 'Hay thiếu: không phân công · chỉ tự bán · bỏ qua khiếu nại · không bàn giao.',
  },
};

const BY_LEVEL: Record<string, Partial<LessonMeta>> = {
  L0: { kind: 'sop', kindLabel: 'Onboarding', minutes: 20, difficulty: 1 },
  L1: { minutes: 15, difficulty: 1 },
  L2: { minutes: 15, difficulty: 1 },
  L3: { minutes: 20, difficulty: 2 },
  L4: { kind: 'checklist', kindLabel: 'Vận hành ca', minutes: 20, difficulty: 2 },
  L5: { kind: 'practice', kindLabel: 'Tư vấn chuyên nghiệp', minutes: 25, difficulty: 3 },
  L6: { kind: 'practice', kindLabel: 'Ca trưởng', minutes: 30, difficulty: 3 },
};

export function resolveLessonMeta(input: {
  moduleCode?: string | null;
  levelCode?: string | null;
  title?: string | null;
  requireAck?: boolean;
  questionCount?: number;
  durationMinutes?: number | null;
}): LessonMeta {
  const code = (input.moduleCode ?? '').toLowerCase();
  const level = (input.levelCode ?? '').toUpperCase();
  const fromCode = BY_CODE[code] ?? {};
  const fromLevel = BY_LEVEL[level] ?? {};
  const merged: LessonMeta = {
    ...DEFAULT,
    ...fromLevel,
    ...fromCode,
  };
  if (input.durationMinutes && input.durationMinutes > 0) {
    merged.minutes = input.durationMinutes;
  }
  if ((input.questionCount ?? 0) > 0 && merged.kind === 'lesson') {
    merged.kindLabel = 'Bài đọc + câu hỏi kiểm tra';
  }
  if (input.requireAck && merged.kind === 'lesson' && (input.questionCount ?? 0) === 0) {
    merged.kind = 'sop';
    merged.kindLabel = 'Quy trình / Đọc xác nhận';
  }
  return merged;
}

export type BadgeVisual = {
  icon: string;
  color: string;
  tip: string;
};

export function resolveBadgeVisual(badgeCode: string, title: string): BadgeVisual {
  const code = badgeCode.toLowerCase();
  if (code.includes('onboard') || code.includes('l0') || title.toLowerCase().includes('onboard')) {
    return { icon: '🏆', color: '#1677ff', tip: 'Hoàn thành onboarding / ca đầu tiên' };
  }
  if (code.includes('crm') || code.includes('care') || title.toLowerCase().includes('crm')) {
    return { icon: '⭐', color: '#722ed1', tip: 'Chăm sóc khách & giữ khách' };
  }
  if (code.includes('fefo') || code.includes('stock') || title.toLowerCase().includes('fefo')) {
    return { icon: '💊', color: '#13c2c2', tip: 'Xuất đúng lô / hạn dùng' };
  }
  if (code.includes('close') || code.includes('streak') || title.toLowerCase().includes('ca')) {
    return { icon: '✅', color: '#52c41a', tip: 'Kỷ luật mở / đóng ca' };
  }
  if (code.includes('tenure') || code.includes('12m')) {
    return { icon: '📅', color: '#fa8c16', tip: 'Gắn bó / thâm niên' };
  }
  if (code.includes('customer') || title.toLowerCase().includes('khách')) {
    return { icon: '❤️', color: '#eb2f96', tip: 'Được khách hàng ghi nhận' };
  }
  if (code.includes('mentor') || title.toLowerCase().includes('mentor')) {
    return { icon: '🎓', color: '#2f54eb', tip: 'Hỗ trợ đồng nghiệp học' };
  }
  return { icon: '🏅', color: '#faad14', tip: title || 'Huy hiệu đạt được' };
}

export function difficultyLabel(d: 1 | 2 | 3) {
  if (d === 1) return 'Cơ bản';
  if (d === 2) return 'Vừa';
  return 'Nâng cao';
}
