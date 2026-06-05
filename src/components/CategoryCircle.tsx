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
  
  // Dynamic fallback URL with minute-based cache busting pointing to optimized thumbnail endpoint
  const fallbackUrl = `${API_BASE_URL}/api/wallpapers/thumbnail/${category.id}/1.jpg`;
  const thumbnailUrl = customThumbnailUrl || fallbackUrl;

  // Dynamically resolve crop positions to center deity faces perfectly
  const getContentPosition = () => {
    if (category.id === 'shiv') {
      // Shift slightly higher up to position Shiv's face above
      return { top: '5%', left: '50%' };
    }
    if (category.id === 'ganesh') {
      // Shift slightly higher up to position Ganesha's face above
      return { top: '3%', left: '50%' };
    }
    return 'top';
  };

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
          contentPosition={getContentPosition()}
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
