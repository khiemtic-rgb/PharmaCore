# NOVIXA Business Policies — catalog tối thiểu

**Version:** 1.0 · Policies **sinh** Business Rules (BR-ID trong code).

| ID | Policy | Sinh ra (ví dụ) | Thực thi pilot |
|----|--------|-----------------|----------------|
| POL-PRIV | Customer Privacy | Consent trước chat/push/CDP | `customer_consents`, app consent APIs |
| POL-MED | Medication | Disclaimer AI; không chẩn đoán | Copilot disclaimer |
| POL-INV | Inventory | FEFO; movements truth | `IInventoryEngine` / BatchResolver |
| POL-AUDIT | Audit | Ghi nhận thay đổi quan trọng | `IAuditEngine` |
| POL-DATA | Data | Tenant isolation | `tenant_id`, accessors |
| POL-SEC | Security | RBAC staff; OTP customer | JWT + policies |
| POL-AI | AI | Tham khảo; escalate chat dược sĩ | `IAiOrchestrator`, SuggestChat |
| POL-INT | Integration | Outbox, không mất event | `IntegrationOutbox*` |

Chi tiết mở rộng từng policy khi compliance / LLM production.
