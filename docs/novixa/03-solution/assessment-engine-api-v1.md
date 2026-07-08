# Assessment Engine — Public API v1

**Mã:** KIT-ASM-01 · **Tier:** T2 · **Version:** 1.0 · **Trạng thái:** Draft (schema + seed done; API implementation next)

> **Phạm vi v1:** Kênh **public web** — anonymous, gate tải báo cáo bằng SĐT/email.  
> **Template pilot:** `PHARMACY_V1` (30 câu, thang điểm **1–4**).  
> **Schema:** `migrations/068_assessment_engine.sql` · **Seed:** `migrations/069_assessment_pharmacy_v1_seed.sql`

**Liên quan:** [platform-kernel-and-solution-packs-v1.md](./platform-kernel-and-solution-packs-v1.md) · [assessment-public-wireframe-v1.md](../07-customer/assessment-public-wireframe-v1.md)

---

## 1. Nguyên tắc

| Quy tắc | Chi tiết |
|---------|----------|
| Anonymous | `tenant_id` NULL trên submission; không JWT bắt buộc |
| Session | `session_token` (cookie / header) để tiếp tục draft |
| Gate | Full report + PDF **sau** `capture-lead` (SĐT, email, …) |
| Preview | Sau `complete`: overall + category scores + 1–2 insight teaser |
| Score | Option.score **1–4**; G4/G5 `scorable=false` |
| Idempotent | Mỗi submission pin `template_id` + `template_version` |

**Base path (public):** `/api/public/assessment`

**Rate limit (khuyến nghị):** 30 req/min/IP; 5 capture-lead/phone/ngày.

---

## 2. Trạng thái submission

```text
draft  →  completed  →  lead_captured  →  report_ready
```

| Status | Mô tả |
|--------|--------|
| `draft` | Đang trả lời |
| `completed` | Đủ câu bắt buộc; preview unlocked |
| `lead_captured` | Đã form SĐT/email |
| `report_ready` | Insight + recommendation + PDF metadata |

---

## 3. Endpoints

### 3.1 Template (read-only)

#### `GET /api/public/assessment/templates/{code}`

Lấy cấu trúc khảo sát để render UI.

**Query:** `version` (optional, default latest active)

**Response 200:**

```json
{
  "id": "uuid",
  "code": "PHARMACY_V1",
  "name": "Đánh giá năng lực nhà thuốc",
  "version": "1.0",
  "categories": [
    {
      "code": "CUSTOMER",
      "name": "Khách hàng",
      "sortOrder": 1,
      "dimensions": [
        {
          "code": "CUSTOMER_OVERALL",
          "name": "Khách hàng (tổng)",
          "questions": [
            {
              "id": "uuid",
              "code": "C1",
              "title": "Nhà thuốc hiện có lưu hồ sơ khách hàng không?",
              "questionType": "single_choice",
              "scorable": true,
              "required": true,
              "sortOrder": 1,
              "options": [
                { "id": "uuid", "code": "OPT1", "label": "Không lưu", "score": 1, "sortOrder": 1 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Ghi chú:** Response **không** trả `score` cho option khi `scorable=false` (G4/G5) — hoặc trả `score: null`.

---

### 3.2 Submission lifecycle

#### `POST /api/public/assessment/submissions`

Tạo submission mới.

**Body:**

```json
{
  "templateCode": "PHARMACY_V1",
  "templateVersion": "1.0",
  "source": "public_web",
  "locale": "vi-VN"
}
```

**Response 201:**

```json
{
  "id": "uuid",
  "sessionToken": "64-char-hex",
  "status": "draft",
  "templateCode": "PHARMACY_V1",
  "templateVersion": "1.0",
  "expiresAt": "2026-07-12T12:00:00Z"
}
```

**Headers:** Set-Cookie `assessment_session={sessionToken}; HttpOnly; SameSite=Lax; Max-Age=604800`

---

#### `GET /api/public/assessment/submissions/{id}`

Resume draft. **Auth:** `X-Assessment-Session: {sessionToken}` hoặc cookie.

**Response 200:** submission + responses map `{ questionId: { optionId, textValue } }`

---

#### `PUT /api/public/assessment/submissions/{id}/responses`

Lưu / cập nhật câu trả lời (batch hoặc từng câu).

**Body:**

```json
{
  "responses": [
    { "questionId": "uuid", "optionId": "uuid" },
    { "questionId": "uuid", "optionId": "uuid", "textValue": null }
  ]
}
```

**Validation:**
- `required` questions must have option (or text for text type)
- `optionId` must belong to `questionId`
- Reject if submission.status ≠ `draft`

**Response 200:** `{ "saved": 2, "answeredRequired": 28, "totalRequired": 28 }`

---

#### `POST /api/public/assessment/submissions/{id}/complete`

Hoàn thành khảo sát → tính điểm → preview.

**Side effects:**
1. Rollup dimension → category → overall (weighted avg, scale 1–4)
2. Persist `assessment_*_score` rows
3. Evaluate `assessment_rule` → insight (teaser only: top 2 by priority)
4. `status = completed`, `completed_at = now()`

**Response 200:**

```json
{
  "status": "completed",
  "overallScore": 2.85,
  "overallPct": 61.7,
  "categoryScores": [
    { "code": "CUSTOMER", "name": "Khách hàng", "score": 3.2, "scorePct": 73.3 }
  ],
  "previewInsights": [
    { "title": "...", "body": "...", "severity": "info" }
  ],
  "reportLocked": true,
  "leadCaptureRequired": true
}
```

**Công thức pct:** `(score - 1) / 3 * 100`

---

#### `POST /api/public/assessment/submissions/{id}/capture-lead`

Gate tải báo cáo — **bắt buộc** trước full report/PDF.

**Body:**

```json
{
  "respondentName": "Nguyen Van A",
  "respondentPhone": "0909123456",
  "respondentEmail": "owner@example.com",
  "respondentOrgName": "Nha thuoc ABC",
  "respondentNote": "Muon tu van phan mem quan ly",
  "consentMarketing": true
}
```

**Validation:**
- `respondentPhone`: required, E.164 hoặc VN 10 số
- `respondentEmail`: required, email format
- `respondentName`, `respondentOrgName`: required min 2 chars
- submission.status must be `completed`

**Side effects:**
1. `status = lead_captured`, `lead_captured_at = now()`
2. Full rule evaluation → all insights + recommendations
3. Event `assessment.submission.lead_captured.v1` (platform_events, tenant_id NULL hoặc system tenant)
4. Optional: notify sales webhook

**Response 200:**

```json
{
  "status": "lead_captured",
  "reportToken": "one-time-or-session",
  "message": "Cam on. Bao cao da san sang."
}
```

---

#### `GET /api/public/assessment/submissions/{id}/report`

Full báo cáo phân tích.

**Auth:** session + status ≥ `lead_captured`

**Response 200:**

```json
{
  "submissionId": "uuid",
  "templateCode": "PHARMACY_V1",
  "completedAt": "...",
  "overallScore": 2.85,
  "overallPct": 61.7,
  "categoryScores": [ ... ],
  "dimensionScores": [ ... ],
  "insights": [ ... ],
  "recommendations": [ ... ],
  "qualitativeTags": {
    "painPoint": "pain_retention",
    "priorityNeed": "need_crm"
  },
  "pdf": {
    "available": true,
    "downloadUrl": "/api/public/assessment/submissions/{id}/report.pdf"
  }
}
```

---

#### `GET /api/public/assessment/submissions/{id}/report.pdf`

Stream PDF (generated on first request, metadata in `assessment_report`).

**Auth:** same as report  
**Response:** `application/pdf`, `Content-Disposition: attachment`

---

## 4. Scoring engine (v1)

```text
question_score = option.score (1-4) × question.weight   [if scorable]
dimension_score = weighted_avg(questions in dimension)
category_score  = weighted_avg(dimensions in category)
overall_score   = weighted_avg(categories)
```

**Lưu snapshot** vào `assessment_dimension_score`, `assessment_category_score`, `assessment_submission.overall_*`.

**G4/G5:** lưu response + tags từ `option.metadata.tag`; không vào rollup.

---

## 5. Rule engine (v1)

Expression syntax (MVP):

| Pattern | Ví dụ |
|---------|--------|
| Category score | `category.CUSTOMER.score < 2.5` |
| Dimension score | `dimension.CUSTOMER_OVERALL.score < 2` |
| Overall | `overall.score >= 3.5` |
| Qualitative | `response.G5.option_code = 'NEED_CRM'` |

`action_type`: `insight` | `recommendation` → payload từ `assessment_rule.action_payload`.

---

## 6. Errors

| HTTP | Code | Khi |
|------|------|-----|
| 400 | `validation_error` | Thiếu câu bắt buộc, option không hợp lệ |
| 401 | `session_invalid` | Sai / hết session_token |
| 403 | `report_locked` | Gọi report trước capture-lead |
| 404 | `not_found` | Submission / template không tồn tại |
| 409 | `already_completed` | Complete 2 lần |
| 429 | `rate_limited` | Quá giới hạn IP/phone |

---

## 7. Events (additive)

| Event type | Khi |
|------------|-----|
| `assessment.submission.completed.v1` | Sau complete (optional, no PII) |
| `assessment.submission.lead_captured.v1` | Sau capture-lead (phone hashed in payload option) |

---

## 8. Implementation checklist (code phase)

- [ ] `PlatformModuleCodes.Assessment`
- [ ] `AssessmentPublicController` (routes above)
- [ ] `AssessmentTemplateService`, `AssessmentSubmissionService`
- [ ] `AssessmentScoringEngine`, `AssessmentRuleEngine`
- [ ] PDF generator (HTML template → PDF)
- [ ] Public SPA `client/assessment-web` hoặc embed novixa-site
- [ ] Admin: list leads `/api/assessment/submissions` (JWT, sau)

---

## 9. Security

- Không expose `session_token` trong URL (cookie / header only)
- PDF URL signed, TTL 24h
- PII (phone/email) không log ở INFO
- CAPTCHA optional trên capture-lead (phase 2)

---

*Owner: Product / Platform · Next: C# services + public SPA*
