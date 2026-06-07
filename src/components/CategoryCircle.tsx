import { TouchableOpacity, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Category } from '@/types';

// Strip /api suffix so static asset URLs resolve correctly
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000').replace('/api', '');

interface CategoryCircleProps {
  category: Category;
  customThumbnailUrl?: string;
}

export function CategoryCircle({ category, customThumbnailUrl }: CategoryCircleProps) {
  // Dynamic fallback URL pointing to optimized thumbnail endpoint
  const fallbackUrl = `${API_BASE_URL}/api/wallpapers/thumbnail/${category.id}/1.jpg`;
  const thumbnailUrl = customThumbnailUrl || fallbackUrl;

  // Dynamically resolve crop positions to center deity faces perfectly
  const getContentPosition = () => {
    switch (category.id) {
      case 'shiv':
        return { top: '35%', left: '50%' };
      case 'ganesh':
        return { top: '38%', left: '50%' };
      case 'ram':
      case 'maa_durga':
      case 'hanuman':
      case 'krishna':
      default:
        return { top: '0%', left: '50%' };
    }
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
          recyclingKey={thumbnailUrl}
        />
      </View>
      <Text
        className="text-white text-xs mt-2 text-center font-semibold"
        style={{ maxWidth: 84 }}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}
