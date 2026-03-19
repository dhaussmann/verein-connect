import { redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { getFirstFieldError } from "@/lib/forms";
import { getMemberFormOptionsUseCase } from "@/modules/members/use-cases/get-member-form-options.use-case";
import { createMemberUseCase } from "@/modules/members/use-cases/create-member.use-case";
import { createMemberFormSchema } from "@/modules/members/schemas/create-member.schema";
import MemberCreateRoute from "@/modules/members/web/MemberCreateRoute";
import type { MemberCreateLoaderData, MemberRouteActionData } from "@/modules/members/types/member.types";

export async function loader({ request, context }: LoaderFunctionArgs): Promise<MemberCreateLoaderData> {
  const { env, user } = await requireRouteData(request, context);
  return getMemberFormOptionsUseCase(env, user.orgId);
}

export async function action({ request, context }: ActionFunctionArgs): Promise<MemberRouteActionData | Response> {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const parsed = createMemberFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    mobile: formData.get("mobile"),
    birthDate: formData.get("birthDate"),
    gender: formData.get("gender"),
    street: formData.get("street"),
    zip: formData.get("zip"),
    city: formData.get("city"),
    status: formData.get("status") || "Aktiv",
  });

  if (!parsed.success) return { error: getFirstFieldError(parsed.error.issues) || "Bitte die Eingaben prüfen" };
  if (formData.get("dsgvo") !== "on") return { error: "Die Datenschutzerklärung muss akzeptiert werden" };

  const profileFields = Object.fromEntries(
    Array.from(formData.entries())
      .filter(([key]) => key.startsWith("custom_"))
      .map(([key, value]) => [key.replace(/^custom_/, ""), String(value)]),
  );

  try {
    await createMemberUseCase(env, {
      orgId: user.orgId,
      actorUserId: user.id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      mobile: parsed.data.mobile,
      birthDate: parsed.data.birthDate,
      gender: parsed.data.gender,
      street: parsed.data.street,
      zip: parsed.data.zip,
      city: parsed.data.city,
      status: parsed.data.status === "Aktiv" ? "active" : parsed.data.status === "Inaktiv" ? "inactive" : "pending",
      roleId: String(formData.get("roleId") || "") || undefined,
      groupId: String(formData.get("groupId") || "") || undefined,
      profileFields,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Fehler beim Erstellen" };
  }

  return redirect("/members");
}

export default MemberCreateRoute;
