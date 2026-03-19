import { useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { listGroupsUseCase } from "@/modules/groups/use-cases/list-groups.use-case";
import { listMembersUseCase } from "@/modules/members/use-cases/list-members.use-case";
import { listMembershipTypesUseCase, listTarifsUseCase } from "@/modules/contracts/use-cases/contract-settings.use-cases";
import { createContractUseCase } from "@/modules/contracts/use-cases/contracts.use-cases";
import ContractNewPage from "@/modules/contracts/web/ContractNewPage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const [membersResult, mtData, tarifData, groupsResult] = await Promise.all([
    listMembersUseCase(env, user.orgId, { page: 1, perPage: 500 }),
    listMembershipTypesUseCase(env, user.orgId),
    listTarifsUseCase(env, user.orgId),
    listGroupsUseCase(env, user.orgId),
  ]);
  return { membersData: { data: membersResult.members }, mtData, tarifData, groupsData: { data: groupsResult.groups } };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  try {
    await createContractUseCase(env, {
      orgId: user.orgId,
      actorUserId: user.id,
      payload: JSON.parse(String(formData.get("payload") || "{}")),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erstellen fehlgeschlagen" };
  }
}

export default function ContractNewRoute() {
  const { membersData, mtData, tarifData, groupsData } = useLoaderData<typeof loader>();
  return (
    <ContractNewPage
      membersData={membersData}
      mtData={mtData}
      tarifData={tarifData}
      groupsData={groupsData}
      actionData={useActionData<typeof action>()}
      navigationState={useNavigation().state}
    />
  );
}
