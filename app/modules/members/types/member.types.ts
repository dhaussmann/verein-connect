import type { BankAccount, Contract, Role } from "@/core/types/api";

export type MemberListSortKey = "name" | "email" | "memberNumber" | "status" | "joinDate";

export type MemberListStatus = "Aktiv" | "Inaktiv" | "Ausstehend";

export type MemberGroup = {
  id: string;
  name: string;
  category: string | null;
  groupType?: string | null;
  role: string | null;
};

export type MemberListItem = {
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
  status: MemberListStatus;
  roles: string[];
  groups: MemberGroup[];
  joinDate: string;
  avatarInitials: string;
  customFields: Record<string, string>;
  familyId?: string;
  familyRelation?: string;
};

export type MemberRoleOption = {
  id: string;
  name: string;
  category: string;
  roleType: string;
  scope: string;
  isAssignable: boolean;
  memberCount: number;
  isSystem: boolean;
  description: string;
  permissions: string[];
  maxMembers?: number;
  parentRoleId?: string;
};

export type MemberGroupOption = {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  category: string | null;
  groupType: string | null;
  ageBand: string | null;
  genderScope: string | null;
  season: string | null;
  league: string | null;
  location: string | null;
  trainingFocus: string | null;
  visibility: string | null;
  admissionOpen: boolean;
  maxMembers: number | null;
  maxGoalies: number | null;
  createdAt: string;
};

export type MemberListFilters = {
  search: string;
  status: string;
  role: string;
  group: string;
  sort: MemberListSortKey;
  dir: "asc" | "desc";
};

export type MemberListLoaderData = {
  members: MemberListItem[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
  roles: MemberRoleOption[];
  groups: MemberGroupOption[];
  filters: MemberListFilters;
};

export type MemberRouteActionData = {
  success?: boolean;
  error?: string;
};

export type MemberProfileFieldOption = {
  id: string;
  category?: string | null;
  name: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  onRegistrationForm?: boolean;
};

export type MemberCreateLoaderData = {
  roles: MemberRoleOption[];
  groups: MemberGroupOption[];
  profileFields: MemberProfileFieldOption[];
};

export type MemberDetailLoaderData = {
  member: MemberListItem;
  contracts: Contract[];
  groups: MemberGroupOption[];
  roles: Role[];
  profileFields: MemberProfileFieldOption[];
  bankAccount: BankAccount | null;
};

export type MemberDetailActionData = {
  success?: boolean;
  intent?: string;
  error?: string;
  redirectTo?: string;
};
