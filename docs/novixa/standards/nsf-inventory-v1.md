# NSF-INV — Inventory Standard v1

**Outcome:** Giảm sai sót xuất kho, giảm cận hạn, tồn có sổ cái.

## Phạm vi

- Warehouse, batch, expiry, transfer, stock count, receiving (qua GRN), low stock.
- **Nguồn truth:** `stock_movements` — không sửa tồn ngoài workflow chuẩn.

## Capability tối thiểu (pilot)

Receiving · Transfer · Stock Count · Batch/Expiry (FEFO) · Low stock alert

## Rules tham chiếu

`BR-INV-001` FEFO · `BR-INV-002` insufficient stock · `BR-INV-003` movements truth

## Engine

`IInventoryEngine` (wrap `IBatchResolver` / `BatchResolver`)
