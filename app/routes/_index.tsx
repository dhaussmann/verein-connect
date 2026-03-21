import type { LoaderFunctionArgs } from 'react-router';
import { redirect } from 'react-router';
import { getSessionUser } from '~/core/auth/auth.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getSessionUser(request, context.cloudflare.env as any);
  if (!user) {
    return redirect('/login');
  }

  // Role-based redirect
  const isAdmin = user.roles.includes('org_admin') || user.roles.includes('member_admin');
  const isTrainer = user.roles.includes('trainer');

  if (isAdmin || isTrainer) {
    return redirect('/dashboard');
  }
  return redirect('/portal');
}

export default function Index() {
  return null;
}
