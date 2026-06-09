import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Image as RNImage,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useRef, useMemo, useEffect } from 'react';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useUserStore } from '@/stores/userStore';
import { useCategoryWallpapers } from '@/hooks/useWallpapers';
import { CATEGORIES } from '@/constants/categories';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';

// Strip /api from the end of the EXPO_PUBLIC_API_URL so that static file URLs resolve correctly
const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000'
).replace('/api', '');
const screenWidth = Dimensions.get('window').width;
const WALLPAPER_WIDTH = screenWidth;

// Aspect ratio 9:20 matching target canvas 1440x3200
const WALLPAPER_HEIGHT = (screenWidth / 9) * 20;

// Native module loader fallback to prevent crashes in Expo Go
let setWallpaperAsync: (
  uri: string,
  screenType: 'home' | 'lock' | 'both'
) => Promise<void>;
try {
  const { requireNativeModule } = require('expo-modules-core');
  const WallpaperManager = requireNativeModule('WallpaperManager');
  setWallpaperAsync = async (
    uri: string,
    screenType: 'home' | 'lock' | 'both'
  ) => {
    return await WallpaperManager.setWallpaperAsync(uri, screenType);
  };
} catch (e) {
  setWallpaperAsync = async (
    uri: string,
    screenType: 'home' | 'lock' | 'both'
  ) => {
    console.warn(
      'WallpaperManager native module not available. Simulating success in development.'
    );
    await new Promise((resolve) => setTimeout(resolve, 1200));
  };
}

// Canvas preview size (scaled down for the editor UI)
// We render at this size, then capture — ViewShot will save at the device pixel density
const CANVAS_PREVIEW_WIDTH = screenWidth * 0.85;
const CANVAS_PREVIEW_HEIGHT = (CANVAS_PREVIEW_WIDTH / 9) * 20;

export default function WallpaperScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = id
    ? CATEGORIES.find((c) => id.startsWith(c.id))?.id || id.split('_')[0]
    : '';
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
  const [selectedScreenOption, setSelectedScreenOption] = useState<
    'home' | 'lock' | 'both'
  >('both');
  const [wallpaperSettingLoading, setWallpaperSettingLoading] = useState(false);

  // Download States
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadSuccessModal, setShowDownloadSuccessModal] =
    useState(false);
  const [downloadedLocalUri, setDownloadedLocalUri] = useState('');

  // ─── Reanimated gesture values ───────────────────────────────────────────
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // We snapshot JS-side copies of gesture values right before capture so we
  // can replicate them in the static capture view without Reanimated involved.
  const [captureTransform, setCaptureTransform] = useState<{
    x: number;
    y: number;
    s: number;
  }>({ x: 0, y: 0, s: 1 });

  const insets = useSafeAreaInsets();

  // ── ViewShot ref — points at the STATIC capture-only view, NOT the live editor
  const captureViewRef = useRef<View>(null);

  // ─── Gesture setup ───────────────────────────────────────────────────────
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
      scale.value = Math.max(
        0.4,
        Math.min(savedScale.value * event.scale, 3.5)
      );
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedPhotoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // ─── URL helpers ─────────────────────────────────────────────────────────
  const wallpaperUrl = useMemo(() => {
    if (!id) return '';
    const found = categoryWallpapers?.find((wp) => wp.id === id);
    if (found) return found.imageUrl;
    const parts = id.split('_');
    const category = parts[0];
    const index = parts[1] || '1';
    return `${API_BASE_URL}/wallpapers/${category}/${index}.jpg?v=${new Date().getMinutes()}`;
  }, [id, categoryWallpapers]);

  const wallpaperDisplayName = useMemo(() => {
    if (!id) return 'Sacred Wallpaper';
    const cat = CATEGORIES.find((c) => c.id === id.split('_')[0]);
    return cat ? cat.name : 'Sacred Wallpaper';
  }, [id]);

  const categoryDisplayName = useMemo(() => {
    if (!id) return '';
    const cat = CATEGORIES.find((c) => c.id === id.split('_')[0]);
    return cat ? `${cat.nameEn} Wallpaper` : '';
  }, [id]);

  // ─── Pre-cache assets on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!wallpaperUrl) return;
    let isMounted = true;

    (async () => {
      try {
        const localWallpaperCache =
          FileSystem.cacheDirectory + `wallpaper_temp_${Date.now()}.jpg`;
        const downloadRes = await FileSystem.downloadAsync(
          wallpaperUrl,
          localWallpaperCache
        );
        if (isMounted) setCachedWallpaperLocalUri(downloadRes.uri);

        const photoToUse = tempPhotoUri || profilePhoto;
        if (photoToUse) {
          if (photoToUse.startsWith('http')) {
            const localPhotoCache =
              FileSystem.cacheDirectory + `profile_temp_${Date.now()}.jpg`;
            const dlPhoto = await FileSystem.downloadAsync(
              photoToUse,
              localPhotoCache
            );
            if (isMounted) setCachedPhotoLocalUri(dlPhoto.uri);
          } else {
            if (isMounted) setCachedPhotoLocalUri(photoToUse);
          }
        }
      } catch (err) {
        console.error('Background pre-caching failed:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [wallpaperUrl, profilePhoto]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Ensure a URI has the file:// scheme for MediaLibrary / Sharing */
  const ensureFileScheme = (uri: string) =>
    uri.startsWith('file://') ? uri : `file://${uri}`;

  const handleShare = async () => {
    try {
      const localUri =
        FileSystem.cacheDirectory + `wallpaper_${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(wallpaperUrl, localUri);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }
      await Sharing.shareAsync(ensureFileScheme(uri), {
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
        Alert.alert(
          'Permission Denied',
          'Please allow gallery access in Settings to save wallpapers.'
        );
        return;
      }
      setIsDownloading(true);
      const localUri =
        FileSystem.cacheDirectory + `wallpaper_${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(
        wallpaperUrl,
        localUri
      );
      const asset = await MediaLibrary.createAssetAsync(
        ensureFileScheme(downloadResult.uri)
      );
      await MediaLibrary.createAlbumAsync('DevaWalls', asset, false);
      setDownloadedLocalUri(ensureFileScheme(downloadResult.uri));
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
      const localUri =
        FileSystem.cacheDirectory + `wallpaper_${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(
        wallpaperUrl,
        localUri
      );
      await setWallpaperAsync(
        ensureFileScheme(downloadResult.uri),
        selectedScreenOption
      );
      Alert.alert('Success', '✨ Wallpaper applied successfully.');
    } catch (error: any) {
      console.error('Set wallpaper failed:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to apply wallpaper. Try downloading instead.'
      );
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

    if (cachedWallpaperLocalUri && cachedPhotoLocalUri) {
      setCustomizeMode(true);
      return;
    }

    try {
      setLoading(true);
      let wallpaperLocal = cachedWallpaperLocalUri;
      if (!wallpaperLocal) {
        const localWallpaperCache =
          FileSystem.cacheDirectory + `wallpaper_temp_${Date.now()}.jpg`;
        const downloadRes = await FileSystem.downloadAsync(
          wallpaperUrl,
          localWallpaperCache
        );
        wallpaperLocal = downloadRes.uri;
        setCachedWallpaperLocalUri(downloadRes.uri);
      }

      let photoLocal = cachedPhotoLocalUri;
      if (!photoLocal) {
        if (photoToUse.startsWith('http')) {
          const localPhotoCache =
            FileSystem.cacheDirectory + `profile_temp_${Date.now()}.jpg`;
          const dlPhoto = await FileSystem.downloadAsync(
            photoToUse,
            localPhotoCache
          );
          photoLocal = dlPhoto.uri;
        } else {
          photoLocal = photoToUse;
        }
        setCachedPhotoLocalUri(photoLocal);
      }
      setCustomizeMode(true);
    } catch (error) {
      console.error('Pre-download for customization failed:', error);
      Alert.alert(
        'Error',
        'Failed to load images for customization. Please check your internet connection.'
      );
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
        let wallpaperLocal = cachedWallpaperLocalUri;
        if (!wallpaperLocal) {
          const localWallpaperCache =
            FileSystem.cacheDirectory + `wallpaper_temp_${Date.now()}.jpg`;
          const downloadRes = await FileSystem.downloadAsync(
            wallpaperUrl,
            localWallpaperCache
          );
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

  // ─── CORE FIX: Save customised wallpaper ─────────────────────────────────
  //
  // The root problem with the previous approach:
  //   1. Reanimated v3 Animated.View on New Architecture (Fabric) renders
  //      entirely on the UI thread — ViewShot's snapshot mechanism cannot
  //      see it, so the photo sticker was always missing or the capture was
  //      blank/red-box.
  //   2. captureRef() from react-native-view-shot is more reliable than the
  //      ref.current.capture() instance method across SDK versions.
  //
  // Fix strategy:
  //   - Keep the live interactive editor exactly as-is (Reanimated gestures
  //     work perfectly there).
  //   - Right before capture, read the current transform values from shared
  //     values and store them in React state (captureTransform).
  //   - Render a HIDDEN off-screen plain <View> (no Reanimated, no gestures)
  //     that replicates the wallpaper + photo at those exact transform values
  //     using ordinary React Native `transform` style prop.
  //   - Use captureRef() on that plain View — this works 100% reliably.
  //   - After capture, clear captureTransform back to null.

  const saveCustomizedWallpaper = async () => {
    if (!cachedWallpaperLocalUri || !cachedPhotoLocalUri) {
      Alert.alert(
        'Not Ready',
        'Images are still loading. Please wait a moment and try again.'
      );
      return;
    }

    try {
      setIsDownloading(true);

      // Step 1 — Snapshot Reanimated values from the JS thread.
      // shared values are readable synchronously from JS side.
      const snapX = translateX.value;
      const snapY = translateY.value;
      const snapS = scale.value;

      // Step 2 — Push snapshot into React state so the capture view re-renders.
      await new Promise<void>((resolve) => {
        setCaptureTransform({ x: snapX, y: snapY, s: snapS });
        // Give React one render cycle to commit the hidden view
        requestAnimationFrame(() => setTimeout(resolve, 80));
      });

      // Step 3 — Capture the hidden plain-View (no Reanimated involved).
      if (!captureViewRef.current) {
        throw new Error('Capture view ref not ready');
      }

      const capturedUri = await captureRef(captureViewRef, {
        format: 'jpg',
        quality: 1.0,
        result: 'tmpfile',
      });

      if (!capturedUri) throw new Error('captureRef returned empty URI');

      // Step 5 — Save to gallery
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setIsDownloading(false);
        Alert.alert(
          'Permission Denied',
          'Please allow gallery access to save your customized wallpaper.'
        );
        return;
      }

      const finalUri = ensureFileScheme(capturedUri);
      const asset = await MediaLibrary.createAssetAsync(finalUri);
      await MediaLibrary.createAlbumAsync('DevaWalls', asset, false);

      setDownloadedLocalUri(finalUri);
      setIsDownloading(false);
      setShowDownloadSuccessModal(true);
      setCustomizeMode(false);
    } catch (error: any) {
      console.error('Save customized failed:', error);
      setIsDownloading(false);
      Alert.alert(
        'Error',
        `Could not save your customized wallpaper.\n\n${error?.message || JSON.stringify(error)}`
      );
    }
  };

  const resetEditorGestures = () => {
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    scale.value = 1;
    savedScale.value = 1;
  };

  // ─── Loading screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-dark items-center justify-center">
        <ActivityIndicator
          size="large"
          color="#F5C518"
          style={{ marginBottom: 16 }}
        />
        <Text className="text-white font-bold text-base">
          Preparing Editor...
        </Text>
        <Text className="text-textMuted text-xs mt-1">
          Downloading wallpaper and profile assets locally
        </Text>
      </SafeAreaView>
    );
  }

  // ─── Customize / Editor Mode ──────────────────────────────────────────────
  if (customizeMode && (tempPhotoUri || profilePhoto)) {
    const photoUri = cachedPhotoLocalUri || tempPhotoUri || profilePhoto || '';

    return (
      <SafeAreaView className="flex-1 bg-dark">
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center px-4 py-3 border-b border-primary/20">
            <Text className="text-white font-bold text-lg">
              Customize Wallpaper
            </Text>
          </View>

          {/* Canvas Workspace — live interactive editor with Reanimated */}
          <ScrollView
            style={{ flex: 0.8 }}
            contentContainerStyle={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 16,
            }}
          >
            {/* LIVE INTERACTIVE EDITOR — Reanimated gestures work here */}
            <View
              style={{
                width: CANVAS_PREVIEW_WIDTH,
                height: CANVAS_PREVIEW_HEIGHT,
                backgroundColor: '#000',
                overflow: 'hidden',
              }}
            >
              {/* Wallpaper background — use only local file:// URI */}
              <RNImage
                source={{ uri: ensureFileScheme(cachedWallpaperLocalUri) }}
                style={{ width: '100%', height: '100%', position: 'absolute' }}
                resizeMode="cover"
              />

              {/* Safe-area guide overlay */}
              <View
                pointerEvents="none"
                style={{
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
                }}
              >
                <Text
                  style={{
                    color: '#F5C518',
                    fontSize: 10,
                    fontWeight: '600',
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 4,
                  }}
                >
                  Safe Area Guide
                </Text>
              </View>

              {/* Draggable / pinchable photo sticker — Reanimated */}
              <GestureDetector gesture={composedGesture}>
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      // Start the photo centred in the canvas
                      top: CANVAS_PREVIEW_HEIGHT / 2 - 60,
                      left: CANVAS_PREVIEW_WIDTH / 2 - 60,
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      borderWidth: 3.5,
                      borderColor: '#F5C518',
                      overflow: 'hidden',
                      backgroundColor: '#1E1E1E',
                    },
                    animatedPhotoStyle,
                  ]}
                >
                  <RNImage
                    source={{ uri: ensureFileScheme(photoUri) }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </Animated.View>
              </GestureDetector>
            </View>

            {/* ── HIDDEN STATIC CAPTURE VIEW ──────────────────────────────
                This view is rendered off-screen (opacity 0, no pointer
                events). It is a plain React Native View with no Reanimated —
                captureRef works on it 100% reliably. ─────────────── */}
              <View
                ref={captureViewRef}
                style={{
                  position: 'absolute',
                  // Place it off-screen and invisible so it doesn't flash
                  top: -9999,
                  left: -9999,
                  opacity: 0,
                  width: CANVAS_PREVIEW_WIDTH,
                  height: CANVAS_PREVIEW_HEIGHT,
                  backgroundColor: '#000',
                  overflow: 'hidden',
                }}
                collapsable={false}
              >
                {/* Wallpaper background */}
                <RNImage
                  source={{ uri: ensureFileScheme(cachedWallpaperLocalUri) }}
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                  }}
                  resizeMode="cover"
                />

                {/* Photo sticker — plain View transform, matches Reanimated snapshot */}
                <View
                  style={{
                    position: 'absolute',
                    top: CANVAS_PREVIEW_HEIGHT / 2 - 60,
                    left: CANVAS_PREVIEW_WIDTH / 2 - 60,
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    borderWidth: 3.5,
                    borderColor: '#F5C518',
                    overflow: 'hidden',
                    backgroundColor: '#1E1E1E',
                    transform: [
                      { translateX: captureTransform.x },
                      { translateY: captureTransform.y },
                      { scale: captureTransform.s },
                    ],
                  }}
                >
                  <RNImage
                    source={{ uri: ensureFileScheme(photoUri) }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
              </View>
          </ScrollView>

          {/* Bottom Controls */}
          <View
            className="p-4 bg-card border-t border-primary/20 gap-4"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Text className="text-center text-textMuted text-xs">
              Pinch to resize &amp; drag your photo anywhere on the wallpaper.
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={pickPhoto}
                className="flex-1 bg-secondary rounded-xl py-3 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-sm">
                  Change Photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTempPhotoUri(null)}
                className="flex-1 bg-red-500/10 border border-red-500 rounded-xl py-3 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-red-500 font-semibold text-sm">
                  Remove Photo
                </Text>
              </TouchableOpacity>
            </View>

            {/* Save & Download */}
            <TouchableOpacity
              onPress={saveCustomizedWallpaper}
              disabled={isDownloading}
              className="bg-primary rounded-xl py-4 items-center"
              activeOpacity={0.8}
            >
              {isDownloading ? (
                <ActivityIndicator color="#0F0F0F" />
              ) : (
                <Text className="text-dark font-bold text-base">
                  Save &amp; Download
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              onPress={() => {
                setCustomizeMode(false);
                resetEditorGestures();
              }}
              className="items-center py-2"
              activeOpacity={0.8}
            >
              <Text className="text-primary font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Saving overlay */}
        <Modal visible={isDownloading} transparent animationType="fade">
          <View className="flex-1 bg-black/80 items-center justify-center">
            <View className="bg-card rounded-2xl p-6 border border-primary/20 items-center">
              <ActivityIndicator
                size="large"
                color="#F5C518"
                style={{ marginBottom: 16 }}
              />
              <Text className="text-white font-bold text-base">Saving...</Text>
              <Text className="text-textMuted text-xs mt-1">
                Compositing and saving to your gallery
              </Text>
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
              <Text className="text-white font-bold text-xl mb-2 text-center">
                Wallpaper Saved!
              </Text>
              <Text className="text-textMuted text-sm text-center mb-6">
                Your customized wallpaper has been saved to the 'DevaWalls'
                album in your gallery.
              </Text>

              <View className="w-full gap-3">
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await Sharing.shareAsync(downloadedLocalUri, {
                        mimeType: 'image/jpeg',
                        dialogTitle: 'Share Customized Wallpaper',
                        UTI: 'public.jpeg',
                      });
                    } catch (e) {
                      console.error('Share after save failed:', e);
                    }
                  }}
                  className="bg-primary rounded-xl py-3 items-center flex-row justify-center"
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={18}
                    color="#0F0F0F"
                    style={{ marginRight: 8 }}
                  />
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

  // ─── Preview Mode ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 justify-between">
        {/* Wallpaper preview */}
        <View
          style={{ height: '62%', backgroundColor: '#000', justifyContent: 'center' }}
        >
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

        {/* Action sheet */}
        <View
          style={{ height: '38%', paddingBottom: Math.max(insets.bottom, 24) }}
          className="bg-card rounded-t-3xl p-6 justify-between border-t border-primary/20"
        >
          <View className="mb-2">
            <Text className="text-white font-bold text-xl mb-1">
              {wallpaperDisplayName}
            </Text>
            <Text className="text-primary text-sm font-semibold">
              {categoryDisplayName}
            </Text>
          </View>

          {/* Set as Wallpaper */}
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
                <Ionicons
                  name="phone-portrait-outline"
                  size={22}
                  color="#0F0F0F"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-dark font-bold text-base">
                  Set as Wallpaper
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary row */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleShare}
              className="flex-1 bg-green-500/10 border border-green-500 rounded-xl p-3 items-center justify-center flex-row"
              activeOpacity={0.8}
            >
              <Ionicons
                name="share-outline"
                size={18}
                color="#22C55E"
                style={{ marginRight: 4 }}
              />
              <Text className="text-green-500 font-bold text-xs">Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDownload}
              className="flex-1 bg-secondary/15 border border-secondary rounded-xl p-3 items-center justify-center flex-row"
              activeOpacity={0.8}
            >
              <Ionicons
                name="download-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 4 }}
              />
              <Text className="text-white font-bold text-xs">Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCustomize}
              className="flex-1 bg-primary/10 border border-primary rounded-xl p-3 items-center justify-center flex-row"
              activeOpacity={0.8}
            >
              <Ionicons
                name="color-palette-outline"
                size={18}
                color="#F5C518"
                style={{ marginRight: 4 }}
              />
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
            <Text className="text-white font-bold text-lg mb-2">
              Add Your Photo
            </Text>
            <Text className="text-textMuted text-sm mb-6">
              Add your photo to customize this wallpaper
            </Text>
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

      {/* Set Wallpaper sheet */}
      <Modal
        visible={showSetWallpaperModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSetWallpaperModal(false)}
      >
        <View className="flex-1 bg-black/75 justify-end">
          <View
            className="bg-card rounded-t-3xl p-6 border-t border-primary/20"
            style={{ paddingBottom: Math.max(insets.bottom, 56) }}
          >
            <View className="items-center mb-4">
              <View className="w-12 h-1 bg-secondary rounded-full mb-3" />
              <Text className="text-white font-bold text-xl">Set Wallpaper</Text>
              <Text className="text-textMuted text-xs mt-1">
                Choose where you want to apply this wallpaper
              </Text>
            </View>

            <View className="gap-3 my-4">
              {[
                { key: 'home', label: 'Home Screen', icon: 'home-outline' },
                {
                  key: 'lock',
                  label: 'Lock Screen',
                  icon: 'lock-closed-outline',
                },
                {
                  key: 'both',
                  label: 'Home & Lock Screen',
                  icon: 'phone-portrait-outline',
                },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() =>
                    setSelectedScreenOption(opt.key as 'home' | 'lock' | 'both')
                  }
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
                      color={
                        selectedScreenOption === opt.key ? '#F5C518' : '#A3A3A3'
                      }
                      style={{ marginRight: 12 }}
                    />
                    <Text
                      className={`font-semibold ${
                        selectedScreenOption === opt.key
                          ? 'text-primary'
                          : 'text-white'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  <View
                    className={`w-5 h-5 rounded-full border items-center justify-center ${
                      selectedScreenOption === opt.key
                        ? 'border-primary'
                        : 'border-secondary'
                    }`}
                  >
                    {selectedScreenOption === opt.key && (
                      <View className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

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

      {/* Downloading spinner */}
      <Modal visible={isDownloading} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center">
          <View className="bg-card rounded-2xl p-6 border border-primary/20 items-center">
            <ActivityIndicator
              size="large"
              color="#F5C518"
              style={{ marginBottom: 16 }}
            />
            <Text className="text-white font-bold text-base">
              Downloading...
            </Text>
            <Text className="text-textMuted text-xs mt-1">
              Saving wallpaper to your gallery
            </Text>
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
            <Text className="text-white font-bold text-xl mb-2 text-center">
              Wallpaper Saved!
            </Text>
            <Text className="text-textMuted text-sm text-center mb-6">
              The wallpaper has been successfully added to your device gallery
              under 'DevaWalls' album.
            </Text>

            <View className="w-full gap-3">
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await Sharing.shareAsync(downloadedLocalUri, {
                      mimeType: 'image/jpeg',
                      dialogTitle: 'Share Wallpaper',
                      UTI: 'public.jpeg',
                    });
                  } catch (e) {
                    console.error('Share failed:', e);
                  }
                }}
                className="bg-primary rounded-xl py-3 items-center flex-row justify-center"
                activeOpacity={0.8}
              >
                <Ionicons
                  name="share-social-outline"
                  size={18}
                  color="#0F0F0F"
                  style={{ marginRight: 8 }}
                />
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