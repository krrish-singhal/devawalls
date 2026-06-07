import { useQuery } from '@tanstack/react-query';
import { wallpapersApi } from '@/api/wallpapers.api';

export function useCategoryWallpapers(category: string) {
  return useQuery({
    queryKey: ['wallpapers', category],
    queryFn: () => wallpapersApi.getByCategory(category),
    enabled: category.length > 0, // Don't fetch if category is empty
    staleTime: 10 * 60 * 1000,    // 10 minutes — avoid redundant refetches
    gcTime: 30 * 60 * 1000,       // Keep in cache for 30 minutes
  });
}

export function useFeaturedWallpapers() {
  return useQuery({
    queryKey: ['wallpapers', 'featured'],
    queryFn: () => wallpapersApi.getFeatured(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useLatestWallpapers(limit: number = 10) {
  return useQuery({
    queryKey: ['wallpapers', 'latest', limit],
    queryFn: () => wallpapersApi.getLatest(limit),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
