import { membersRepository } from "../repository/members.repository";
import type { RouteEnv } from "@/core/runtime/route";
import { toMemberFormOptions } from "../presenters/member.presenter";

export async function getMemberFormOptionsUseCase(env: RouteEnv, orgId: string) {
  const repo = membersRepository(env);
  return toMemberFormOptions(repo, orgId);
}
