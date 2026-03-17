import { create } from 'zustand';

interface User {
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
  login: (email: string, password: string) => Promise<void>;
  register: (data: { clubName: string; clubType: string; firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const mockUser: User = {
  id: '1',
  email: 'admin@sportverein.de',
  firstName: 'Max',
  lastName: 'Müller',
  role: 'admin',
  clubName: 'TSV Musterstadt',
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async (_email: string, _password: string) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 500));
    set({ user: mockUser, isAuthenticated: true, isLoading: false });
  },
  register: async (_data) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 800));
    set({ user: mockUser, isAuthenticated: true, isLoading: false });
  },
  logout: () => {
    set({ user: null, isAuthenticated: false });
  },
}));
