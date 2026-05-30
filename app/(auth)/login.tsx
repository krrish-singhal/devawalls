import { View, TouchableOpacity, Text, SafeAreaView, ActivityIndicator } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { router } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleSuccess(authentication.accessToken);
      }
    }
  }, [response]);

  const handleGoogleSuccess = async (accessToken: string) => {
    try {
      setLoading(true);
      setError('');
      const authResponse = await authApi.googleSignIn(accessToken);
      setToken(authResponse.token);
      setUser({
        id: authResponse.user.id,
        name: authResponse.user.name,
        email: authResponse.user.email,
        profilePhoto: authResponse.user.profilePhoto,
        isProfileComplete: !!authResponse.user.name,
      });
      router.replace('/splash');
    } catch (err) {
      console.error('Sign in failed:', err);
      setError('Sign in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark">
      <View className="flex-1 justify-between p-6">
        {/* Top section - Logo and branding */}
        <View className="flex-1 justify-center items-center">
          <Text className="text-6xl mb-6">🪷</Text>
          <Text className="text-4xl font-bold text-primary text-center">Deva Walls</Text>
          <Text className="text-white text-center mt-3 text-base">Sacred Wallpapers for Your Soul</Text>
        </View>

        {/* Bottom section - Sign in button */}
        <View className="gap-4">
          {error && <Text className="text-red-500 text-center text-sm">{error}</Text>}

          <TouchableOpacity
            onPress={() => promptAsync()}
            disabled={loading || !request}
            className="bg-white rounded-xl p-4 flex-row items-center justify-center"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#0F0F0F" />
            ) : (
              <>
                <Text className="text-2xl mr-3">G</Text>
                <Text className="text-dark font-semibold text-base">Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
