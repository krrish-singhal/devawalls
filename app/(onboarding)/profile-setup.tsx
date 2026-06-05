import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image as RNImage } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { authApi } from '@/api/auth.api';
import { useUserStore } from '@/stores/userStore';
import { router } from 'expo-router';

export default function ProfileSetupScreen() {
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useUserStore((state) => state.setUser);
  const setProfilePhoto = useUserStore((state) => state.setProfilePhoto);

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Photo picker error:', err);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      setLoading(true);
      let photoBase64: string | undefined;

      if (photoUri) {
        // Convert URI to base64
        const response = await fetch(photoUri);
        const blob = await response.blob();
        photoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      await authApi.updateProfile(name, photoBase64?.split(',')[1]);
      setUser({ isProfileComplete: true, name });
      if (photoUri) {
        setProfilePhoto(photoUri);
      }
      router.replace('/home');
    } catch (err) {
      console.error('Profile update error:', err);
      alert('Failed to save profile. Please try again.');
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setUser({ isProfileComplete: true });
    router.replace('/home');
  };

  return (
    <SafeAreaView className="flex-1 bg-dark">
      <ScrollView className="flex-1 px-6 py-8" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <Text className="text-3xl font-bold text-primary mb-2">Welcome!</Text>
        <Text className="text-white text-sm mb-8">Tell us your name and add a photo. We&apos;ll place it on wallpapers for you!</Text>

        {/* Profile photo circle */}
        <TouchableOpacity
          onPress={pickPhoto}
          className="items-center mb-8"
        >
          <View
            className="border-2 border-dashed border-primary items-center justify-center rounded-full"
            style={{ width: 120, height: 120 }}
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={{ width: 120, height: 120, borderRadius: 60 }}
                contentFit="cover"
              />
            ) : (
              <>
                <Ionicons name="camera" size={32} color="#F5C518" style={{ marginBottom: 8 }} />
                <Text className="text-primary text-xs text-center">Add Photo</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Name input */}
        <TextInput
          placeholder="Enter your name"
          placeholderTextColor="#AAAAAA"
          value={name}
          onChangeText={setName}
          className="border border-primary rounded-lg px-4 py-3 text-white bg-card mb-12"
        />

        {/* Save & Continue button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          className="bg-secondary rounded-xl p-4 items-center mb-3"
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-bold text-base">Save & Continue</Text>
          )}
        </TouchableOpacity>

        {/* Skip button */}
        <TouchableOpacity
          onPress={handleSkip}
          disabled={loading}
          className="flex-row items-center justify-center"
        >
          <Text className="text-primary text-center font-semibold mr-1">Skip for now</Text>
          <Ionicons name="arrow-forward" size={16} color="#F5C518" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
