export type GroupListItem = {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  category: string | null;
  createdAt: string;
};

export type GroupMemberItem = {
  id: string;
  userId: string;
  role: string | null;
  joinedAt: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type GroupAvailableMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type GroupsListLoaderData = {
  groups: GroupListItem[];
};

export type GroupDetailLoaderData = {
  group: GroupListItem | null;
  groupMembers: GroupMemberItem[];
  availableMembers: GroupAvailableMember[];
};

export type GroupRouteActionData = {
  success?: boolean;
  intent?: string;
  error?: string;
};
