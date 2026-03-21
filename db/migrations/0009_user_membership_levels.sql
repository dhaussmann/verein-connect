-- Create join table for many-to-many user <-> membership_levels
CREATE TABLE IF NOT EXISTS user_membership_levels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  level_id TEXT NOT NULL REFERENCES membership_levels(id),
  assigned_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_uml_user_level ON user_membership_levels(user_id, level_id);
CREATE INDEX IF NOT EXISTS idx_uml_level ON user_membership_levels(level_id);

-- Migrate existing membership_level_id data to the join table
INSERT INTO user_membership_levels (id, user_id, level_id)
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
       id, membership_level_id
FROM users
WHERE membership_level_id IS NOT NULL AND membership_level_id != '';
