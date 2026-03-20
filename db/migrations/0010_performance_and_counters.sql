CREATE TABLE IF NOT EXISTS db_counters (
  id TEXT PRIMARY KEY NOT NULL,
  org_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_db_counters_org_scope
  ON db_counters(org_id, scope);

CREATE UNIQUE INDEX IF NOT EXISTS idx_etr_event_role
  ON event_target_roles(event_id, role_id);
CREATE INDEX IF NOT EXISTS idx_etr_event
  ON event_target_roles(event_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_el_event_user
  ON event_leaders(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_el_event
  ON event_leaders(event_id);

CREATE INDEX IF NOT EXISTS idx_event_occurrences_start_date
  ON event_occurrences(start_date);

CREATE INDEX IF NOT EXISTS idx_messages_org_created
  ON messages(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_org_status_created
  ON messages(org_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_org_channel_created
  ON messages(org_id, channel, created_at);
CREATE INDEX IF NOT EXISTS idx_message_recipients_message
  ON message_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_org_created
  ON message_templates(org_id, created_at);

CREATE INDEX IF NOT EXISTS idx_inv_org_created
  ON invoices(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inv_org_status_created
  ON invoices(org_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_inv_user_created
  ON invoices(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_sort
  ON invoice_items(invoice_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_ae_org_entry_date
  ON accounting_entries(org_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_ae_invoice
  ON accounting_entries(invoice_id);

CREATE INDEX IF NOT EXISTS idx_audit_org_created
  ON audit_log(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user_created
  ON audit_log(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_tp_parent_period
  ON tarif_pricing(parent_id, parent_type, billing_period);

CREATE INDEX IF NOT EXISTS idx_contracts_org_member
  ON contracts(org_id, member_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org_group
  ON contracts(org_id, group_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org_created
  ON contracts(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_contracts_org_status_paid
  ON contracts(org_id, status, paid_until);

CREATE INDEX IF NOT EXISTS idx_contract_pauses_contract_dates
  ON contract_pauses(contract_id, pause_from, pause_until);

CREATE INDEX IF NOT EXISTS idx_ca_org_status_submitted
  ON contract_applications(org_id, status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_ca_org_submitted
  ON contract_applications(org_id, submitted_at);
