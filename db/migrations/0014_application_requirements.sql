ALTER TABLE membership_types ADD COLUMN application_requirements TEXT DEFAULT '[]';
ALTER TABLE tarifs ADD COLUMN application_requirements TEXT DEFAULT '[]';

UPDATE membership_types
SET application_requirements = CASE
  WHEN lower(name) LIKE '%jugend%' THEN '["guardian","group","sport_profile"]'
  ELSE '[]'
END
WHERE application_requirements IS NULL OR application_requirements = '';

UPDATE tarifs
SET application_requirements = CASE
  WHEN lower(name) LIKE '%camp%' THEN '["group","sport_profile","medical_clearance"]'
  ELSE '[]'
END
WHERE application_requirements IS NULL OR application_requirements = '';
