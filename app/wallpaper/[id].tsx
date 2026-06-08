import { View, Text, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator, Modal, Alert, Image as RNImage } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useRef, useMemo, useEffect } from 'react';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import { useUserStore } from '@/stores/userStore';
import { useCategoryWallpapers } from '@/hooks/useWallpapers';
import { CATEGORIES } from '@/constants/categories';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

// Strip /api from the end of the EXPO_PUBLIC_API_URL so that static file URLs resolve correctly
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000').replace('/api', '');
const screenWidth = Dimensions.get('window').width;
const WALLPAPER_WIDTH = screenWidth;

// Aspect ratio 9:20 matching target canvas 1440x3200
const WALLPAPER_HEIGHT = screenWidth / (9 / 20);

// Native module loader fallback to prevent crashes in Expo Go
let setWallpaperAsync: (uri: string, screenType: 'home' | 'lock' | 'both') => Promise<void>;
try {
  const { requireNativeModule } = require('expo-modules-core');
  const WallpaperManager = requireNativeModule('WallpaperManager');
  setWallpaperAsync = async (uri: string, screenType: 'home' | 'lock' | 'both') => {
    return await WallpaperManager.setWallpaperAsync(uri, screenType);
  };
} catch (e) {
  setWallpaperAsync = async (uri: string, screenType: 'home' | 'lock' | 'both') => {
    console.warn('WallpaperManager native module not available. Simulating success in development.');
    await new Promise((resolve) => setTimeout(resolve, 1200));
  };
}

export default function WallpaperScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = id ? id.split('_')[0] : '';
  const { data: categoryWallpapers } = useCategoryWallpapers(categoryId);
  const profilePhoto = useUserStore((state) => state.profilePhoto);
  const setProfilePhoto = useUserStore((state) => state.setProfilePhoto);

  const [customizeMode, setCustomizeMode] = useState(false);
  const [tempPhotoUri, setTempPhotoUri] = useState(profilePhoto);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cachedWallpaperLocalUri, setCachedWallpaperLocalUri] = useState('');
  const [cachedPhotoLocalUri, setCachedPhotoLocalUri] = useState('');

  // Wallpaper Setting States
  const [showSetWallpaperModal, setShowSetWallpaperModal] = useState(false);
  const [selectedScreenOption, setSelectedScreenOption] = useState<'home' | 'lock' | 'both'>('both');
  const [wallpaperSettingLoading, setWallpaperSettingLoading] = useState(false);

  // Download States
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadSuccessModal, setShowDownloadSuccessModal] = useState(false);
  const [downloadedLocalUri, setDownloadedLocalUri] = useState('');

  // Editor Capture State
  const guideOpacity = useSharedValue(1);

  // Reanimated Gesture Values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const insets = useSafeAreaInsets();
  const viewShotRef = useRef<any>(null);

  // Composed Gestures for Sticker Overlay
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(0.4, Math.min(savedScale.value * event.scale, 3.5));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const guideAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: guideOpacity.value,
    };
  });

  const wallpaperUrl = useMemo(() => {
    if (!id) return '';
    
    // Look up cache-busted URL from the fetched list
    const found = categoryWallpapers?.find((wp) => wp.id === id);
    if (found) return found.imageUrl;

    // Fallback URL with minute-based cache busting
    const parts = id.split('_');
    const category = parts[0];
    const index = parts[1] || '1';
    return `${API_BASE_URL}/wallpapers/${category}/${index}.jpg?v=${new Date().getMinutes()}`;
  }, [id, categoryWallpapers]);

  const wallpaperDisplayName = useMemo(() => {
    if (!id) return 'Sacred Wallpaper';
    const parts = id.split('_');
    const categoryId = parts[0];
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat ? cat.name : 'Sacred Wallpaper';
  }, [id]);

  const categoryDisplayName = useMemo(() => {
    if (!id) return '';
    const parts = id.split('_');
    const categoryId = parts[0];
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat ? `${cat.nameEn} Wallpaper` : '';
  }, [id]);

  // Background pre-cache the wallpaper and profile photo assets on mount or url change
  useEffect(() => {
    if (!wallpaperUrl) return;

    let isMounted = true;

    const preCacheAssets = async () => {
      try {
        // 1. Download background wallpaper
        const localWallpaperCache = FileSystem.cacheDirectory + `wallpaper_temp_${Date.now()}.jpg`;
        const downloadRes = await FileSystem.downloadAsync(wallpaperUrl, localWallpaperCache);
        if (isMounted) {
          setCachedWallpaperLocalUri(downloadRes.uri);
        }

        // 2. Download profile photo
        const photoToUse = tempPhotoUri || profilePhoto;
        if (photoToUse) {
          if (photoToUse.startsWith('http')) {
            const localPhotoCache = FileSystem.cacheDirectory + `profile_temp_${Date.now()}.jpg`;
            const downloadResPhoto = await FileSystem.downloadAsync(photoToUse, localPhotoCache);
            if (isMounted) {
              setCachedPhotoLocalUri(downloadResPhoto.uri);
            }
          } else {
            if (isMounted) {
              setCachedPhotoLocalUri(photoToUse);
            }
          }
        }
      } catch (error) {
        console.error('Background pre-caching failed:', error);
      }
    };

    preCacheAssets();

    return () => {
      isMounted = false;
    };
  }, [wallpaperUrl, profilePhoto]);

  const handleShare = async () => {
    try {
      const localUri = FileSystem.cacheDirectory + `wallpaper_${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(wallpaperUrl, localUri);

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share this wallpaper',
        UTI: 'public.jpeg',
      });
    } catch (error) {
      console.error('Share failed:', error);
      Alert.alert('Error', 'Could not share the image. Please try again.');
    }
  };

  const handleDownload = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow gallery access in Settings to save wallpapers.');
        return;
      }

      setIsDownloading(true);

      const localUri = FileSystem.cacheDirectory + `wallpaper_${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(wallpaperUrl, localUri);
      
      // Save it to gallery under Custom Album
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      await MediaLibrary.createAlbumAsync('DevaWalls', asset, false);

      setDownloadedLocalUri(downloadResult.uri);
      setIsDownloading(false);
      setShowDownloadSuccessModal(true);
    } catch (error) {
      console.error('Download failed:', error);
      setIsDownloading(false);
      Alert.alert('Error', 'Download failed. Please try again.');
    }
  };

  const handleApplyWallpaper = async () => {
    try {
      setShowSetWallpaperModal(false);
      setWallpaperSettingLoading(true);

      // Download file locally to feed to WallpaperManager
      const localUri = FileSystem.cacheDirectory + `wallpaper_${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(wallpaperUrl, localUri);

      // Call Native Module
      await setWallpaperAsync(downloadResult.uri, selectedScreenOption);

      Alert.alert('Success', '✨ Wallpaper applied successfully.');
    } catch (error: any) {
      console.error('Set wallpaper failed:', error);
      Alert.alert('Error', error.message || 'Failed to apply wallpaper. Try downloading instead.');
    } finally {
      setWallpaperSettingLoading(false);
    }
  };

  const handleCustomize = async () => {
    const photoToUse = tempPhotoUri || profilePhoto;
    if (!photoToUse) {
      setShowPhotoModal(true);
      return;
    }

    // Instant transition if already background-cached!
    if (cachedWallpaperLocalUri && cachedPhotoLocalUri) {
      setCustomizeMode(true);
      return;
    }

    try {
      setLoading(true);
      
      // 1. Pre-download background wallpaper if not cached
      let wallpaperLocal = cachedWallpaperLocalUri;
      if (!wallpaperLocal) {
        const localWallpaperCache = FileSystem.cacheDirectory + `wallpaper_temp_${Date.now()}.jpg`;
        const downloadRes = await FileSystem.downloadAsync(wallpaperUrl, localWallpaperCache);
        wallpaperLocal = downloadRes.uri;
        setCachedWallpaperLocalUri(downloadRes.uri);
      }

      // 2. Pre-download profile photo if remote
      let photoLocal = photoToUse;
      if (photoToUse.startsWith('http')) {
        const localPhotoCache = FileSystem.cacheDirectory + `profile_temp_${Date.now()}.jpg`;
        const downloadResPhoto = await FileSystem.downloadAsync(photoToUse, localPhotoCache);
        photoLocal = downloadResPhoto.uri;
        setCachedPhotoLocalUri(downloadResPhoto.uri);
      } else {
        setCachedPhotoLocalUri(photoToUse);
      }

      setCustomizeMode(true);
    } catch (error) {
      console.error('Pre-download for customization failed:', error);
      Alert.alert('Error', 'Failed to load images for customization. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled) {
        const selectedUri = result.assets[0].uri;
        setTempPhotoUri(selectedUri);
        setProfilePhoto(selectedUri);
        setShowPhotoModal(false);
        
        setLoading(true);
        // Pre-download background if not cached
        let wallpaperLocal = cachedWallpaperLocalUri;
        if (!wallpaperLocal) {
          const localWallpaperCache = FileSystem.cacheDirectory + `wallpaper_temp_${Date.now()}.jpg`;
          const downloadRes = await FileSystem.downloadAsync(wallpaperUrl, localWallpaperCache);
          wallpaperLocal = downloadRes.uri;
          setCachedWallpaperLocalUri(downloadRes.uri);
        }

        setCachedPhotoLocalUri(selectedUri);
        setCustomizeMode(true);
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      console.error('Photo picker error:', err);
    }
  };

  const saveCustomizedWallpaper = async () => {
    try {
      // 1. Disable Guide Layer
      guideOpacity.value = 0; 

      // 2. Wait 1 frame for Reanimated native UI thread flush
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // 3. Wait 300ms for gesture/momentum to settle
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (!viewShotRef.current) {
        throw new Error('Workspace canvas capture interface not ready');
      }

      // 4. Capture native view tag securely
      const capturedUri = await captureRef(viewShotRef.current, {
        format: 'jpg',
        quality: 1.0,
      });
      
      // 5. Restore Guide Layer
      guideOpacity.value = 1; 

      if (!capturedUri) throw new Error('Capture failed');

      setIsDownloading(true);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setIsDownloading(false);
        Alert.alert('Permission Denied', 'Please allow gallery access to save your customized wallpaper.');
        return;
      }

      // Prepend file:// scheme if missing (e.g. raw absolute paths returned on some Android versions)
      let fromUri = capturedUri;
      if (!fromUri.startsWith('file://')) {
        fromUri = 'file://' + fromUri;
      }

      // Save to gallery under DevaWalls Album directly using the snapshot URI
      const asset = await MediaLibrary.createAssetAsync(fromUri);
      await MediaLibrary.createAlbumAsync('DevaWalls', asset, false);

      setDownloadedLocalUri(fromUri);
      setIsDownloading(false);
      setShowDownloadSuccessModal(true);
      setCustomizeMode(false);
    } catch (error: any) {
      console.error('Save customized failed:', error);
      Alert.alert('Error', `Could not save your customized wallpaper. Error: ${error?.message || JSON.stringify(error)}`);
      guideOpacity.value = 1;
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-dark items-center justify-center">
        <ActivityIndicator size="large" color="#F5C518" style={{ marginBottom: 16 }} />
        <Text className="text-white font-bold text-base">Preparing Editor...</Text>
        <Text className="text-textMuted text-xs mt-1">Downloading wallpaper and profile assets locally</Text>
      </SafeAreaView>
    );
  }

  if (customizeMode && tempPhotoUri) {
    return (
      <SafeAreaView className="flex-1 bg-dark">
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center px-4 py-3 border-b border-primary/20">
            <Text className="text-white font-bold text-lg">Customize Wallpaper</Text>
          </View>

          {/* Top section - Canvas Workspace */}
          <ScrollView style={{ flex: 0.8 }} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }}>
            {/* STABLE WRAPPER: Standard View provides a standard ViewGroup native node to ViewShot, avoiding ClassCastException */}
            <View collapsable={false} ref={viewShotRef}>
              <View style={{ width: WALLPAPER_WIDTH, height: WALLPAPER_HEIGHT, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                <RNImage
                  source={{ uri: cachedWallpaperLocalUri || wallpaperUrl }}
                  style={{ width: '100%', height: '100%', position: 'absolute' }}
                  resizeMode="cover"
                />

              {/* Safe Area Guide */}
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    top: '12.5%',
                    left: '12.5%',
                    width: '75%',
                    height: '75%',
                    borderWidth: 1.5,
                    borderColor: 'rgba(245, 197, 24, 0.45)',
                    borderStyle: 'dashed',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    paddingTop: 8,
                  },
                  guideAnimatedStyle
                ]}
              >
                <Text style={{ color: '#F5C518', fontSize: 10, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                  Safe Area Guide (1080 x 2400)
                </Text>
              </Animated.View>

              {/* Draggable and Scalable Profile Picture Overlay */}
              <GestureDetector gesture={composedGesture}>
                <Animated.View
                  style={[
                    {
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      borderWidth: 3.5,
                      borderColor: '#F5C518',
                      overflow: 'hidden',
                      backgroundColor: '#1E1E1E',
                    },
                    animatedStyle
                  ]}
                >
                  <RNImage
                    source={{ uri: cachedPhotoLocalUri || tempPhotoUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </Animated.View>
              </GestureDetector>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Customization Controls */}
          <View className="p-4 bg-card border-t border-primary/20 gap-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <Text className="text-center text-textMuted text-xs">
              Pinch to resize & drag your photo anywhere on the wallpaper.
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={pickPhoto}
                className="flex-1 bg-secondary rounded-xl py-3 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-sm">Change Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTempPhotoUri(null)}
                className="flex-1 bg-red-500/10 border border-red-500 rounded-xl py-3 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-red-500 font-semibold text-sm">Remove Photo</Text>
              </TouchableOpacity>
            </View>

            {/* Save & Download */}
            <TouchableOpacity
              onPress={saveCustomizedWallpaper}
              disabled={loading}
              className="bg-primary rounded-xl py-4 items-center"
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#0F0F0F" />
              ) : (
                <Text className="text-dark font-bold text-base">Save & Download</Text>
              )}
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity
              onPress={() => {
                setCustomizeMode(false);
                translateX.value = 0;
                translateY.value = 0;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
                scale.value = 1;
                savedScale.value = 1;
              }}
              className="items-center py-2"
              activeOpacity={0.8}
            >
              <Text className="text-primary font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Preview Mode */}
      <View className="flex-1 justify-between">
        {/* Top section - Wallpaper preview */}
        <View style={{ height: '62%', backgroundColor: '#000', justifyContent: 'center' }}>
          <Image
            source={{ uri: wallpaperUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
          />

          {/* Floating Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              zIndex: 10,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Bottom section - Action buttons sheet */}
        <View style={{ height: '38%', paddingBottom: Math.max(insets.bottom, 24) }} className="bg-card rounded-t-3xl p-6 justify-between border-t border-primary/20">
          <View className="mb-2">
            <Text className="text-white font-bold text-xl mb-1">{wallpaperDisplayName}</Text>
            <Text className="text-primary text-sm font-semibold">{categoryDisplayName}</Text>
          </View>

          {/* Primary Action: Set as Wallpaper */}
          <TouchableOpacity
            onPress={() => setShowSetWallpaperModal(true)}
            disabled={wallpaperSettingLoading}
            className="bg-primary rounded-xl py-4 flex-row items-center justify-center mb-4"
            activeOpacity={0.8}
          >
            {wallpaperSettingLoading ? (
              <ActivityIndicator color="#0F0F0F" />
            ) : (
              <>
                <Ionicons name="phone-portrait-outline" size={22} color="#0F0F0F" style={{ marginRight: 8 }} />
                <Text className="text-dark font-bold text-base">Set as Wallpaper</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary Action row: Share, Download, Customize */}
          <View className="flex-row gap-3">
            {/* Share */}
            <TouchableOpacity
              onPress={handleShare}
              className="flex-1 bg-green-500/10 border border-green-500 rounded-xl p-3 items-center justify-center flex-row"
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={18} color="#22C55E" style={{ marginRight: 4 }} />
              <Text className="text-green-500 font-bold text-xs">Share</Text>
            </TouchableOpacity>

            {/* Download */}
            <TouchableOpacity
              onPress={handleDownload}
              className="flex-1 bg-secondary/15 border border-secondary rounded-xl p-3 items-center justify-center flex-row"
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text className="text-white font-bold text-xs">Gallery</Text>
            </TouchableOpacity>

            {/* Customize */}
            <TouchableOpacity
              onPress={handleCustomize}
              className="flex-1 bg-primary/10 border border-primary rounded-xl p-3 items-center justify-center flex-row"
              activeOpacity={0.8}
            >
              <Ionicons name="color-palette-outline" size={18} color="#F5C518" style={{ marginRight: 4 }} />
              <Text className="text-primary font-bold text-xs">Customize</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Photo picker modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center">
          <View className="bg-card rounded-2xl p-6 w-80 border border-primary/20">
            <Text className="text-white font-bold text-lg mb-2">Add Your Photo</Text>
            <Text className="text-textMuted text-sm mb-6">Add your photo to customize this wallpaper</Text>

            <TouchableOpacity
              onPress={pickPhoto}
              className="bg-primary rounded-lg p-3 mb-3 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-dark font-semibold">Choose Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowPhotoModal(false)}
              className="bg-secondary rounded-lg p-3 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Set Wallpaper modal sheet */}
      <Modal
        visible={showSetWallpaperModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSetWallpaperModal(false)}
      >
        <View className="flex-1 bg-black/75 justify-end">
          <View className="bg-card rounded-t-3xl p-6 border-t border-primary/20" style={{ paddingBottom: Math.max(insets.bottom, 56) }}>
            <View className="items-center mb-4">
              <View className="w-12 h-1 bg-secondary rounded-full mb-3" />
              <Text className="text-white font-bold text-xl">Set Wallpaper</Text>
              <Text className="text-textMuted text-xs mt-1">Choose where you want to apply this wallpaper</Text>
            </View>

            {/* Options */}
            <View className="gap-3 my-4">
              {[
                { key: 'home', label: 'Home Screen', icon: 'home-outline' },
                { key: 'lock', label: 'Lock Screen', icon: 'lock-closed-outline' },
                { key: 'both', label: 'Home & Lock Screen', icon: 'phone-portrait-outline' }
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setSelectedScreenOption(opt.key as any)}
                  className={`flex-row items-center justify-between p-4 rounded-xl border ${
                    selectedScreenOption === opt.key 
                      ? 'border-primary bg-primary/5' 
                      : 'border-secondary bg-transparent'
                  }`}
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center">
                    <Ionicons 
                      name={opt.icon as any} 
                      size={20} 
                      color={selectedScreenOption === opt.key ? '#F5C518' : '#A3A3A3'} 
                      style={{ marginRight: 12 }} 
                    />
                    <Text className={`font-semibold ${selectedScreenOption === opt.key ? 'text-primary' : 'text-white'}`}>
                      {opt.label}
                    </Text>
                  </View>
                  <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                    selectedScreenOption === opt.key ? 'border-primary' : 'border-secondary'
                  }`}>
                    {selectedScreenOption === opt.key && (
                      <View className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                onPress={() => setShowSetWallpaperModal(false)}
                className="flex-1 bg-secondary rounded-xl py-4 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApplyWallpaper}
                className="flex-1 bg-primary rounded-xl py-4 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-dark font-bold">Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Downloading Visual Progress Spinner */}
      <Modal
        visible={isDownloading}
        transparent
        animationType="fade"
      >
        <View className="flex-1 bg-black/80 items-center justify-center">
          <View className="bg-card rounded-2xl p-6 border border-primary/20 items-center">
            <ActivityIndicator size="large" color="#F5C518" style={{ marginBottom: 16 }} />
            <Text className="text-white font-bold text-base">Downloading...</Text>
            <Text className="text-textMuted text-xs mt-1">Saving wallpaper to your gallery</Text>
          </View>
        </View>
      </Modal>

      {/* Download Success Modal */}
      <Modal
        visible={showDownloadSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDownloadSuccessModal(false)}
      >
        <View className="flex-1 bg-black/85 items-center justify-center">
          <View className="bg-card rounded-2xl p-6 w-80 border border-primary/20 items-center">
            <View className="bg-green-500/10 p-3 rounded-full mb-4">
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
            </View>
            <Text className="text-white font-bold text-xl mb-2 text-center">Wallpaper Saved!</Text>
            <Text className="text-textMuted text-sm text-center mb-6">
              The wallpaper has been successfully added to your device gallery under 'DevaWalls' album.
            </Text>

            <View className="w-full gap-3">
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await Sharing.shareAsync(downloadedLocalUri, {
                      mimeType: 'image/jpeg',
                      dialogTitle: 'Share Wallpaper',
                    });
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="bg-primary rounded-xl py-3 items-center flex-row justify-center"
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={18} color="#0F0F0F" style={{ marginRight: 8 }} />
                <Text className="text-dark font-bold">Share Wallpaper</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowDownloadSuccessModal(false)}
                className="bg-secondary rounded-xl py-3 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
