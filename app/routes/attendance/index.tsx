import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { listTodayAttendanceEventsUseCase } from "@/modules/attendance/use-cases/attendance.use-cases";
import AttendancePage from "@/modules/attendance/web/AttendancePage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const today = new Date().toISOString().slice(0, 10);
  const eventsData = await listTodayAttendanceEventsUseCase(env, user.orgId, today);
  return { eventsData };
}

export default function AttendanceIndexRoute() {
  return <AttendancePage {...useLoaderData<typeof loader>()} />;
}
