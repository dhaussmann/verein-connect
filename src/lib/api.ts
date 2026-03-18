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
    throw new ApiError(res.status, body.error || body.message || 'Fehler');
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
  groups: string[];
  joinDate: string;
  avatarInitials: string;
  customFields: Record<string, string>;
  familyId?: string;
  familyRelation?: string;
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
      }),
    }),

  delete: (id: string) =>
    request<void>(`/v1/members/${id}`, { method: 'DELETE' }),

  bulkAction: (action: string, memberIds: string[]) =>
    request<{ affected: number }>('/v1/members/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, member_ids: memberIds }),
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

  listProfileFields: () => request<unknown[]>('/v1/settings/profile-fields'),

  createProfileField: (data: Record<string, unknown>) =>
    request<unknown>('/v1/settings/profile-fields', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

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
