import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useFeaturedWallpapers, useLatestWallpapers } from '@/hooks/useWallpapers';
import { useUserStore } from '@/stores/userStore';
import { WallpaperCard } from '@/components/WallpaperCard';
import { CategoryCircle } from '@/components/CategoryCircle';
import { SkeletonCard } from '@/components/SkeletonCard';
import { CATEGORIES } from '@/constants/categories';
import { Wallpaper } from '@/types';

const { width: screenWidth } = Dimensions.get('window');

const CARD_WIDTH = screenWidth * 0.42;
const CARD_HEIGHT = CARD_WIDTH / (9 / 16);
const GRID_CARD_WIDTH = (screenWidth - 44) / 2;
const GRID_CARD_HEIGHT = GRID_CARD_WIDTH / (9 / 16);

// Stable skeleton data — avoids recreating array on each render
const SKELETON_FEATURED = Array(3).fill(null);
const SKELETON_LATEST = Array(6).fill(null);

export default function HomeScreen() {
  const userProfilePhoto = useUserStore((state) => state.profilePhoto);
  const userName = useUserStore((state) => state.name);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: featuredWallpapers,
    isLoading: featuredLoading,
    refetch: refetchFeatured,
  } = useFeaturedWallpapers();

  const {
    data: latestWallpapers,
    isLoading: latestLoading,
    refetch: refetchLatest,
  } = useLatestWallpapers();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFeatured(), refetchLatest()]);
    setRefreshing(false);
  }, [refetchFeatured, refetchLatest]);

  // Prefetch thumbnails to warm the expo-image disk cache
  useEffect(() => {
    if (featuredWallpapers) {
      featuredWallpapers.forEach((wp) => Image.prefetch(wp.thumbnailUrl));
    }
  }, [featuredWallpapers]);

  useEffect(() => {
    if (latestWallpapers) {
      latestWallpapers.forEach((wp) => Image.prefetch(wp.thumbnailUrl));
    }
  }, [latestWallpapers]);

  // Feed skeleton placeholders (null) while loading, real items when done
  const listData: (Wallpaper | null)[] = latestLoading
    ? SKELETON_LATEST
    : (latestWallpapers ?? []);

  // renderItem is stable — useCallback prevents FlatList re-renders
  const renderItem = useCallback(
    ({ item }: { item: Wallpaper | null }) => (
      <View style={{ width: GRID_CARD_WIDTH }}>
        {item === null ? (
          <SkeletonCard width={GRID_CARD_WIDTH} height={GRID_CARD_HEIGHT} />
        ) : (
          <WallpaperCard
            imageUrl={item.thumbnailUrl}
            onPress={() => router.push(`/wallpaper/${item.id}`)}
            size="grid"
          />
        )}
      </View>
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: Wallpaper | null, index: number) => (item ? item.id : `skeleton-${index}`),
    []
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: GRID_CARD_HEIGHT + 12,
      offset: (GRID_CARD_HEIGHT + 12) * Math.floor(index / 2),
      index,
    }),
    []
  );

  const ListHeader = (
    <View className="mb-4">
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-primary mb-4">
        <View className="flex-row items-center">
          <Image
            source={require('../assets/logo.png')}
            style={{ width: 32, height: 32, marginRight: 10, borderRadius: 6 }}
            contentFit="contain"
          />
          <Text className="text-primary font-bold text-lg">Deva Walls</Text>
        </View>
        <TouchableOpacity
          className="w-10 h-10 rounded-full overflow-hidden border border-primary items-center justify-center"
          onPress={() => router.push('/profile')}
        >
          {userProfilePhoto ? (
            <Image
              source={{ uri: userProfilePhoto }}
              style={{ width: 40, height: 40 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View className="bg-primary items-center justify-center w-full h-full">
              {userName ? (
                <Text className="text-dark font-bold">{userName.charAt(0).toUpperCase()}</Text>
              ) : (
                <Ionicons name="person" size={20} color="#0F0F0F" />
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Category Circles ── */}
      <View className="px-4 mb-4">
        <Text className="text-white font-bold text-base mb-3">All Gods and Goddesses Wallpapers</Text>
        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          renderItem={({ item }) => {
            const featured = featuredWallpapers?.find((wp) => wp.category === item.id);
            return (
              <CategoryCircle
                category={item}
                customThumbnailUrl={featured?.thumbnailUrl}
              />
            );
          }}
        />
      </View>

      {/* ── Top Wallpapers (Featured) ── */}
      <View className="px-4 mb-4">
        <Text className="text-white font-bold text-base mb-3">Top Wallpapers</Text>
        {featuredLoading ? (
          <FlatList
            data={SKELETON_FEATURED}
            keyExtractor={(_, i) => `skeleton-featured-${i}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            renderItem={() => (
              <View style={{ marginRight: 8 }}>
                <SkeletonCard width={CARD_WIDTH} height={CARD_HEIGHT} />
              </View>
            )}
          />
        ) : (
          <FlatList
            data={featuredWallpapers ?? []}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingRight: 16 }}
            maxToRenderPerBatch={4}
            initialNumToRender={3}
            renderItem={({ item }) => (
              <View style={{ marginRight: 8 }}>
                <WallpaperCard
                  imageUrl={item.thumbnailUrl}
                  onPress={() => router.push(`/wallpaper/${item.id}`)}
                  size="featured"
                />
              </View>
            )}
          />
        )}
      </View>

      {/* ── Section Title ── */}
      <View className="px-4 pt-2">
        <Text className="text-white font-bold text-base">New Wallpapers</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-dark">
      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={4}
        windowSize={5}
        initialNumToRender={6}
        getItemLayout={getItemLayout}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F5C518"
            colors={['#F5C518']}
          />
        }
      />
    </SafeAreaView>
  );
}
