UPDATE users
SET password_hash = 'ea43218ebe66ace354a062df1e95e487:5dae2927fc4f1794a1ebf2223728500b9b9bf666e926edbb50a7d1074cb4ce3a2937a6b38f31a74638f2cb8aef3bf95dae72957c387f59475f75c9a5432fa7f0'
WHERE email = 'admin@ehc-musterstadt.de';

INSERT OR IGNORE INTO auth_accounts (
  id,
  account_id,
  provider_id,
  user_id,
  password_hash,
  created_at,
  updated_at
)
SELECT
  'auth-account-admin-001',
  id,
  'credential',
  id,
  'ea43218ebe66ace354a062df1e95e487:5dae2927fc4f1794a1ebf2223728500b9b9bf666e926edbb50a7d1074cb4ce3a2937a6b38f31a74638f2cb8aef3bf95dae72957c387f59475f75c9a5432fa7f0',
  CAST(unixepoch('now') * 1000 AS INTEGER),
  CAST(unixepoch('now') * 1000 AS INTEGER)
FROM users
WHERE email = 'admin@ehc-musterstadt.de';

UPDATE auth_accounts
SET password_hash = 'ea43218ebe66ace354a062df1e95e487:5dae2927fc4f1794a1ebf2223728500b9b9bf666e926edbb50a7d1074cb4ce3a2937a6b38f31a74638f2cb8aef3bf95dae72957c387f59475f75c9a5432fa7f0',
    updated_at = CAST(unixepoch('now') * 1000 AS INTEGER)
WHERE provider_id = 'credential'
  AND user_id = (SELECT id FROM users WHERE email = 'admin@ehc-musterstadt.de');
