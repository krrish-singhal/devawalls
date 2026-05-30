import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { router } from 'expo-router';

export default function Index() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isProfileComplete = useUserStore((state) => state.isProfileComplete);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else if (!isProfileComplete) {
      router.replace('/splash');
    } else {
      router.replace('/(tabs)/');
    }
  }, []);

  return null;
}
