import type { LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "./route";

export async function authenticatedLoader({ request, context }: LoaderFunctionArgs) {
  await requireRouteData(request, context);
  return null;
}
