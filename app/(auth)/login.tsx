import { View, TouchableOpacity, Text, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { GoogleSignin, statusCodes, isSuccessResponse, isErrorWithCode } from '@react-native-google-signin/google-signin';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { router } from 'expo-router';

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

GoogleSignin.configure({
  webClientId: googleWebClientId,
  scopes: ['openid', 'profile', 'email'],
  offlineAccess: false,
});

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setToken = useAuthStore((state) => state.setToken);
  const setGoogleAccessToken = useAuthStore((state) => state.setGoogleAccessToken);
  const setUser = useUserStore((state) => state.setUser);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      if (!googleWebClientId) {
        setError('Google sign in is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
        setLoading(false);
        return;
      }

      console.log('[GOOGLE] Starting Native Google sign in...');
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const idToken = response.data.idToken;
        if (!idToken) {
          setError('Google sign in completed, but no ID token was returned.');
          setLoading(false);
          return;
        }

        setGoogleAccessToken(null);
        await handleBackendVerification(idToken);
      } else {
         setError('Sign in was cancelled.');
         setLoading(false);
      }
    } catch (err: any) {
      console.error('[GOOGLE] Native Sign-In error:', err);

      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.IN_PROGRESS:
            setError('Google sign in is already in progress.');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError('Google Play Services is not available or outdated.');
            break;
          case statusCodes.SIGN_IN_CANCELLED:
            setError('Sign in was cancelled.');
            break;
          default:
            setError(`Sign in failed: ${err.message || 'Unknown error code'}`);
        }
      } else {
        setError(`Sign in failed: ${err?.message || 'Unexpected Google authentication error.'}`);
      }

      setLoading(false);
    }
  };

  const handleBackendVerification = async (idToken: string) => {
    try {
      console.log('[BACKEND] Sending ID token to backend for verification...');
      console.log(`[BACKEND] API URL: ${process.env.EXPO_PUBLIC_API_URL}`);

      let authResponse;
      const retries = 5;
      const delay = 4000;

      for (let i = 0; i < retries; i++) {
        try {
          authResponse = await authApi.googleSignIn(idToken);
          break;
        } catch (err: any) {
          const isTimeoutOrNetwork = 
            err?.code === 'ECONNABORTED' || 
            err?.code === 'ERR_NETWORK' ||
            err?.code === 'ECONNREFUSED' ||
            err?.message?.includes('timeout') ||
            err?.message?.includes('Network') ||
            err?.message?.includes('network');

          if (isTimeoutOrNetwork && i < retries - 1) {
            console.log(`[Google Auth] Backend may be waking up (Render cold start). Retrying request (${i + 1}/${retries}) in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw err;
        }
      }

      if (!authResponse) {
        throw new Error('Authentication response empty');
      }

      console.log('[BACKEND] Verification successful, user:', authResponse.user.email);

      setToken(authResponse.token);
      setUser({
        id: authResponse.user.id,
        name: authResponse.user.name,
        email: authResponse.user.email,
        profilePhoto: authResponse.user.profilePhoto,
        isProfileComplete: !!(authResponse.user.name && authResponse.user.name.trim().length > 0),
      });

      console.log('[AUTH] User state set, navigating to splash...');
      router.replace('/splash');
    } catch (err: any) {
      console.error(
        '[BACKEND] Verification failed:',
        err?.response?.data || err?.message || err
      );

      let errorMessage = 'Backend verification failed. Please try again.';

      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        errorMessage =
          'Connection timed out. The server may be starting up. Please try again in 30 seconds.';
      } else if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNREFUSED') {
        errorMessage =
          'Cannot connect to the server. Please check your internet connection or try again after the backend wakes up.';
      } else if (err?.response?.status === 401) {
        errorMessage = 'Invalid Google token. Please choose your Google account again.';
      } else if (err?.response?.status === 404) {
        errorMessage = 'Backend authentication endpoint is unavailable. Please verify the API URL.';
      } else if (err?.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err?.message) {
        errorMessage = `Error: ${err.message}`;
      }

      setError(errorMessage);

      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark">
      <View className="flex-1 justify-between p-6">
        {/* Top section - Logo and branding */}
        <View className="flex-1 justify-center items-center">
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 80, height: 80, marginBottom: 24, borderRadius: 12 }}
            resizeMode="contain"
          />
          <Text className="text-4xl font-bold text-primary text-center">Deva Walls</Text>
          <Text className="text-white text-center mt-3 text-base">Sacred Wallpapers for Your Soul</Text>
        </View>

        {/* Bottom section */}
        <View className="gap-4">
          {error ? (
            <Text className="text-red-400 text-center text-xs px-2 leading-5">{error}</Text>
          ) : null}

          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={loading}
            className="bg-white rounded-xl p-4 flex-row items-center justify-center"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#0F0F0F" />
            ) : (
              <>
                <Image
                  source={require('../../public/google.png')}
                  style={{ width: 24, height: 24, marginRight: 12 }}
                  resizeMode="contain"
                />
                <Text className="text-dark font-semibold text-base">Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
