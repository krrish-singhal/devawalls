import React from 'react';
import { TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';

interface WallpaperCardProps {
  imageUrl: string;
  onPress: () => void;
  size?: 'grid' | 'featured';
}

export const WallpaperCard = React.memo(function WallpaperCard({ imageUrl, onPress, size = 'grid' }: WallpaperCardProps) {
  const screenWidth = Dimensions.get('window').width;

  const cardWidth = size === 'featured'
    ? screenWidth * 0.42
    : (screenWidth - 40) / 2;   // 16px padding each side + 8px gap

  const cardHeight = cardWidth / (9 / 16);  // ALWAYS enforce 9:16 ratio

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
