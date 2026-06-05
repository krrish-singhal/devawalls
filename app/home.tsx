import { useState, useEffect } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useFeaturedWallpapers, useLatestWallpapers } from '@/hooks/useWallpapers';
import { useUserStore } from '@/stores/userStore';
import { WallpaperCard } from '@/components/WallpaperCard';
import { CategoryCircle } from '@/components/CategoryCircle';
import { SkeletonCard } from '@/components/SkeletonCard';
import { CATEGORIES } from '@/constants/categories';

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const userProfilePhoto = useUserStore((state) => state.profilePhoto);
  const userName = useUserStore((state) => state.name);
  const [refreshing, setRefreshing] = useState(false);
  const { data: featuredWallpapers, isLoading: featuredLoading, refetch: refetchFeatured } = useFeaturedWallpapers();
  const { data: latestWallpapers, isLoading: latestLoading, refetch: refetchLatest } = useLatestWallpapers();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchFeatured(), refetchLatest()]);
    setRefreshing(false);
  };

  // Prefetch featured wallpapers to warm cache
  useEffect(() => {
    if (featuredWallpapers) {
      featuredWallpapers.forEach((wp) => {
        Image.prefetch(wp.thumbnailUrl);
      });
    }
  }, [featuredWallpapers]);

  // Prefetch latest wallpapers to warm cache
  useEffect(() => {
    if (latestWallpapers) {
      latestWallpapers.forEach((wp) => {
        Image.prefetch(wp.thumbnailUrl);
      });
    }
  }, [latestWallpapers]);

  const cardWidth = screenWidth * 0.42;
  const cardHeight = cardWidth / (9 / 16);  // 9:16 portrait ratio
  const gridCardWidth = (screenWidth - 44) / 2;
  const gridCardHeight = gridCardWidth / (9 / 16);  // 9:16 portrait ratio

  const listData = latestLoading ? Array(6).fill(null) : (latestWallpapers || []);

  return (
    <SafeAreaView className="flex-1 bg-dark">
      <FlatList
        data={listData}
        keyExtractor={(item, index) => item ? item.id : `skeleton-${index}`}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={4}
        windowSize={3}
        initialNumToRender={6}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F5C518"
            colors={['#F5C518']}
          />
        }
        ListHeaderComponent={
          <View className="mb-4">
            {/* Header */}
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

            {/* Category Circles Section */}
            <View className="px-4 mb-4">
              <Text className="text-white font-bold text-base mb-3">सभी देवी-देवताओं के वॉलपेपर</Text>
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

            {/* Top Wallpapers Section */}
            <View className="px-4 mb-4">
              <Text className="text-white font-bold text-base mb-3">Top Wallpapers</Text>
              {featuredLoading ? (
                <FlatList
                  data={Array(3).fill(null)}
                  keyExtractor={(_, i) => `skeleton-${i}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={() => (
                    <View style={{ marginRight: 8 }}>
                      <SkeletonCard width={cardWidth} height={cardHeight} />
                    </View>
                  )}
                />
              ) : (
                <FlatList
                  data={featuredWallpapers || []}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  contentContainerStyle={{ paddingRight: 16 }}
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

            {/* Title for New Wallpapers section */}
            <View className="px-4 pt-2">
              <Text className="text-white font-bold text-base">New Wallpapers</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ width: gridCardWidth }}>
            {latestLoading ? (
              <SkeletonCard width={gridCardWidth} height={gridCardHeight} />
            ) : (
              <WallpaperCard
                imageUrl={item.thumbnailUrl}
                onPress={() => router.push(`/wallpaper/${item.id}`)}
                size="grid"
              />
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
