import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { addGroupMemberUseCase } from "@/modules/groups/use-cases/add-group-member.use-case";
import { removeGroupMemberUseCase } from "@/modules/groups/use-cases/remove-group-member.use-case";
import { upsertBankAccountUseCase, deleteBankAccountUseCase } from "@/modules/members/use-cases/bank-account.use-case";
import { getMemberDetailUseCase } from "@/modules/members/use-cases/get-member-detail.use-case";
import { updateMemberUseCase } from "@/modules/members/use-cases/update-member.use-case";
import { changeMemberStatusUseCase } from "@/modules/members/use-cases/change-member-status.use-case";
import MemberDetailPage from "@/modules/members/web/MemberDetailPage";
import type { MemberDetailActionData, MemberDetailLoaderData } from "@/modules/members/types/member.types";

export async function loader({ request, context, params }: LoaderFunctionArgs): Promise<MemberDetailLoaderData> {
  const { env, user } = await requireRouteData(request, context);
  const memberId = params.id;
  if (!memberId) throw new Error("Mitglied fehlt");
  return getMemberDetailUseCase(env, { orgId: user.orgId, memberId });
}

export async function action({ request, context, params }: ActionFunctionArgs): Promise<MemberDetailActionData> {
  const { env, user } = await requireRouteData(request, context);
  const memberId = params.id;
  if (!memberId) return { error: "Mitglied fehlt" };

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  try {
    if (intent === "deactivate-member") {
      await updateMemberUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        memberId,
        body: { status: "inactive" },
      });
      return { success: true, intent };
    }
    if (intent === "delete-member") {
      await changeMemberStatusUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        memberId,
        hardDelete: true,
      });
      return { success: true, intent, redirectTo: "/members" };
    }
    if (intent === "add-group-member") {
      const groupId = String(formData.get("groupId") || "");
      if (!groupId) return { success: false, intent, error: "Gruppe fehlt" };
      await addGroupMemberUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId, userId: memberId });
      return { success: true, intent };
    }
    if (intent === "remove-group-member") {
      const groupId = String(formData.get("groupId") || "");
      if (!groupId) return { success: false, intent, error: "Gruppe fehlt" };
      await removeGroupMemberUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId, userId: memberId });
      return { success: true, intent };
    }
    if (intent === "upsert-bank-account") {
      await upsertBankAccountUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        memberId,
        accountHolder: String(formData.get("accountHolder") || ""),
        iban: String(formData.get("iban") || ""),
        bic: String(formData.get("bic") || "") || null,
        bankName: String(formData.get("bankName") || "") || null,
        sepaMandate: formData.get("sepaMandate") === "on",
        sepaMandateDate: String(formData.get("sepaMandateDate") || "") || null,
        sepaMandateRef: String(formData.get("sepaMandateRef") || "") || null,
      });
      return { success: true, intent };
    }
    if (intent === "delete-bank-account") {
      await deleteBankAccountUseCase(env, { orgId: user.orgId, actorUserId: user.id, memberId });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : "Aktion fehlgeschlagen" };
  }

  return { error: "Unbekannte Aktion" };
}

export default MemberDetailPage;
