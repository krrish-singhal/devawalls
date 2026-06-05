import { View, TouchableOpacity, Text, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { router } from 'expo-router';

let GoogleSignin: any;
let statusCodes: any;

try {
  const GoogleModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = GoogleModule.GoogleSignin;
  statusCodes = GoogleModule.statusCodes;
  
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
} catch (e) {
  console.warn('GoogleSignin native module is not available. Falling back to dev mode bypass.');
}

export default function LoginScreen() {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useUserStore((state) => state.setUser);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      
      if (tokens.accessToken) {
        await handleGoogleSuccess(tokens.accessToken);
      } else {
        throw new Error('No access token returned from Google');
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        setError('Sign in cancelled');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Sign in already in progress');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available');
      } else if (
        err.code === '10' || 
        err.code === 10 || 
        err.message?.includes('10') || 
        err.message?.includes('DEVELOPER_ERROR')
      ) {
        setError('Developer Error (10): Please register the EAS Android Keystore SHA-1 (A2:B3:CD:18:48:AD:B6:FE:AE:E0:D0:2A:0D:31:B9:B9:BD:FB:DF:63) in your Google Cloud / Firebase Console under package com.krrish.devawalls.');
      } else {
        setError('Sign in failed. Please try again.');
      }
      setLoading(false);
    }
  };

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
          <Image 
            source={require('../../assets/logo.png')} 
            style={{ width: 80, height: 80, marginBottom: 24, borderRadius: 12 }} 
            resizeMode="contain" 
          />
          <Text className="text-4xl font-bold text-primary text-center">Deva Walls</Text>
          <Text className="text-white text-center mt-3 text-base">Sacred Wallpapers for Your Soul</Text>
        </View>

        {/* Bottom section - Sign in button and bypass */}
        <View className="gap-4">
          {error && <Text className="text-red-500 text-center text-xs px-2">{error}</Text>}

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

          {/* Sign in button only */}
        </View>
      </View>
    </SafeAreaView>
  );
}
