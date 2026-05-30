import { View, Text, SafeAreaView, ScrollView, FlatList, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useFeaturedWallpapers, useLatestWallpapers } from '@/hooks/useWallpapers';
import { useUserStore } from '@/stores/userStore';
import { WallpaperCard } from '@/components/WallpaperCard';
import { CategoryCircle } from '@/components/CategoryCircle';
import { SkeletonCard } from '@/components/SkeletonCard';
import { CATEGORIES } from '@/constants/categories';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000';
const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const userProfilePhoto = useUserStore((state) => state.profilePhoto);
  const userName = useUserStore((state) => state.name);
  const { data: featuredWallpapers, isLoading: featuredLoading } = useFeaturedWallpapers();
  const { data: latestWallpapers, isLoading: latestLoading } = useLatestWallpapers();

  const cardWidth = screenWidth * 0.42;
  const cardHeight = cardWidth * (16 / 9);
  const gridCardWidth = (screenWidth - 40) / 2;
  const gridCardHeight = gridCardWidth * (16 / 9);

  return (
    <SafeAreaView className="flex-1 bg-dark">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-primary">
          <View className="flex-row items-center">
            <Text className="text-2xl mr-2">🪷</Text>
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
              <Text className="bg-primary text-dark font-bold">
                {userName?.charAt(0).toUpperCase() || '👤'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Category Circles Section */}
        <View className="px-4 py-6">
          <Text className="text-white font-bold text-base mb-4">सभी देवी-देवताओं के वॉलपेपर</Text>
          <FlatList
            data={CATEGORIES}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            renderItem={({ item }) => <CategoryCircle category={item} />}
          />
        </View>

        {/* Top Wallpapers Section */}
        <View className="px-4 py-6">
          <Text className="text-white font-bold text-base mb-4">Top Wallpapers</Text>
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
                    imageUrl={item.imageUrl}
                    onPress={() => router.push(`/wallpaper/${item.id}`)}
                    size="featured"
                  />
                </View>
              )}
            />
          )}
        </View>

        {/* New Wallpapers Section */}
        <View className="px-4 py-6 pb-12">
          <Text className="text-white font-bold text-base mb-4">New Wallpapers</Text>
          {latestLoading ? (
            <View className="flex-row flex-wrap gap-2">
              {Array(10).fill(null).map((_, i) => (
                <View key={i} style={{ width: gridCardWidth, marginBottom: 8 }}>
                  <SkeletonCard width={gridCardWidth} height={gridCardHeight} />
                </View>
              ))}
            </View>
          ) : (
            <FlatList
              data={latestWallpapers || []}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={{ gap: 8 }}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <WallpaperCard
                  imageUrl={item.imageUrl}
                  onPress={() => router.push(`/wallpaper/${item.id}`)}
                  size="grid"
                />
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
