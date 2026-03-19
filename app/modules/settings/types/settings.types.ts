export type OrganizationSettingsData = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: string | null;
  settings: Record<string, unknown>;
};

export type SettingsUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  avatarInitials: string;
  roles: string[];
};

export type SettingsRole = {
  id: string;
  name: string;
  category: string;
  memberCount: number;
  isSystem: boolean;
  description: string;
  permissions: string[];
};

export type SettingsProfileField = {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  searchable: boolean;
  visibleRegistration: boolean;
  sortOrder: number | null;
  gdprRetentionDays: number | null;
};

export type SettingsAuditEntry = {
  id: string;
  user: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  timestamp: string;
};
