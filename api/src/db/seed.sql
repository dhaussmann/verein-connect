-- ═══════════════════════════════════════════════════════════════════════════════
-- Verein Connect – Seed Data (Demo-Verein mit Beispieldaten)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Demo Organization
INSERT OR IGNORE INTO organizations (id, name, slug, settings, plan) VALUES
  ('org-demo-001', 'TSV Musterstadt 1890 e.V.', 'tsv-musterstadt', '{"type":"sport","language":"de","timezone":"Europe/Berlin"}', 'pro');

-- System Roles
INSERT OR IGNORE INTO roles (id, org_id, name, description, category, is_system, permissions, sort_order) VALUES
  ('role-admin',    'org-demo-001', 'org_admin',     'Vollzugriff auf alle Bereiche',            'system', 1, '["*"]', 1),
  ('role-memadmin', 'org-demo-001', 'member_admin',  'Mitglieder- und Rollenverwaltung',         'system', 1, '["members.*","roles.*"]', 2),
  ('role-evtadmin', 'org-demo-001', 'event_admin',   'Kurs- und Terminverwaltung',               'system', 1, '["events.*","courses.*"]', 3),
  ('role-finadmin', 'org-demo-001', 'finance_admin', 'Rechnungen und Buchhaltung',               'system', 1, '["invoices.*","payments.*","accounting.*"]', 4),
  ('role-trainer',  'org-demo-001', 'trainer',       'Anwesenheit erfassen, Kurse einsehen',     'system', 1, '["events.read","attendance.write","members.read"]', 5),
  ('role-member',   'org-demo-001', 'member',        'Basis-Mitgliedsrechte',                    'system', 1, '["profile.own","events.register","events.read","courses.read"]', 6);

-- Additional Group/Team Roles
INSERT OR IGNORE INTO roles (id, org_id, name, description, category, is_system, permissions, sort_order) VALUES
  ('role-1mannschaft', 'org-demo-001', '1. Mannschaft',    'Erste Mannschaft Fußball',   'team', 0, '["events.read"]', 10),
  ('role-2mannschaft', 'org-demo-001', '2. Mannschaft',    'Zweite Mannschaft Fußball',  'team', 0, '["events.read"]', 11),
  ('role-jugend',      'org-demo-001', 'Jugendabteilung',  'Jugendabteilung',            'team', 0, '["events.read"]', 12),
  ('role-vorstand',    'org-demo-001', 'Vorstand',         'Vereinsvorstand',            'department', 0, '["*"]', 20);

-- Demo Admin User (Passwort: "admin123" – bcrypt hash)
-- HINWEIS: In Produktion wird der Hash beim Register generiert
INSERT OR IGNORE INTO users (id, org_id, email, password_hash, first_name, last_name, display_name, status, member_number, qr_code) VALUES
  ('user-admin-001', 'org-demo-001', 'admin@tsv-musterstadt.de',
   '$2a$12$LJ3m4ys3Gz8y/nJqRkHMBeN1H/FGYwTMv7.p4Nt7eZ0cJB3/xHfGK',
   'Max', 'Mustermann', 'Max Mustermann', 'active', 'M-2024-001', 'qr-admin-001');

-- Assign admin + member role
INSERT OR IGNORE INTO user_roles (id, user_id, role_id, status) VALUES
  ('ur-001', 'user-admin-001', 'role-admin', 'active'),
  ('ur-002', 'user-admin-001', 'role-member', 'active'),
  ('ur-003', 'user-admin-001', 'role-vorstand', 'active');

-- Demo Members
INSERT OR IGNORE INTO users (id, org_id, email, password_hash, first_name, last_name, display_name, status, member_number, phone, mobile, birth_date, gender, street, zip, city, qr_code) VALUES
  ('user-002', 'org-demo-001', 'anna.schmidt@email.de', NULL, 'Anna', 'Schmidt', 'Anna Schmidt', 'active', 'M-2024-002', '089 1234567', '0170 1234567', '1992-03-15', 'weiblich', 'Hauptstr. 1', '80331', 'München', 'qr-002'),
  ('user-003', 'org-demo-001', 'thomas.mueller@email.de', NULL, 'Thomas', 'Müller', 'Thomas Müller', 'active', 'M-2024-003', '089 7654321', '0171 7654321', '1985-07-22', 'männlich', 'Bahnhofstr. 5', '80335', 'München', 'qr-003'),
  ('user-004', 'org-demo-001', 'lisa.weber@email.de', NULL, 'Lisa', 'Weber', 'Lisa Weber', 'active', 'M-2024-004', NULL, '0172 1111111', '1998-11-30', 'weiblich', 'Gartenweg 12', '80337', 'München', 'qr-004'),
  ('user-005', 'org-demo-001', 'jan.hoffmann@email.de', NULL, 'Jan', 'Hoffmann', 'Jan Hoffmann', 'active', 'M-2024-005', NULL, '0173 2222222', '1990-05-08', 'männlich', 'Ringstr. 8', '80339', 'München', 'qr-005'),
  ('user-006', 'org-demo-001', 'maria.braun@email.de', NULL, 'Maria', 'Braun', 'Maria Braun', 'inactive', 'M-2024-006', '089 9999999', NULL, '1975-01-20', 'weiblich', 'Schlossallee 3', '80333', 'München', 'qr-006'),
  ('user-007', 'org-demo-001', 'peter.koch@email.de', NULL, 'Peter', 'Koch', 'Peter Koch', 'pending', 'M-2024-007', NULL, '0174 3333333', '2001-09-12', 'männlich', NULL, NULL, NULL, 'qr-007');

-- Assign roles to demo members
INSERT OR IGNORE INTO user_roles (id, user_id, role_id, status) VALUES
  ('ur-010', 'user-002', 'role-member', 'active'),
  ('ur-011', 'user-002', 'role-trainer', 'active'),
  ('ur-012', 'user-003', 'role-member', 'active'),
  ('ur-013', 'user-003', 'role-1mannschaft', 'active'),
  ('ur-014', 'user-004', 'role-member', 'active'),
  ('ur-015', 'user-004', 'role-jugend', 'active'),
  ('ur-016', 'user-005', 'role-member', 'active'),
  ('ur-017', 'user-005', 'role-1mannschaft', 'active'),
  ('ur-018', 'user-005', 'role-evtadmin', 'active'),
  ('ur-019', 'user-006', 'role-member', 'active'),
  ('ur-020', 'user-007', 'role-member', 'active');

-- Event Categories
INSERT OR IGNORE INTO event_categories (id, org_id, name, color, sort_order) VALUES
  ('cat-training',  'org-demo-001', 'Training',    '#2E86C1', 1),
  ('cat-wettkampf', 'org-demo-001', 'Wettkampf',   '#E74C3C', 2),
  ('cat-workshop',  'org-demo-001', 'Workshop',     '#27AE60', 3),
  ('cat-lager',     'org-demo-001', 'Lager',        '#F39C12', 4),
  ('cat-freizeit',  'org-demo-001', 'Freizeit',     '#8E44AD', 5);

-- Demo Events / Courses
INSERT OR IGNORE INTO events (id, org_id, category_id, title, description, event_type, location, start_date, end_date, max_participants, fee_amount, auto_invoice, is_public, status, time_start, time_end, weekdays, created_by) VALUES
  ('evt-001', 'org-demo-001', 'cat-training', 'Fußball Training Erwachsene', 'Wöchentliches Training der 1. Mannschaft', 'recurring', 'Sportplatz A', '2026-01-07', '2026-12-31', 25, 0, 0, 0, 'active', '18:00', '20:00', '["Di","Do"]', 'user-admin-001'),
  ('evt-002', 'org-demo-001', 'cat-training', 'Jugendtraining', 'Fußball-Training für die Jugendabteilung', 'recurring', 'Sportplatz B', '2026-01-08', '2026-12-31', 30, 0, 0, 0, 'active', '16:00', '17:30', '["Mi","Fr"]', 'user-admin-001'),
  ('evt-003', 'org-demo-001', 'cat-workshop', 'Erste-Hilfe-Kurs', 'Auffrischungskurs Erste Hilfe für Trainer', 'single', 'Vereinsheim Raum 1', '2026-04-15', '2026-04-15', 15, 25.00, 1, 1, 'active', '09:00', '16:00', NULL, 'user-admin-001'),
  ('evt-004', 'org-demo-001', 'cat-lager', 'Sommercamp 2026', '5-tägiges Fußballcamp für Jugendliche', 'single', 'Sportgelände + Jugendherberge', '2026-07-20', '2026-07-25', 40, 180.00, 1, 1, 'active', '08:00', '18:00', NULL, 'user-admin-001'),
  ('evt-005', 'org-demo-001', 'cat-wettkampf', 'Vereinsturnier', 'Jährliches internes Vereinsturnier', 'single', 'Sportplatz A + B', '2026-06-14', '2026-06-14', 64, 5.00, 1, 1, 'active', '10:00', '18:00', NULL, 'user-admin-001');

-- Assign leaders to events
INSERT OR IGNORE INTO event_leaders (event_id, user_id, role_label) VALUES
  ('evt-001', 'user-002', 'Trainerin'),
  ('evt-002', 'user-002', 'Trainerin'),
  ('evt-003', 'user-admin-001', 'Kursleiter'),
  ('evt-004', 'user-002', 'Camp-Leiterin'),
  ('evt-004', 'user-005', 'Co-Trainer');

-- Some event registrations
INSERT OR IGNORE INTO event_registrations (id, event_id, user_id, status, registered_by) VALUES
  ('reg-001', 'evt-001', 'user-003', 'registered', 'user-003'),
  ('reg-002', 'evt-001', 'user-005', 'registered', 'user-005'),
  ('reg-003', 'evt-002', 'user-004', 'registered', 'user-004'),
  ('reg-004', 'evt-003', 'user-002', 'registered', 'user-002'),
  ('reg-005', 'evt-003', 'user-003', 'registered', 'user-003'),
  ('reg-006', 'evt-004', 'user-004', 'registered', 'user-004'),
  ('reg-007', 'evt-005', 'user-003', 'registered', 'user-003'),
  ('reg-008', 'evt-005', 'user-004', 'registered', 'user-004'),
  ('reg-009', 'evt-005', 'user-005', 'registered', 'user-005');

-- Demo Invoices
INSERT OR IGNORE INTO invoices (id, org_id, user_id, invoice_number, status, subtotal, total, due_date, notes, created_at) VALUES
  ('inv-001', 'org-demo-001', 'user-003', 'RE-2026-00001', 'paid', 120.00, 120.00, '2026-02-28', 'Mitgliedsbeitrag 2026', '2026-01-15T10:00:00Z'),
  ('inv-002', 'org-demo-001', 'user-004', 'RE-2026-00002', 'sent', 120.00, 120.00, '2026-02-28', 'Mitgliedsbeitrag 2026', '2026-01-15T10:00:00Z'),
  ('inv-003', 'org-demo-001', 'user-005', 'RE-2026-00003', 'overdue', 120.00, 120.00, '2026-02-28', 'Mitgliedsbeitrag 2026', '2026-01-15T10:00:00Z'),
  ('inv-004', 'org-demo-001', 'user-002', 'RE-2026-00004', 'draft', 25.00, 25.00, '2026-05-15', 'Erste-Hilfe-Kurs', '2026-03-17T10:00:00Z');

INSERT OR IGNORE INTO invoice_items (id, invoice_id, description, quantity, unit_price, total, sort_order) VALUES
  ('ii-001', 'inv-001', 'Mitgliedsbeitrag Erwachsene 2026', 1, 120.00, 120.00, 0),
  ('ii-002', 'inv-002', 'Mitgliedsbeitrag Jugend 2026', 1, 120.00, 120.00, 0),
  ('ii-003', 'inv-003', 'Mitgliedsbeitrag Erwachsene 2026', 1, 120.00, 120.00, 0),
  ('ii-004', 'inv-004', 'Erste-Hilfe-Kurs Teilnahmegebühr', 1, 25.00, 25.00, 0);

-- Demo Accounting Entries
INSERT OR IGNORE INTO accounting_entries (id, org_id, entry_date, type, category, description, amount, payment_method, created_by) VALUES
  ('acc-001', 'org-demo-001', '2026-01-20', 'income', 'Mitgliedsbeiträge', 'Zahlung Mitgliedsbeitrag Thomas Müller', 120.00, 'Überweisung', 'user-admin-001'),
  ('acc-002', 'org-demo-001', '2026-01-15', 'expense', 'Sportgeräte', 'Neue Trainingsbälle (10 Stk.)', -89.90, 'Rechnung', 'user-admin-001'),
  ('acc-003', 'org-demo-001', '2026-02-01', 'expense', 'Miete', 'Hallenmiete Februar', -350.00, 'Überweisung', 'user-admin-001'),
  ('acc-004', 'org-demo-001', '2026-02-10', 'income', 'Spenden', 'Spende Firma XY', 500.00, 'Überweisung', 'user-admin-001');

-- Demo Shop Products
INSERT OR IGNORE INTO shop_products (id, org_id, name, description, price, stock, category, members_only, is_active) VALUES
  ('prod-001', 'org-demo-001', 'Vereinstrikot', 'Offizielles Vereinstrikot 2025/26', 45.00, 50, 'Bekleidung', 1, 1),
  ('prod-002', 'org-demo-001', 'Trainingshose', 'Schwarze Trainingshose mit Vereinslogo', 29.90, 30, 'Bekleidung', 0, 1),
  ('prod-003', 'org-demo-001', 'Trinkflasche', 'Trinkflasche 750ml mit Vereinslogo', 12.50, 100, 'Zubehör', 0, 1),
  ('prod-004', 'org-demo-001', 'Schal', 'Fan-Schal TSV Musterstadt', 15.00, 25, 'Fan-Artikel', 0, 1);

-- Demo Profile Field Definitions
INSERT OR IGNORE INTO profile_field_definitions (id, org_id, field_name, field_label, field_type, category, is_required, is_searchable, sort_order) VALUES
  ('pfd-001', 'org-demo-001', 'trikot_nummer', 'Trikotnummer', 'number', 'Sport', 0, 1, 1),
  ('pfd-002', 'org-demo-001', 'position', 'Position', 'select', 'Sport', 0, 1, 2),
  ('pfd-003', 'org-demo-001', 'blutgruppe', 'Blutgruppe', 'select', 'Medizin', 0, 0, 3),
  ('pfd-004', 'org-demo-001', 'notfallkontakt', 'Notfallkontakt', 'text', 'Medizin', 1, 0, 4);

-- Demo Message Templates
INSERT OR IGNORE INTO message_templates (id, org_id, name, channel, subject, body) VALUES
  ('tpl-001', 'org-demo-001', 'Willkommen', 'email', 'Willkommen im {{verein}}!', '<p>Liebe/r {{vorname}},</p><p>herzlich willkommen im {{verein}}! Wir freuen uns, dich als neues Mitglied begrüßen zu dürfen.</p>'),
  ('tpl-002', 'org-demo-001', 'Zahlungserinnerung', 'email', 'Zahlungserinnerung – {{verein}}', '<p>Liebe/r {{vorname}},</p><p>wir möchten dich freundlich an die offene Rechnung erinnern.</p>'),
  ('tpl-003', 'org-demo-001', 'Training abgesagt', 'email', 'Training am {{datum}} entfällt', '<p>Liebe Mitglieder,</p><p>das Training am {{datum}} muss leider entfallen.</p>');

-- Initial Audit Log
INSERT OR IGNORE INTO audit_log (id, org_id, user_id, action, entity_type, entity_id, details) VALUES
  ('audit-001', 'org-demo-001', 'user-admin-001', 'Verein registriert', 'organization', 'org-demo-001', 'Demo-Verein TSV Musterstadt angelegt');
