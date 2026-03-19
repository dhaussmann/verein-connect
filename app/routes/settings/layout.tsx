import type { LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import SettingsLayoutPage from "@/modules/settings/web/SettingsLayoutPage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireRouteData(request, context);
  return null;
}

export default SettingsLayoutPage;
