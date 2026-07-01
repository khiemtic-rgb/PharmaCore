-- product_kind for active-medication catalog filter (from 051, additive for older DBs)

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS product_kind VARCHAR(30) NOT NULL DEFAULT 'pharmacy_drug';

UPDATE products
SET product_kind = 'pharmacy_drug'
WHERE product_kind IS NULL OR TRIM(product_kind) = '';
