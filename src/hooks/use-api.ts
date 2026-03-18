import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  membersApi, rolesApi, eventsApi, attendanceApi,
  communicationApi, financeApi, shopApi, filesApi, settingsApi, portalApi,
  type Member, type PaginatedResponse, type Role, type Event,
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); },
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
