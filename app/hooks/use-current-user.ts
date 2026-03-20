import { useMatches } from "react-router";
import type { AuthUser } from "@/lib/auth.server";

type MatchWithUser = {
  data?: {
    user?: AuthUser | null;
  };
};

export function useCurrentUser() {
  const matches = useMatches() as MatchWithUser[];

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const user = matches[index]?.data?.user;
    if (user) {
      return user;
    }
  }

  return null;
}
