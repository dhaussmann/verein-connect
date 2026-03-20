const API_BASE = import.meta.env.VITE_API_URL || 'https://verein-connect-api.cloudflareone-demo-account.workers.dev';

let accessToken: string | null = localStorage.getItem('access_token');
let refreshToken: string | null = localStorage.getItem('refresh_token');

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Don't set Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // If 401 and we have a refresh token, try refreshing
  if (res.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  if (res.status === 401) {
    clearTokens();
    window.location.href = '/login';
    throw new ApiError(401, 'Nicht authentifiziert');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const msg = body.details ? `${body.error}: ${JSON.stringify(body.details)}` : body.error || body.message || 'Fehler';
    throw new ApiError(res.status, msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  clubName: string;
  avatarUrl?: string | null;
  roles?: string[];
  permissions?: string[];
  organization?: { id: string; name: string; slug: string; plan: string };
}

export interface AuthResponse {
  user: AuthUser;
  organization?: { id: string; name: string; slug: string; plan: string };
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface MeResponse {
  user: AuthUser & {
    roles: string[];
    permissions: string[];
    organization: { id: string; name: string; slug: string; plan: string };
  };
}

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { org_name: string; org_type: string; first_name: string; last_name: string; email: string; password: string }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<MeResponse>('/auth/me'),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string) =>
    request<{ success: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    }),
};

// ─── Members ─────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  birthDate: string;
  gender: string;
  street: string;
  zip: string;
  city: string;
  status: 'Aktiv' | 'Inaktiv' | 'Ausstehend';
  roles: string[];
  groups: { id: string; name: string; category: string | null; role: string | null }[];
  joinDate: string;
  avatarInitials: string;
  customFields: Record<string, string>;
  familyId?: string;
  familyRelation?: string;
  membershipLevels?: { id: string; name: string; color: string }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; per_page: number; total_pages: number };
}

export const membersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<PaginatedResponse<Member>>(`/v1/members${qs}`);
  },

  get: (id: string) => request<Member>(`/v1/members/${id}`),

  create: (data: Partial<Member> & { password?: string; role_ids?: string[] }) =>
    request<Member>('/v1/members', {
      method: 'POST',
      body: JSON.stringify({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        mobile: data.mobile,
        birth_date: data.birthDate,
        gender: data.gender,
        street: data.street,
        zip: data.zip,
        city: data.city,
        status: data.status === 'Aktiv' ? 'active' : data.status === 'Inaktiv' ? 'inactive' : data.status === 'Ausstehend' ? 'pending' : data.status,
        profile_fields: data.customFields,
        password: data.password,
        role_ids: data.role_ids,
      }),
    }),

  update: (id: string, data: Partial<Member>) =>
    request<Member>(`/v1/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(data.firstName !== undefined && { first_name: data.firstName }),
        ...(data.lastName !== undefined && { last_name: data.lastName }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.mobile !== undefined && { mobile: data.mobile }),
        ...(data.birthDate !== undefined && { birth_date: data.birthDate }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.street !== undefined && { street: data.street }),
        ...(data.zip !== undefined && { zip: data.zip }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.status !== undefined && { status: data.status === 'Aktiv' ? 'active' : data.status === 'Inaktiv' ? 'inactive' : data.status === 'Ausstehend' ? 'pending' : data.status }),
        ...(data.customFields !== undefined && { profile_fields: data.customFields }),
        ...(data.membershipLevels !== undefined && { membership_level_ids: data.membershipLevels.map(l => l.id) }),
      }),
    }),

  delete: (id: string) =>
    request<void>(`/v1/members/${id}?hard=true`, { method: 'DELETE' }),

  bulkAction: (action: string, memberIds: string[]) =>
    request<{ affected: number }>('/v1/members/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, member_ids: memberIds }),
    }),
};

// ─── Bank Accounts ──────────────────────────────────────────────────────────

export interface BankAccount {
  id: string;
  userId: string;
  accountHolder: string;
  iban: string;
  bic: string | null;
  bankName: string | null;
  sepaMandate: boolean;
  sepaMandateDate: string | null;
  sepaMandateRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export const bankAccountApi = {
  get: (memberId: string) =>
    request<BankAccount | null>(`/v1/members/${memberId}/bank-account`),

  upsert: (memberId: string, data: {
    account_holder: string;
    iban: string;
    bic?: string | null;
    bank_name?: string | null;
    sepa_mandate?: boolean;
    sepa_mandate_date?: string | null;
    sepa_mandate_ref?: string | null;
  }) =>
    request<{ id: string }>(`/v1/members/${memberId}/bank-account`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (memberId: string) =>
    request<{ success: boolean }>(`/v1/members/${memberId}/bank-account`, {
      method: 'DELETE',
    }),
};

// ─── Guardians (Erziehungsberechtigte) ──────────────────────────────────────

export interface Guardian {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export const guardianApi = {
  list: (memberId: string) =>
    request<Guardian[]>(`/v1/members/${memberId}/guardians`),

  create: (memberId: string, data: {
    first_name: string;
    last_name: string;
    street?: string | null;
    zip?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
  }) =>
    request<{ id: string; created: boolean }>(`/v1/members/${memberId}/guardians`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (memberId: string, guardianId: string, data: {
    first_name: string;
    last_name: string;
    street?: string | null;
    zip?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
  }) =>
    request<{ id: string; updated: boolean }>(`/v1/members/${memberId}/guardians/${guardianId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (memberId: string, guardianId: string) =>
    request<{ success: boolean }>(`/v1/members/${memberId}/guardians/${guardianId}`, {
      method: 'DELETE',
    }),
};

// ─── Families (Familienprofile) ──────────────────────────────────────────────

export interface FamilyMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  birthDate?: string;
  relationship?: string;
}

export interface FamilyProfile {
  id: string;
  name: string;
  contractPartnerFirstName: string | null;
  contractPartnerLastName: string | null;
  contractPartnerEmail: string | null;
  contractPartnerPhone: string | null;
  contractPartnerStreet: string | null;
  contractPartnerZip: string | null;
  contractPartnerCity: string | null;
  contractPartnerBirthDate: string | null;
  contractPartnerMemberId: string | null;
  memberCount: number;
  members: FamilyMember[];
  hasActiveContract: boolean;
  activeContractNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyDetail extends FamilyProfile {
  contracts: {
    id: string;
    contractNumber: string;
    status: string;
    currentPrice: number;
    billingPeriod: string;
    startDate: string;
    endDate: string | null;
  }[];
}

export type FamilyCreateData = {
  name: string;
  contract_partner_first_name: string;
  contract_partner_last_name: string;
  contract_partner_email?: string | null;
  contract_partner_phone?: string | null;
  contract_partner_street?: string | null;
  contract_partner_zip?: string | null;
  contract_partner_city?: string | null;
  contract_partner_birth_date?: string | null;
  contract_partner_member_id?: string | null;
};

export const familyApi = {
  list: () =>
    request<FamilyProfile[]>('/v1/families'),

  get: (id: string) =>
    request<FamilyDetail>(`/v1/families/${id}`),

  create: (data: FamilyCreateData) =>
    request<{ id: string; created: boolean }>('/v1/families', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: FamilyCreateData) =>
    request<{ id: string; updated: boolean }>(`/v1/families/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/v1/families/${id}`, {
      method: 'DELETE',
    }),

  addMember: (familyId: string, data: { user_id: string; relationship?: string }) =>
    request<{ id: string; created: boolean }>(`/v1/families/${familyId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeMember: (familyId: string, userId: string) =>
    request<{ success: boolean }>(`/v1/families/${familyId}/members/${userId}`, {
      method: 'DELETE',
    }),
};

// ─── Roles ───────────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  category: string;
  memberCount: number;
  isSystem: boolean;
  description: string;
  permissions: string[];
  maxMembers?: number;
  parentRoleId?: string;
}

export const rolesApi = {
  list: () => request<Role[]>('/v1/roles'),

  get: (id: string) => request<Role>(`/v1/roles/${id}`),

  create: (data: Partial<Role>) =>
    request<Role>('/v1/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Role>) =>
    request<Role>(`/v1/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/v1/roles/${id}`, { method: 'DELETE' }),

  assignMember: (roleId: string, userId: string) =>
    request<void>(`/v1/roles/${roleId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  removeMember: (roleId: string, userId: string) =>
    request<void>(`/v1/roles/${roleId}/members/${userId}`, { method: 'DELETE' }),
};

// ─── Events ──────────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  title: string;
  category: string;
  status: string;
  description: string;
  instructorId: string;
  instructorName: string;
  instructorInitials: string;
  schedule: string;
  location: string;
  participants: number;
  maxParticipants: number;
  waitlist: number;
  price: number | null;
  startDate: string;
  endDate: string;
  weekdays: string[];
  timeStart: string;
  timeEnd: string;
  isPublic: boolean;
  showOnHomepage: boolean;
  targetRoles: string[];
  autoInvoice: boolean;
  eventType: string;
  groupIds: string[];
  groups: { id: string; name: string }[];
  leaders: { userId: string; name: string; roleLabel: string }[];
}

export interface CalendarEvent {
  id: string;
  courseId?: string;
  title: string;
  date: string;
  endDate?: string;
  timeStart: string;
  timeEnd: string;
  category: string;
  location: string;
  participants: number;
  maxParticipants: number;
  status: string;
  groups?: { id: string; name: string }[];
}

export const eventsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<PaginatedResponse<Event>>(`/v1/events${qs}`);
  },

  get: (id: string) => request<Event>(`/v1/events/${id}`),

  create: (data: Partial<Event>) =>
    request<Event>('/v1/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Event>) =>
    request<Event>(`/v1/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/v1/events/${id}`, { method: 'DELETE' }),

  register: (eventId: string, userId?: string) =>
    request<{ registration: unknown; invoice?: unknown }>(`/v1/events/${eventId}/register`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  unregister: (eventId: string, userId?: string) =>
    request<void>(`/v1/events/${eventId}/register`, {
      method: 'DELETE',
      body: JSON.stringify({ user_id: userId }),
    }),

  calendar: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<CalendarEvent[]>(`/v1/events/calendar${qs}`);
  },
};

// ─── Attendance ──────────────────────────────────────────────────────────────

export const attendanceApi = {
  getForOccurrence: (occurrenceId: string) =>
    request<unknown[]>(`/v1/attendance/${occurrenceId}`),

  checkIn: (occurrenceId: string, userId: string, status: string) =>
    request<unknown>(`/v1/attendance/${occurrenceId}/check-in`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, status }),
    }),

  bulkUpdate: (occurrenceId: string, records: { user_id: string; status: string }[]) =>
    request<unknown>(`/v1/attendance/${occurrenceId}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ records }),
    }),

  stats: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<unknown>(`/v1/attendance/stats${qs}`);
  },
};

// ─── Communication ───────────────────────────────────────────────────────────

export const communicationApi = {
  listMessages: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<unknown>(`/v1/messages${qs}`);
  },

  createMessage: (data: Record<string, unknown>) =>
    request<unknown>('/v1/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendMessage: (id: string) =>
    request<unknown>(`/v1/messages/${id}/send`, { method: 'POST' }),

  listTemplates: () => request<unknown[]>('/v1/messages/templates'),

  createTemplate: (data: Record<string, unknown>) =>
    request<unknown>('/v1/messages/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listConversations: () => request<unknown[]>('/v1/chat/conversations'),

  getConversationMessages: (id: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<unknown>(`/v1/chat/conversations/${id}/messages${qs}`);
  },
};

// ─── Finance ─────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  number: string;
  memberId: string;
  memberName: string;
  memberInitials: string;
  date: string;
  dueDate: string;
  amount: string;
  amountRaw: number;
  status: string;
  description: string;
  positions: { description: string; quantity: number; unitPrice: string; total: string }[];
  timeline: { step: string; date?: string }[];
}

export interface AccountingEntry {
  id: string;
  date: string;
  type: 'Einnahme' | 'Ausgabe';
  category: string;
  description: string;
  amount: string;
  amountRaw: number;
  receipt?: string;
}

export const financeApi = {
  listInvoices: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<PaginatedResponse<Invoice> & { summary?: unknown }>(`/v1/invoices${qs}`);
  },

  getInvoice: (id: string) => request<Invoice>(`/v1/invoices/${id}`),

  createInvoice: (data: Record<string, unknown>) =>
    request<Invoice>('/v1/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendInvoice: (id: string) =>
    request<unknown>(`/v1/invoices/${id}/send`, { method: 'POST' }),

  markPaid: (id: string) =>
    request<unknown>(`/v1/invoices/${id}/paid`, { method: 'POST' }),

  deleteInvoice: (id: string) =>
    request<unknown>(`/v1/invoices/${id}`, { method: 'DELETE' }),

  listAccounting: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ entries: AccountingEntry[]; summary?: unknown }>(`/v1/accounting${qs}`);
  },

  createAccountingEntry: (data: Record<string, unknown>) =>
    request<AccountingEntry>('/v1/accounting', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Shop ────────────────────────────────────────────────────────────────────

export const shopApi = {
  listProducts: () => request<unknown[]>('/v1/shop/products'),

  createProduct: (data: Record<string, unknown>) =>
    request<unknown>('/v1/shop/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (id: string, data: Record<string, unknown>) =>
    request<unknown>(`/v1/shop/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  listOrders: () => request<unknown[]>('/v1/shop/orders'),

  createOrder: (data: Record<string, unknown>) =>
    request<unknown>('/v1/shop/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Files ───────────────────────────────────────────────────────────────────

export const filesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ folders: string[]; files: unknown[] }>(`/v1/files${qs}`);
  },

  upload: (formData: FormData) =>
    request<unknown>('/v1/files/upload', {
      method: 'POST',
      body: formData,
    }),

  download: (id: string) => `${API_BASE}/v1/files/${id}/download`,

  delete: (id: string) =>
    request<void>(`/v1/files/${id}`, { method: 'DELETE' }),
};

// ─── Settings ────────────────────────────────────────────────────────────────

export const settingsApi = {
  getOrganization: () => request<unknown>('/v1/settings/organization'),

  updateOrganization: (data: Record<string, unknown>) =>
    request<unknown>('/v1/settings/organization', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    return request<{ logoUrl: string }>('/v1/settings/organization/logo', {
      method: 'POST',
      body: fd,
    });
  },

  listProfileFields: () => request<unknown[]>('/v1/settings/fields'),

  createProfileField: (data: Record<string, unknown>) =>
    request<{ id: string }>('/v1/settings/fields', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProfileField: (id: string, data: Record<string, unknown>) =>
    request<{ success: boolean }>(`/v1/settings/fields/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteProfileField: (id: string) =>
    request<{ success: boolean }>(`/v1/settings/fields/${id}`, { method: 'DELETE' }),

  listFamilies: () => request<unknown[]>('/v1/settings/families'),

  getAuditLog: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<PaginatedResponse<unknown>>(`/v1/settings/audit-log${qs}`);
  },

  gdprExport: (userId: string) =>
    request<unknown>(`/v1/settings/gdpr/export/${userId}`),

  gdprDelete: (userId: string) =>
    request<unknown>(`/v1/settings/gdpr/delete/${userId}`, { method: 'POST' }),
};

// ─── Portal (Member Self-Service) ───────────────────────────────────────────

export interface MyProfile {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  birthDate: string;
  gender: string;
  street: string;
  zip: string;
  city: string;
  status: string;
  avatarUrl: string | null;
  avatarInitials: string;
  roles: { id: string; name: string; category: string; description: string }[];
  customFields: Record<string, string>;
  joinDate: string;
}

export interface MyEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  timeStart: string;
  timeEnd: string;
  eventType: string;
  status: string;
  maxParticipants: number | null;
  participants: number;
  registeredAt: string;
  registrationStatus: string;
}

export interface MyAttendance {
  records: { id: string; eventTitle: string; date: string; status: string; checkedInAt: string | null }[];
  stats: { total: number; present: number; rate: number };
}

export interface MyDashboard {
  registeredEvents: number;
  attendanceRate: number;
  roles: string[];
  upcomingEvents: { id: string; title: string; startDate: string; timeStart: string; timeEnd: string; location: string }[];
}

// ─── Contracts (Vertragsverwaltung) ──────────────────────────────────────────

export interface Contract {
  id: string;
  contractNumber: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberInitials: string;
  contractKind: string;
  typeName: string;
  groupId: string | null;
  groupName: string;
  familyId: string | null;
  familyName: string;
  status: string;
  startDate: string;
  endDate: string | null;
  currentPrice: number | null;
  billingPeriod: string | null;
  autoRenew: number | null;
  cancellationDate: string | null;
  cancellationEffectiveDate: string | null;
  createdAt: string;
}

export interface ContractDetail extends Contract {
  membershipTypeId: string | null;
  tarifId: string | null;
  parentContractId: string | null;
  discountGroupId: string | null;
  activationFeeCharged: number | null;
  paidUntil: string | null;
  renewalDurationMonths: number | null;
  cancellationNoticeDays: number | null;
  cancellationNoticeBasis: string | null;
  renewalCancellationDays: number | null;
  notes: string | null;
  hasNotice: number | null;
  createdBy: string | null;
  createdByName: string;
  updatedAt: string;
  member: {
    id: string; firstName: string; lastName: string; email: string;
    phone: string | null; mobile: string | null;
    street: string | null; zip: string | null; city: string | null;
  } | null;
  familyMembers: { id: string; firstName: string; lastName: string; email: string; relationship: string }[];
  familyName: string | null;
  pauses: ContractPause[];
  invoices: any[];
  children: any[];
}

export interface ContractPause {
  id: string;
  contractId: string;
  pauseFrom: string;
  pauseUntil: string;
  reason: string | null;
  creditAmount: number | null;
  createdAt: string;
}

export interface MembershipType {
  id: string;
  orgId: string;
  name: string;
  isActive: number;
  selfRegistrationEnabled: number;
  shortDescription: string | null;
  description: string | null;
  bankAccountId: string | null;
  invoiceCategory: string | null;
  vatPercent: number;
  defaultInvoiceDay: number;
  activationFee: number;
  contractType: string;
  contractDurationMonths: number | null;
  renewalDurationMonths: number | null;
  cancellationNoticeDays: number;
  cancellationNoticeBasis: string;
  renewalCancellationDays: number | null;
  defaultGroupId: string | null;
  isFamilyTarif: number;
  minFamilyMembers: number;
  groupName: string;
  sortOrder: number;
  pricing: TarifPricing[];
  createdAt: string;
  updatedAt: string;
}

export interface Tarif extends MembershipType {
  allowedMembershipTypeIds: string[];
}

export interface TarifPricing {
  id: string;
  parentId: string;
  parentType: string;
  billingPeriod: string;
  price: number;
  membershipTypeId: string | null;
}

export interface DiscountGroup {
  id: string;
  orgId: string;
  name: string;
  rules: { field: string; operator: string; value: string }[];
  groupId: string | null;
  groupName: string;
  createdAt: string;
}

export interface Group {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  parentGroupId: string | null;
  category: string | null;
  memberCount: number;
  childrenCount: number;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  userId: string;
  role: string | null;
  joinedAt: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ContractApplication {
  id: string;
  orgId: string;
  memberId: string | null;
  membershipTypeId: string | null;
  tarifId: string | null;
  billingPeriod: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  additionalData: Record<string, any>;
  status: string;
  typeName: string;
  reviewerName: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

export interface ContractSettings {
  invoicePublishMode: string;
  defaultInvoiceGroupId: string | null;
  daysInAdvance: number;
  priceUpdateTrigger: string;
  sepaRequired: number;
  memberCancellationAllowed: number;
  selfRegistrationEnabled: number;
  selfRegistrationAccess: string;
  welcomePageText: string | null;
  confirmationPageText: string | null;
}

export const contractsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<PaginatedResponse<Contract>>(`/v1/contracts${qs}`);
  },
  get: (id: string) => request<ContractDetail>(`/v1/contracts/${id}`),
  create: (data: Record<string, any>) =>
    request<any>('/v1/contracts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, any>) =>
    request<any>(`/v1/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/v1/contracts/${id}`, { method: 'DELETE' }),
  cancel: (id: string, data: { cancellation_date: string }) =>
    request<any>(`/v1/contracts/${id}/cancel`, { method: 'POST', body: JSON.stringify(data) }),
  pause: (id: string, data: { pause_from: string; pause_until: string; reason?: string }) =>
    request<any>(`/v1/contracts/${id}/pause`, { method: 'POST', body: JSON.stringify(data) }),
  removePause: (id: string, pauseId: string) =>
    request<any>(`/v1/contracts/${id}/pause/${pauseId}`, { method: 'DELETE' }),
  markPaid: (id: string, data: { paid_until: string }) =>
    request<any>(`/v1/contracts/${id}/mark-paid`, { method: 'POST', body: JSON.stringify(data) }),
  createInvoice: (id: string) =>
    request<any>(`/v1/contracts/${id}/invoice`, { method: 'POST' }),
  bulkInvoice: () =>
    request<{ created: number }>('/v1/contracts/bulk-invoice', { method: 'POST' }),
};

export const membershipTypesApi = {
  list: () => request<{ data: MembershipType[] }>('/v1/membership-types'),
  create: (data: Record<string, any>) =>
    request<MembershipType>('/v1/membership-types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, any>) =>
    request<any>(`/v1/membership-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<any>(`/v1/membership-types/${id}`, { method: 'DELETE' }),
  setPricing: (id: string, pricing: any[]) =>
    request<any>(`/v1/membership-types/${id}/pricing`, { method: 'POST', body: JSON.stringify({ pricing }) }),
  setDiscounts: (id: string, discounts: any[]) =>
    request<any>(`/v1/membership-types/${id}/discounts`, { method: 'POST', body: JSON.stringify({ discounts }) }),
};

export const tarifsApi = {
  list: () => request<{ data: Tarif[] }>('/v1/tarifs'),
  create: (data: Record<string, any>) =>
    request<Tarif>('/v1/tarifs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, any>) =>
    request<any>(`/v1/tarifs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<any>(`/v1/tarifs/${id}`, { method: 'DELETE' }),
  setPricing: (id: string, pricing: any[]) =>
    request<any>(`/v1/tarifs/${id}/pricing`, { method: 'POST', body: JSON.stringify({ pricing }) }),
  setDiscounts: (id: string, discounts: any[]) =>
    request<any>(`/v1/tarifs/${id}/discounts`, { method: 'POST', body: JSON.stringify({ discounts }) }),
};

export const discountGroupsApi = {
  list: () => request<{ data: DiscountGroup[] }>('/v1/discount-groups'),
  create: (data: Record<string, any>) =>
    request<DiscountGroup>('/v1/discount-groups', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, any>) =>
    request<any>(`/v1/discount-groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<any>(`/v1/discount-groups/${id}`, { method: 'DELETE' }),
};

export const groupsApi = {
  list: () => request<{ data: Group[] }>('/v1/groups'),
  create: (data: { name: string; description?: string; category?: string }) =>
    request<Group>('/v1/groups', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name: string; description?: string; category?: string }) =>
    request<any>(`/v1/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<any>(`/v1/groups/${id}`, { method: 'DELETE' }),
  getMembers: (id: string) =>
    request<{ data: GroupMember[] }>(`/v1/groups/${id}/members`),
  addMember: (id: string, data: { user_id: string; role?: string }) =>
    request<any>(`/v1/groups/${id}/members`, { method: 'POST', body: JSON.stringify(data) }),
  removeMember: (id: string, userId: string) =>
    request<any>(`/v1/groups/${id}/members/${userId}`, { method: 'DELETE' }),
};

export const billingApi = {
  getSchedule: () => request<any>('/v1/billing/schedule'),
  run: () => request<{ created: number; errors: string[] }>('/v1/billing/run', { method: 'POST' }),
};

export const contractSettingsApi = {
  get: () => request<ContractSettings>('/v1/contract-settings'),
  update: (data: Partial<ContractSettings>) =>
    request<any>('/v1/contract-settings', { method: 'PUT', body: JSON.stringify(data) }),
};

export const contractApplicationsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<PaginatedResponse<ContractApplication>>(`/v1/contract-applications${qs}`);
  },
  accept: (id: string) =>
    request<any>(`/v1/contract-applications/${id}/accept`, { method: 'PUT' }),
  reject: (id: string, data?: { review_notes?: string }) =>
    request<any>(`/v1/contract-applications/${id}/reject`, { method: 'PUT', body: JSON.stringify(data || {}) }),
};

export const selfRegistrationApi = {
  getOptions: (orgSlug: string) => {
    const base = import.meta.env.VITE_API_URL || 'https://verein-connect-api.cloudflareone-demo-account.workers.dev';
    return fetch(`${base}/public/self-registration/options?org=${orgSlug}`).then(r => r.json());
  },
  apply: (data: Record<string, any>) => {
    const base = import.meta.env.VITE_API_URL || 'https://verein-connect-api.cloudflareone-demo-account.workers.dev';
    return fetch(`${base}/public/self-registration/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json());
  },
};

// ─── Membership Levels ──────────────────────────────────────────────────────
export interface MembershipLevel {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sortOrder: number;
  isDefault: boolean;
  memberCount: number;
}

export const membershipLevelsApi = {
  list: () => request<{ data: MembershipLevel[] }>('/v1/settings/membership-levels'),
  create: (data: { name: string; description?: string; color?: string; sort_order?: number; is_default?: boolean }) =>
    request<{ id: string }>('/v1/settings/membership-levels', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string; color?: string; sort_order?: number; is_default?: boolean }) =>
    request<{ success: boolean }>(`/v1/settings/membership-levels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/v1/settings/membership-levels/${id}`, { method: 'DELETE' }),
  reorder: (order: string[]) =>
    request<{ success: boolean }>('/v1/settings/membership-levels/reorder', { method: 'PUT', body: JSON.stringify({ order }) }),
};

export const portalApi = {
  getProfile: () => request<MyProfile>('/v1/me/profile'),

  updateProfile: (data: { phone?: string; mobile?: string; street?: string; zip?: string; city?: string; current_password?: string; new_password?: string }) =>
    request<{ success: boolean }>('/v1/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getMyEvents: () => request<MyEvent[]>('/v1/me/events'),

  getMyAttendance: () => request<MyAttendance>('/v1/me/attendance'),

  getMyDashboard: () => request<MyDashboard>('/v1/me/dashboard'),
};
