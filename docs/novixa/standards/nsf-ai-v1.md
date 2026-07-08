# NSF-AI — AI Standard v1

**Outcome:** AI hỗ trợ, không thay dược sĩ; an toàn và nhất quán với Policy.

## Pilot hiện tại

- Rule-based Copilot (`ICustomerAiHealthService`) qua `IAiOrchestrator`.
- Chỉ tham khảo; disclaimer bắt buộc.
- Log engagement `ai_ask` (không log PII câu hỏi ở Phase 1 analytics).

## Đường mục tiêu (không phá pilot)

```
User → App → IAiOrchestrator → Knowledge → Rules → Care/Medication contracts
```

**Cấm (khi nâng LLM):** AI service SQL trực tiếp vào bảng operational — phải qua context contracts.

## Rules

`BR-AI-001` độ dài câu hỏi · `BR-AI-002` knowledge tạm
