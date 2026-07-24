import type { LearningRecognition } from '@/shared/api/learning.api';
import { resolveBadgeVisual } from '@/modules/learning/learning-module-meta';

export type FeedChannel = 'achievement' | 'learning' | 'internal';

const LEVEL_STORY: Record<string, string> = {
  l0: 'Onboarding / ca đầu tiên',
  l1: 'Bán hàng tại quầy cơ bản',
  l2: 'Chăm sóc khách hàng & giữ khách',
  l3: 'Xuất hàng gần hết hạn trước',
  l4: 'Làm chủ ca',
  l5: 'Tư vấn chuyên nghiệp',
  l6: 'Ca trưởng & quản lý quầy',
};

/** Đổi mã kỹ thuật → câu người đọc được. */
export function humanizeRecognitionTitle(r: LearningRecognition): string {
  const code = (r.badgeCode ?? '').toLowerCase();
  const title = r.title?.trim() || '';

  const perfect = code.match(/^perfect_l(\d)$/);
  if (perfect) {
    const story = LEVEL_STORY[`l${perfect[1]}`] ?? `Bậc ${perfect[1]}`;
    return `Hoàn thành xuất sắc bậc ${perfect[1]} — ${story}`;
  }
  const complete = code.match(/^complete_l(\d)$/);
  if (complete) {
    const story = LEVEL_STORY[`l${complete[1]}`] ?? `Bậc ${complete[1]}`;
    return `Hoàn thành bậc ${complete[1]} — ${story}`;
  }
  if (code === 'customer_praise' || r.kind === 'customer_praise' || r.kind === 'customer_feedback') {
    const rating = parseCustomerPraiseRating(r);
    if (rating != null) return `Khách đánh giá ${rating}★`;
    return title.includes('★') ? title : title || 'Được khách hàng khen';
  }
  if (code === 'mentor') return title || 'Kèm đồng nghiệp';
  if (code === 'tenure_12m') return title || 'Gắn bó 12 tháng';
  if (code === 'close_streak_7') return title || '7 ngày đóng ca liên tục';
  if (code === 'zero_error_shift') return title || 'Ca không sai sót';

  // Bỏ mã kỹ thuật còn sót trong title
  if (/^(complete|perfect)_l\d$/i.test(title) || /^badge$/i.test(title)) {
    return humanizeRecognitionTitle({ ...r, title: r.body || 'Thành tích mới' });
  }
  return title || 'Ghi nhận mới';
}

export function recognitionIcon(r: LearningRecognition): string {
  const code = (r.badgeCode ?? '').toLowerCase();
  if (code) return resolveBadgeVisual(code, r.title).icon;
  if (r.kind === 'customer_praise' || r.kind === 'customer_feedback') return '❤️';
  if (r.kind === 'birthday') return '🎂';
  if (r.kind === 'work_anniversary') return '📅';
  if (r.kind === 'module_complete') return '📚';
  if (r.kind === 'badge_award') return '🏆';
  return '👏';
}

export function classifyFeedChannel(r: LearningRecognition): FeedChannel {
  const kind = (r.kind ?? '').toLowerCase();
  const code = (r.badgeCode ?? '').toLowerCase();
  if (
    kind === 'birthday' ||
    kind === 'custom' ||
    /họp|thông báo|sinh nhật/i.test(r.title)
  ) {
    return 'internal';
  }
  if (
    kind === 'module_complete' ||
    /^complete_l\d$/.test(code) ||
    /^perfect_l\d$/.test(code) ||
    /học|hoàn thành l\d|pos|crm|fefo|module/i.test(r.title)
  ) {
    return 'learning';
  }
  return 'achievement';
}

export function recognitionSource(r: LearningRecognition): 'customer' | 'peer' | 'manager' {
  if (
    r.kind === 'customer_praise' ||
    r.kind === 'customer_feedback' ||
    r.badgeCode === 'customer_praise'
  ) {
    return 'customer';
  }
  if (r.badgeCode === 'mentor' || /đồng nghiệp|mentor/i.test(r.title)) return 'peer';
  return 'manager';
}

export function daysAgo(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

export function inCurrentMonth(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

export function inPreviousMonth(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  const prev = new Date(n.getFullYear(), n.getMonth() - 1, 1);
  return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
}

/** Sao khách để lại — ưu tiên field API, fallback title «Khách đánh giá N★». */
export function parseCustomerPraiseRating(r: LearningRecognition): number | null {
  if (!isCustomerFeedbackKind(r)) return null;
  const fromApi = r.customerRating;
  if (typeof fromApi === 'number' && fromApi >= 1 && fromApi <= 5) return fromApi;
  const m = (r.title ?? '').match(/(?:đánh giá|rating)\s*([1-5])\s*[★⭐*]?/i)
    ?? (r.title ?? '').match(/([1-5])\s*[★⭐]/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 5 ? n : null;
}

export function isCustomerFeedbackKind(r: Pick<LearningRecognition, 'kind' | 'badgeCode'>): boolean {
  const kind = (r.kind ?? '').toLowerCase();
  const code = (r.badgeCode ?? '').toLowerCase();
  return (
    kind === 'customer_praise' ||
    kind === 'customer_feedback' ||
    code === 'customer_praise'
  );
}

/** Chỉ phản hồi thật từ app khách (có sao), không gồm «Khen tay» của quản lý. */
export function isCustomerAppPraise(r: LearningRecognition): boolean {
  return parseCustomerPraiseRating(r) != null;
}

export function customerPraiseComment(r: LearningRecognition): string | null {
  if (!isCustomerFeedbackKind(r)) return null;
  const body = (r.body ?? '').trim();
  return body || null;
}

export function isRecentRecognition(r: LearningRecognition, withinHours: number): boolean {
  const t = new Date(r.createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= withinHours * 3600 * 1000;
}
