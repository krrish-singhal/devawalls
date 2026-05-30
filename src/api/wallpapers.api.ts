import { apiClient } from './client';
import { Wallpaper } from '@/types';

export const wallpapersApi = {
  async getByCategory(category: string): Promise<Wallpaper[]> {
    const response = await apiClient.get(`/wallpapers/${category}`);
    return response.data.wallpapers;
  },

  async getFeatured(): Promise<Wallpaper[]> {
    const response = await apiClient.get('/wallpapers/featured');
    return response.data.wallpapers;
  },

  async getLatest(limit: number = 10): Promise<Wallpaper[]> {
    const response = await apiClient.get('/wallpapers', {
      params: { sort: 'latest', limit },
    });
    return response.data.wallpapers;
  },
};
