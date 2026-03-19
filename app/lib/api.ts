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
  status: "Aktiv" | "Inaktiv" | "Ausstehend";
  roles: string[];
  groups: { id: string; name: string; category: string | null; role: string | null }[];
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
  type: "Einnahme" | "Ausgabe";
  category: string;
  description: string;
  amount: string;
  amountRaw: number;
  receipt?: string;
}

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

export interface ContractPause {
  id: string;
  contractId: string;
  pauseFrom: string;
  pauseUntil: string;
  reason: string | null;
  creditAmount: number | null;
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
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    mobile: string | null;
    street: string | null;
    zip: string | null;
    city: string | null;
  } | null;
  pauses: ContractPause[];
  invoices: unknown[];
  children: unknown[];
}

export interface TarifPricing {
  id: string;
  parentId: string;
  parentType: string;
  billingPeriod: string;
  price: number;
  membershipTypeId: string | null;
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
  groupName: string;
  sortOrder: number;
  pricing: TarifPricing[];
  createdAt: string;
  updatedAt: string;
}

export interface Tarif extends MembershipType {
  allowedMembershipTypeIds: string[];
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
  category: string | null;
  createdAt: string;
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
  additionalData: Record<string, unknown>;
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
