import { TouchableOpacity, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Category } from '@/types';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000').replace('/api', '');

interface CategoryCircleProps {
  category: Category;
  customThumbnailUrl?: string;
}

export function CategoryCircle({ category, customThumbnailUrl }: CategoryCircleProps) {
  const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000').replace('/api', '');
  
  // Dynamic fallback URL with minute-based cache busting if featured image payload isn't ready
  const fallbackUrl = `${API_BASE_URL}/wallpapers/${category.id}/1.jpg?v=${new Date().getMinutes()}`;
  const thumbnailUrl = customThumbnailUrl || fallbackUrl;

  return (
    <TouchableOpacity
      className="items-center mr-5"
      onPress={() => router.push(`/category/${category.id}`)}
      activeOpacity={0.8}
    >
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          borderWidth: 2.5,
          borderColor: '#F5C518',
          backgroundColor: '#1E1E1E',
          overflow: 'hidden',
          // Premium drop shadows
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 3,
        }}
      >
        <Image
          source={{ uri: thumbnailUrl }}
          style={{ width: '100%', height: '100%', borderRadius: 42 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          transition={250}
        />
      </View>
      <Text className="text-white text-xs mt-2 text-center font-semibold" style={{ maxWidth: 84 }}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}
