ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1;

UPDATE users
SET display_name = CASE
  WHEN trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) <> '' THEN trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
  ELSE email
END
WHERE display_name IS NULL OR trim(display_name) = '';

CREATE TABLE IF NOT EXISTS auth_accounts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_accounts_provider_account ON auth_accounts(provider_id, account_id);
CREATE INDEX IF NOT EXISTS idx_auth_accounts_user ON auth_accounts(user_id);

INSERT INTO auth_accounts (
  id,
  account_id,
  provider_id,
  user_id,
  password_hash,
  created_at,
  updated_at
)
SELECT
  'cred-' || users.id,
  users.id,
  'credential',
  users.id,
  users.password_hash,
  CAST(unixepoch('now') * 1000 AS INTEGER),
  CAST(unixepoch('now') * 1000 AS INTEGER)
FROM users
WHERE users.password_hash IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM auth_accounts
    WHERE auth_accounts.provider_id = 'credential'
      AND auth_accounts.user_id = users.id
  );

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS auth_verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_verifications_identifier ON auth_verifications(identifier);
