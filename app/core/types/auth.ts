export type SessionUser = {
  id: string;
  orgId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  clubName: string;
  avatarUrl?: string | null;
  roles: string[];
  permissions: string[];
  organization?: { id: string; name: string; slug: string } | null;
};
