-- ═══════════════════════════════════════════════════════════════════════════════
-- Verein Connect – Contract Management Migration
-- ═══════════════════════════════════════════════════════════════════════════════

-- Extend existing invoices table
ALTER TABLE invoices ADD COLUMN contract_id TEXT;
CREATE INDEX IF NOT EXISTS idx_inv_contract ON invoices(contract_id);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_org_name ON groups(org_id, name);

-- Membership Types
CREATE TABLE IF NOT EXISTS membership_types (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  self_registration_enabled INTEGER DEFAULT 0,
  short_description TEXT,
  description TEXT,
  bank_account_id TEXT,
  invoice_category TEXT,
  vat_percent REAL DEFAULT 0,
  default_invoice_day INTEGER DEFAULT 1,
  activation_fee REAL DEFAULT 0,
  contract_type TEXT DEFAULT 'AUTO_RENEW',
  contract_duration_months INTEGER,
  renewal_duration_months INTEGER,
  cancellation_notice_days INTEGER DEFAULT 30,
  cancellation_notice_basis TEXT DEFAULT 'FROM_CANCELLATION',
  renewal_cancellation_days INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mt_org_name ON membership_types(org_id, name);

-- Tarifs
CREATE TABLE IF NOT EXISTS tarifs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  self_registration_enabled INTEGER DEFAULT 0,
  short_description TEXT,
  description TEXT,
  bank_account_id TEXT,
  invoice_category TEXT,
  vat_percent REAL DEFAULT 0,
  default_invoice_day INTEGER DEFAULT 1,
  activation_fee REAL DEFAULT 0,
  contract_type TEXT DEFAULT 'AUTO_RENEW',
  contract_duration_months INTEGER,
  renewal_duration_months INTEGER,
  cancellation_notice_days INTEGER DEFAULT 30,
  cancellation_notice_basis TEXT DEFAULT 'FROM_CANCELLATION',
  renewal_cancellation_days INTEGER,
  allowed_membership_type_ids TEXT DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tarifs_org_name ON tarifs(org_id, name);

-- Tarif Pricing
CREATE TABLE IF NOT EXISTS tarif_pricing (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  parent_id TEXT NOT NULL,
  parent_type TEXT NOT NULL,
  billing_period TEXT NOT NULL,
  price REAL NOT NULL,
  membership_type_id TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tp_unique ON tarif_pricing(parent_id, parent_type, billing_period, membership_type_id);

-- Discount Groups
CREATE TABLE IF NOT EXISTS discount_groups (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  rules TEXT DEFAULT '[]',
  group_id TEXT REFERENCES groups(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tarif Discounts
CREATE TABLE IF NOT EXISTS tarif_discounts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  parent_id TEXT NOT NULL,
  parent_type TEXT NOT NULL,
  billing_period TEXT NOT NULL,
  discount_group_id TEXT NOT NULL REFERENCES discount_groups(id),
  discount_type TEXT NOT NULL,
  discount_value REAL NOT NULL
);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  contract_number TEXT NOT NULL,
  member_id TEXT NOT NULL REFERENCES users(id),
  group_id TEXT REFERENCES groups(id),
  contract_kind TEXT NOT NULL,
  membership_type_id TEXT REFERENCES membership_types(id),
  tarif_id TEXT REFERENCES tarifs(id),
  parent_contract_id TEXT,
  status TEXT DEFAULT 'ACTIVE',
  start_date TEXT NOT NULL,
  end_date TEXT,
  billing_period TEXT,
  current_price REAL,
  discount_group_id TEXT REFERENCES discount_groups(id),
  activation_fee_charged INTEGER DEFAULT 0,
  paid_until TEXT,
  auto_renew INTEGER DEFAULT 0,
  renewal_duration_months INTEGER,
  cancellation_notice_days INTEGER,
  cancellation_notice_basis TEXT,
  renewal_cancellation_days INTEGER,
  cancellation_date TEXT,
  cancellation_effective_date TEXT,
  notes TEXT,
  has_notice INTEGER DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_org_number ON contracts(org_id, contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_member ON contracts(member_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(org_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_parent ON contracts(parent_contract_id);

-- Contract Pauses
CREATE TABLE IF NOT EXISTS contract_pauses (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  pause_from TEXT NOT NULL,
  pause_until TEXT NOT NULL,
  reason TEXT,
  credit_amount REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Contract Applications
CREATE TABLE IF NOT EXISTS contract_applications (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  member_id TEXT REFERENCES users(id),
  membership_type_id TEXT REFERENCES membership_types(id),
  tarif_id TEXT REFERENCES tarifs(id),
  billing_period TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  date_of_birth TEXT,
  additional_data TEXT DEFAULT '{}',
  status TEXT DEFAULT 'PENDING',
  submitted_at TEXT DEFAULT (datetime('now')),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  review_notes TEXT
);

-- Contract Settings
CREATE TABLE IF NOT EXISTS contract_settings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  invoice_publish_mode TEXT DEFAULT 'DRAFT',
  default_invoice_group_id TEXT REFERENCES groups(id),
  days_in_advance INTEGER DEFAULT 14,
  price_update_trigger TEXT DEFAULT 'ON_RENEWAL',
  sepa_required INTEGER DEFAULT 0,
  member_cancellation_allowed INTEGER DEFAULT 1,
  self_registration_enabled INTEGER DEFAULT 0,
  self_registration_access TEXT DEFAULT 'LINK_AND_FORM',
  welcome_page_text TEXT,
  confirmation_page_text TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_org ON contract_settings(org_id);
