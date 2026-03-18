import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function RoleRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admins and trainers go to admin dashboard, members go to portal
  if (user?.role === 'admin' || user?.role === 'trainer') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/portal" replace />;
}
