import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  membersApi, rolesApi, eventsApi, attendanceApi,
  communicationApi, financeApi, shopApi, filesApi, settingsApi, portalApi,
  contractsApi, membershipTypesApi, tarifsApi, discountGroupsApi, groupsApi,
  billingApi, contractSettingsApi, contractApplicationsApi, bankAccountApi, guardianApi, familyApi,
  membershipLevelsApi,
  type Member, type PaginatedResponse, type Role, type Event,
  type Contract, type ContractDetail, type MembershipType, type Tarif,
  type DiscountGroup, type Group, type ContractApplication, type ContractSettings,
  type BankAccount, type Guardian, type FamilyProfile, type FamilyDetail, type FamilyCreateData,
  type MembershipLevel,
} from '@/lib/api';

// ─── Members ─────────────────────────────────────────────────────────────────

export function useMembers(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['members', params],
    queryFn: () => membersApi.list(params),
  });
}

export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: () => membersApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Member>) => membersApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members'] }); },
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Member> }) => membersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members'] }); },
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => membersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members'] }); },
  });
}

// ─── Bank Accounts ──────────────────────────────────────────────────────────

export function useBankAccount(memberId: string | undefined) {
  return useQuery({
    queryKey: ['bank-account', memberId],
    queryFn: () => bankAccountApi.get(memberId!),
    enabled: !!memberId,
  });
}

export function useUpsertBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: Parameters<typeof bankAccountApi.upsert>[1] }) =>
      bankAccountApi.upsert(memberId, data),
    onSuccess: (_d, vars) => { qc.invalidateQueries({ queryKey: ['bank-account', vars.memberId] }); },
  });
}

export function useDeleteBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => bankAccountApi.delete(memberId),
    onSuccess: (_d, memberId) => { qc.invalidateQueries({ queryKey: ['bank-account', memberId] }); },
  });
}

// ─── Guardians (Erziehungsberechtigte) ──────────────────────────────────────

export function useGuardians(memberId: string | undefined) {
  return useQuery({
    queryKey: ['guardians', memberId],
    queryFn: () => guardianApi.list(memberId!),
    enabled: !!memberId,
  });
}

export function useCreateGuardian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: Parameters<typeof guardianApi.create>[1] }) =>
      guardianApi.create(memberId, data),
    onSuccess: (_d, vars) => { qc.invalidateQueries({ queryKey: ['guardians', vars.memberId] }); },
  });
}

export function useUpdateGuardian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, guardianId, data }: { memberId: string; guardianId: string; data: Parameters<typeof guardianApi.update>[2] }) =>
      guardianApi.update(memberId, guardianId, data),
    onSuccess: (_d, vars) => { qc.invalidateQueries({ queryKey: ['guardians', vars.memberId] }); },
  });
}

export function useDeleteGuardian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, guardianId }: { memberId: string; guardianId: string }) =>
      guardianApi.delete(memberId, guardianId),
    onSuccess: (_d, vars) => { qc.invalidateQueries({ queryKey: ['guardians', vars.memberId] }); },
  });
}

// ─── Families (Familienprofile) ──────────────────────────────────────────────

export function useFamilies() {
  return useQuery({
    queryKey: ['families'],
    queryFn: () => familyApi.list(),
  });
}

export function useFamily(id: string | undefined) {
  return useQuery({
    queryKey: ['families', id],
    queryFn: () => familyApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FamilyCreateData) => familyApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['families'] }); },
  });
}

export function useUpdateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FamilyCreateData }) => familyApi.update(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['families'] });
      qc.invalidateQueries({ queryKey: ['families', vars.id] });
    },
  });
}

export function useDeleteFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => familyApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['families'] }); },
  });
}

export function useAddFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ familyId, data }: { familyId: string; data: { user_id: string; relationship?: string } }) =>
      familyApi.addMember(familyId, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['families'] });
      qc.invalidateQueries({ queryKey: ['families', vars.familyId] });
    },
  });
}

export function useRemoveFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ familyId, userId }: { familyId: string; userId: string }) =>
      familyApi.removeMember(familyId, userId),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['families'] });
      qc.invalidateQueries({ queryKey: ['families', vars.familyId] });
    },
  });
}

// ─── Roles ───────────────────────────────────────────────────────────────────

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
  });
}

export function useRole(id: string | undefined) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: () => rolesApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Role>) => rolesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Role> }) => rolesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); },
  });
}

export function useAssignRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) => rolesApi.assignMember(roleId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export function useRemoveRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) => rolesApi.removeMember(roleId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

// ─── Events ──────────────────────────────────────────────────────────────────

export function useEvents(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => eventsApi.list(params),
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Event>) => eventsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) => eventsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: (_data, deletedId) => {
      qc.removeQueries({ queryKey: ['events', deletedId] });
      qc.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'events' && query.queryKey[1] !== deletedId,
      });
    },
  });
}

export function useEventCalendar(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['events', 'calendar', params],
    queryFn: () => eventsApi.calendar(params),
  });
}

export function useRegisterForEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId?: string }) => eventsApi.register(eventId, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); },
  });
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export function useAttendance(occurrenceId: string | undefined) {
  return useQuery({
    queryKey: ['attendance', occurrenceId],
    queryFn: () => attendanceApi.getForOccurrence(occurrenceId!),
    enabled: !!occurrenceId,
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ occurrenceId, userId, status }: { occurrenceId: string; userId: string; status: string }) =>
      attendanceApi.checkIn(occurrenceId, userId, status),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['attendance', vars.occurrenceId] }); },
  });
}

export function useAttendanceStats(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['attendance', 'stats', params],
    queryFn: () => attendanceApi.stats(params),
  });
}

// ─── Communication ───────────────────────────────────────────────────────────

export function useMessages(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['messages', params],
    queryFn: () => communicationApi.listMessages(params),
  });
}

export function useMessageTemplates() {
  return useQuery({
    queryKey: ['message-templates'],
    queryFn: () => communicationApi.listTemplates(),
  });
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => communicationApi.listConversations(),
  });
}

export function useCreateMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => communicationApi.createMessage(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); },
  });
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export function useInvoices(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => financeApi.listInvoices(params),
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => financeApi.getInvoice(id!),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeApi.createInvoice(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); },
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.markPaid(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.deleteInvoice(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); },
  });
}

export function useAccounting(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['accounting', params],
    queryFn: () => financeApi.listAccounting(params),
  });
}

export function useCreateAccountingEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeApi.createAccountingEntry(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounting'] }); },
  });
}

// ─── Shop ────────────────────────────────────────────────────────────────────

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => shopApi.listProducts(),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => shopApi.createProduct(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); },
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => shopApi.listOrders(),
  });
}

// ─── Files ───────────────────────────────────────────────────────────────────

export function useFiles(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['files', params],
    queryFn: () => filesApi.list(params),
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => filesApi.upload(formData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['files'] }); },
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => filesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['files'] }); },
  });
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function useOrganizationSettings() {
  return useQuery({
    queryKey: ['organization-settings'],
    queryFn: () => settingsApi.getOrganization(),
  });
}

export function useProfileFields() {
  return useQuery({
    queryKey: ['profile-fields'],
    queryFn: () => settingsApi.listProfileFields(),
  });
}

export function useCreateProfileField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => settingsApi.createProfileField(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile-fields'] }); },
  });
}

export function useUpdateProfileField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: unknown }) => settingsApi.updateProfileField(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile-fields'] }); },
  });
}

export function useDeleteProfileField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteProfileField(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile-fields'] }); },
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => settingsApi.updateOrganization(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organization-settings'] }); },
  });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => settingsApi.uploadLogo(file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organization-settings'] }); },
  });
}

export function useAuditLog(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['audit-log', params],
    queryFn: () => settingsApi.getAuditLog(params),
  });
}

// ─── Portal (Member Self-Service) ───────────────────────────────────────────

export function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: () => portalApi.getProfile(),
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { phone?: string; mobile?: string; street?: string; zip?: string; city?: string; current_password?: string; new_password?: string }) =>
      portalApi.updateProfile(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-profile'] }); },
  });
}

export function useMyEvents() {
  return useQuery({
    queryKey: ['my-events'],
    queryFn: () => portalApi.getMyEvents(),
  });
}

export function useMyAttendance() {
  return useQuery({
    queryKey: ['my-attendance'],
    queryFn: () => portalApi.getMyAttendance(),
  });
}

export function useMyDashboard() {
  return useQuery({
    queryKey: ['my-dashboard'],
    queryFn: () => portalApi.getMyDashboard(),
  });
}

// ─── Contracts (Vertragsverwaltung) ──────────────────────────────────────────

export function useContracts(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['contracts', params],
    queryFn: () => contractsApi.list(params),
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: () => contractsApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => contractsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); },
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contractsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); },
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) => contractsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); },
  });
}

export function useCancelContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cancellation_date }: { id: string; cancellation_date: string }) => contractsApi.cancel(id, { cancellation_date }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); },
  });
}

export function usePauseContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; pause_from: string; pause_until: string; reason?: string }) => contractsApi.pause(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); },
  });
}

export function useCreateContractInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contractsApi.createInvoice(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); },
  });
}

export function useBulkInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => contractsApi.bulkInvoice(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); },
  });
}

// ─── Membership Types ───────────────────────────────────────────────────────

export function useMembershipTypes() {
  return useQuery({
    queryKey: ['membership-types'],
    queryFn: () => membershipTypesApi.list(),
  });
}

export function useCreateMembershipType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => membershipTypesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['membership-types'] }); },
  });
}

export function useUpdateMembershipType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) => membershipTypesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['membership-types'] }); },
  });
}

export function useDeleteMembershipType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => membershipTypesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['membership-types'] }); },
  });
}

// ─── Tarifs ─────────────────────────────────────────────────────────────────

export function useTarifs() {
  return useQuery({
    queryKey: ['tarifs'],
    queryFn: () => tarifsApi.list(),
  });
}

export function useCreateTarif() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => tarifsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tarifs'] }); },
  });
}

export function useUpdateTarif() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) => tarifsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tarifs'] }); },
  });
}

export function useDeleteTarif() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tarifsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tarifs'] }); },
  });
}

// ─── Discount Groups ────────────────────────────────────────────────────────

export function useDiscountGroups() {
  return useQuery({
    queryKey: ['discount-groups'],
    queryFn: () => discountGroupsApi.list(),
  });
}

export function useCreateDiscountGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => discountGroupsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['discount-groups'] }); },
  });
}

export function useDeleteDiscountGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => discountGroupsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['discount-groups'] }); },
  });
}

// ─── Groups ─────────────────────────────────────────────────────────────────

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.list(),
  });
}

export function useGroupMembers(groupId?: string) {
  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => groupsApi.getMembers(groupId!),
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; category?: string; parent_group_id?: string }) => groupsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string; category?: string; parent_group_id?: string } }) => groupsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); },
  });
}

export function useAddGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId, role }: { groupId: string; userId: string; role?: string }) =>
      groupsApi.addMember(groupId, { user_id: userId, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['group-members'] });
    },
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      groupsApi.removeMember(groupId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['group-members'] });
    },
  });
}

// ─── Contract Applications ──────────────────────────────────────────────────

export function useContractApplications(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['contract-applications', params],
    queryFn: () => contractApplicationsApi.list(params),
  });
}

export function useAcceptApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contractApplicationsApi.accept(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-applications'] }); },
  });
}

export function useRejectApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, review_notes }: { id: string; review_notes?: string }) => contractApplicationsApi.reject(id, { review_notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-applications'] }); },
  });
}

// ─── Billing ────────────────────────────────────────────────────────────────

export function useBillingSchedule() {
  return useQuery({
    queryKey: ['billing-schedule'],
    queryFn: () => billingApi.getSchedule(),
  });
}

export function useBillingRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => billingApi.run(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-schedule'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

// ─── Contract Settings ──────────────────────────────────────────────────────

export function useContractSettings() {
  return useQuery({
    queryKey: ['contract-settings'],
    queryFn: () => contractSettingsApi.get(),
  });
}

export function useUpdateContractSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ContractSettings>) => contractSettingsApi.update(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-settings'] }); },
  });
}

// ─── Membership Levels ──────────────────────────────────────────────────────

export function useMembershipLevels() {
  return useQuery({
    queryKey: ['membership-levels'],
    queryFn: () => membershipLevelsApi.list(),
  });
}

export function useCreateMembershipLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string; sort_order?: number; is_default?: boolean }) =>
      membershipLevelsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['membership-levels'] }); },
  });
}

export function useUpdateMembershipLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; color?: string; sort_order?: number; is_default?: boolean }) =>
      membershipLevelsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['membership-levels'] }); },
  });
}

export function useDeleteMembershipLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => membershipLevelsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['membership-levels'] }); },
  });
}
