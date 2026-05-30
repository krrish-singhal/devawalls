import { useQuery } from '@tanstack/react-query';
import { wallpapersApi } from '@/api/wallpapers.api';

export function useCategoryWallpapers(category: string) {
  return useQuery({
    queryKey: ['wallpapers', category],
    queryFn: () => wallpapersApi.getByCategory(category),
    staleTime: 10 * 60 * 1000,
  });
}

export function useFeaturedWallpapers() {
  return useQuery({
    queryKey: ['wallpapers', 'featured'],
    queryFn: () => wallpapersApi.getFeatured(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useLatestWallpapers(limit: number = 10) {
  return useQuery({
    queryKey: ['wallpapers', 'latest', limit],
    queryFn: () => wallpapersApi.getLatest(limit),
    staleTime: 10 * 60 * 1000,
  });
}
