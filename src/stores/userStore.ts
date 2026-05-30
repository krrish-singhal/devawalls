import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserState {
  id: string | null;
  name: string | null;
  email: string | null;
  profilePhoto: string | null;
  isProfileComplete: boolean;
  setUser: (user: Partial<UserState>) => void;
  setProfilePhoto: (uri: string) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      id: null,
      name: null,
      email: null,
      profilePhoto: null,
      isProfileComplete: false,
      setUser: (user) => set((state) => ({ ...state, ...user })),
      setProfilePhoto: (uri) => set({ profilePhoto: uri }),
      clearUser: () => set({ id: null, name: null, email: null, profilePhoto: null, isProfileComplete: false }),
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
