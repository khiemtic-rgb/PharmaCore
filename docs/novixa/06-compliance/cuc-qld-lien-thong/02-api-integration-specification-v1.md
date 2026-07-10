# ĐẶC TẢ KỸ THUẬT API LIÊN THÔNG NOVIXA

**Novixa Drug Integration API Specification**

| | |
|---|---|
| **Mã tài liệu** | NVX-CQD-API-01 |
| **Phiên bản** | 1.0 |
| **Sản phẩm** | Novixa Pharmacy Management System |
| **Đơn vị phát triển** | Công ty TNHH Truyền thông và Công nghệ KIT |
| **Base URL (Production)** | `https://api.novixa.vn` |
| **Ngày ban hành** | 10/07/2026 |

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Chuẩn kỹ thuật](#2-chuẩn-kỹ-thuật)
3. [Authentication](#3-authentication)
4. [Headers chung](#4-headers-chung)
5. [Danh sách API](#5-danh-sách-api)
6. [API Danh mục thuốc Quốc gia (QĐ 522)](#6-api-danh-mục-thuốc-quốc-gia-qđ-522)
7. [API Liên thông QĐ 540 Bảng 1](#7-api-liên-thông-qđ-540-bảng-1)
8. [API Đồng bộ giao dịch (Connector)](#8-api-đồng-bộ-giao-dịch-connector)
9. [API Tra cứu trạng thái đồng bộ](#9-api-tra-cứu-trạng-thái-đồng-bộ)
10. [Request/Response JSON mẫu](#10-requestresponse-json-mẫu)
11. [Mã lỗi (Error Codes)](#11-mã-lỗi-error-codes)
12. [Retry Policy](#12-retry-policy)
13. [Sequence Diagram](#13-sequence-diagram)
14. [API Versioning](#14-api-versioning)

---

## 1. Tổng quan

Tài liệu này mô tả **giao diện lập trình ứng dụng (API)** của Novixa phục vụ:

- **Nội bộ:** Ứng dụng Admin, Staff POS truy cập backend
- **Liên thông:** Drug Integration Service truyền dữ liệu lên Cổng liên thông Bộ Y tế
- **Kiểm thử:** Xuất dữ liệu QĐ 540 trước khi kết nối Live

Kiến trúc API tuân thủ **RESTful**, trao đổi dữ liệu qua **HTTPS** với payload **JSON UTF-8**.

---

## 2. Chuẩn kỹ thuật

| Hạng mục | Giá trị |
|----------|---------|
| **Protocol** | HTTPS (TLS 1.2 trở lên) |
| **Format** | JSON |
| **Encoding** | UTF-8 |
| **Content-Type** | `application/json` |
| **Date/Time** | ISO 8601 (UTC) cho API nội bộ; `YYYYMMDDHHmm` cho QĐ 540 |
| **Timezone** | `Asia/Ho_Chi_Minh` (UTC+7) khi transform QĐ 540 |

---

## 3. Authentication

### 3.1 JWT Bearer (API nội bộ Novixa)

Hệ thống sử dụng **JWT (JSON Web Token)** với cơ chế access token + refresh token.

**Luồng đăng nhập:**

```http
POST /api/auth/login
Content-Type: application/json

{
  "tenantCode": "NT001",
  "username": "admin",
  "password": "********"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJl...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

**Sử dụng token:**

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Refresh token:**

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**JWT Claims:**

| Claim | Mô tả |
|-------|-------|
| `sub` | User ID |
| `tenant_id` | ID tenant (nhà thuốc) |
| `tenant_code` | Mã tenant |
| `permissions` | Danh sách quyền RBAC |
| `exp` | Thời gian hết hạn |
| `iss` | `KitPlatform` |

### 3.2 OAuth2 (Connector liên thông Cổng BYT)

Khi kết nối **Live** với Cổng liên thông Bộ Y tế (theo QĐ 777), Drug Integration Service sử dụng **OAuth2 Client Credentials** hoặc cơ chế xác thực do Cục QLD cấp:

```http
POST {MOH_TOKEN_ENDPOINT}
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&scope=drug.sync
```

**Response:**

```json
{
  "access_token": "moh_access_token...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

> **Lưu ý:** Endpoint, client_id, client_secret do Cục Quản lý Dược cấp khi phê duyệt đăng ký liên thông.

### 3.3 Phân quyền (RBAC)

| Policy | Mô tả | API áp dụng |
|--------|-------|-------------|
| `Catalog.Read` | Đọc danh mục | National drugs |
| `Inventory.Read` | Đọc kho, xuất QĐ 540 | QD540 export |
| `Integration.Write` | Gửi dữ liệu liên thông | Connector push |

---

## 4. Headers chung

| Header | Bắt buộc | Mô tả |
|--------|----------|-------|
| `Authorization` | Có | `Bearer {token}` |
| `Content-Type` | Có (POST/PUT) | `application/json` |
| `Accept` | Khuyến nghị | `application/json` |
| `X-Request-Id` | Khuyến nghị | UUID — trace request |
| `X-Tenant-Code` | Không* | Mã tenant (đã embed trong JWT) |

*Tenant được xác định từ JWT claim `tenant_id`.

---

## 5. Danh sách API

### 5.1 API xác thực

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/refresh` | Làm mới token |
| POST | `/api/auth/logout` | Đăng xuất |
| GET | `/api/auth/me` | Thông tin user hiện tại |

### 5.2 API Danh mục thuốc Quốc gia (QĐ 522)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/catalog/national-drugs/connection-status` | Trạng thái kết nối CSDL Dược QG |
| GET | `/api/catalog/national-drugs/field-map` | Map trường QG ↔ Novixa |
| GET | `/api/catalog/national-drugs` | Tìm kiếm danh mục QG |
| GET | `/api/catalog/national-drugs/{drugId}` | Chi tiết thuốc QG |
| GET | `/api/catalog/national-drugs/{drugId}/prefill` | Prefill tạo sản phẩm |
| POST | `/api/catalog/products/bulk-suggest-national-registration` | Gợi ý SĐK hàng loạt |

### 5.3 API Liên thông QĐ 540

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/pharmacy/integration/qd540/table1` | Xuất Bảng 1 JSON |
| GET | `/api/pharmacy/integration/qd540/table1.csv` | Xuất Bảng 1 CSV |

### 5.4 API Connector (Drug Integration Service → Cổng BYT)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/v1/drug/sales` | Đồng bộ giao dịch bán |
| POST | `/api/v1/drug/inventory` | Đồng bộ tồn kho |
| POST | `/api/v1/drug/import` | Đồng bộ nhập thuốc |
| GET | `/api/v1/drug/status/{id}` | Tra cứu trạng thái gửi |

> **Ghi chú:** Endpoint `/api/v1/drug/*` là giao diện **Drug Integration Service** khi đẩy lên Cổng liên thông. Payload tuân chuẩn QĐ 540 Bảng 1.

---

## 6. API Danh mục thuốc Quốc gia (QĐ 522)

### 6.1 GET `/api/catalog/national-drugs/connection-status`

**Mô tả:** Kiểm tra trạng thái kết nối CSDL Dược Quốc gia.

**Response 200:**

```json
{
  "mode": "live",
  "isConnected": true,
  "lastSyncAt": "2026-07-10T08:30:00Z",
  "catalogVersion": "2026.07.01",
  "message": "Liên thông CSDL Dược Quốc gia — chế độ Live"
}
```

**Mode values:** `mock` | `sandbox` | `live`

---

### 6.2 GET `/api/catalog/national-drugs`

**Mô tả:** Tìm kiếm thuốc trong CSDL Dược Quốc gia.

**Query parameters:**

| Param | Type | Mô tả |
|-------|------|-------|
| `search` | string | Từ khóa (tên, SĐK, mã) |
| `page` | int | Trang (default: 1) |
| `pageSize` | int | Số dòng/trang (default: 20, max: 100) |

**Response 200:**

```json
{
  "items": [
    {
      "drugId": "VN1234518lo200vien",
      "drugName": "Paracetamol 500mg",
      "registrationNumber": "VN-12345-18",
      "activeIngredient": "Paracetamol",
      "strength": "500mg",
      "manufacturer": "DHG Pharma",
      "countryOfOrigin": "Việt Nam",
      "dosageForm": "Viên nén",
      "packaging": "Hộp 10 vỉ x 10 viên"
    }
  ],
  "totalCount": 150,
  "page": 1,
  "pageSize": 20
}
```

---

### 6.3 GET `/api/catalog/national-drugs/{drugId}/prefill`

**Mô tả:** Lấy dữ liệu prefill để tạo sản phẩm Novixa từ bản ghi QG.

**Response 200:**

```json
{
  "nationalDrugId": "VN1234518lo200vien",
  "productName": "Paracetamol 500mg",
  "nationalRegistrationNumber": "VN-12345-18",
  "genericName": "Paracetamol",
  "brandName": "DHG Pharma",
  "countryCode": "VN",
  "dosageForm": "Viên nén",
  "packaging": "Hộp 10 vỉ x 10 viên",
  "suggestedBaseUnit": "Viên"
}
```

---

## 7. API Liên thông QĐ 540 Bảng 1

### 7.1 GET `/api/pharmacy/integration/qd540/table1`

**Mô tả:** Xuất dữ liệu Bảng 1 QĐ 540 dạng JSON — phục vụ kiểm thử và xem trước trước khi đẩy Live.

**Query parameters:**

| Param | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `from` | date (YYYY-MM-DD) | Có | Ngày bắt đầu |
| `to` | date (YYYY-MM-DD) | Có | Ngày kết thúc |
| `branchId` | uuid | Không | Lọc theo chi nhánh |

**Response 200:**

```json
{
  "rows": [
    {
      "maThuoc": "VN1234518lo200vien",
      "tenThuoc": "Paracetamol 500mg",
      "soDangKy": "VN-12345-18",
      "tenHoatChat": "Paracetamol",
      "nongDoHamLuong": "500mg",
      "nhaSanXuat": "DHG Pharma",
      "nuocSanXuat": "Việt Nam",
      "nhaNhapKhau": "",
      "quyCachDongGoi": "Hộp 10 vỉ x 10 viên",
      "dangBaoChe": "Viên nén",
      "donViDongGoiNn": "Viên",
      "giaBanLe": 500,
      "soLo": "LOT20260701",
      "hanDung": 20280701,
      "soLuongNhap": 0,
      "soLuongBan": 2,
      "soLuongTon": 0,
      "donViBThuocChoCsbl": "",
      "soHoaDonMThuoc": "",
      "ngayNhap": null,
      "ngayBan": 202607101430,
      "maCoSoBanLe": "CSBL00012345",
      "maCoSoBanBuon": ""
    }
  ],
  "warnings": [
    "Thiếu so_dang_ky cho SP Vitamin C 1000mg (source a1b2c3d4-...)."
  ],
  "skippedRows": 1
}
```

**Response 400:**

```json
{
  "message": "Chi nhánh chưa có Ma_co_so_ban_le (retail_facility_code). Cập nhật tại Hệ thống → Chi nhánh."
}
```

---

### 7.2 GET `/api/pharmacy/integration/qd540/table1.csv`

**Mô tả:** Tải file CSV Bảng 1 — đúng header 23 cột QĐ 540.

**Query parameters:** Giống endpoint JSON.

**Response 200:**

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="qd540-table1-20260701-20260710.csv"
```

**CSV header:**

```
ma_thuoc,ten_thuoc,so_dang_ky,ten_hoat_chat,nong_do_ham_luong,nha_san_xuat,nuoc_san_xuat,nha_nhap_khau,quy_cach_dong_goi,dang_bao_che,don_vi_dong_goi_nn,gia_ban_le,so_lo,han_dung,so_luong_nhap,so_luong_ban,so_luong_ton,don_vi_bthuoc_cho_csbl,so_hoa_don_mthuoc,ngay_nhap,ngay_ban,Ma_co_so_ban_le,Ma_co_so_ban_buon
```

---

## 8. API Đồng bộ giao dịch (Connector)

Các endpoint dưới đây mô tả giao diện **Drug Integration Service** sử dụng khi đẩy dữ liệu lên **Cổng liên thông Bộ Y tế**. Payload tuân chuẩn **QĐ 540 Bảng 1** (23 trường).

### 8.1 POST `/api/v1/drug/sales`

**Mô tả:** Đồng bộ giao dịch bán thuốc.

**Request:**

```json
{
  "facilityCode": "CSBL00012345",
  "syncBatchId": "550e8400-e29b-41d4-a716-446655440000",
  "records": [
    {
      "maThuoc": "VN1234518lo200vien",
      "tenThuoc": "Paracetamol 500mg",
      "soDangKy": "VN-12345-18",
      "tenHoatChat": "Paracetamol",
      "nongDoHamLuong": "500mg",
      "nhaSanXuat": "DHG Pharma",
      "nuocSanXuat": "Việt Nam",
      "nhaNhapKhau": "",
      "quyCachDongGoi": "Hộp 10 vỉ x 10 viên",
      "dangBaoChe": "Viên nén",
      "donViDongGoiNn": "Viên",
      "giaBanLe": 500,
      "soLo": "LOT20260701",
      "hanDung": 20280701,
      "soLuongNhap": 0,
      "soLuongBan": 2,
      "soLuongTon": 0,
      "donViBThuocChoCsbl": "",
      "soHoaDonMThuoc": "",
      "ngayNhap": null,
      "ngayBan": 202607101430,
      "maCoSoBanLe": "CSBL00012345",
      "maCoSoBanBuon": ""
    }
  ]
}
```

**Response 202 (Accepted):**

```json
{
  "syncBatchId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "accepted",
  "recordCount": 1,
  "message": "Dữ liệu đã nhận, đang xử lý"
}
```

---

### 8.2 POST `/api/v1/drug/import`

**Mô tả:** Đồng bộ dữ liệu nhập thuốc (GRN).

**Request:** Cùng cấu trúc `records[]` — dòng nhập có `soLuongNhap > 0`, `soLuongBan = 0`, `ngayNhap` có giá trị.

---

### 8.3 POST `/api/v1/drug/inventory`

**Mô tả:** Đồng bộ snapshot tồn kho.

**Request:** Cùng cấu trúc — dòng tồn có `soLuongTon > 0`, `soLuongNhap = 0`, `soLuongBan = 0`.

---

## 9. API Tra cứu trạng thái đồng bộ

### 9.1 GET `/api/v1/drug/status/{id}`

**Mô tả:** Tra cứu trạng thái một batch đồng bộ.

**Path parameter:**

| Param | Mô tả |
|-------|-------|
| `id` | `syncBatchId` (UUID) |

**Response 200:**

```json
{
  "syncBatchId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "recordCount": 150,
  "successCount": 148,
  "failedCount": 2,
  "submittedAt": "2026-07-10T14:30:00Z",
  "completedAt": "2026-07-10T14:30:45Z",
  "errors": [
    {
      "recordIndex": 42,
      "code": "MISSING_EXPIRY",
      "message": "Thiếu hạn dùng lô LOT20260101"
    }
  ]
}
```

**Status values:**

| Status | Mô tả |
|--------|-------|
| `pending` | Chưa gửi |
| `processing` | Đang gửi |
| `success` | Thành công |
| `partial` | Một phần thành công |
| `failed` | Thất bại |

---

## 10. Request/Response JSON mẫu

### 10.1 Cấu trúc lỗi chuẩn

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      {
        "field": "maCoSoBanLe",
        "message": "Mã cơ sở bán lẻ không được để trống"
      }
    ],
    "requestId": "req-550e8400-e29b-41d4-a716"
  }
}
```

### 10.2 Pagination chuẩn

```json
{
  "items": [],
  "totalCount": 1000,
  "page": 1,
  "pageSize": 20,
  "totalPages": 50
}
```

---

## 11. Mã lỗi (Error Codes)

### 11.1 HTTP Status Codes

| Code | Mô tả |
|------|-------|
| 200 | OK — thành công |
| 202 | Accepted — đã nhận, đang xử lý |
| 400 | Bad Request — dữ liệu không hợp lệ |
| 401 | Unauthorized — token không hợp lệ/hết hạn |
| 403 | Forbidden — không đủ quyền |
| 404 | Not Found — không tìm thấy tài nguyên |
| 409 | Conflict — trùng lặp (idempotent) |
| 429 | Too Many Requests — vượt rate limit |
| 500 | Internal Server Error |
| 502 | Bad Gateway — lỗi Cổng liên thông |
| 503 | Service Unavailable — bảo trì |

### 11.2 Business Error Codes

| Code | HTTP | Mô tả | Xử lý |
|------|------|-------|-------|
| `AUTH_INVALID_TOKEN` | 401 | Token hết hạn/không hợp lệ | Refresh token |
| `AUTH_INSUFFICIENT_PERMISSION` | 403 | Thiếu quyền | Liên hệ admin |
| `MISSING_RETAIL_CODE` | 400 | Thiếu Ma_co_so_ban_le | Cập nhật Chi nhánh |
| `MISSING_WHOLESALE_CODE` | 400 | Thiếu Ma_co_so_ban_buon | Cập nhật NCC |
| `MISSING_EXPIRY` | 400 | Thiếu hạn dùng lô | Bổ sung trên lô |
| `MISSING_REGISTRATION` | 400 | Thiếu số đăng ký | Liên kết CSDL QG |
| `VALIDATION_FAILED` | 400 | Dữ liệu không đạt chuẩn 540 | Sửa master data |
| `DUPLICATE_BATCH` | 409 | Batch đã gửi (hash trùng) | Bỏ qua |
| `NETWORK_ERROR` | 502 | Lỗi kết nối Cổng BYT | Retry |
| `MOH_RATE_LIMITED` | 429 | Vượt giới hạn Cổng BYT | Chờ + retry |
| `MOH_REJECTED` | 400 | Cục QLD từ chối bản ghi | Xem chi tiết lỗi |

---

## 12. Retry Policy

### 12.1 Chiến lược retry

| Loại lỗi | Retry | Backoff |
|----------|-------|---------|
| `NETWORK_ERROR` | Có | Exponential: 1m → 5m → 15m → 1h |
| `MOH_RATE_LIMITED` | Có | Fixed: 5 phút |
| `AUTH_INVALID_TOKEN` | Có | Refresh token ngay, retry 1 lần |
| `VALIDATION_FAILED` | Không | Sửa dữ liệu thủ công |
| `DUPLICATE_BATCH` | Không | Bỏ qua (idempotent) |
| `MOH_REJECTED` | Không | Sửa + tạo batch mới |

### 12.2 Cấu hình

```json
{
  "retryPolicy": {
    "maxAttempts": 5,
    "initialDelaySeconds": 60,
    "maxDelaySeconds": 3600,
    "backoffMultiplier": 3,
    "retryableErrors": ["NETWORK_ERROR", "MOH_RATE_LIMITED", "503"]
  }
}
```

### 12.3 Queue (Integration Outbox)

- Mọi batch chưa gửi thành công được đưa vào **Integration Outbox**
- Worker poll outbox mỗi 30 giây
- Dead letter sau 5 lần retry — cần can thiệp thủ công

---

## 13. Sequence Diagram

### 13.1 Luồng đồng bộ bán thuốc

```mermaid
sequenceDiagram
    participant POS as Novixa POS
    participant API as KitPlatform API
    participant DIS as Drug Integration Service
    participant Queue as Integration Outbox
    participant GW as API Gateway (BYT)
    participant QLD as Cục Quản lý Dược

    POS->>API: POST /api/sales/orders/{id}/complete
    API->>API: Trừ tồn FEFO, ghi stock_movements
    API->>Queue: Enqueue QD540 sale event
    Queue->>DIS: Poll outbox (30s)
    DIS->>DIS: Transform → QD540 Bảng 1 (23 trường)
    DIS->>DIS: Validate (mã CS, HSD, SĐK)
    DIS->>GW: POST /api/v1/drug/sales (OAuth2 JWT)
    GW->>QLD: Forward payload
    QLD-->>GW: 202 Accepted
    GW-->>DIS: syncBatchId + status
    DIS->>API: Ghi qd540_export_log (success)
    DIS-->>API: Update outbox status

    Note over DIS,QLD: Nếu lỗi → retry theo policy
```

### 13.2 Luồng tra cứu danh mục QG

```mermaid
sequenceDiagram
    participant Admin as Admin Web
    participant API as KitPlatform API
    participant Cat as NationalDrugCatalogService
    participant QG as CSDL Dược QG

    Admin->>API: GET /api/catalog/national-drugs?search=Paracetamol
    API->>Cat: SearchAsync()
    alt mode = live
        Cat->>QG: REST API (OAuth2)
        QG-->>Cat: Danh sách thuốc
    else mode = mock
        Cat->>Cat: MockNationalDrugCatalogService
    end
    Cat-->>API: PagedNationalDrugListResult
    API-->>Admin: JSON response
    Admin->>API: GET /api/catalog/national-drugs/{id}/prefill
    API-->>Admin: Prefill data → tạo sản phẩm
```

### 13.3 Luồng xuất kiểm thử QĐ 540

```mermaid
sequenceDiagram
    participant Admin as Admin Web
    participant API as KitPlatform API
    participant Svc as Qd540Table1Service
    participant DB as PostgreSQL

    Admin->>API: GET /api/pharmacy/integration/qd540/table1?from=2026-07-01&to=2026-07-10
    API->>Svc: ExportTable1Async()
    Svc->>DB: Load GRN lines + Sale lines
    DB-->>Svc: Source rows
    Svc->>Svc: Qd540Transform.MapSourceRow() × N
    Svc->>DB: INSERT qd540_export_log
    Svc-->>API: Qd540Table1ExportResult (rows + warnings)
    API-->>Admin: JSON preview
    Admin->>API: GET .../table1.csv
    API-->>Admin: Download CSV file
```

---

## 14. API Versioning

### 14.1 Chiến lược

| Version | Prefix | Trạng thái |
|---------|--------|------------|
| v1 | `/api/v1/drug/*` | Current — liên thông Cổng BYT |
| — | `/api/pharmacy/integration/qd540/*` | Internal — xuất kiểm thử |
| — | `/api/catalog/national-drugs/*` | Internal — tra cứu QG |

### 14.2 Quy tắc

- **Breaking change** → tăng major version (`/api/v2/...`)
- **Backward compatible** → giữ version, thêm field optional
- Header `Accept-Version: v1` (tùy chọn) cho client muốn pin version
- Deprecation notice: header `Sunset` + tài liệu 90 ngày trước khi ngừng

### 14.3 Changelog

| Version | Ngày | Thay đổi |
|---------|------|----------|
| 1.0 | 10/07/2026 | Phát hành ban đầu — QĐ 540 Bảng 1, QĐ 522 lookup |

---

**Công ty TNHH Truyền thông và Công nghệ KIT**  
*Novixa Drug Integration API Specification v1.0*
