import "../global.css";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { router } from 'expo-router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isProfileComplete = useUserStore((state) => state.isProfileComplete);

  useEffect(() => {
    // Check authentication on mount
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else if (!isProfileComplete) {
      router.replace('/splash');
    } else {
      router.replace('/(tabs)/');
    }
  }, [isAuthenticated, isProfileComplete]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
