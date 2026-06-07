import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  token: string | null;
  googleAccessToken: string | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setGoogleAccessToken: (token: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      googleAccessToken: null,
      isAuthenticated: false,
      setToken: (token) => set({ token, isAuthenticated: true }),
      setGoogleAccessToken: (token) => set({ googleAccessToken: token }),
      clearAuth: () => set({ token: null, googleAccessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
