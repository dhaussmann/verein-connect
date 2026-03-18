import { create } from 'zustand';
import { authApi, setTokens, clearTokens, getAccessToken, ApiError } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'trainer' | 'member';
  clubName: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { clubName: string; clubType: string; firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

function mapRole(roles?: string[]): 'admin' | 'trainer' | 'member' {
  if (roles?.includes('org_admin')) return 'admin';
  if (roles?.includes('trainer')) return 'trainer';
  return 'member';
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!getAccessToken(),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(email, password);
      setTokens(res.access_token, res.refresh_token);
      const user: User = {
        id: res.user.id,
        email: res.user.email,
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        role: mapRole(res.user.roles),
        clubName: res.user.clubName || res.organization?.name || '',
        avatarUrl: res.user.avatarUrl ?? undefined,
      };
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login fehlgeschlagen';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.register({
        org_name: data.clubName,
        org_type: data.clubType,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password: data.password,
      });
      setTokens(res.access_token, res.refresh_token);
      const user: User = {
        id: res.user.id,
        email: res.user.email,
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        role: mapRole(res.user.roles),
        clubName: res.user.clubName || res.organization?.name || '',
        avatarUrl: res.user.avatarUrl ?? undefined,
      };
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Registrierung fehlgeschlagen';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: () => {
    authApi.logout().catch(() => {});
    clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    if (!getAccessToken()) {
      set({ user: null, isAuthenticated: false });
      return;
    }
    set({ isLoading: true });
    try {
      const res = await authApi.me();
      const u = res.user;
      const user: User = {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: mapRole(u.roles),
        clubName: u.organization?.name || '',
        avatarUrl: u.avatarUrl ?? undefined,
      };
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
