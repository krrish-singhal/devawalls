import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { name, email, profilePhoto, clearUser } = useUserStore();
  const { clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearUser();
    clearAuth();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-dark">
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 border-b border-primary">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">My Profile</Text>
      </View>

      <ScrollView className="flex-1 px-6 py-8">
        <View className="items-center mb-8">
          <View className="w-32 h-32 rounded-full overflow-hidden border-2 border-primary items-center justify-center bg-card">
            {profilePhoto ? (
              <Image
                source={{ uri: profilePhoto }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <Ionicons name="person" size={48} color="#F5C518" />
            )}
          </View>
        </View>

        <View className="bg-card rounded-2xl p-6 mb-8">
          <View className="mb-6">
            <Text className="text-textMuted text-sm mb-1">Name</Text>
            <Text className="text-white text-lg font-semibold">{name || 'Devotee'}</Text>
          </View>
          
          <View>
            <Text className="text-textMuted text-sm mb-1">Email</Text>
            <Text className="text-white text-lg font-semibold">{email || 'Not provided'}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500/10 border border-red-500 rounded-xl p-4 flex-row items-center justify-center"
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text className="text-red-500 font-bold text-base">Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
