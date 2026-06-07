import { apiClient } from './client';
import { AuthResponse } from '@/types';

export const authApi = {
  /**
   * Verify a Google ID token with the backend.
   * The backend uses google-auth-library to cryptographically verify the token
   * and then returns our own application JWT.
   * @param idToken - The Google ID token from Expo AuthSession.
   */
  async googleSignIn(idToken: string): Promise<AuthResponse> {
    console.log('[API] POST /auth/google with idToken');
    const response = await apiClient.post('/auth/google', { idToken });
    return response.data;
  },

  /**
   * Update user profile (name and/or profile photo).
   * Profile photo should be a base64-encoded JPEG string (no data URI prefix).
   * The backend will upload it to Cloudinary.
   */
  async updateProfile(name: string, profilePhotoBase64?: string): Promise<AuthResponse> {
    console.log('[API] PATCH /auth/profile');
    const response = await apiClient.patch('/auth/profile', { name, profilePhotoBase64 });
    return response.data;
  },
};
