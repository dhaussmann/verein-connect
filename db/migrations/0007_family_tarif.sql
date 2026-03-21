-- Extend families table with contract partner fields
ALTER TABLE families ADD COLUMN contract_partner_first_name TEXT;
ALTER TABLE families ADD COLUMN contract_partner_last_name TEXT;
ALTER TABLE families ADD COLUMN contract_partner_email TEXT;
ALTER TABLE families ADD COLUMN contract_partner_phone TEXT;
ALTER TABLE families ADD COLUMN contract_partner_street TEXT;
ALTER TABLE families ADD COLUMN contract_partner_zip TEXT;
ALTER TABLE families ADD COLUMN contract_partner_city TEXT;
ALTER TABLE families ADD COLUMN contract_partner_birth_date TEXT;
ALTER TABLE families ADD COLUMN contract_partner_member_id TEXT REFERENCES users(id);
ALTER TABLE families ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

-- Extend membership_types with family tarif fields
ALTER TABLE membership_types ADD COLUMN is_family_tarif INTEGER DEFAULT 0;
ALTER TABLE membership_types ADD COLUMN min_family_members INTEGER DEFAULT 3;

-- Extend contracts with family reference
ALTER TABLE contracts ADD COLUMN family_id TEXT REFERENCES families(id);

-- Index for families org lookup
CREATE INDEX IF NOT EXISTS idx_families_org ON families(org_id);
