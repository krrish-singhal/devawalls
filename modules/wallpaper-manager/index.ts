import { requireNativeModule } from 'expo-modules-core';

const WallpaperManager = requireNativeModule('WallpaperManager');

/**
 * Native Android wallpaper setter.
 * @param uri The URI of the image (local file path or web URL).
 * @param screenType 'home', 'lock', or 'both'.
 */
export async function setWallpaperAsync(uri: string, screenType: 'home' | 'lock' | 'both'): Promise<void> {
  return await WallpaperManager.setWallpaperAsync(uri, screenType);
}
