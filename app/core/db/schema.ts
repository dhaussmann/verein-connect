import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Organizations ───────────────────────────────────────────────────────────
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  settings: text('settings').default('{}'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const dbCounters = sqliteTable('db_counters', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  scope: text('scope').notNull(),
  value: integer('value').notNull().default(0),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ([
  uniqueIndex('idx_db_counters_org_scope').on(table.orgId, table.scope),
]));

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(true),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  status: text('status').default('active'),
  memberNumber: text('member_number'),
  phone: text('phone'),
  mobile: text('mobile'),
  birthDate: text('birth_date'),
  gender: text('gender'),
  street: text('street'),
  zip: text('zip'),
  city: text('city'),
  joinDate: text('join_date'),
  qrCode: text('qr_code').$defaultFn(() => crypto.randomUUID()),
  lastLogin: text('last_login'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ([
  uniqueIndex('idx_users_org_email').on(table.orgId, table.email),
  index('idx_users_org').on(table.orgId),
  index('idx_users_status').on(table.orgId, table.status),
  index('idx_users_qr').on(table.qrCode),
]));

export const authAccounts = sqliteTable('auth_accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ([
  uniqueIndex('idx_auth_accounts_provider_account').on(table.providerId, table.accountId),
  index('idx_auth_accounts_user').on(table.userId),
]));

export const authSessions = sqliteTable('auth_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text('token').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ([
  uniqueIndex('idx_auth_sessions_token').on(table.token),
  index('idx_auth_sessions_user').on(table.userId),
  index('idx_auth_sessions_expires').on(table.expiresAt),
]));

export const authVerifications = sqliteTable('auth_verifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ([
  index('idx_auth_verifications_identifier').on(table.identifier),
]));

// ─── Profile Field Definitions (EAV) ────────────────────────────────────────
export const profileFieldDefinitions = sqliteTable('profile_field_definitions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  category: text('category').default('general'),
  fieldName: text('field_name').notNull(),
  fieldLabel: text('field_label').notNull(),
  fieldType: text('field_type').notNull(),
  options: text('options'),
  isRequired: integer('is_required').default(0),
  isSearchable: integer('is_searchable').default(1),
  isVisibleRegistration: integer('is_visible_registration').default(0),
  onRegistrationForm: integer('on_registration_form').default(0),
  editableByMember: integer('editable_by_member').default(0),
  visibleToMember: integer('visible_to_member').default(0),
  adminOnly: integer('admin_only').default(0),
  sortOrder: integer('sort_order').default(0),
  gdprRetentionDays: integer('gdpr_retention_days'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ([
  uniqueIndex('idx_pfd_org_name').on(table.orgId, table.fieldName),
]));

// ─── Profile Field Values (EAV) ─────────────────────────────────────────────
export const profileFieldValues = sqliteTable('profile_field_values', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fieldId: text('field_id').notNull().references(() => profileFieldDefinitions.id, { onDelete: 'cascade' }),
  value: text('value'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ([
  uniqueIndex('idx_pfv_user_field').on(table.userId, table.fieldId),
  index('idx_pfv_user').on(table.userId),
  index('idx_pfv_field').on(table.fieldId, table.value),
]));

// ─── Roles ───────────────────────────────────────────────────────────────────
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').default('general'),
  roleType: text('role_type').default('staff'),
  scope: text('scope').default('club'),
  isAssignable: integer('is_assignable').default(1),
  isSystem: integer('is_system').default(0),
  maxMembers: integer('max_members'),
  permissions: text('permissions').default('[]'),
  parentRoleId: text('parent_role_id'),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ([
  uniqueIndex('idx_roles_org_name').on(table.orgId, table.name),
]));

// ─── User Roles ──────────────────────────────────────────────────────────────
export const userRoles = sqliteTable('user_roles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  isLeader: integer('is_leader').default(0),
  startDate: text('start_date').notNull().default(sql`(date('now'))`),
  endDate: text('end_date').default('9999-12-31'),
  status: text('status').default('active'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ([
  uniqueIndex('idx_ur_unique').on(table.userId, table.roleId, table.startDate),
  index('idx_ur_user').on(table.userId),
  index('idx_ur_role').on(table.roleId),
  index('idx_ur_active').on(table.roleId, table.status, table.endDate),
]));

// ─── Families ────────────────────────────────────────────────────────────────
export const families = sqliteTable('families', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  primaryContactId: text('primary_contact_id').references(() => users.id),
  discountPercent: real('discount_percent').default(0),
  contractPartnerFirstName: text('contract_partner_first_name'),
  contractPartnerLastName: text('contract_partner_last_name'),
  contractPartnerEmail: text('contract_partner_email'),
  contractPartnerPhone: text('contract_partner_phone'),
  contractPartnerStreet: text('contract_partner_street'),
  contractPartnerZip: text('contract_partner_zip'),
  contractPartnerCity: text('contract_partner_city'),
  contractPartnerBirthDate: text('contract_partner_birth_date'),
  contractPartnerMemberId: text('contract_partner_member_id').references(() => users.id),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ([
  index('idx_families_org').on(table.orgId),
]));

export const familyMembers = sqliteTable('family_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  relationship: text('relationship').default('member'),
  isBillingContact: integer('is_billing_contact').default(0),
}, (table) => ([
  uniqueIndex('idx_fm_unique').on(table.familyId, table.userId),
]));

// ─── Event Categories ────────────────────────────────────────────────────────
export const eventCategories = sqliteTable('event_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  color: text('color').default('#2E86C1'),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
}, (table) => ([
  uniqueIndex('idx_ec_org_name').on(table.orgId, table.name),
]));

// ─── Events ──────────────────────────────────────────────────────────────────
export const events = sqliteTable('events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  categoryId: text('category_id').references(() => eventCategories.id),
  title: text('title').notNull(),
  description: text('description'),
  eventType: text('event_type').notNull(),
  location: text('location'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  recurrenceRule: text('recurrence_rule'),
  maxParticipants: integer('max_participants'),
  registrationDeadline: text('registration_deadline'),
  cancellationDeadline: text('cancellation_deadline'),
  feeAmount: real('fee_amount').default(0),
  feeCurrency: text('fee_currency').default('EUR'),
  autoInvoice: integer('auto_invoice').default(0),
  isPublic: integer('is_public').default(0),
  status: text('status').default('active'),
  timeStart: text('time_start'),
  timeEnd: text('time_end'),
  weekdays: text('weekdays'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ([
  index('idx_events_org').on(table.orgId, table.startDate),
  index('idx_events_type').on(table.orgId, table.eventType, table.status),
]));

// ─── Event Occurrences ───────────────────────────────────────────────────────
export const eventOccurrences = sqliteTable('event_occurrences', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  isCancelled: integer('is_cancelled').default(0),
  overrideLocation: text('override_location'),
  notes: text('notes'),
}, (table) => ([
  index('idx_eo_event').on(table.eventId, table.startDate),
  index('idx_eo_start').on(table.startDate),
]));

// ─── Event Target Groups ─────────────────────────────────────────────────────
export const eventTargetGroups = sqliteTable('event_target_groups', {
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  maxFromGroup: integer('max_from_group'),
}, (table) => ([
  uniqueIndex('idx_etg_event_group').on(table.eventId, table.groupId),
  index('idx_etg_event').on(table.eventId),
]));

// ─── Event Registrations ─────────────────────────────────────────────────────
export const eventRegistrations = sqliteTable('event_registrations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  occurrenceId: text('occurrence_id').references(() => eventOccurrences.id),
  userId: text('user_id').notNull().references(() => users.id),
  status: text('status').default('registered'),
  waitlistPosition: integer('waitlist_position'),
  cancellationReason: text('cancellation_reason'),
  registeredAt: text('registered_at').default(sql`(datetime('now'))`),
  registeredBy: text('registered_by').references(() => users.id),
  invoiceId: text('invoice_id'),
}, (table) => ([
  uniqueIndex('idx_er_unique').on(table.eventId, table.userId, table.occurrenceId),
  index('idx_er_event').on(table.eventId, table.status),
  index('idx_er_user').on(table.userId),
]));

// ─── Event Leaders ───────────────────────────────────────────────────────────
export const eventLeaders = sqliteTable('event_leaders', {
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  roleLabel: text('role_label').default('Trainer'),
  showOnRegistration: integer('show_on_registration').default(1),
}, (table) => ([
  uniqueIndex('idx_el_event_user').on(table.eventId, table.userId),
  index('idx_el_event').on(table.eventId),
]));

// ─── Attendance ──────────────────────────────────────────────────────────────
export const attendance = sqliteTable('attendance', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  occurrenceId: text('occurrence_id').notNull().references(() => eventOccurrences.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  status: text('status').notNull(),
  checkedInAt: text('checked_in_at'),
  checkedInBy: text('checked_in_by').references(() => users.id),
  checkInMethod: text('check_in_method').default('manual'),
  notes: text('notes'),
}, (table) => ([
  uniqueIndex('idx_att_unique').on(table.occurrenceId, table.userId),
  index('idx_att_occ').on(table.occurrenceId),
  index('idx_att_user').on(table.userId, table.status),
]));

// ─── Messages ────────────────────────────────────────────────────────────────
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  senderId: text('sender_id').references(() => users.id),
  channel: text('channel').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  templateId: text('template_id'),
  isPublished: integer('is_published').default(0),
  publishDate: text('publish_date'),
  status: text('status').default('draft'),
  scheduledAt: text('scheduled_at'),
  sentAt: text('sent_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ([
  index('idx_messages_org_created').on(table.orgId, table.createdAt),
  index('idx_messages_org_status_created').on(table.orgId, table.status, table.createdAt),
  index('idx_messages_org_channel_created').on(table.orgId, table.channel, table.createdAt),
]));

export const messageRecipients = sqliteTable('message_recipients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  recipientType: text('recipient_type').notNull(),
  recipientId: text('recipient_id'),
  deliveryStatus: text('delivery_status').default('pending'),
  deliveredAt: text('delivered_at'),
}, (table) => ([
  index('idx_message_recipients_message').on(table.messageId),
]));

export const messageTemplates = sqliteTable('message_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  channel: text('channel').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  signature: text('signature'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ([
  index('idx_message_templates_org_created').on(table.orgId, table.createdAt),
]));

// ─── Invoices ────────────────────────────────────────────────────────────────
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  userId: text('user_id').notNull().references(() => users.id),
  invoiceNumber: text('invoice_number').notNull(),
  type: text('type').default('invoice'),
  status: text('status').default('draft'),
  subtotal: real('subtotal').notNull(),
  taxRate: real('tax_rate').default(0),
  taxAmount: real('tax_amount').default(0),
  total: real('total').notNull(),
  currency: text('currency').default('EUR'),
  dueDate: text('due_date'),
  paidAt: text('paid_at'),
  paymentMethod: text('payment_method'),
  stripePaymentId: text('stripe_payment_id'),
  pdfUrl: text('pdf_url'),
  notes: text('notes'),
  contractId: text('contract_id'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ([
  uniqueIndex('idx_inv_org_number').on(table.orgId, table.invoiceNumber),
  index('idx_inv_contract').on(table.contractId),
  index('idx_inv_org_created').on(table.orgId, table.createdAt),
  index('idx_inv_org_status_created').on(table.orgId, table.status, table.createdAt),
  index('idx_inv_user_created').on(table.userId, table.createdAt),
]));

export const invoiceItems = sqliteTable('invoice_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: real('quantity').default(1),
  unitPrice: real('unit_price').notNull(),
  total: real('total').notNull(),
  eventId: text('event_id').references(() => events.id),
  sortOrder: integer('sort_order').default(0),
}, (table) => ([
  index('idx_invoice_items_invoice_sort').on(table.invoiceId, table.sortOrder),
]));

// ─── Accounting ──────────────────────────────────────────────────────────────
export const accountingEntries = sqliteTable('accounting_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  invoiceId: text('invoice_id').references(() => invoices.id),
  entryDate: text('entry_date').notNull(),
  type: text('type').notNull(),
  category: text('category'),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method'),
  receiptUrl: text('receipt_url'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ([
  index('idx_ae_org_entry_date').on(table.orgId, table.entryDate),
  index('idx_ae_invoice').on(table.invoiceId),
]));

// ─── Saved Filters ───────────────────────────────────────────────────────────
export const savedFilters = sqliteTable('saved_filters', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  createdBy: text('created_by').references(() => users.id),
  name: text('name').notNull(),
  entityType: text('entity_type').notNull(),
  filterRules: text('filter_rules').notNull(),
  columns: text('columns'),
  isFavorite: integer('is_favorite').default(0),
  isShared: integer('is_shared').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ─── Audit Log ───────────────────────────────────────────────────────────────
export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ([
  index('idx_audit_org_created').on(table.orgId, table.createdAt),
  index('idx_audit_user_created').on(table.userId, table.createdAt),
]));

// ─── Groups (Vertragsgruppen) ───────────────────────────────────────────────
export const groups = sqliteTable('groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').default('standard'),
  groupType: text('group_type').default('standard'),
  ageBand: text('age_band'),
  genderScope: text('gender_scope').default('mixed'),
  season: text('season'),
  league: text('league'),
  location: text('location'),
  trainingFocus: text('training_focus'),
  visibility: text('visibility').default('internal'),
  admissionOpen: integer('admission_open').default(1),
  maxMembers: integer('max_members'),
  maxGoalies: integer('max_goalies'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ([
  uniqueIndex('idx_groups_org_name').on(table.orgId, table.name),
]));

// ─── Group Members (Mitglieder-Gruppen-Zuordnung) ──────────────────────────
export const groupMembers = sqliteTable('group_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').default('Mitglied'),
  joinedAt: text('joined_at').default(sql`(datetime('now'))`),
}, (table) => ([
  uniqueIndex('idx_gm_unique').on(table.groupId, table.userId),
  index('idx_gm_user').on(table.userId),
]));

// ─── Membership Types (Mitgliedsarten) ──────────────────────────────────────
export const membershipTypes = sqliteTable('membership_types', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  isActive: integer('is_active').default(1),
  selfRegistrationEnabled: integer('self_registration_enabled').default(0),
  shortDescription: text('short_description'),
  description: text('description'),
  bankAccountId: text('bank_account_id'),
  invoiceCategory: text('invoice_category'),
  vatPercent: real('vat_percent').default(0),
  defaultInvoiceDay: integer('default_invoice_day').default(1),
  activationFee: real('activation_fee').default(0),
  contractType: text('contract_type').default('AUTO_RENEW'),
  contractDurationMonths: integer('contract_duration_months'),
  renewalDurationMonths: integer('renewal_duration_months'),
  cancellationNoticeDays: integer('cancellation_notice_days').default(30),
  cancellationNoticeBasis: text('cancellation_notice_basis').default('FROM_CANCELLATION'),
  renewalCancellationDays: integer('renewal_cancellation_days'),
  applicationRequirements: text('application_requirements').default('[]'),
  isFamilyTarif: integer('is_family_tarif').default(0),
  minFamilyMembers: integer('min_family_members').default(3),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ([
  uniqueIndex('idx_mt_org_name').on(table.orgId, table.name),
]));

// ─── Tarifs ─────────────────────────────────────────────────────────────────
export const tarifs = sqliteTable('tarifs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  isActive: integer('is_active').default(1),
  selfRegistrationEnabled: integer('self_registration_enabled').default(0),
  shortDescription: text('short_description'),
  description: text('description'),
  bankAccountId: text('bank_account_id'),
  invoiceCategory: text('invoice_category'),
  vatPercent: real('vat_percent').default(0),
  defaultInvoiceDay: integer('default_invoice_day').default(1),
  activationFee: real('activation_fee').default(0),
  contractType: text('contract_type').default('AUTO_RENEW'),
  contractDurationMonths: integer('contract_duration_months'),
  renewalDurationMonths: integer('renewal_duration_months'),
  cancellationNoticeDays: integer('cancellation_notice_days').default(30),
  cancellationNoticeBasis: text('cancellation_notice_basis').default('FROM_CANCELLATION'),
  renewalCancellationDays: integer('renewal_cancellation_days'),
  applicationRequirements: text('application_requirements').default('[]'),
  allowedMembershipTypeIds: text('allowed_membership_type_ids').default('[]'),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ([
  uniqueIndex('idx_tarifs_org_name').on(table.orgId, table.name),
]));

// ─── Tarif Pricing (Preise pro Abrechnungszeitraum) ─────────────────────────
export const tarifPricing = sqliteTable('tarif_pricing', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  parentId: text('parent_id').notNull(),
  parentType: text('parent_type').notNull(),
  billingPeriod: text('billing_period').notNull(),
  price: real('price').notNull(),
  membershipTypeId: text('membership_type_id'),
}, (table) => ([
  uniqueIndex('idx_tp_unique').on(table.parentId, table.parentType, table.billingPeriod, table.membershipTypeId),
  index('idx_tp_parent_period').on(table.parentId, table.parentType, table.billingPeriod),
]));

// ─── Discount Groups (Rabattgruppen) ────────────────────────────────────────
export const discountGroups = sqliteTable('discount_groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  rules: text('rules').default('[]'),
  groupId: text('group_id').references(() => groups.id),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ─── Tarif Discounts ────────────────────────────────────────────────────────
export const tarifDiscounts = sqliteTable('tarif_discounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  parentId: text('parent_id').notNull(),
  parentType: text('parent_type').notNull(),
  billingPeriod: text('billing_period').notNull(),
  discountGroupId: text('discount_group_id').notNull().references(() => discountGroups.id),
  discountType: text('discount_type').notNull(),
  discountValue: real('discount_value').notNull(),
});

// ─── Contracts (Verträge) ───────────────────────────────────────────────────
export const contracts = sqliteTable('contracts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  contractNumber: text('contract_number').notNull(),
  memberId: text('member_id').notNull().references(() => users.id),
  groupId: text('group_id').references(() => groups.id),
  contractKind: text('contract_kind').notNull(),
  membershipTypeId: text('membership_type_id').references(() => membershipTypes.id),
  tarifId: text('tarif_id').references(() => tarifs.id),
  parentContractId: text('parent_contract_id'),
  familyId: text('family_id').references(() => families.id),
  status: text('status').default('ACTIVE'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  billingPeriod: text('billing_period'),
  currentPrice: real('current_price'),
  discountGroupId: text('discount_group_id').references(() => discountGroups.id),
  activationFeeCharged: integer('activation_fee_charged').default(0),
  paidUntil: text('paid_until'),
  autoRenew: integer('auto_renew').default(0),
  renewalDurationMonths: integer('renewal_duration_months'),
  cancellationNoticeDays: integer('cancellation_notice_days'),
  cancellationNoticeBasis: text('cancellation_notice_basis'),
  renewalCancellationDays: integer('renewal_cancellation_days'),
  cancellationDate: text('cancellation_date'),
  cancellationEffectiveDate: text('cancellation_effective_date'),
  notes: text('notes'),
  hasNotice: integer('has_notice').default(0),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ([
  uniqueIndex('idx_contracts_org_number').on(table.orgId, table.contractNumber),
  index('idx_contracts_member').on(table.memberId),
  index('idx_contracts_status').on(table.orgId, table.status),
  index('idx_contracts_parent').on(table.parentContractId),
  index('idx_contracts_org_member').on(table.orgId, table.memberId),
  index('idx_contracts_org_group').on(table.orgId, table.groupId),
  index('idx_contracts_org_created').on(table.orgId, table.createdAt),
  index('idx_contracts_org_status_paid').on(table.orgId, table.status, table.paidUntil),
]));

// ─── Contract Pauses (Vertragspausen) ───────────────────────────────────────
export const contractPauses = sqliteTable('contract_pauses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  contractId: text('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  pauseFrom: text('pause_from').notNull(),
  pauseUntil: text('pause_until').notNull(),
  reason: text('reason'),
  creditAmount: real('credit_amount').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ([
  index('idx_contract_pauses_contract_dates').on(table.contractId, table.pauseFrom, table.pauseUntil),
]));

// ─── Contract Applications (Selbstregistrierungs-Anträge) ───────────────────
export const contractApplications = sqliteTable('contract_applications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  memberId: text('member_id').references(() => users.id),
  membershipTypeId: text('membership_type_id').references(() => membershipTypes.id),
  tarifId: text('tarif_id').references(() => tarifs.id),
  billingPeriod: text('billing_period'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  address: text('address'),
  dateOfBirth: text('date_of_birth'),
  additionalData: text('additional_data').default('{}'),
  status: text('status').default('PENDING'),
  submittedAt: text('submitted_at').default(sql`(datetime('now'))`),
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewedAt: text('reviewed_at'),
  reviewNotes: text('review_notes'),
}, (table) => ([
  index('idx_ca_org_status_submitted').on(table.orgId, table.status, table.submittedAt),
  index('idx_ca_org_submitted').on(table.orgId, table.submittedAt),
]));

// ─── Contract Settings (Org-weite Vertragseinstellungen) ────────────────────
export const contractSettings = sqliteTable('contract_settings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  invoicePublishMode: text('invoice_publish_mode').default('DRAFT'),
  defaultInvoiceGroupId: text('default_invoice_group_id').references(() => groups.id),
  daysInAdvance: integer('days_in_advance').default(14),
  priceUpdateTrigger: text('price_update_trigger').default('ON_RENEWAL'),
  sepaRequired: integer('sepa_required').default(0),
  memberCancellationAllowed: integer('member_cancellation_allowed').default(1),
  selfRegistrationEnabled: integer('self_registration_enabled').default(0),
  selfRegistrationAccess: text('self_registration_access').default('LINK_AND_FORM'),
  welcomePageText: text('welcome_page_text'),
  confirmationPageText: text('confirmation_page_text'),
}, (table) => ([
  uniqueIndex('idx_cs_org').on(table.orgId),
]));

// ─── Bank Accounts ──────────────────────────────────────────────────────────
export const bankAccounts = sqliteTable('bank_accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountHolder: text('account_holder').notNull(),
  iban: text('iban').notNull(),
  bic: text('bic'),
  bankName: text('bank_name'),
  sepaMandate: integer('sepa_mandate').default(0),
  sepaMandateDate: text('sepa_mandate_date'),
  sepaMandateRef: text('sepa_mandate_ref'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ([
  uniqueIndex('idx_bank_user').on(table.userId),
  index('idx_bank_org').on(table.orgId),
]));

// ─── Guardians (Erziehungsberechtigte) ──────────────────────────────────────
export const guardians = sqliteTable('guardians', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').notNull().references(() => organizations.id),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  street: text('street'),
  zip: text('zip'),
  city: text('city'),
  phone: text('phone'),
  email: text('email'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ([
  index('idx_guardians_user').on(table.userId),
  index('idx_guardians_org').on(table.orgId),
]));
