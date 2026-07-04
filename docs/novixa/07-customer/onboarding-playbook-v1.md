# Novixa — Onboarding Playbook V1

**Mã:** NVX-CS-01 · **Tier:** T2 · **Trạng thái:** Outline · **Version:** 1.0

---

## 1. Mục tiêu

Đưa khách **founding** từ ký HĐ → **go-live POS ổn định** trong **≤ 4 tuần**, với migrate dữ liệu và training có cấu trúc.

---

## 2. Timeline chuẩn (4 tuần)

| Tuần | Giai đoạn | Deliverable |
|------|-----------|-------------|
| **W0** | Kickoff | Tenant tạo, user admin, lịch training |
| **W1** | Master data | Danh mục SP, NCC, kho, chi nhánh |
| **W2** | Opening balance | Tồn đầu theo lô, đối soát |
| **W3** | Training | POS, GRN, kiểm kê pilot |
| **W4** | Go-live | POS production, hypercare 2 tuần |

*Chuỗi nhiều cửa: +1–2 tuần / cửa.*

---

## 3. Kickoff checklist

- [ ] Nhận handoff từ Sales ([sales-playbook](../04-gtm/sales-playbook-v1.md) §7)
- [ ] Tạo tenant qua `/setup` (Model B) hoặc bootstrap script
- [ ] Cấu hình chi nhánh, kho mặc định, receipt settings
- [ ] Tạo user: admin, quản lý, thu ngân (roles)
- [ ] Xác nhận nguồn migrate: Excel / POS cũ / thủ công
- [ ] Lên lịch 3 buổi training (2h/buổi)

---

## 4. Migrate dữ liệu

### 4.1 Danh mục sản phẩm

| Nguồn | Cách làm |
|-------|----------|
| Excel | Import catalog (`ProductImportPage`) |
| Template Novixa | Cung cấp file mẫu + mapping cột |

**Bắt buộc:** mã SP, tên, đơn vị, giá bán (nếu có), barcode (nếu có)

### 4.2 Tồn đầu kỳ

- Nhập **theo lô**: số lô, HSD, số lượng, kho
- Đối soát tổng tồn vs sổ cũ — ký xác nhận với chủ NT
- Tham chiếu mẫu: `import/xuan-hoa/` (case nội bộ)

### 4.3 Khách hàng (optional W2+)

- Import nếu có SĐT sạch
- Loyalty opening balance — thống nhất trước go-live app

Chi tiết: NVX-CS-07 migration playbook *(Planned)*

---

## 5. Training curriculum (rút gọn)

| Buổi | Đối tượng | Nội dung |
|------|-----------|----------|
| 1 | Quản lý | Admin: danh mục, PO/GRN, tồn, báo cáo cơ bản |
| 2 | Thu ngân / DS quầy | POS: ca, bán, trả, in bill |
| 3 | Quản lý + DS | Kiểm kê, cảnh báo HSD, app khách O2O |

Tài liệu khách: NVX-CS-04/05/06 *(Planned)*

---

## 6. Go-live gate

**Không go-live** nếu thiếu:

- [ ] ≥80% danh mục bán hàng ngày đã import
- [ ] Tồn đầu lô đã đối soát ký
- [ ] ≥2 user POS trained + test 10 đơn thử
- [ ] Ca + in bill OK
- [ ] Production config: không demo seed, OTP policy rõ

Checklist đầy đủ: `client/admin/pilot-go-live-checklist.md`  
Customer-facing copy: [go-live-checklist-customer-v1.md](./go-live-checklist-customer-v1.md) (NVX-CS-02)

---

## 7. Hypercare (2 tuần sau go-live)

| Ngày | Hoạt động |
|------|-----------|
| D+1, D+3, D+7 | Check-in Zalo/call — blocker P0 |
| D+7 | Review báo cáo doanh thu vs kỳ vọng |
| D+14 | Handoff support thường + feedback case study |

**Escalation P0:** POS không bán, sai tồn nghiêm trọng, không login

---

## 8. Case study (founding)

Thu thập (với consent):

- Pain trước / sau (số liệu nếu được)
- Quote chủ / dược sĩ
- Screenshot báo cáo (ẩn thông tin nhạy cảm)

Dùng cho: novixa.vn, sales deck

---

## 9. RACI rút gọn

| Việc | CS | Khách | Eng |
|------|-----|-------|-----|
| Tạo tenant | A | I | C |
| Migrate | C | A (data) | C |
| Training | A | R | I |
| Go-live sign-off | A | A | C |
| Bug P0 | C | I | A |

---

## 10. Tham chiếu

- [GPP context](../06-compliance/gpp-operational-context-v1.md)
- [Deployment](../05-operations/deployment-model-v1.md)
- Demo UAT: `demo-pos-checklist.md`, `demo-procurement-checklist.md`

---

*Owner: Customer Success · KPI: go-live ≤ 4 tuần*
