# NOVIXA Domain Map v1 (15 domains)

**Mã:** NVX-DOM-01 · Map capability → code hiện tại · **Pilot-safe**  
**Platform:** Novixa = Pack:Pharmacy trên [KIT Platform](../03-solution/platform-kernel-and-solution-packs-v1.md) (KIT-PLT-01)

| # | Domain | Owner (founding) | Code / module hiện tại | NSF |
|---|--------|------------------|------------------------|-----|
| 1 | Customer | Product | `Customers`, `CustomerApp` (family, consent, chat, loyalty) | NSF-CUS |
| 2 | Medication | Product | `Catalog`, `ActiveIngredient`, drug knowledge tạm | NSF-MED |
| 3 | Inventory | Eng | `Inventory`, `IInventoryEngine` | NSF-INV |
| 4 | Sales | Eng | `Sales`, draft/reservation (CustomerApp channel) | — |
| 5 | Procurement | Eng | `Procurement` | — |
| 6 | Pricing | Eng | `IPricingEngine`, `SalesPricing`, `ProcurementPricing` | — |
| 7 | Finance | Eng | Receivables, payables, payments | — |
| 8 | Care | Product | Reminders, adherence, health, repurchase (CustomerApp) | NSF-CARE |
| 9 | AI | Product | `IAiOrchestrator`, `CustomerAiHealthService` | NSF-AI |
| 10 | Reporting | Eng | `Dashboard`, `Reports`, engagement analytics | — |
| 11 | Identity | Eng | `Auth`, `Identity`, platform tenant | POL-SEC |
| 12 | Notification | Eng | Push, OTP, in-app notifications | — |
| 13 | Integration | Eng | Outbox, CDP webhook | POL-INT |
| 14 | Master Data | Eng | Catalog, brands, units, national drug mock | NSF-MED |
| 15 | Knowledge | Product | **Chưa có bảng** — backlog G4 | NSF-AI |

**Kênh (không phải Domain):** Admin Web, Customer App, Staff App, `novixa-site`.
