import React from 'react';
import { TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';

// Computed once at module level — avoids re-computation on every render
const { width: screenWidth } = Dimensions.get('window');

const FEATURED_CARD_WIDTH = screenWidth * 0.42;
const FEATURED_CARD_HEIGHT = FEATURED_CARD_WIDTH / (9 / 16);

const GRID_CARD_WIDTH = (screenWidth - 40) / 2; // 16px padding each side + 8px gap
const GRID_CARD_HEIGHT = GRID_CARD_WIDTH / (9 / 16);

interface WallpaperCardProps {
  imageUrl: string;
  onPress: () => void;
  size?: 'grid' | 'featured';
}

export const WallpaperCard = React.memo(function WallpaperCard({
  imageUrl,
  onPress,
  size = 'grid',
}: WallpaperCardProps) {
  const cardWidth = size === 'featured' ? FEATURED_CARD_WIDTH : GRID_CARD_WIDTH;
  const cardHeight = size === 'featured' ? FEATURED_CARD_HEIGHT : GRID_CARD_HEIGHT;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-xl overflow-hidden"
      style={{ width: cardWidth, height: cardHeight }}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: imageUrl }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        recyclingKey={imageUrl}
        placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        transition={200}
        cachePolicy="memory-disk"
      />
    </TouchableOpacity>
  );
});
