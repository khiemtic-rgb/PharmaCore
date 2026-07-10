-- Pilot NT_XUANHOA: gán dispensing_class cho SKU Rx thực tế (kháng sinh + codeine)
-- Chạy sau 097_rx_strict_pilot_nt_xuanhoa.sql

-- Kháng sinh / kháng sinh kết hợp → kê đơn (drug_type=2)
UPDATE products p
SET
    drug_type = 2,
    dispensing_class = 'prescription',
    updated_at = NOW()
FROM tenants t
WHERE p.tenant_id = t.id
  AND t.tenant_code = 'NT_XUANHOA'
  AND p.deleted_at IS NULL
  AND (
    lower(p.product_name) ~ '(amoxicillin|augmentin|ampicillin|cefixim|cefuroxim|azithromycin|ciprofloxacin|levofloxacin|metronidazol|doxycyclin|clarithromycin|cefadroxil|cefalexin|cefaclor|moxiflox|clavulan|zinnat|rocephin|spiramycin|ofloxacin|norfloxacin|erythromycin|cotrimoxazol|bactrim|linezolid|meropenem|vancomycin|ceftriaxone|zitromax|zopucef|vinaflam.*cefurox|ofialin|zinnat)'
    OR lower(COALESCE(p.generic_name, '')) ~ '(amoxicillin|augmentin|ampicillin|cefixim|cefuroxim|azithromycin|ciprofloxacin|levofloxacin|metronidazol|doxycyclin|clarithromycin|cefadroxil|cefalexin|moxiflox|clavulan|zinnat|erythromycin|cotrimoxazol|ceftriaxone)'
  );

-- Thuốc kiểm soát (codeine…) → controlled (drug_type=3)
UPDATE products p
SET
    drug_type = 3,
    dispensing_class = 'controlled',
    updated_at = NOW()
FROM tenants t
WHERE p.tenant_id = t.id
  AND t.tenant_code = 'NT_XUANHOA'
  AND p.deleted_at IS NULL
  AND lower(p.product_name) ~ '(codein|morphin|tramadol|fentanyl|methadone|midazolam|ketamin)';
