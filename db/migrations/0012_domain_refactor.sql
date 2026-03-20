-- Phase 1: echtes Beitrittsdatum aus created_at ableiten, falls leer
UPDATE users
SET join_date = substr(created_at, 1, 10)
WHERE (join_date IS NULL OR join_date = '')
  AND created_at IS NOT NULL
  AND created_at != '';

-- Phase 2: Team-/Abteilungsrollen in Gruppen ueberfuehren
INSERT OR IGNORE INTO groups (id, org_id, name, description, category, created_at)
SELECT
  'grp-' || replace(lower(hex(randomblob(16))), ' ', ''),
  r.org_id,
  r.name,
  r.description,
  CASE
    WHEN r.category = 'team' THEN 'team'
    ELSE 'standard'
  END,
  datetime('now')
FROM roles r
WHERE r.category IN ('team', 'department');

INSERT OR IGNORE INTO group_members (id, group_id, user_id, role, joined_at)
SELECT
  'gm-' || replace(lower(hex(randomblob(16))), ' ', ''),
  g.id,
  ur.user_id,
  CASE
    WHEN r.name = 'trainer' THEN 'Trainer'
    ELSE 'Mitglied'
  END,
  datetime('now')
FROM user_roles ur
INNER JOIN roles r ON r.id = ur.role_id
INNER JOIN groups g ON g.org_id = r.org_id AND g.name = r.name
WHERE r.category IN ('team', 'department');

DELETE FROM user_roles
WHERE role_id IN (
  SELECT id FROM roles WHERE category IN ('team', 'department')
);

DELETE FROM roles
WHERE category IN ('team', 'department');

-- Phase 3: Mitgliedsstufen abbauen
DROP TABLE IF EXISTS user_membership_levels;
DROP TABLE IF EXISTS membership_levels;
-- membership_level_id bleibt in Alt-Datenbanken als Legacy-Spalte bestehen.
-- Das Feld wird von der Anwendung nicht mehr verwendet.

-- Phase 4: Events auf Gruppen umstellen
CREATE TABLE IF NOT EXISTS event_target_groups (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  max_from_group INTEGER,
  PRIMARY KEY (event_id, group_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_etg_event_group
  ON event_target_groups(event_id, group_id);
CREATE INDEX IF NOT EXISTS idx_etg_event
  ON event_target_groups(event_id);

INSERT OR IGNORE INTO event_target_groups (event_id, group_id)
SELECT etr.event_id, g.id
FROM event_target_roles etr
INNER JOIN roles r ON r.id = etr.role_id
INNER JOIN groups g ON g.org_id = r.org_id AND g.name = r.name;

DROP TABLE IF EXISTS event_target_roles;
