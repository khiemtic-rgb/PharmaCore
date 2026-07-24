/** Mã năng lực / chứng nhận kỹ thuật → tên tiếng Việt dễ hiểu. */

const COMPETENCY_LABELS: Record<string, string> = {
  // L0–L2
  app_basics: 'Làm quen hệ thống',
  tone_of_service: 'Thái độ phục vụ / giọng điệu quầy',
  pos_basic: 'Bán hàng tại quầy cơ bản',
  payment: 'Thanh toán đơn bán',
  return_policy: 'Chính sách trả hàng',
  customer_lookup: 'Tìm / tạo khách hàng',
  loyalty: 'Điểm thưởng / khách thân thiết',
  advise_boundary: 'Ranh giới tư vấn (mời dược sĩ)',
  store_policy: 'Onboarding & cách làm việc tại nhà thuốc',
  store_rules: 'Cách làm việc tại nhà thuốc',
  crm_care: 'Chăm sóc khách / gắn điểm thưởng',

  // L3–L5 / ca
  grn_receive: 'Nhận hàng nhập kho',
  expiry_fefo: 'Xuất trước hàng gần hết hạn',
  fefo_stock: 'Xuất trước hàng gần hết hạn',
  count_basic: 'Kiểm đếm tồn cơ bản',
  shift_close: 'Đóng ca đúng quy trình',
  cash_variance: 'Đối quỹ / lệch tiền ca',
  gpp_daily: 'Thực hành tốt hàng ngày tại quầy',
  incident: 'Báo cáo sự cố',
  escalate: 'Báo cáo / chuyển lên quản lý',
  multi_skill_pass: 'Làm được nhiều việc trên ca',
  lead_shift: 'Điều phối ca',
  own_shift: 'Làm chủ ca (mở–đóng)',
  shift_lead: 'Ca trưởng / điều phối quầy',
  team_coach: 'Hướng dẫn & hỗ trợ đồng nghiệp trên ca',
};

const ENROLLMENT_STATUS_VI: Record<string, string> = {
  completed: 'Đã hoàn thành',
  complete: 'Đã hoàn thành',
  in_progress: 'Đang học',
  inprogress: 'Đang học',
  active: 'Đang học',
  enrolled: 'Đã đăng ký',
  assigned: 'Đã gán',
  pending: 'Chờ bắt đầu',
  cancelled: 'Đã hủy',
  canceled: 'Đã hủy',
  failed: 'Chưa đạt',
  passed: 'Đã đạt',
};

/** Chuẩn hóa mã (bỏ tiền tố module kiểu l1_). */
export function normalizeCompetencyCode(code: string): string {
  return code
    .trim()
    .toLowerCase()
    .replace(/^l\d[_-]/, '')
    .replace(/^complete_/, '')
    .replace(/^perfect_/, '');
}

export function competencyLabelVi(code: string): string {
  const raw = code.trim();
  if (!raw) return '';
  const key = normalizeCompetencyCode(raw);
  return COMPETENCY_LABELS[key] ?? COMPETENCY_LABELS[raw.toLowerCase()] ?? humanizeSnakeVi(raw);
}

/** Fallback: biến snake_case thành cụm tiếng Việt ngắn (không Title Case tiếng Anh). */
function humanizeSnakeVi(code: string): string {
  const words = code
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const map: Record<string, string> = {
    app: 'ứng dụng',
    basics: 'cơ bản',
    basic: 'cơ bản',
    customer: 'khách hàng',
    lookup: 'tra cứu',
    loyalty: 'điểm thưởng',
    advise: 'tư vấn',
    boundary: 'ranh giới',
    payment: 'thanh toán',
    return: 'trả hàng',
    policy: 'chính sách',
    store: 'nhà thuốc',
    expiry: 'hết hạn',
    fefo: 'xuất trước gần hết hạn',
    count: 'kiểm đếm',
    shift: 'ca',
    close: 'đóng',
    cash: 'tiền',
    variance: 'lệch',
    gpp: 'thực hành tốt',
    daily: 'hàng ngày',
    incident: 'sự cố',
    escalate: 'báo cáo lên',
    multi: 'nhiều',
    skill: 'kỹ năng',
    pass: 'đạt',
    pos: 'bán hàng tại quầy',
    tone: 'thái độ',
    of: '',
    service: 'phục vụ',
    grn: 'nhập hàng',
    receive: 'nhận',
  };
  const vi = words.map((w) => map[w] ?? w).filter(Boolean).join(' ');
  return vi.charAt(0).toUpperCase() + vi.slice(1);
}

export function competencyListVi(codes: string[]): string {
  if (!codes.length) return '';
  return codes.map(competencyLabelVi).join(' · ');
}

export function enrollmentStatusVi(status: string | null | undefined): string {
  if (!status?.trim()) return '—';
  const key = status.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ENROLLMENT_STATUS_VI[key] ?? status;
}

/** Việt hóa câu lý do thiếu từ API (có thể chứa mã kỹ thuật). */
export function humanizeMissingReason(reason: string): string {
  let text = reason.trim();
  text = text.replace(/Thiếu credential:\s*/gi, 'Thiếu năng lực: ');
  text = text.replace(/Thiếu competency:\s*/gi, 'Thiếu năng lực: ');
  text = text.replace(/\bmode\s*=\s*\w+/gi, '').replace(/\(\s*\)/g, '').trim();
  text = text.replace(/\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/gi, (m) => competencyLabelVi(m));
  text = text.replace(/\bpos\b/gi, 'bán hàng tại quầy');
  text = text.replace(/\bNL\b/g, 'năng lực');
  text = text.replace(/\bcompleted\b/gi, 'đã hoàn thành');
  return text.replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').trim();
}
