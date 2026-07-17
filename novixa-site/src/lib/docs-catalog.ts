export type DocCategoryId =
  | 'khoi-nghiep-dieu-hanh'
  | 'quan-tri-nhan-su'
  | 'van-hanh-nha-thuoc'
  | 'quan-ly-kho'
  | 'khach-hang-crm'
  | 'kinh-doanh-doanh-thu'
  | 'danh-gia-nha-thuoc';

export type DocAccess = 'free' | 'member' | 'customer';

export type DocAccent = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal' | 'indigo' | 'pink' | 'amber';

export type DocCategory = {
  id: DocCategoryId;
  title: string;
  description: string;
};

export type DocItem = {
  slug: string;
  title: string;
  /** Nhãn ngắn trên sidebar */
  navLabel: string;
  description: string;
  categoryId: DocCategoryId;
  file: string;
  pages: number;
  access: DocAccess;
  accent: DocAccent;
  isNew?: boolean;
  /** Thứ tự hiển thị trên lưới (01, 02, …) */
  order: number;
};

/** Thứ tự mục legacy — vẫn dùng cho trang cảm ơn */
export const DOC_CATEGORIES: DocCategory[] = [
  {
    id: 'khoi-nghiep-dieu-hanh',
    title: 'Khởi nghiệp & Điều hành',
    description: 'Mở nhà thuốc, mô hình vận hành và việc chủ nhà thuốc cần nắm từ ngày đầu.',
  },
  {
    id: 'quan-tri-nhan-su',
    title: 'Quản trị nhân sự',
    description: 'Ca làm việc, phân quyền, họp ngắn và giữ đội ngũ ổn định tại quầy.',
  },
  {
    id: 'van-hanh-nha-thuoc',
    title: 'Vận hành Nhà thuốc',
    description: 'Checklist hàng ngày, quy trình ca bán và phối hợp giữa các vai trò.',
  },
  {
    id: 'quan-ly-kho',
    title: 'Quản lý Kho',
    description: 'Kiểm kê, FEFO, cận date và giảm tồn chết.',
  },
  {
    id: 'khach-hang-crm',
    title: 'Khách hàng & CRM',
    description: 'Hồ sơ khách, chăm sóc sau bán và giữ chân khách quay lại.',
  },
  {
    id: 'kinh-doanh-doanh-thu',
    title: 'Kinh doanh & Doanh thu',
    description: 'KPI sáng, biên lợi nhuận và đọc số liệu để ra quyết định.',
  },
  {
    id: 'danh-gia-nha-thuoc',
    title: 'Đánh giá Nhà thuốc',
    description: 'Khung tự đánh giá vận hành — điểm mạnh, điểm yếu và bước cải thiện.',
  },
];

/** Tài liệu — PDF trong public/docs/ */
export const DOCS_CATALOG: DocItem[] = [
  {
    slug: 'cam-nang-chu-nha-thuoc',
    title: 'Cẩm nang Chủ Nhà Thuốc',
    navLabel: 'Cẩm nang chủ nhà thuốc',
    description:
      'Vai trò điều hành của chủ nhà thuốc: nhịp quản lý hằng tuần, số liệu cần nắm và cách thoát khỏi việc đứng quầy cả ngày.',
    categoryId: 'khoi-nghiep-dieu-hanh',
    file: '/docs/cam-nang-chu-nha-thuoc.pdf',
    pages: 3,
    access: 'free',
    accent: 'blue',
    isNew: true,
    order: 1,
  },
  {
    slug: 'cam-nang-quan-ly-nhan-su',
    title: 'Cẩm nang Quản Lý Nhân Sự Nhà Thuốc',
    navLabel: 'Quản lý nhân sự',
    description:
      'Tuyển dụng, phân ca, phân quyền, đào tạo và giữ đội ngũ dược sĩ ổn định tại quầy.',
    categoryId: 'quan-tri-nhan-su',
    file: '/docs/cam-nang-quan-ly-nhan-su.pdf',
    pages: 3,
    access: 'free',
    accent: 'green',
    isNew: true,
    order: 2,
  },
  {
    slug: 'cam-nang-van-hanh-nha-thuoc',
    title: 'Cẩm nang Vận Hành Nhà Thuốc',
    navLabel: 'Vận hành nhà thuốc',
    description:
      'Quy trình vận hành trọn vòng: mở ca, bán hàng, bàn giao và chốt ngày — phối hợp giữa các vai trò.',
    categoryId: 'van-hanh-nha-thuoc',
    file: '/docs/cam-nang-van-hanh-nha-thuoc.pdf',
    pages: 2,
    access: 'member',
    accent: 'purple',
    isNew: true,
    order: 3,
  },
  {
    slug: 'cam-nang-quan-ly-kho-hang-hoa',
    title: 'Cẩm nang Quản Lý Kho & Hàng Hóa',
    navLabel: 'Quản lý kho & hàng hóa',
    description:
      'Nhập hàng, kiểm kê theo lô/HSD, FEFO, xử lý hàng cận date và giảm tồn chết trên kệ.',
    categoryId: 'quan-ly-kho',
    file: '/docs/cam-nang-quan-ly-kho-hang-hoa.pdf',
    pages: 2,
    access: 'member',
    accent: 'orange',
    isNew: true,
    order: 4,
  },
  {
    slug: 'cam-nang-cham-soc-giu-chan-khach-hang',
    title: 'Cẩm nang Chăm Sóc & Giữ Chân Khách Hàng',
    navLabel: 'Chăm sóc khách hàng',
    description:
      'Xây hồ sơ khách, chăm sóc sau bán, nhắc tái mua và chương trình giữ chân khách quay lại.',
    categoryId: 'khach-hang-crm',
    file: '/docs/cam-nang-cham-soc-giu-chan-khach-hang.pdf',
    pages: 2,
    access: 'member',
    accent: 'red',
    isNew: true,
    order: 5,
  },
  {
    slug: 'cam-nang-phat-trien-doanh-thu',
    title: 'Cẩm nang Phát Triển Doanh Thu Nhà Thuốc',
    navLabel: 'Phát triển doanh thu',
    description:
      'KPI cần theo dõi, biên lợi nhuận, cơ cấu danh mục và cách đọc số liệu để tăng doanh thu bền vững.',
    categoryId: 'kinh-doanh-doanh-thu',
    file: '/docs/cam-nang-phat-trien-doanh-thu.pdf',
    pages: 2,
    access: 'member',
    accent: 'teal',
    isNew: true,
    order: 6,
  },
  {
    slug: 'cam-nang-danh-gia-phat-trien',
    title: 'Cẩm nang Đánh Giá & Phát Triển Nhà Thuốc',
    navLabel: 'Đánh giá & cải tiến',
    description:
      'Khung tự đánh giá vận hành, kho, nhân sự và khách hàng — xác định ưu tiên cải thiện trong 30 ngày.',
    categoryId: 'danh-gia-nha-thuoc',
    file: '/docs/cam-nang-danh-gia-phat-trien.pdf',
    pages: 3,
    access: 'customer',
    accent: 'indigo',
    isNew: true,
    order: 7,
  },
  {
    slug: 'so-tay-nhan-vien-nha-thuoc',
    title: 'Sổ Tay Nhân Viên Nhà Thuốc',
    navLabel: 'Sổ tay nhân viên',
    description:
      'Tài liệu phát cho nhân viên mới: chuẩn tác phong, quy trình bán hàng và những việc cần làm trong ca.',
    categoryId: 'quan-tri-nhan-su',
    file: '/docs/so-tay-nhan-vien-nha-thuoc.pdf',
    pages: 2,
    access: 'customer',
    accent: 'pink',
    isNew: true,
    order: 8,
  },
  {
    slug: 'bo-checklist-van-hanh-nha-thuoc',
    title: 'Bộ Checklist Vận Hành Nhà Thuốc',
    navLabel: 'Bộ checklist vận hành',
    description:
      'Tập hợp checklist in được: đầu ca, cuối ngày, kiểm kê định kỳ — dùng ngay tại quầy.',
    categoryId: 'van-hanh-nha-thuoc',
    file: '/docs/bo-checklist-van-hanh-nha-thuoc.pdf',
    pages: 2,
    access: 'customer',
    accent: 'amber',
    isNew: true,
    order: 9,
  },
];

/** Tab lọc theo tầng: free ≤2, member ≤6, customer ≤9 */
export const ACCESS_FILTER_MAX_ORDER: Record<DocAccess, number> = {
  free: 2,
  member: 6,
  customer: 9,
};

export const ACCESS_LABELS: Record<DocAccess, string> = {
  free: 'Miễn phí',
  member: 'Thành viên',
  customer: 'Dành riêng',
};

export function getDocBySlug(slug: string | null | undefined): DocItem | undefined {
  if (!slug) return undefined;
  return DOCS_CATALOG.find((d) => d.slug === slug);
}

export function getDocsByCategory(categoryId: DocCategoryId): DocItem[] {
  return DOCS_CATALOG.filter((d) => d.categoryId === categoryId);
}

export function getDocCategory(categoryId: DocCategoryId): DocCategory | undefined {
  return DOC_CATEGORIES.find((c) => c.id === categoryId);
}

export function getDocsSorted(): DocItem[] {
  return [...DOCS_CATALOG].sort((a, b) => a.order - b.order);
}
