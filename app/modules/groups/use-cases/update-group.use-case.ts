import { writeAuditLog } from "@/core/lib/audit";
import type { RouteEnv } from "@/core/runtime/route";
import { groupsRepository } from "../repository/groups.repository";

export async function updateGroupUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    actorUserId: string;
    groupId: string;
    name: string;
    description?: string;
    category?: string;
    groupType?: string;
    ageBand?: string;
    genderScope?: string;
    season?: string;
    league?: string;
    location?: string;
    trainingFocus?: string;
    visibility?: string;
    admissionOpen?: boolean;
    maxMembers?: number | null;
    maxGoalies?: number | null;
  },
) {
  const repo = groupsRepository(env);
  await repo.updateGroup(input.orgId, input.groupId, {
    name: input.name,
    description: input.description || null,
    category: input.category || "standard",
    groupType: input.groupType || "standard",
    ageBand: input.ageBand || null,
    genderScope: input.genderScope || "mixed",
    season: input.season || null,
    league: input.league || null,
    location: input.location || null,
    trainingFocus: input.trainingFocus || null,
    visibility: input.visibility || "internal",
    admissionOpen: input.admissionOpen === false ? 0 : 1,
    maxMembers: input.maxMembers ?? null,
    maxGoalies: input.maxGoalies ?? null,
  });
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Gruppe '${input.name}' bearbeitet`, "group", input.groupId);
}
