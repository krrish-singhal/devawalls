import { View, Text, SafeAreaView, FlatList, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useCategoryWallpapers } from '@/hooks/useWallpapers';
import { WallpaperCard } from '@/components/WallpaperCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { CATEGORIES } from '@/constants/categories';

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 40) / 2;
const cardHeight = cardWidth * (16 / 9);

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: wallpapers, isLoading } = useCategoryWallpapers(id || '');

  const category = CATEGORIES.find((c) => c.id === id);

  return (
    <SafeAreaView className="flex-1 bg-dark">
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 border-b border-primary">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
        >
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">{category?.name} Wallpapers</Text>
      </View>

      {/* Grid */}
      {isLoading ? (
        <FlatList
          data={Array(10).fill(null)}
          keyExtractor={(_, i) => `skeleton-${i}`}
          numColumns={2}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingVertical: 16 }}
          scrollEnabled={false}
          renderItem={() => <SkeletonCard width={cardWidth} height={cardHeight} />}
        />
      ) : (
        <FlatList
          data={wallpapers || []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <WallpaperCard
              imageUrl={item.imageUrl}
              onPress={() => router.push(`/wallpaper/${item.id}`)}
              size="grid"
            />
          )}
          getItemLayout={(_, index) => ({
            length: cardHeight + 8,
            offset: (cardHeight + 8) * Math.floor(index / 2),
            index,
          })}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
        />
      )}
    </SafeAreaView>
  );
}
