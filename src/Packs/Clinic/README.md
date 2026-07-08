# Clinic + CRM Pack (Solution Pack 2 — pilot)

Additive pack tables: `pack_clinic.*`, `pack_crm.*`. No changes to `kit_*` kernel schemas.

## Projects

| Project | Role |
|---------|------|
| `KitPlatform.Packs.Clinic.Application` | Pack metadata (`ClinicPackDefinition`) |
| `KitPlatform.Packs.Clinic.Infrastructure` | Pack DI stub — services added incrementally |

Migration: `migrations/078_pack_clinic_crm.sql`
