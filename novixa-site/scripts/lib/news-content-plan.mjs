/**
 * Lịch đăng tin tự động Novixa — mỗi ngày 1 bài (giống Kit Technology content-plan).
 */

export const EDITORIAL_HUB = {
  name: 'Novixa Tin tức',
  startDate: '2026-07-11',
  endDate: '2026-09-30',
  publishPerDay: 1,
};

/** Bài đã có trong src/content/tin-tuc — không tạo lại */
export const PUBLISHED_SLUGS = new Set([
  'gioi-thieu-novixa',
  'pos-ban-hang',
  'quan-ly-lo-fefo',
  'lo-trinh-phat-trien-2026',
  'vi-sao-excel-khong-con-phu-hop-de-quan-ly-nha-thuoc',
  '7-sai-lam-khien-nha-thuoc-that-thoat-loi-nhuan-moi-thang',
  'quan-ly-nha-thuoc-thong-minh-tu-quay-ban-den-ton-kho-lo',
  'quan-ly-ton-kho-thuoc-hieu-qua-cho-nha-thuoc-hien-dai',
  'giam-that-thoat-tu-hang-can-date-va-het-han-su-dung',
  'fefo-la-gi-nguyen-tac-ban-het-han-truoc-cho-nha-thuoc',
  'quan-ly-nhieu-chi-nhanh-nha-thuoc-thach-thuc-va-giai-phap',
  'cach-giam-ton-kho-chet-trong-nha-thuoc',
  'chuyen-doi-so-cho-nha-thuoc-bat-dau-tu-dau',
  'cac-kpi-quan-trong-khi-quan-ly-nha-thuoc',
  'tuan-thu-gpp-trong-quan-ly-nha-thuoc',
  'canh-bao-hang-can-date-quy-trinh-5-buoc',
  'pos-nha-thuoc-5-tinh-nang-khong-the-thieu',
  'crm-cho-nha-thuoc-bat-dau-tu-dau-lieu-khach-hang',
  'bao-cao-doanh-thu-real-time-doc-so-lieu-dung',
  'mo-rong-chuoi-nha-thuoc-checklist-he-thong',
  'ai-ho-tro-van-hanh-nha-thuoc',
  'kiem-ke-ton-kho-dinh-ky-quy-trinh-chuan',
  'lo-trinh-novixa-q3-2026',
]);

const SCHEDULED_POOL = [
  {
    id: 'nv-loyalty',
    slug: 'loyalty-nha-thuoc-tich-diem-thuong',
    title: 'Loyalty (tích điểm thưởng) cho nhà thuốc — bắt đầu đơn giản',
    topic: 'chương trình tích điểm, khách quay lại, không spam',
    targetWords: 1100,
  },
  {
    id: 'nv-o2o',
    slug: 'o2o-dat-online-nhan-tai-quay',
    title: 'O2O (đặt online — nhận tại quầy) cho nhà thuốc nhỏ',
    topic: 'đặt trước qua Zalo/điện thoại, gom đơn tại POS',
    targetWords: 1100,
  },
  {
    id: 'nv-shift',
    slug: 'chot-ca-ban-hang-cuoi-ngay',
    title: 'Chốt ca bán hàng cuối ngày — checklist 10 phút',
    topic: 'đối soát tiền mặt, ca làm, báo cáo ngày',
    targetWords: 1000,
  },
  {
    id: 'nv-supplier',
    slug: 'quan-ly-nha-cung-cap-duoc',
    title: 'Quản lý nhà cung cấp dược — từ đặt hàng đến đối soát',
    topic: 'công nợ NCC, lịch sử nhập, giá vốn',
    targetWords: 1200,
  },
  {
    id: 'nv-einvoice',
    slug: 'hoa-don-dien-tu-nha-thuoc',
    title: 'Hóa đơn điện tử tại nhà thuốc — những điều cần chuẩn bị',
    topic: 'xuất hóa đơn, POS, lưu trữ',
    targetWords: 1100,
  },
  {
    id: 'nv-print',
    slug: 'in-nhan-tu-quay-pos',
    title: 'In nhãn và tem từ quầy POS — giảm sai sót thủ công',
    topic: 'máy in nhiệt, tem giá, tem lô',
    targetWords: 1000,
  },
  {
    id: 'nv-security',
    slug: 'bao-mat-du-lieu-khach-hang-nha-thuoc',
    title: 'Bảo mật dữ liệu khách hàng nhà thuốc — thực hành tối thiểu',
    topic: 'phân quyền, sao lưu, đồng ý marketing',
    targetWords: 1100,
  },
  {
    id: 'nv-reorder',
    slug: 'goi-y-nhap-hang-tu-ton-kho',
    title: 'Gợi ý nhập hàng từ tồn kho — tránh thiếu hàng và tồn chết',
    topic: 'điểm đặt hàng lại, mùa vụ, ABC',
    targetWords: 1200,
  },
  {
    id: 'nv-promo',
    slug: 'khuyen-mai-theo-mua-nha-thuoc',
    title: 'Khuyến mại theo mùa cho nhà thuốc — không làm lỗ biên',
    topic: 'combo, cận date, margin',
    targetWords: 1100,
  },
  {
    id: 'nv-zalo',
    slug: 'zalo-oa-cho-nha-thuoc',
    title: 'Zalo OA cho nhà thuốc — kênh chăm sóc khách hàng thực tế',
    topic: 'nhắc tái khám, nhắc lịch uống thuốc (opt-in)',
    targetWords: 1100,
  },
  {
    id: 'nv-rx',
    slug: 'don-thuoc-dien-tu-va-luu-tru',
    title: 'Đơn thuốc điện tử và lưu trữ — gợi ý quy trình số hóa',
    topic: 'ảnh đơn, ghi chú dược sĩ, tuân thủ',
    targetWords: 1200,
  },
  {
    id: 'nv-staff',
    slug: 'phan-quyen-nhan-vien-nha-thuoc',
    title: 'Phân quyền nhân viên nhà thuốc — ai được xem gì, sửa gì',
    topic: 'thu ngân, kho, quản lý chi nhánh',
    targetWords: 1000,
  },
  {
    id: 'nv-dashboard',
    slug: 'dashboard-chu-nha-thuoc-5-chi-so',
    title: 'Dashboard chủ nhà thuốc — 5 chỉ số nên xem mỗi sáng',
    topic: 'doanh thu, tồn chậm, cận date, ca, top SKU',
    targetWords: 1100,
  },
  {
    id: 'nv-migrate',
    slug: 'chuyen-tu-excel-sang-phan-mem-nha-thuoc',
    title: 'Chuyển từ Excel sang phần mềm nhà thuốc — lộ trình 4 tuần',
    topic: 'nhập danh mục, tồn đầu kỳ, đào tạo',
    targetWords: 1200,
  },
  {
    id: 'nv-cold',
    slug: 'bao-quan-thuoc-can-mat',
    title: 'Bảo quản thuốc cần mát — theo dõi nhiệt độ và hạn dùng',
    topic: 'vaccine, insulin, tủ lạnh',
    targetWords: 1100,
  },
  {
    id: 'nv-return',
    slug: 'doi-tra-hang-nha-thuoc',
    title: 'Đổi trả hàng tại nhà thuốc — quy trình ghi nhận đúng',
    topic: 'trả hàng NCC, trả khách, điều chỉnh tồn',
    targetWords: 1000,
  },
  {
    id: 'nv-tax',
    slug: 'ke-khai-thue-ban-le-nha-thuoc',
    title: 'Kê khai thuế bán lẻ nhà thuốc — dữ liệu cần có sẵn',
    topic: 'doanh thu, chi phí, hóa đơn',
    targetWords: 1100,
  },
  {
    id: 'nv-otc',
    slug: 'phan-biet-thuoc-ke-don-va-otc',
    title: 'Phân biệt thuốc kê đơn và OTC trong hệ thống bán hàng',
    topic: 'nhóm hàng, cảnh báo, tư vấn',
    targetWords: 1000,
  },
  {
    id: 'nv-audit',
    slug: 'chuan-bi-kiem-tra-gpp',
    title: 'Chuẩn bị kiểm tra GPP — checklist số hóa',
    topic: 'sổ lô, nhiệt độ, đào tạo',
    targetWords: 1200,
  },
  {
    id: 'nv-forecast',
    slug: 'du-bao-nhu-cau-mua-thuoc',
    title: 'Dự báo nhu cầu mua thuốc — từ kinh nghiệm đến dữ liệu',
    topic: 'mùa dịch, học sinh, khu vực',
    targetWords: 1100,
  },
  {
    id: 'nv-multi-price',
    slug: 'nhieu-bang-gia-chi-nhanh',
    title: 'Nhiều bảng giá giữa các chi nhánh — cách kiểm soát',
    topic: 'giá niêm yết, khuyến mại local',
    targetWords: 1000,
  },
  {
    id: 'nv-training',
    slug: 'dao-tao-nhan-vien-moi-nha-thuoc',
    title: 'Đào tạo nhân viên mới nhà thuốc — tài liệu và quy trình POS',
    topic: 'onboarding, SOP, shadow ca',
    targetWords: 1100,
  },
  {
    id: 'nv-night',
    slug: 'ban-hang-ca-dem-va-cuoi-tuan',
    title: 'Bán hàng ca đêm và cuối tuần — vận hành không sai tồn',
    topic: 'ca kíp, bàn giao, kiểm kê nhanh',
    targetWords: 1000,
  },
  {
    id: 'nv-erp',
    slug: 'erp-nha-thuoc-khi-nao-can',
    title: 'ERP nhà thuốc — khi nào cần và khi nào POS đủ dùng',
    topic: 'quy mô, chuỗi, tích hợp kế toán',
    targetWords: 1200,
  },
  {
    id: 'nv-cloud',
    slug: 'du-lieu-nha-thuoc-tren-cloud',
    title: 'Dữ liệu nhà thuốc trên cloud — lợi ích và rủi ro cần hiểu',
    topic: 'sao lưu, uptime, phân quyền',
    targetWords: 1100,
  },
];

function spreadPublishDates(items, startIso, endIso) {
  const start = new Date(`${startIso}T12:00:00Z`);
  const end = new Date(`${endIso}T12:00:00Z`);
  const span = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));

  return items.map((item, index) => {
    const dayOffset = Math.floor((index * span) / items.length);
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    return {
      ...item,
      publishDate: date.toISOString().slice(0, 10),
    };
  });
}

export const EDITORIAL_PLAN = spreadPublishDates(
  SCHEDULED_POOL,
  EDITORIAL_HUB.startDate,
  EDITORIAL_HUB.endDate,
);

export function getPlanById(id) {
  return EDITORIAL_PLAN.find((item) => item.id === id);
}

export function getPlanForDate(isoDate) {
  return EDITORIAL_PLAN.filter(
    (item) => item.publishDate === isoDate && !PUBLISHED_SLUGS.has(item.slug),
  );
}

export function getUpcomingPlan(fromDate = new Date()) {
  const iso = fromDate.toISOString().slice(0, 10);
  return EDITORIAL_PLAN.filter(
    (item) => !PUBLISHED_SLUGS.has(item.slug) && item.publishDate >= iso,
  ).sort((a, b) => a.publishDate.localeCompare(b.publishDate));
}
