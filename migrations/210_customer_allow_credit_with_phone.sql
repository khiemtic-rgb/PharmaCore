-- Customers with a phone number may buy on credit by default.
-- Ops can turn off allow_credit per customer later.

UPDATE customers
SET allow_credit = TRUE
WHERE deleted_at IS NULL
  AND allow_credit = FALSE
  AND phone IS NOT NULL
  AND length(trim(phone)) > 0
  AND length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 8;
