/**
 * Tiêu chí quan sát tại quầy (soft).
 * L0–L6 có rubric riêng · khác: chung. Đạt ≥80%.
 */

export type ObserveCriterion = { key: string; label: string };

const GENERIC: ObserveCriterion[] = [
  { key: 'applied', label: 'Hiểu và làm đúng nội dung bài trên ca' },
  { key: 'attitude', label: 'Thái độ / giao tiếp phù hợp với khách & đồng nghiệp' },
  { key: 'process', label: 'Tuân thủ quy trình trên Novixa (không bỏ bước)' },
  { key: 'ask_help', label: 'Biết hỏi quản lý / dược sĩ khi chưa chắc' },
  { key: 'on_shift', label: 'Đã áp dụng thực tế trong ca (không chỉ học lý thuyết)' },
  { key: 'boundaries', label: 'Không vượt quyền / không bỏ qua cảnh báo hệ thống' },
];

const L0: ObserveCriterion[] = [
  { key: 'login', label: 'Đăng nhập đúng tài khoản cá nhân' },
  { key: 'dashboard', label: 'Biết dùng màn hình chính / Hub' },
  { key: 'checklist_open', label: 'Biết mở Checklist' },
  { key: 'notify', label: 'Biết đọc thông báo' },
  { key: 'checklist_done', label: 'Thực hiện Checklist đầu ca' },
  { key: 'logout', label: 'Đăng xuất đúng quy trình' },
];

const L1: ObserveCriterion[] = [
  { key: 'greet', label: 'Chào hỏi đúng' },
  { key: 'listen', label: 'Lắng nghe' },
  { key: 'needs', label: 'Xác định nhu cầu' },
  { key: 'counsel', label: 'Tư vấn rõ ràng (trong quyền)' },
  { key: 'pos', label: 'Bán hàng tại quầy thành thạo' },
  { key: 'fefo', label: 'Xuất hàng gần hết hạn trước (theo gợi ý hệ thống)' },
  { key: 'pay', label: 'Thanh toán chính xác' },
  { key: 'usage', label: 'Hướng dẫn sử dụng' },
  { key: 'thanks', label: 'Cảm ơn khách' },
];

/** L2 — chăm sóc / giữ khách. */
const L2: ObserveCriterion[] = [
  { key: 'greet', label: 'Chào hỏi thân thiện' },
  { key: 'lookup', label: 'Tra cứu đúng khách' },
  { key: 'crm', label: 'Cập nhật hồ sơ khách' },
  { key: 'points', label: 'Tích điểm (khi khách đồng ý)' },
  { key: 'program', label: 'Giới thiệu đúng chương trình / chính sách' },
  { key: 'no_push', label: 'Không ép bán / không ép tích điểm' },
  { key: 'explain', label: 'Hướng dẫn khách rõ ràng' },
  { key: 'remind', label: 'Đặt lịch nhắc khi cần' },
];

/** L3 — an toàn thuốc / hàng hóa. */
const L3: ObserveCriterion[] = [
  { key: 'lot', label: 'Kiểm tra lô' },
  { key: 'expiry', label: 'Kiểm tra hạn dùng' },
  { key: 'fefo', label: 'Xuất hàng gần hết hạn trước (theo gợi ý hệ thống)' },
  { key: 'receive', label: 'Nhập hàng đúng (khi được giao)' },
  { key: 'damage', label: 'Báo / cách ly thuốc lỗi' },
  { key: 'count', label: 'Kiểm kê đúng quy trình (khi được giao)' },
  { key: 'process', label: 'Tuân thủ quy trình an toàn thuốc' },
];

/** L4 — vận hành ca. */
const L4: ObserveCriterion[] = [
  { key: 'ontime', label: 'Đúng giờ nhận ca' },
  { key: 'login', label: 'Đăng nhập đúng' },
  { key: 'open_checklist', label: 'Hoàn thành Checklist đầu ca' },
  { key: 'dashboard', label: 'Theo dõi màn hình chính / Hub' },
  { key: 'tasks', label: 'Hoàn thành nhiệm vụ được giao' },
  { key: 'mid_checklist', label: 'Thực hiện Checklist giữa ca (khi có)' },
  { key: 'handover', label: 'Bàn giao đầy đủ (khi có ca sau)' },
  { key: 'close_checklist', label: 'Hoàn thành Checklist cuối ca' },
  { key: 'logout', label: 'Đăng xuất đúng quy trình' },
];

/** L5 — tư vấn chuyên nghiệp. */
const L5: ObserveCriterion[] = [
  { key: 'greet', label: 'Chào hỏi đúng' },
  { key: 'listen', label: 'Lắng nghe khách hàng' },
  { key: 'ask', label: 'Đặt câu hỏi phù hợp' },
  { key: 'advise', label: 'Tư vấn đúng nhu cầu (trong quyền)' },
  { key: 'usage', label: 'Hướng dẫn sử dụng thuốc rõ ràng' },
  { key: 'no_push', label: 'Không ép bán' },
  { key: 'crm', label: 'Cập nhật hồ sơ khách' },
  { key: 'aftercare', label: 'Chăm sóc sau bán' },
];

/** L6 — ca trưởng / lãnh đạo vận hành. */
const L6: ObserveCriterion[] = [
  { key: 'assign', label: 'Phân công công việc hợp lý' },
  { key: 'coordinate', label: 'Điều phối nhân viên trong ca' },
  { key: 'coach', label: 'Hỗ trợ / hướng dẫn nhân viên' },
  { key: 'incidents', label: 'Xử lý tình huống / khiếu nại kịp thời' },
  { key: 'dashboard', label: 'Theo dõi màn hình chính / Hub' },
  { key: 'checklist', label: 'Kiểm soát Checklist ca' },
  { key: 'quality', label: 'Kiểm soát chất lượng dịch vụ' },
  { key: 'report', label: 'Báo cáo / bàn giao cuối ca' },
];

export const OBSERVE_PASS_PCT = 80;

/** @deprecated dùng getObserveCriteria */
export const COUNTER_OBSERVE_CRITERIA = GENERIC;

export function getObserveCriteria(levelCode?: string | null): ObserveCriterion[] {
  const level = (levelCode ?? '').toUpperCase();
  if (level === 'L0') return L0;
  if (level === 'L1') return L1;
  if (level === 'L2') return L2;
  if (level === 'L3') return L3;
  if (level === 'L4') return L4;
  if (level === 'L5') return L5;
  if (level === 'L6') return L6;
  return GENERIC;
}

export function emptyObserveCriteria(levelCode?: string | null): Record<string, boolean> {
  return Object.fromEntries(getObserveCriteria(levelCode).map((c) => [c.key, false]));
}

export function observePassStats(
  criteria: Record<string, boolean>,
  levelCode?: string | null,
): { total: number; passed: number; pct: number; ok: boolean } {
  const defs = getObserveCriteria(levelCode);
  const total = defs.length;
  const passed = defs.filter((d) => criteria[d.key]).length;
  const pct = total === 0 ? 0 : Math.round((100 * passed) / total);
  return { total, passed, pct, ok: pct >= OBSERVE_PASS_PCT };
}
