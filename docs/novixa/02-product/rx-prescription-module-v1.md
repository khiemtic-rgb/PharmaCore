# Novixa — Module đơn thuốc bác sĩ (e-Rx) V1

**Mã:** NVX-PRD-11 · **Tier:** T1/T2 · **Trạng thái:** Approved (pilot) · **Version:** 1.3  
**Ngày:** 2026-07-10 · **Owner:** Product · **Pilot tenant:** `NT_XUANHOA`

> **Disclaimer:** Novixa hỗ trợ ghi nhận và truy vết cấp phát theo đơn. Khách hàng chịu trách nhiệm tuân thủ quy định dược và hành nghề y tế hiện hành.

---

## 1. Tóm tắt

Module **Đơn thuốc bác sĩ (e-Rx)** cho phép nhà thuốc:

- Quản lý **danh sách bác sĩ liên kết**
- Nhận đơn qua **nhân viên nhập + xác nhận** hoặc **bác sĩ kê online** (portal)
- **Bán thuốc kê đơn trên POS** chỉ khi có đơn hợp lệ (pilot **strict**)
- In **một phiếu** phân dòng Rx / OTC; báo cáo theo bác sĩ và nhân viên bán

**Pain pilot:** Quầy nhỏ vùng sâu — chặn Rx không đơn → nhân viên bán chui không in phiếu → chủ mất kiểm soát tiền.

---

## 2. Quyết định đã chốt (2026-07-10)

| # | Chủ đề | Quyết định |
|---|--------|------------|
| D1 | Chế độ POS | **Strict ngay** — xem giải thích §3.1. Cấu hình tenant `RxEnforcementMode`: `strict` \| `warn` (pilot Xuân Hòa: **strict**) |
| D2 | In phiếu | **1 phiếu**, phân dòng Rx / OTC trên cùng phiếu. Sau này có thể thêm báo cáo tổng hợp thuốc BS kê theo yêu cầu |
| D3 | Ai được **xác nhận đơn** (verify) | **Cấu hình được** qua phân quyền (System → Role) — permission `rx.prescription.verify`. Preset theo mô hình: quầy lẻ vs chuỗi. **NV thu ngân mặc định không verify.** Xem §4 |
| D4 | **Hạn đơn** (deadline cấp phát) | **7 ngày** kể từ `signed_at` / `verified_at`. Hết hạn → không bán trên POS; cần đơn mới. Xem §5 |
| D5 | Portal bác sĩ (Rx-2) | **Có trong Sprint 1** (cùng pilot NT_XUANHOA), không chờ sau 1 tháng |
| D6 | Đơn hỗn hợp Rx + OTC | **1 đơn BS**, nhiều dòng; **1 lần bán POS**; không tách 2 đơn bác sỹ |
| D7 | Bác sĩ không dùng app | NV nhập + verify; **ảnh đơn không bắt buộc lúc gửi duyệt**, **bắt buộc lúc verify** (trừ luồng BS portal). Xem §4.5 |
| D8 | Cấp phát nhiều lần | **Cho phép** partial dispense trong hạn đơn — `qty_prescribed` / `qty_dispensed` / `qty_remaining` |
| D9 | POS-first | Strict **+** wizard POS: tìm/tạo đơn ngay tại quầy, không chỉ báo lỗi |
| D10 | Chi nhánh | Pilot **same branch**; tenant cấu hình `RxDispenseBranchPolicy` cho chuỗi sau |
| D11 | **Liên kết NT → BS** | NT mời (SĐT/CCHN) → BS **đồng ý** trên portal → `active`. Xem §7.5 |
| D12 | **Liên kết BS → NT** | BS chọn NT trong mạng Novixa → NT **duyệt** trên admin → `active`. Xem §7.5 |
| D13 | **Chọn NT khi kê** | Portal BS: mỗi lần kê **bắt buộc** chọn NT `active` (+ chi nhánh nếu chuỗi). Đơn thuộc tenant đích |
| D14 | **Bệnh nhân = KH CRM** | Ưu tiên `customer_id` trong CRM **tenant đích**; `patient_name`/`patient_phone` là snapshot hiển thị |
| D15 | **Xác minh BS (pilot)** | CCHN verify **thủ công**; BS mới = `pending_verification` đến khi Novixa/NT duyệt |
| D16 | **Thuốc kiểm soát** | `controlled` **không kê qua portal** phase 1 — chỉ luồng quầy + verify chặt |

**Mạng BS (roadmap):** [rx-prescriber-network-v1.md](./rx-prescriber-network-v1.md)

---

## 3.1 Giải thích: “Strict — Rx không đơn thì POS không bán” (D1)

Novixa phân **từng sản phẩm** trên danh mục:

| Loại SP (`dispensing_class`) | Ví dụ | Strict = POS làm gì? |
|------------------------------|-------|----------------------|
| **OTC** (không kê đơn) | Paracetamol, vitamin, oresol | Bán **bình thường**, không cần đơn BS |
| **Prescription** (kê đơn) | Amoxicillin, Amlodipine, kháng sinh… | **Chỉ bán** khi đã gắn **đơn bác sĩ** hợp lệ (`verified` / `signed`, còn hạn) |

**“Strict”** = máy **chặn cứng**: nhân viên quét/nhập thuốc **kê đơn** mà **chưa** mở đơn BS → **không thanh toán, không in phiếu** được.

### Ví dụ dễ hiểu

| Tình huống | Strict | Warn (tham khảo — không dùng pilot) |
|------------|--------|-------------------------------------|
| Khách mua **Panadol** (OTC) | Bán ngay ✓ | Bán ngay ✓ |
| Khách mua **Amoxicillin** (Rx), **chưa có đơn BS** | Máy báo lỗi, **không bán** ✗ | Cảnh báo nhưng vẫn cho bán (dễ lọt) |
| Khách có **đơn BS đã verify**, NV bấm “Bán theo đơn” | Bán + **in phiếu** ✓ | ✓ |

**Mục đích strict (pain chủ quầy):** Trước đây NV **không bán Rx trên máy** (vì không in được không đơn) → bán tay, **tiền không vào sổ**. Strict buộc mọi Rx phải đi qua **đơn BS → verify → POS** mới bán được.

**Strict không có nghĩa** “mọi thuốc đều cần đơn” — **chỉ** dòng đánh dấu **kê đơn** trên danh mục.

### Luồng đúng sau khi bật strict

```
Khách cần thuốc KÊ ĐƠN
    → Có đơn BS (NV nhập + verify, hoặc BS kê portal)
    → POS "Bán theo đơn"
    → In phiếu, tiền vào báo cáo
```

Không có đơn → **không có đường tắt** trên POS (tránh bán chui).

---

## 3. Phạm vi Sprint 1 (Rx-0 + Rx-1 + Rx-2)

| ID | Hạng mục | Mô tả ngắn |
|----|----------|------------|
| Rx-0-01 | `products.dispensing_class` | `otc` \| `prescription` \| `controlled` (reserved) |
| Rx-0-02 | POS strict + wizard | Chặn Rx không đơn; tìm/tạo đơn tại POS; log sự kiện chặn |
| Rx-1-01 | `linked_prescribers` | CRUD bác sĩ liên kết |
| Rx-1-02 | `electronic_prescriptions` + lines | Tạo đơn, trạng thái, audit |
| Rx-1-03 | Luồng NV nhập | draft → pending_verification (ảnh **không** bắt buộc lúc gửi) |
| Rx-1-04 | Luồng verify | Verify **bắt buộc có ảnh** (luồng NV); queue + notify + SLA |
| Rx-1-05 | POS bind đơn | Nạp đơn; partial dispense; link `prescription_line_id`; mark dispensed/partial |
| Rx-1-06 | In phiếu | 1 phiếu, cột/ nhãn Rx vs OTC |
| Rx-1-07 | Báo cáo | Doanh thu theo BS, theo NV bán |
| Rx-2-01 | Portal bác sĩ | OTP/login BS → **chọn NT active** → kê đơn → `signed` |
| Rx-2-02 | Hàng chờ quầy | Danh sách đơn mới từ BS |
| Rx-2-03 | Liên kết BS↔NT | Mời / xin liên kết / duyệt / thu hồi (D11, D12) |
| Rx-2-04 | Pharmacy directory | BS tìm NT trong mạng (read-only, opt-in) |

**Ngoài Sprint 1 (backlog):** OCR ảnh đơn (P13), tele ca trên app khách, liên thông đơn BYT, mẫu đơn BS, dashboard mạng — xem [rx-prescriber-network-v1.md](./rx-prescriber-network-v1.md).

---

## 4. Giải thích & cấu hình: Ai verify? (D3)

**Verify** = bước **“Đã đối chiếu căn cứ — cho phép cấp phát thuốc kê đơn trên máy”** (gọi BS xong, có ảnh đơn, hoặc BS đã kê portal).

### 4.1 Tách bước: nhập vs xác nhận

| Bước | Permission | Ai thường làm |
|------|------------|----------------|
| Nhập đơn (`create`) | `rx.prescription.create` | NV, dược, quản lý chi nhánh |
| **Xác nhận (`verify`)** | `rx.prescription.verify` | **Tuỳ cấu hình** — xem preset §4.2 |
| Bán POS (`dispense`) | `rx.prescription.dispense` | NV quầy (sau khi đơn verified/signed) |

**Quy tắc cố định:** User có `create` **không được** mặc định có `verify` (tránh tự nhập tự duyệt). Admin tenant **tích chọn** role nào được verify.

### 4.2 Preset cấu hình (System → Vai trò → quyền Rx)

| Preset | Gán `rx.prescription.verify` cho | Phù hợp |
|--------|-----------------------------------|---------|
| **Quầy lẻ** | `PHARMACIST` + `ADMIN` | Chủ/dược một cửa (NT_XUANHOA pilot) |
| **Chuỗi — chi nhánh** | `PHARMACIST` + `MANAGER` (quản lý cửa hàng) | Chủ/HQ **không** verify từng đơn; **QL chi nhánh** duyệt |
| **Chuỗi — tập trung** | `PHARMACIST` + role `RX_VERIFIER` (tùy chỉnh) | Team dược văn phòng duyệt đơn nhiều cửa |
| **Tối thiểu** | Chỉ `PHARMACIST` | Chỉ dược sĩ có CCHN verify |

**Cài đặt tenant (Admin → Cài đặt thuốc kê đơn):**

| Setting | Mô tả | Mặc định |
|---------|-------|----------|
| `RxVerifyRequired` | Bật bước verify (luồng NV nhập) | `true` |
| `RxVerifyAllowSelfVerify` | Cùng user vừa create vừa verify | `false` (khuyến nghị) |
| `RxVerifyNotifyRoles` | Gửi thông báo “đơn chờ duyệt” tới role nào | `MANAGER`, `PHARMACIST` |
| `RxEnforcementMode` | `strict` / `warn` | `strict` (pilot) |
| `RxAttachmentRequiredAtVerify` | Verify luồng NV **phải có ≥1 ảnh** đính kèm | `true` (pilot) |
| `RxAttachmentRequiredAtSubmit` | Gửi duyệt **phải** có ảnh | `false` (pilot — tránh khách chờ) |
| `RxPartialDispenseAllowed` | Cấp phát nhiều lần trong hạn đơn | `true` |
| `RxDispenseBranchPolicy` | `same_branch_only` \| `any_branch_in_tenant` | `same_branch_only` (pilot) |
| `RxVerifyEscalationMinutes` | Đơn chờ quá X phút → notify leo cấp | `15` |
| `RxPosBlockedAudit` | Ghi log mỗi lần POS chặn Rx | `true` |
| `RxDuplicateWindowHours` | Cảnh báo đơn trùng (cùng KH+BS+dòng) | `24` (cảnh báo, không chặn) |
| `RxOutOfStockWarnOnVerify` | Verify cảnh báo nếu tồn không đủ | `true` |

**Luồng BS kê portal (`signed`):** Coi như BS đã kê — **không cần** verify thêm (tuỳ chọn tenant: `RxRequirePharmacistReviewOnSigned` = quản lý chỉ **soi**, không block).

### 4.3 Chuỗi vs quầy lẻ — ví dụ

**Quầy Xuân Hòa (1 cửa):** Chủ hoặc dược trực verify 5 phút/lần.

**Chuỗi 10 cửa:**

- NV cửa A nhập đơn → trạng thái `pending_verification`
- **Quản lý cửa A** (role MANAGER chi nhánh A) nhận thông báo → Verify
- Chủ công ty **không** cần verify — xem báo cáo tổng theo cửa / theo BS
- (Tuỳ chọn) Đơn vượt ngưỡng giá trị → leo lên dược văn phòng

### 4.4 Audit (bắt buộc mọi preset)

Mỗi lần verify ghi: `verified_by`, `verified_at`, `verification_method` (phone / zalo / in_person / doctor_portal), `branch_id`.

**Pilot Xuân Hòa:** Preset **Quầy lẻ** — ít nhất 1 user có `verify`; NV thu ngân không có quyền này.

### 4.5 Ảnh đơn: gửi duyệt vs verify (D7)

**Quyết định pilot:** Ảnh **không bắt buộc khi NV gửi duyệt** — khách **không phải đứng chờ** tại quầy trong lúc gọi BS / chờ ảnh Zalo. Ảnh **bắt buộc khi quản lý/dược bấm Verify** — người duyệt phải có căn cứ trước khi cho bán trên POS.

| Thời điểm | Ảnh bắt buộc? | Lý do |
|-----------|----------------|-------|
| NV **Gửi duyệt** (`pending_verification`) | **Không** | NV kịp gọi BS, nhập thuốc; ảnh Zalo có thể tới sau; khách về / đi việc khác |
| Người có quyền **Verify** | **Có** (≥1 attachment) | Chủ/QL/dược đối chiếu trước khi mở khóa POS |
| BS kê **portal** (`signed`) | **Không** (exempt) | Đơn điện tử đã ký BS = căn cứ; không cần ảnh giấy |
| App khách upload (P12) | Ảnh có sẵn từ upload | Verify như luồng NV |

**Luồng thực tế quầy lẻ:**

```
NV gọi BS → nhập đơn → Gửi duyệt (chưa cần ảnh)
    → Khách không bắt buộc chờ
    → NV/QL nhận ảnh Zalo sau → đính kèm đơn
    → QL Verify (máy kiểm: phải có ảnh) → POS bán
```

**Ai đính kèm ảnh?** Bất kỳ user có `rx.prescription.create` hoặc `verify` — thường NV upload sau khi BS gửi Zalo, hoặc QL upload lúc verify.

**API/UI:** Nút **Verify** disabled cho đến khi `attachments.count >= 1` (luồng NV). Thông báo: *“Cần ảnh đơn trước khi xác nhận.”*

**Ngoại lệ tenant:** `RxAttachmentRequiredAtVerify = false` chỉ khi chủ chấp nhận verify không ảnh (không khuyến nghị pilot).

---

## 5. Giải thích: Hạn đơn 7 ngày (D4)

**Hạn đơn** trong Novixa = **số ngày tối đa từ lúc đơn được xác nhận đến lúc quầy vẫn được bán trên POS**.

- **Không phải** “thuốc dùng mấy ngày” (đó là field `dosage_instruction` trên từng dòng)
- **Không phải** hạn thuốc trên vỏ hộp (HSD lô — module Inventory)

**Ví dụ:**

- 01/07 BS kê / dược verify đơn → hạn cấp phát **08/07** (7 ngày)
- Khách đến 05/07 → POS vẫn bán được
- Khách đến 10/07 → POS **từ chối** — cần BS kê đơn mới (bệnh có thể đổi)

**Vì sao 7 ngày (không 5)?**

- Quầy tỉnh lẻ: khách đi xa, trễ vài ngày
- 5 ngày dễ hết hạn trước khi khách quay lại → NV lại bán chui

**Cấu hình tenant:** `RxPrescriptionValidityDays` (mặc định **7**, admin sửa được).

---

## 6. Trạng thái đơn

| Status | Mô tả | POS bán Rx? |
|--------|-------|-------------|
| `draft` | NV đang nhập | Không |
| `pending_verification` | Chờ dược/chủ xác nhận | Không |
| `verified` | Dược/chủ đã xác nhận (luồng NV) | **Có** (trong hạn) |
| `signed` | BS đã kê trên portal (luồng BS) | **Có** (trong hạn) |
| `partially_dispensed` | Đã bán một phần, còn `qty_remaining` | **Có** (dòng còn lại, trong hạn) |
| `dispensed` | Đã bán hết mọi dòng Rx | Không sửa |
| `expired` | Quá hạn 7 ngày | Không |
| `cancelled` | Hủy | Không |

---

## 7. Luồng nghiệp vụ

### 7.1 Nhân viên nhập (BS không mở app)

1. Khách cần thuốc kê đơn  
2. NV gọi BS (SĐT trong danh sách liên kết) hoặc nhận ảnh Zalo  
3. NV tạo đơn: chọn BS, KH, dòng thuốc (Rx + OTC chung một đơn)  
4. **Gửi duyệt** — ảnh **chưa bắt buộc**; khách có thể không chờ tại quầy  
5. (Song song) NV/QL đính kèm ảnh khi BS gửi Zalo  
6. Dược/chủ/QL **Verify** — **bắt buộc có ảnh** → `verified`  
7. POS **Bán theo đơn** → in 1 phiếu → `dispensed` hoặc `partially_dispensed`

### 7.2 Bác sĩ kê online (portal) — D13, D14

1. BS đăng nhập portal (OTP SĐT + identity `prescribers`)  
2. **Chọn nhà thuốc** — chỉ NT có liên kết `active` (D11/D12)  
3. (Chuỗi) Chọn **chi nhánh** nếu `RxDispenseBranchPolicy` = same branch  
4. Tìm **khách hàng (bệnh nhân)** theo SĐT/mã trong CRM **tenant đã chọn** → gắn `customer_id`  
5. Kê đơn (không có dòng `controlled` — D16), **Gửi** → `signed`  
6. NT đích: hàng chờ đơn → dược soi (tuỳ chọn) → POS bán → `dispensed`

```
BS login
  → Chọn NT (active)
  → (Tuỳ chọn) Chọn chi nhánh
  → Chọn KH CRM tenant đó
  → Kê thuốc → signed
  → Quầy NT đích → POS
```

**Không cho phép pilot:** kê đơn NT A, bán NT B (cross-tenant).

### 7.5 Liên kết bác sĩ ↔ nhà thuốc (D11, D12)

Hai chiều khởi tạo; **một lần đồng thuận** → `active` → BS được kê đơn về NT đó.

| Ai khởi tạo | Trạng thái ban đầu | Ai duyệt | Kết quả |
|-------------|-------------------|----------|---------|
| **NT mời BS** | `pending_nt_invite` | BS Accept trên portal | `active` |
| **BS chọn NT** | `pending_nt_approval` | NT Approve trên admin | `active` |
| Từ chối | `rejected` | — | Không kê được |
| Gỡ liên kết | `revoked` | NT hoặc BS | Đơn cũ giữ; **không kê mới** |

**Admin NT (Bác sĩ liên kết):**

- Mời BS (SĐT/CCHN) → “Chờ BS xác nhận”
- Hàng chờ “BS xin liên kết” → Duyệt / Từ chối
- Danh sách BS **Đang liên kết** (`active`)

**Portal BS:**

- Thông báo lời mời từ NT → Đồng ý / Từ chối
- Tìm NT trong [Pharmacy Directory](./rx-prescriber-network-v1.md#3-pharmacy-directory) → Gửi yêu cầu
- Kê đơn: chỉ NT `active`

**Pilot Xuân Hòa:** BS nhập thủ công trên admin (Rx-1) = liên kết `active` thủ công; khi BS cài app → claim profile + accept invite (nếu có).

### 7.3 POS strict + wizard (D1, D9)

- Thêm SP `prescription` vào giỏ **không** qua đơn → **chặn cứng** + ghi audit (`RxPosBlockedAudit`)
- Panel hành động: **Tìm đơn** (SĐT/tên/mã) | **Tạo đơn nhanh** | **Gọi BS**
- Đơn `verified`/`signed` → **Bán theo đơn** nạp giỏ; không vượt `qty_remaining` từng dòng
- SP `otc` → bán bình thường (có hoặc không qua đơn BS)

### 7.4 Partial dispense (D8)

- BS kê 30 viên → lần 1 bán 10 → `partially_dispensed`, còn 20 trong hạn 7 ngày
- Lần 2 POS nạp cùng đơn → chỉ còn dòng/số lượng remaining
- Hết hạn hoặc hết remaining → cần đơn mới

---

## 8. Data model

Schema: `pack_pharmacy` (+ cột directory trên `public.tenants`)

| Bảng | Mục đích |
|------|----------|
| **`prescribers`** | Identity BS platform (1 người — CCHN, SĐT, OTP) — migration **100** |
| **`prescriber_tenant_links`** | Many-to-many BS↔NT, trạng thái D11/D12 — migration **100** |
| `linked_prescribers` | BS trong sổ NT (Rx-1); thêm `prescriber_id`, `link_id` → master |
| `electronic_prescriptions` | Header đơn; thêm `prescriber_id` (optional audit) |
| `electronic_prescription_lines` | Dòng thuốc + `line_dispensing_class` + qty |
| `prescription_attachments` | Ảnh đơn giấy |
| `prescription_audit_log` | create / verify / dispense / cancel / pos_blocked / link_* |
| `prescription_dispense_events` | order_id, prescription_line_id, qty, branch_id, user |

**Tenants (additive):** `rx_directory_discoverable` — NT opt-in hiện trên directory BS search.

**Products (additive):** `dispensing_class VARCHAR` — migration Rx-0.

**Sales:** `sales_orders.prescription_id`; `sales_order_items.prescription_line_id`.

---

## 9. API (prefix)

**Admin / ERP (tenant-scoped):**

```
/api/pharmacy/prescribers
/api/pharmacy/prescribers/links/invite
/api/pharmacy/prescribers/links/pending-approval
/api/pharmacy/prescribers/links/{id}/approve
/api/pharmacy/prescribers/links/{id}/reject
/api/pharmacy/prescribers/links/{id}/revoke
/api/pharmacy/prescriptions
/api/pharmacy/prescriptions/{id}/submit|verify|cancel|pos-load|mark-dispensed
/api/pharmacy/rx/settings
```

**Prescriber portal (auth riêng — Rx-2):**

```
/api/prescriber-portal/auth/otp-request
/api/prescriber-portal/auth/otp-verify
/api/prescriber-portal/me
/api/prescriber-portal/pharmacies              # NT active của BS
/api/prescriber-portal/pharmacies/directory   # Tìm NT discoverable (D12)
/api/prescriber-portal/links/pending-invites
/api/prescriber-portal/links/{id}/accept|reject
/api/prescriber-portal/links/request           # BS xin liên kết NT
/api/prescriber-portal/prescriptions
/api/prescriber-portal/customers/search        # CRM tenant đã chọn
```

---

## 10. UI

| Kênh | Màn hình |
|------|----------|
| **Admin** | Bác sĩ liên kết; Danh sách đơn; Tạo/sửa đơn; Duyệt đơn; Cấu hình Rx; Báo cáo theo BS |
| **Admin / Staff POS** | Bán theo đơn; wizard chặn Rx; hàng chờ verify; đính kèm ảnh |
| **Prescriber portal** | Login OTP; Liên kết NT; Chọn NT; Kê đơn; Lịch sử đơn |

---

## 11. Phân quyền

| Permission | Mô tả |
|------------|-------|
| `rx.prescriber.manage` | CRUD BS liên kết (sổ NT) |
| `rx.prescriber.link.manage` | Mời / duyệt / thu hồi liên kết BS↔NT (Rx-2) |
| `rx.prescription.create` | Tạo/sửa draft |
| `rx.prescription.verify` | Xác nhận đơn — **gán theo role** (dược / quản lý chi nhánh / chủ — tuỳ preset) |
| `rx.prescription.dispense` | Nạp POS / mark dispensed |
| `rx.prescription.read` | Xem danh sách |
| `rx.prescriber_portal.access` | BS kê online (gắn `linked_prescriber_id`) |

---

## 12. Pilot NT_XUANHOA — checklist

- [ ] Rà `dispensing_class` top SKU (~200+)
- [ ] Bật strict trên tenant
- [ ] Thêm 2–3 BS liên kết (CCHN, SĐT)
- [ ] Cấu hình role verify (preset quầy lẻ hoặc chuỗi)
- [ ] Tạo user có quyền verify (dược / quản lý — theo cấu hình)
- [ ] Dán [quy trình quầy](../06-compliance/rx-dispensing-quy-trinh-quay-v1.md)
- [ ] 50+ đơn thật; đối soát tiền mặt vs POS hàng ngày
- [ ] Báo cáo: POS chặn Rx theo NV; đơn chờ verify > SLA

---

## 13. Tham chiếu

- [Quy trình quầy A4](../06-compliance/rx-dispensing-quy-trinh-quay-v1.md)
- [GPP vận hành](../06-compliance/gpp-operational-context-v1.md)
- [Module catalog](./module-catalog-v1.md)
- [Mạng bác sĩ & roadmap Rx-2+](./rx-prescriber-network-v1.md)
- Handoff dev: `.cursor/handoff/rx-module-v1.md`
- Backlog app khách P12–P13: [customer-app-backlog-p12-p18.md](../07-customer/customer-app-backlog-p12-p18.md)

---

## Changelog

| Version | Ngày | Thay đổi |
|---------|------|----------|
| 1.1 | 2026-07-10 | Thêm §3.1 giải thích Strict; D3 verify **cấu hình được** + preset chuỗi/quầy lẻ |
| 1.3 | 2026-07-10 | D11–D16: liên kết BS↔NT hai chiều; chọn NT khi kê; KH CRM; CCHN verify; controlled portal block; schema 100 |
| 1.2 | 2026-07-10 | D7–D10: ảnh bắt buộc **lúc verify** (không lúc gửi); partial dispense; POS wizard; branch policy; settings & schema mở rộng |
| 1.0 | 2026-07-10 | Khởi tạo; chốt D1–D7 pilot Xuân Hòa |

---

*Owner: Product · Review: Engineering · Pilot: NT_XUANHOA*
