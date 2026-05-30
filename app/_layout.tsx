import "../global.css";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const { isAuthenticated } = useAuthStore();
  const { isProfileComplete } = useUserStore();

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{ headerShown: false }}
        initialRouteName={
          isAuthenticated
            ? isProfileComplete
              ? '(tabs)'
              : 'splash'
            : '(auth)/login'
        }
      />
    </QueryClientProvider>
  );
}
