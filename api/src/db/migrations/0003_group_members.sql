-- Add category column to groups
ALTER TABLE groups ADD COLUMN category TEXT DEFAULT 'standard';

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Mitglied',
  joined_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gm_unique ON group_members(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_gm_user ON group_members(user_id);
