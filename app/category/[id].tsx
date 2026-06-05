import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useCategoryWallpapers } from '@/hooks/useWallpapers';
import { WallpaperCard } from '@/components/WallpaperCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { CATEGORIES } from '@/constants/categories';

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 40) / 2;
const cardHeight = cardWidth / (9 / 16);  // 9:16 portrait ratio

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const { data: wallpapers, isLoading, refetch } = useCategoryWallpapers(id || '');

  const category = CATEGORIES.find((c) => c.id === id);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Prefetch category wallpapers to cache
  useEffect(() => {
    if (wallpapers) {
      wallpapers.forEach((wp) => {
        Image.prefetch(wp.thumbnailUrl);
      });
    }
  }, [wallpapers]);

  return (
    <SafeAreaView className="flex-1 bg-dark">
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 border-b border-primary">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">{category?.name} Wallpapers</Text>
      </View>

      {/* Grid */}
      {isLoading ? (
        <FlatList
          data={Array(10).fill(null)}
          keyExtractor={(_, i) => `skeleton-${i}`}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingVertical: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          scrollEnabled={false}
          renderItem={() => <SkeletonCard width={cardWidth} height={cardHeight} />}
        />
      ) : (
        <FlatList
          data={wallpapers || []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingVertical: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F5C518"
              colors={['#F5C518']}
            />
          }
          renderItem={({ item }) => (
            <WallpaperCard
              imageUrl={item.thumbnailUrl}
              onPress={() => router.push(`/wallpaper/${item.id}`)}
              size="grid"
            />
          )}
          getItemLayout={(_, index) => ({
            length: cardHeight + 12,
            offset: (cardHeight + 12) * Math.floor(index / 2),
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
