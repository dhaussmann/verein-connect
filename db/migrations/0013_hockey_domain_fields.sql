ALTER TABLE roles ADD COLUMN role_type TEXT DEFAULT 'staff';
ALTER TABLE roles ADD COLUMN scope TEXT DEFAULT 'club';
ALTER TABLE roles ADD COLUMN is_assignable INTEGER DEFAULT 1;

ALTER TABLE groups ADD COLUMN group_type TEXT DEFAULT 'standard';
ALTER TABLE groups ADD COLUMN age_band TEXT;
ALTER TABLE groups ADD COLUMN gender_scope TEXT DEFAULT 'mixed';
ALTER TABLE groups ADD COLUMN season TEXT;
ALTER TABLE groups ADD COLUMN league TEXT;
ALTER TABLE groups ADD COLUMN location TEXT;
ALTER TABLE groups ADD COLUMN training_focus TEXT;
ALTER TABLE groups ADD COLUMN visibility TEXT DEFAULT 'internal';
ALTER TABLE groups ADD COLUMN admission_open INTEGER DEFAULT 1;
ALTER TABLE groups ADD COLUMN max_members INTEGER;
ALTER TABLE groups ADD COLUMN max_goalies INTEGER;

UPDATE roles
SET
  role_type = CASE
    WHEN category = 'system' OR is_system = 1 THEN 'system'
    WHEN name IN ('trainer', 'co_trainer') THEN 'trainer'
    WHEN name IN ('team_manager', 'betreuer') THEN 'support'
    WHEN name IN ('member', 'player') THEN 'player'
    ELSE 'staff'
  END,
  scope = CASE
    WHEN category = 'system' OR is_system = 1 THEN 'club'
    WHEN name IN ('trainer', 'co_trainer', 'team_manager', 'betreuer') THEN 'group'
    ELSE 'club'
  END,
  is_assignable = CASE
    WHEN category = 'system' OR is_system = 1 THEN 0
    ELSE 1
  END
WHERE role_type IS NULL OR scope IS NULL OR is_assignable IS NULL;

UPDATE groups
SET
  group_type = CASE
    WHEN lower(name) LIKE '%u7%' THEN 'youth_team'
    WHEN lower(name) LIKE '%u9%' THEN 'youth_team'
    WHEN lower(name) LIKE '%u11%' THEN 'youth_team'
    WHEN lower(name) LIKE '%u13%' THEN 'youth_team'
    WHEN lower(name) LIKE '%u15%' THEN 'youth_team'
    WHEN lower(name) LIKE '%u17%' THEN 'youth_team'
    WHEN lower(name) LIKE '%u20%' THEN 'youth_team'
    WHEN lower(name) LIKE '%goalie%' OR lower(name) LIKE '%torh%' THEN 'goalie'
    WHEN category = 'team' THEN 'team'
    ELSE 'standard'
  END,
  age_band = CASE
    WHEN upper(name) LIKE '%U7%' THEN 'U7'
    WHEN upper(name) LIKE '%U9%' THEN 'U9'
    WHEN upper(name) LIKE '%U11%' THEN 'U11'
    WHEN upper(name) LIKE '%U13%' THEN 'U13'
    WHEN upper(name) LIKE '%U15%' THEN 'U15'
    WHEN upper(name) LIKE '%U17%' THEN 'U17'
    WHEN upper(name) LIKE '%U20%' THEN 'U20'
    WHEN lower(name) LIKE '%herren%' OR lower(name) LIKE '%damen%' THEN 'Senioren'
    ELSE NULL
  END,
  visibility = COALESCE(visibility, 'internal'),
  admission_open = COALESCE(admission_open, 1)
WHERE group_type IS NULL;

WITH hockey_profile_fields (
  id, category, field_name, field_label, field_type, options,
  is_required, is_searchable, is_visible_registration, on_registration_form,
  editable_by_member, visible_to_member, admin_only, sort_order, gdpr_retention_days
) AS (
  VALUES
    ('pfd-hockey-position', 'Sport', 'position', 'Position', 'select', '["Torwart","Verteidiger","Stuermer","Hybrid"]', 0, 1, 1, 1, 1, 1, 0, 20, 3650),
    ('pfd-hockey-shoots', 'Sport', 'shoots', 'Schusshand', 'select', '["Links","Rechts"]', 0, 1, 1, 1, 1, 1, 0, 21, 3650),
    ('pfd-hockey-jersey', 'Sport', 'jersey_number', 'Rueckennummer', 'text', NULL, 0, 1, 1, 1, 1, 1, 0, 22, 3650),
    ('pfd-hockey-pass-number', 'Sport', 'player_pass_number', 'Spielerpassnummer', 'text', NULL, 0, 1, 0, 0, 0, 0, 1, 23, 3650),
    ('pfd-hockey-pass-status', 'Sport', 'player_pass_status', 'Spielerpass-Status', 'select', '["Nicht beantragt","In Bearbeitung","Aktiv","Gesperrt"]', 0, 1, 0, 0, 0, 0, 1, 24, 3650),
    ('pfd-hockey-medical', 'Medizin', 'medical_clearance_until', 'Sportfreigabe gueltig bis', 'text', NULL, 0, 0, 1, 1, 0, 0, 1, 25, 3650),
    ('pfd-hockey-emergency-name', 'Notfall', 'emergency_contact_name', 'Notfallkontakt', 'text', NULL, 0, 1, 1, 1, 1, 1, 0, 26, 3650),
    ('pfd-hockey-emergency-phone', 'Notfall', 'emergency_contact_phone', 'Notfalltelefon', 'text', NULL, 0, 1, 1, 1, 1, 1, 0, 27, 3650),
    ('pfd-hockey-insurance', 'Medizin', 'health_insurance', 'Krankenkasse', 'text', NULL, 0, 1, 0, 0, 1, 1, 0, 28, 3650),
    ('pfd-hockey-allergies', 'Medizin', 'allergies', 'Allergien', 'text', NULL, 0, 1, 0, 0, 1, 1, 0, 29, 3650),
    ('pfd-hockey-medication', 'Medizin', 'medication_notes', 'Medikamente / Hinweise', 'text', NULL, 0, 0, 0, 0, 1, 1, 0, 30, 3650),
    ('pfd-hockey-skate-size', 'Ausrüstung', 'skate_size', 'Schlittschuhgroesse', 'text', NULL, 0, 1, 0, 0, 1, 1, 0, 31, 3650)
)
INSERT OR IGNORE INTO profile_field_definitions (
  id, org_id, category, field_name, field_label, field_type, options,
  is_required, is_searchable, is_visible_registration, on_registration_form,
  editable_by_member, visible_to_member, admin_only, sort_order, gdpr_retention_days
)
SELECT
  defs.id, org.id, defs.category, defs.field_name, defs.field_label, defs.field_type, defs.options,
  defs.is_required, defs.is_searchable, defs.is_visible_registration, defs.on_registration_form,
  defs.editable_by_member, defs.visible_to_member, defs.admin_only, defs.sort_order, defs.gdpr_retention_days
FROM organizations org
JOIN hockey_profile_fields defs
WHERE org.id = 'org-demo-001';
