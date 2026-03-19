import { writeAuditLog } from "@/core/lib/audit";
import type { RouteEnv } from "@/core/runtime/route";
import { membersRepository } from "../repository/members.repository";

export async function changeMemberStatusUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    actorUserId: string;
    memberId: string;
    hardDelete?: boolean;
  },
) {
  const repo = membersRepository(env);
  const member = await repo.findUserById(input.orgId, input.memberId);
  if (!member) {
    throw new Error("Mitglied nicht gefunden");
  }

  if (input.hardDelete) await repo.deleteUser(input.memberId);
  else await repo.blockUser(input.memberId);

  await writeAuditLog(
    env.DB,
    input.orgId,
    input.actorUserId,
    input.hardDelete ? "Mitglied gelöscht" : "Mitglied deaktiviert",
    "user",
    input.memberId,
    `${member.firstName} ${member.lastName}`,
  );
}
