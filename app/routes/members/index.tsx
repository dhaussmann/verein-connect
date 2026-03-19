import { useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { listMembersUseCase } from "@/modules/members/use-cases/list-members.use-case";
import { changeMemberStatusUseCase } from "@/modules/members/use-cases/change-member-status.use-case";
import MembersListRoute from "@/modules/members/web/MembersListRoute";
import type { MemberListLoaderData, MemberListSortKey, MemberRouteActionData } from "@/modules/members/types/member.types";

export async function loader({ request, context }: LoaderFunctionArgs): Promise<MemberListLoaderData> {
  const { env, user } = await requireRouteData(request, context);
  const url = new URL(request.url);
  const data = await listMembersUseCase(env, user.orgId, {
    search: url.searchParams.get("search") || undefined,
    status: url.searchParams.get("status") || undefined,
    role: url.searchParams.get("role") || undefined,
    group: url.searchParams.get("group") || undefined,
    sort: url.searchParams.get("sort") || undefined,
    dir: url.searchParams.get("dir") || undefined,
    page: Number(url.searchParams.get("page") || 1),
    perPage: Number(url.searchParams.get("perPage") || 25),
  });

  return {
    ...data,
    filters: {
      search: url.searchParams.get("search") || "",
      status: url.searchParams.get("status") || "Alle",
      role: url.searchParams.get("role") || "Alle",
      group: url.searchParams.get("group") || "Alle",
      sort: (url.searchParams.get("sort") || "name") as MemberListSortKey,
      dir: (url.searchParams.get("dir") || "asc") as "asc" | "desc",
    },
  };
}

export async function action({ request, context }: ActionFunctionArgs): Promise<MemberRouteActionData> {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const memberId = String(formData.get("memberId") || "");

  try {
    if (intent === "deactivate-member" || intent === "delete-member") {
      if (!memberId) return { error: "Mitglied fehlt" };
      await changeMemberStatusUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        memberId,
        hardDelete: intent === "delete-member",
      });
      return { success: true };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Aktion fehlgeschlagen" };
  }

  return { error: "Unbekannte Aktion" };
}

export default MembersListRoute;
