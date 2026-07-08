## KIT Platform scope

- **Layer:** <!-- Platform | Pack:Pharmacy | Pack:FamilyOS | Channel — see docs/novixa/03-solution/platform-kernel-and-solution-packs-v1.md -->
- **Pack / product:** <!-- Novixa Pharmacy (default pilot) | KIT Platform only | other pack -->

## Domain & EA

- **Domain:** <!-- e.g. care, inventory, sales — see docs/novixa/domains/domain-map-v1.md -->
- **Capability:** <!-- e.g. POS checkout, AI copilot, module gate -->
- **Business rules:** <!-- e.g. BR-INV-001, BR-PRC-002 or "new BR — describe" -->
- **NSF / Policy:** <!-- e.g. NSF-INV, POL-AI -->

## Pilot safety

- [ ] Không breaking API / schema cho 3 nhà thuốc pilot
- [ ] Engine / Domain contract additive (wrap logic cũ nếu refactor)
- [ ] Hành vi POS / kho / app khách không đổi (hoặc ghi rõ thay đổi)
- [ ] **Platform PR:** không nhét logic pack-specific (thuốc, family, clinic) vào `Core/Engines`
- [ ] **Pack PR:** không sửa kernel behavior (tenant, sales core, inventory FEFO) trừ khi bugfix có test

## Test plan

<!-- Cách verify -->
