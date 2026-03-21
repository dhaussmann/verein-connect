import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { createAuth } from '~/core/auth/auth.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const auth = createAuth(context.cloudflare.env as any);
  return auth.handler(request);
}

export async function action({ request, context }: ActionFunctionArgs) {
  const auth = createAuth(context.cloudflare.env as any);
  return auth.handler(request);
}
