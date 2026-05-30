import { TouchableOpacity, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Category } from '@/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000';

export function CategoryCircle({ category }: { category: Category }) {
  const thumbnailUrl = `${API_BASE_URL}/wallpapers/${category.id}/1.jpg`;

  return (
    <TouchableOpacity
      className="items-center mr-4"
      onPress={() => router.push(`/category/${category.id}`)}
      activeOpacity={0.8}
    >
      <View className="rounded-full border-2 border-primary overflow-hidden" style={{ width: 72, height: 72 }}>
        <Image
          source={{ uri: thumbnailUrl }}
          style={{ width: 72, height: 72 }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>
      <Text className="text-white text-xs mt-1 text-center" style={{ maxWidth: 72 }}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}
