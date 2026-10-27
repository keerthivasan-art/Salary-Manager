import { create } from 'zustand';
import type { AppUser } from '@shared/types';

interface Credentials {
  userId: string;
  password: string;
}

// Predefined users only — no registration, no forgot-password flow.
const USERS: Record<string, { password: string; displayName: AppUser['displayName'] }> = {
  keerthi: { password: '4107', displayName: 'Keerthi' },
  mathi: { password: '4107', displayName: 'Mathi' },
};

interface AuthState {
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  lastUserId: string | null; // remembers only the last USER ID (never the password)
  login: (creds: Credentials) => { success: boolean; error?: string };
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  lastUserId: localStorage.getItem('sasm_last_user_id'),

  login: ({ userId, password }) => {
    const normalized = userId.trim().toLowerCase();
    const record = USERS[normalized];
    if (!record || record.password !== password) {
      return { success: false, error: 'Invalid User ID or Password.' };
    }
    localStorage.setItem('sasm_last_user_id', normalized);
    set({
      currentUser: { userId: normalized as AppUser['userId'], displayName: record.displayName },
      isAuthenticated: true,
      lastUserId: normalized,
    });
    return { success: true };
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false });
  },
}));
