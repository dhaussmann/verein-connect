-- Migration: Add membership_levels table, extend users and profile_field_definitions

-- Membership Levels
CREATE TABLE IF NOT EXISTS membership_levels (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  sort_order INTEGER DEFAULT 0,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_org_name ON membership_levels(org_id, name);

-- Add membership_level_id to users
ALTER TABLE users ADD COLUMN membership_level_id TEXT;

-- Extend profile_field_definitions with visibility columns
ALTER TABLE profile_field_definitions ADD COLUMN on_registration_form INTEGER DEFAULT 0;
ALTER TABLE profile_field_definitions ADD COLUMN editable_by_member INTEGER DEFAULT 0;
ALTER TABLE profile_field_definitions ADD COLUMN visible_to_member INTEGER DEFAULT 0;
ALTER TABLE profile_field_definitions ADD COLUMN admin_only INTEGER DEFAULT 0;
