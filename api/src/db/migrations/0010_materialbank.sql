-- File categories for Materialbank
CREATE TABLE IF NOT EXISTS file_categories (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fc_org ON file_categories(org_id);

-- Extend files table with category, group, visibility, description
ALTER TABLE files ADD COLUMN category_id TEXT REFERENCES file_categories(id);
ALTER TABLE files ADD COLUMN group_id TEXT REFERENCES groups(id);
ALTER TABLE files ADD COLUMN visibility TEXT DEFAULT 'admin';
ALTER TABLE files ADD COLUMN description TEXT;
