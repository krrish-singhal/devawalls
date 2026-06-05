import "../global.css";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{ headerShown: false }}
          initialRouteName={
            isAuthenticated
              ? isProfileComplete
                ? 'home'
                : 'splash'
              : '(auth)'
          }
        />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
