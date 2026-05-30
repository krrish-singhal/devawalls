import { apiClient } from './client';
import { AuthResponse } from '@/types';

export const authApi = {
  async googleSignIn(accessToken: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/google', { accessToken });
    return response.data;
  },

  async updateProfile(name: string, profilePhotoBase64?: string): Promise<AuthResponse> {
    const response = await apiClient.patch('/user/profile', { name, profilePhotoBase64 });
    return response.data;
  },
};
