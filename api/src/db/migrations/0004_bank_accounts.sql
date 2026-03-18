-- Bank Accounts (1:1 per user)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_holder TEXT NOT NULL,
  iban TEXT NOT NULL,
  bic TEXT,
  bank_name TEXT,
  sepa_mandate INTEGER DEFAULT 0,
  sepa_mandate_date TEXT,
  sepa_mandate_ref TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_user ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_org ON bank_accounts(org_id);
