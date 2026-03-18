-- ═══════════════════════════════════════════════════════════════════════════════
-- Verein Connect – Initial D1 Migration
-- ═══════════════════════════════════════════════════════════════════════════════

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  settings TEXT DEFAULT '{}',
  plan TEXT DEFAULT 'free',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL,
  password_hash TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active',
  member_number TEXT,
  phone TEXT,
  mobile TEXT,
  birth_date TEXT,
  gender TEXT,
  street TEXT,
  zip TEXT,
  city TEXT,
  qr_code TEXT,
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_org_email ON users(org_id, email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(org_id, status);
CREATE INDEX IF NOT EXISTS idx_users_qr ON users(qr_code);

-- Profile Field Definitions (EAV)
CREATE TABLE IF NOT EXISTS profile_field_definitions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  category TEXT DEFAULT 'general',
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  options TEXT,
  is_required INTEGER DEFAULT 0,
  is_searchable INTEGER DEFAULT 1,
  is_visible_registration INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  gdpr_retention_days INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pfd_org_name ON profile_field_definitions(org_id, field_name);

-- Profile Field Values (EAV)
CREATE TABLE IF NOT EXISTS profile_field_values (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL REFERENCES profile_field_definitions(id) ON DELETE CASCADE,
  value TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pfv_user_field ON profile_field_values(user_id, field_id);
CREATE INDEX IF NOT EXISTS idx_pfv_user ON profile_field_values(user_id);
CREATE INDEX IF NOT EXISTS idx_pfv_field ON profile_field_values(field_id, value);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_system INTEGER DEFAULT 0,
  max_members INTEGER,
  permissions TEXT DEFAULT '[]',
  parent_role_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_org_name ON roles(org_id, name);

-- User Roles
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  is_leader INTEGER DEFAULT 0,
  start_date TEXT NOT NULL DEFAULT (date('now')),
  end_date TEXT DEFAULT '9999-12-31',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ur_unique ON user_roles(user_id, role_id, start_date);
CREATE INDEX IF NOT EXISTS idx_ur_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_ur_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_ur_active ON user_roles(role_id, status, end_date);

-- Families
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  primary_contact_id TEXT REFERENCES users(id),
  discount_percent REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS family_members (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'member',
  is_billing_contact INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fm_unique ON family_members(family_id, user_id);

-- Event Categories
CREATE TABLE IF NOT EXISTS event_categories (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#2E86C1',
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ec_org_name ON event_categories(org_id, name);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  category_id TEXT REFERENCES event_categories(id),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  location TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  recurrence_rule TEXT,
  max_participants INTEGER,
  registration_deadline TEXT,
  cancellation_deadline TEXT,
  fee_amount REAL DEFAULT 0,
  fee_currency TEXT DEFAULT 'EUR',
  auto_invoice INTEGER DEFAULT 0,
  is_public INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  time_start TEXT,
  time_end TEXT,
  weekdays TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_org ON events(org_id, start_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(org_id, event_type, status);

-- Event Occurrences
CREATE TABLE IF NOT EXISTS event_occurrences (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_cancelled INTEGER DEFAULT 0,
  override_location TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_eo_event ON event_occurrences(event_id, start_date);

-- Event Target Roles
CREATE TABLE IF NOT EXISTS event_target_roles (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  max_from_role INTEGER,
  PRIMARY KEY (event_id, role_id)
);

-- Event Registrations
CREATE TABLE IF NOT EXISTS event_registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  occurrence_id TEXT REFERENCES event_occurrences(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'registered',
  waitlist_position INTEGER,
  cancellation_reason TEXT,
  registered_at TEXT DEFAULT (datetime('now')),
  registered_by TEXT REFERENCES users(id),
  invoice_id TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_er_unique ON event_registrations(event_id, user_id, occurrence_id);
CREATE INDEX IF NOT EXISTS idx_er_event ON event_registrations(event_id, status);
CREATE INDEX IF NOT EXISTS idx_er_user ON event_registrations(user_id);

-- Event Leaders
CREATE TABLE IF NOT EXISTS event_leaders (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  role_label TEXT DEFAULT 'Trainer',
  show_on_registration INTEGER DEFAULT 1,
  PRIMARY KEY (event_id, user_id)
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  occurrence_id TEXT NOT NULL REFERENCES event_occurrences(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  checked_in_at TEXT,
  checked_in_by TEXT REFERENCES users(id),
  check_in_method TEXT DEFAULT 'manual',
  notes TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_att_unique ON attendance(occurrence_id, user_id);
CREATE INDEX IF NOT EXISTS idx_att_occ ON attendance(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_att_user ON attendance(user_id, status);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  sender_id TEXT REFERENCES users(id),
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  template_id TEXT,
  is_published INTEGER DEFAULT 0,
  publish_date TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_at TEXT,
  sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS message_recipients (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL,
  recipient_id TEXT,
  delivery_status TEXT DEFAULT 'pending',
  delivered_at TEXT
);

CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  signature TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  invoice_number TEXT NOT NULL,
  type TEXT DEFAULT 'invoice',
  status TEXT DEFAULT 'draft',
  subtotal REAL NOT NULL,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total REAL NOT NULL,
  currency TEXT DEFAULT 'EUR',
  due_date TEXT,
  paid_at TEXT,
  payment_method TEXT,
  stripe_payment_id TEXT,
  pdf_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_org_number ON invoices(org_id, invoice_number);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL DEFAULT 1,
  unit_price REAL NOT NULL,
  total REAL NOT NULL,
  event_id TEXT REFERENCES events(id),
  sort_order INTEGER DEFAULT 0
);

-- Accounting
CREATE TABLE IF NOT EXISTS accounting_entries (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  invoice_id TEXT REFERENCES invoices(id),
  entry_date TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT,
  receipt_url TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Shop
CREATE TABLE IF NOT EXISTS shop_products (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  category TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  currency TEXT DEFAULT 'EUR',
  stock INTEGER,
  image_url TEXT,
  is_active INTEGER DEFAULT 1,
  members_only INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shop_orders (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  order_number TEXT,
  status TEXT DEFAULT 'pending',
  total REAL NOT NULL,
  invoice_id TEXT REFERENCES invoices(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shop_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES shop_products(id),
  quantity INTEGER DEFAULT 1,
  unit_price REAL NOT NULL,
  total REAL NOT NULL
);

-- Files
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  folder_path TEXT DEFAULT '/',
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  r2_key TEXT NOT NULL,
  uploaded_by TEXT REFERENCES users(id),
  access_roles TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Saved Filters
CREATE TABLE IF NOT EXISTS saved_filters (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  created_by TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  filter_rules TEXT NOT NULL,
  columns TEXT,
  is_favorite INTEGER DEFAULT 0,
  is_shared INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Chat Conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT,
  is_group INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_participants (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  last_read_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cp_unique ON chat_participants(conversation_id, user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
