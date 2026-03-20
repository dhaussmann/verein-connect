import type { AuthUser } from "@/lib/auth.server";

export function hasPermission(user: Pick<AuthUser, "permissions">, permission: string) {
  return user.permissions.includes("*") || user.permissions.includes(permission);
}

export function requirePermission(user: Pick<AuthUser, "permissions">, permission: string) {
  if (!hasPermission(user, permission)) {
    throw new Error("Keine Berechtigung für diese Aktion");
  }
}
