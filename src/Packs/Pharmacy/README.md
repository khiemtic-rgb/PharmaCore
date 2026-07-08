# Novixa Pharmacy Pack (Solution Pack 1)

Physical home for pack-scoped code on KIT Platform. Strangler move — API routes and DB tables unchanged.

## Projects

| Project | Role |
|---------|------|
| `KitPlatform.Packs.Pharmacy.Application` | Pack contracts: Care, Knowledge, pack metadata |
| `KitPlatform.Packs.Pharmacy.Infrastructure` | Pack DI + Care/Knowledge implementations |

Platform kernel stays in `src/KitPlatform.*` — **no** reference from kernel to pack. API calls `AddPharmacyPack()` after `AddInfrastructure()`.

## Default modules

See `PharmacyPackDefinition.DefaultEnabledModules` — sync with migration `051` pilot backfill.

## Roadmap (move dần)

- [x] Application: Care + Knowledge contracts
- [x] Infrastructure: Care + Knowledge implementations (`AddPharmacyPack()`)
- [x] Pack event handlers: order completed, return completed
- [x] Customer App medication services (`CustomerActiveMedication*` in pack; `ReminderScheduleHelper` in kernel Application)

Governance: PR label `Layer: Pack:Pharmacy` — [platform-kernel doc](../../docs/novixa/03-solution/platform-kernel-and-solution-packs-v1.md).
