import { useActionData, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { checkInAttendanceUseCase, getAttendanceOccurrenceUseCase } from "@/modules/attendance/use-cases/attendance.use-cases";
import AttendanceCheckInPage from "@/modules/attendance/web/AttendanceCheckInPage";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  if (!params.eventId) throw new Response("Not Found", { status: 404 });
  const data = await getAttendanceOccurrenceUseCase(env, { orgId: user.orgId, occurrenceId: params.eventId });
  if (!data) throw new Response("Not Found", { status: 404 });
  return { eventId: params.eventId, event: data.event, attendanceData: data.attendanceData };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  if (!params.eventId) throw new Response("Not Found", { status: 404 });
  const formData = await request.formData();

  try {
    await checkInAttendanceUseCase(env, {
      orgId: user.orgId,
      actorUserId: user.id,
      occurrenceId: params.eventId,
      userId: String(formData.get("userId") || ""),
      status: String(formData.get("status") || ""),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Check-in fehlgeschlagen" };
  }
}

export default function AttendanceCheckInRoute() {
  return <AttendanceCheckInPage {...useLoaderData<typeof loader>()} actionData={useActionData<typeof action>()} />;
}
