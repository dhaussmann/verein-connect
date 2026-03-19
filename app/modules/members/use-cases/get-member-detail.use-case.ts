import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { bankAccounts, contracts, groups, membershipTypes, tarifs } from "@/core/db/schema";
import { settingsRepository } from "@/modules/settings/repository/settings.repository";
import { getSettingsProfileFieldsUseCase, getSettingsRolesUseCase } from "@/modules/settings/use-cases/settings.use-cases";
import { listGroupsUseCase } from "@/modules/groups/use-cases/list-groups.use-case";
import { membersRepository } from "../repository/members.repository";
import { toMemberListItem } from "../presenters/member.presenter";

export async function getMemberDetailUseCase(env: RouteEnv, input: { orgId: string; memberId: string }) {
  const repo = membersRepository(env);
  const memberRow = await repo.findUserById(input.orgId, input.memberId);
  if (!memberRow) {
    throw new Error("Mitglied nicht gefunden");
  }

  const db = drizzle(env.DB);
  const [member, contractsRows, groupsResult, roles, profileFields, bankAccountRows] = await Promise.all([
    toMemberListItem(repo, memberRow),
    db.select().from(contracts).where(and(eq(contracts.orgId, input.orgId), eq(contracts.memberId, input.memberId))).orderBy(desc(contracts.createdAt)),
    listGroupsUseCase(env, input.orgId),
    getSettingsRolesUseCase(env, input.orgId),
    getSettingsProfileFieldsUseCase(env, input.orgId),
    db.select().from(bankAccounts).where(and(eq(bankAccounts.orgId, input.orgId), eq(bankAccounts.userId, input.memberId))),
  ]);

  const mappedContracts = await Promise.all(contractsRows.map(async (contract) => {
    let typeName = "";
    if (contract.membershipTypeId) {
      const rows = await db.select({ name: membershipTypes.name }).from(membershipTypes).where(eq(membershipTypes.id, contract.membershipTypeId));
      typeName = rows[0]?.name || "";
    }
    if (contract.tarifId) {
      const rows = await db.select({ name: tarifs.name }).from(tarifs).where(eq(tarifs.id, contract.tarifId));
      typeName = rows[0]?.name || "";
    }

    let groupName = "";
    if (contract.groupId) {
      const rows = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, contract.groupId));
      groupName = rows[0]?.name || "";
    }

    return {
      id: contract.id,
      contractNumber: contract.contractNumber,
      memberId: contract.memberId,
      memberName: `${member.firstName} ${member.lastName}`,
      memberEmail: member.email,
      memberInitials: member.avatarInitials,
      contractKind: contract.contractKind,
      typeName,
      groupId: contract.groupId,
      groupName,
      status: contract.status || "",
      startDate: contract.startDate,
      endDate: contract.endDate,
      currentPrice: contract.currentPrice,
      billingPeriod: contract.billingPeriod,
      autoRenew: contract.autoRenew,
      cancellationDate: contract.cancellationDate,
      cancellationEffectiveDate: contract.cancellationEffectiveDate,
      createdAt: contract.createdAt || "",
    };
  }));

  const bankAccount = bankAccountRows[0]
    ? {
        id: bankAccountRows[0].id,
        userId: bankAccountRows[0].userId,
        accountHolder: bankAccountRows[0].accountHolder,
        iban: bankAccountRows[0].iban,
        bic: bankAccountRows[0].bic,
        bankName: bankAccountRows[0].bankName,
        sepaMandate: !!bankAccountRows[0].sepaMandate,
        sepaMandateDate: bankAccountRows[0].sepaMandateDate,
        sepaMandateRef: bankAccountRows[0].sepaMandateRef,
        createdAt: bankAccountRows[0].createdAt || "",
        updatedAt: bankAccountRows[0].updatedAt || "",
      }
    : null;

  return {
    member,
    contracts: mappedContracts,
    groups: groupsResult.groups,
    roles,
    profileFields,
    bankAccount,
  };
}
