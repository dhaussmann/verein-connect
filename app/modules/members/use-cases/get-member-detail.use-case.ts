import { and, desc, eq, inArray } from "drizzle-orm";
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

  const membershipTypeIds = [...new Set(contractsRows.map((contract) => contract.membershipTypeId).filter((id): id is string => Boolean(id)))];
  const tarifIds = [...new Set(contractsRows.map((contract) => contract.tarifId).filter((id): id is string => Boolean(id)))];
  const groupIds = [...new Set(contractsRows.map((contract) => contract.groupId).filter((id): id is string => Boolean(id)))];
  const [membershipTypeRows, tarifRows, groupRows] = await Promise.all([
    membershipTypeIds.length > 0
      ? db.select({ id: membershipTypes.id, name: membershipTypes.name }).from(membershipTypes).where(inArray(membershipTypes.id, membershipTypeIds))
      : Promise.resolve([]),
    tarifIds.length > 0
      ? db.select({ id: tarifs.id, name: tarifs.name }).from(tarifs).where(inArray(tarifs.id, tarifIds))
      : Promise.resolve([]),
    groupIds.length > 0
      ? db.select({ id: groups.id, name: groups.name }).from(groups).where(inArray(groups.id, groupIds))
      : Promise.resolve([]),
  ]);
  const membershipTypeNames = new Map(membershipTypeRows.map((row) => [row.id, row.name]));
  const tarifNames = new Map(tarifRows.map((row) => [row.id, row.name]));
  const groupNames = new Map(groupRows.map((row) => [row.id, row.name]));

  const mappedContracts = contractsRows.map((contract) => {
    const typeName = contract.membershipTypeId
      ? membershipTypeNames.get(contract.membershipTypeId) || ""
      : contract.tarifId
        ? tarifNames.get(contract.tarifId) || ""
        : "";
    const groupName = contract.groupId ? groupNames.get(contract.groupId) || "" : "";

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
  });

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
    profileFields: profileFields.map((field) => ({ ...field, options: [] })),
    bankAccount,
  };
}
