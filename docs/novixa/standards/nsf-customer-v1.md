# NSF-CUS — Customer Standard v1

**Outcome:** Hồ sơ khách lâu dài, gia đình, consent, không khai báo lại không cần thiết.

## Phạm vi

- Hồ sơ khách (`customers`), tài khoản app, consent, family members, chat, loyalty gắn KH.
- **Không** sở hữu đơn bán (Sales) hay tồn kho (Inventory).

## Capability tối thiểu (pilot)

Customer Profile · Search · Family · Consent · Loyalty · Communication (chat)

## Rules tham chiếu

`BR-ID-001` (tenant), consent channels, family status — xem `BusinessRuleIds`.

## API / code

Admin: `/api/customers/*` · App: `/api/customer-app/family`, consent, chat, loyalty
