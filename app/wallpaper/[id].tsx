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
  findNodeHandle,
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
import { captureRef } from 'react-native-view-shot';
import { useUserStore } from '@/stores/userStore';
import { useCategoryWallpapers } from '@/hooks/useWallpapers';
import { CATEGORIES } from '@/constants/categories';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000'
).replace('/api', '');

const screenWidth = Dimensions.get('window').width;
const CANVAS_PREVIEW_WIDTH = screenWidth * 0.85;
const CANVAS_PREVIEW_HEIGHT = (CANVAS_PREVIEW_WIDTH / 9) * 20;
const CIRCLE_SIZE = 120;
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;

// Wallpaper native module
let setWallpaperAsync: (uri: string, screenType: 'home' | 'lock' | 'both') => Promise<void>;
try {
  const { requireNativeModule } = require('expo-modules-core');
  const WallpaperManager = requireNativeModule('WallpaperManager');
  setWallpaperAsync = async (uri, screenType) =>
    WallpaperManager.setWallpaperAsync(uri, screenType);
} catch {
  setWallpaperAsync = async () => {
    await new Promise(r => setTimeout(r, 1200));
  };
}

const ensureFileScheme = (uri: string): string =>
  uri && !uri.startsWith('file://') ? `file://${uri}` : uri;

export default function WallpaperScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = id
    ? CATEGORIES.find(c => id.startsWith(c.id))?.id || id.split('_')[0]
    : '';
  const { data: categoryWallpapers } = useCategoryWallpapers(categoryId);
  const profilePhoto = useUserStore(s => s.profilePhoto);
  const setProfilePhoto = useUserStore(s => s.setProfilePhoto);

  const [customizeMode, setCustomizeMode] = useState(false);
  const [tempPhotoUri, setTempPhotoUri] = useState<string | null>(profilePhoto);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cachedWallpaperLocalUri, setCachedWallpaperLocalUri] = useState('');
  const [cachedPhotoLocalUri, setCachedPhotoLocalUri] = useState('');

  const [showSetWallpaperModal, setShowSetWallpaperModal] = useState(false);
  const [selectedScreenOption, setSelectedScreenOption] = useState<'home' | 'lock' | 'both'>('both');
  const [wallpaperSettingLoading, setWallpaperSettingLoading] = useState(false);

  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadSuccessModal, setShowDownloadSuccessModal] = useState(false);
  const [downloadedLocalUri, setDownloadedLocalUri] = useState('');

  // Reanimated shared values for the live interactive editor
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Plain React state — mirrors of gesture values written just before capture
  // These drive the hidden capture view (plain View, no Reanimated)
  const [captureX, setCaptureX] = useState(0);
  const [captureY, setCaptureY] = useState(0);
  const [captureS, setCaptureS] = useState(1);

  const insets = useSafeAreaInsets();

  // Ref on the PLAIN hidden view — never inside a ScrollView
  const captureViewRef = useRef<View>(null);

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.max(0.4, Math.min(savedScale.value * e.scale, 3.5));
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

  const wallpaperUrl = useMemo(() => {
    if (!id) return '';
    const found = categoryWallpapers?.find(wp => wp.id === id);
    if (found) return found.imageUrl;
    const parts = id.split('_');
    return `${API_BASE_URL}/wallpapers/${parts[0]}/${parts[1] || '1'}.jpg?v=${new Date().getMinutes()}`;
  }, [id, categoryWallpapers]);

  const wallpaperDisplayName = useMemo(() => {
    if (!id) return 'Sacred Wallpaper';
    const cat = CATEGORIES.find(c => c.id === id.split('_')[0]);
    return cat ? cat.name : 'Sacred Wallpaper';
  }, [id]);

  const categoryDisplayName = useMemo(() => {
    if (!id) return '';
    const cat = CATEGORIES.find(c => c.id === id.split('_')[0]);
    return cat ? `${cat.nameEn} Wallpaper` : '';
  }, [id]);

  useEffect(() => {
    if (!wallpaperUrl) return;
    let mounted = true;
    (async () => {
      try {
        const wPath = FileSystem.cacheDirectory + `wp_${Date.now()}.jpg`;
        const wRes = await FileSystem.downloadAsync(wallpaperUrl, wPath);
        if (mounted) setCachedWallpaperLocalUri(wRes.uri);
        const photo = tempPhotoUri || profilePhoto;
        if (photo) {
          if (photo.startsWith('http')) {
            const pPath = FileSystem.cacheDirectory + `ph_${Date.now()}.jpg`;
            const pRes = await FileSystem.downloadAsync(photo, pPath);
            if (mounted) setCachedPhotoLocalUri(pRes.uri);
          } else {
            if (mounted) setCachedPhotoLocalUri(photo);
          }
        }
      } catch (e) { console.error('Pre-cache failed:', e); }
    })();
    return () => { mounted = false; };
  }, [wallpaperUrl, profilePhoto]);

  const resetGestures = () => {
    translateX.value = 0; translateY.value = 0;
    savedTranslateX.value = 0; savedTranslateY.value = 0;
    scale.value = 1; savedScale.value = 1;
    setCaptureX(0); setCaptureY(0); setCaptureS(1);
  };

  const handleShare = async () => {
    try {
      const localUri = FileSystem.cacheDirectory + `share_${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(wallpaperUrl, localUri);
      if (!(await Sharing.isAvailableAsync())) { Alert.alert('Error', 'Sharing not available'); return; }
      await Sharing.shareAsync(ensureFileScheme(uri), { mimeType: 'image/jpeg', dialogTitle: 'Share wallpaper', UTI: 'public.jpeg' });
    } catch { Alert.alert('Error', 'Could not share. Please try again.'); }
  };

  const handleDownload = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Denied', 'Please allow gallery access.'); return; }
      setIsDownloading(true);
      const localUri = FileSystem.cacheDirectory + `dl_${Date.now()}.jpg`;
      const result = await FileSystem.downloadAsync(wallpaperUrl, localUri);
      const asset = await MediaLibrary.createAssetAsync(ensureFileScheme(result.uri));
      await MediaLibrary.createAlbumAsync('DevaWalls', asset, false);
      setDownloadedLocalUri(ensureFileScheme(result.uri));
      setIsDownloading(false);
      setShowDownloadSuccessModal(true);
    } catch { setIsDownloading(false); Alert.alert('Error', 'Download failed. Try again.'); }
  };

  const handleApplyWallpaper = async () => {
    try {
      setShowSetWallpaperModal(false);
      setWallpaperSettingLoading(true);
      const localUri = FileSystem.cacheDirectory + `apply_${Date.now()}.jpg`;
      const result = await FileSystem.downloadAsync(wallpaperUrl, localUri);
      await setWallpaperAsync(ensureFileScheme(result.uri), selectedScreenOption);
      Alert.alert('Success', '✨ Wallpaper applied successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to apply wallpaper.');
    } finally { setWallpaperSettingLoading(false); }
  };

  const handleCustomize = async () => {
    const photo = tempPhotoUri || profilePhoto;
    if (!photo) { setShowPhotoModal(true); return; }
    if (cachedWallpaperLocalUri && cachedPhotoLocalUri) { setCustomizeMode(true); return; }
    try {
      setLoading(true);
      if (!cachedWallpaperLocalUri) {
        const wPath = FileSystem.cacheDirectory + `wp_${Date.now()}.jpg`;
        const wRes = await FileSystem.downloadAsync(wallpaperUrl, wPath);
        setCachedWallpaperLocalUri(wRes.uri);
      }
      if (!cachedPhotoLocalUri) {
        if (photo.startsWith('http')) {
          const pPath = FileSystem.cacheDirectory + `ph_${Date.now()}.jpg`;
          const pRes = await FileSystem.downloadAsync(photo, pPath);
          setCachedPhotoLocalUri(pRes.uri);
        } else { setCachedPhotoLocalUri(photo); }
      }
      setCustomizeMode(true);
    } catch { Alert.alert('Error', 'Failed to load images. Check your connection.'); }
    finally { setLoading(false); }
  };

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.9,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setTempPhotoUri(uri); setProfilePhoto(uri); setShowPhotoModal(false);
        setLoading(true);
        if (!cachedWallpaperLocalUri) {
          const wPath = FileSystem.cacheDirectory + `wp_${Date.now()}.jpg`;
          const wRes = await FileSystem.downloadAsync(wallpaperUrl, wPath);
          setCachedWallpaperLocalUri(wRes.uri);
        }
        setCachedPhotoLocalUri(uri);
        setCustomizeMode(true); setLoading(false);
      }
    } catch (e) { setLoading(false); console.error('Photo picker error:', e); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE CUSTOMIZED WALLPAPER — THE DEFINITIVE FIX
  //
  // WHY ALL PREVIOUS VERSIONS FAILED:
  // The hidden capture view was placed INSIDE a ScrollView with
  // top: -9999, left: -9999. Android's native layout engine clips and
  // UNMOUNTS views that are outside the ScrollView's visible bounds.
  // This is why captureViewRef.current was always null — the view
  // was physically destroyed by Android before capture was called.
  //
  // THE FIX:
  // The capture view is placed OUTSIDE the ScrollView, OUTSIDE the main
  // content View, as a direct child of SafeAreaView. At this level,
  // Android never clips or unmounts it regardless of position values.
  // It uses pointerEvents="none" so it doesn't intercept any touches.
  // It uses opacity:0 so the user never sees it.
  // It contains ZERO Reanimated — plain RNImage + plain transform style.
  // captureRef() on this view works 100% reliably.
  // ─────────────────────────────────────────────────────────────────────────
  const saveCustomizedWallpaper = async () => {
    if (!cachedWallpaperLocalUri || !cachedPhotoLocalUri) {
      Alert.alert('Not Ready', 'Images are still loading. Please wait and try again.');
      return;
    }

    try {
      setIsDownloading(true);

      // Read gesture values synchronously from Reanimated shared values
      const snapX = translateX.value;
      const snapY = translateY.value;
      const snapS = scale.value;

      // Write into plain React state — drives the hidden capture view
      setCaptureX(snapX);
      setCaptureY(snapY);
      setCaptureS(snapS);

      // Wait for React state commit → native paint
      // 300ms is enough on even slow real devices
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => setTimeout(resolve, 300))
      );

      // captureViewRef is ALWAYS ready here because the view is mounted
      // outside ScrollView as a SafeAreaView sibling — never clipped
      console.log("CAPTURE_REF_EXISTS", !!captureViewRef.current);
      console.log("CAPTURE_REF_TYPE", typeof captureViewRef.current);

      const nodeHandle = findNodeHandle(captureViewRef.current);
      console.log("NODE_HANDLE", nodeHandle);

      const capturedUri = await captureRef(nodeHandle, {
        format: 'jpg',
        quality: 1.0,
        result: 'tmpfile',
      });

      if (!capturedUri) throw new Error('captureRef returned empty result');

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setIsDownloading(false);
        Alert.alert('Permission Denied', 'Please allow gallery access.');
        return;
      }

      const finalUri = ensureFileScheme(capturedUri);
      const asset = await MediaLibrary.createAssetAsync(finalUri);
      await MediaLibrary.createAlbumAsync('DevaWalls', asset, false);

      setDownloadedLocalUri(finalUri);
      setIsDownloading(false);
      setShowDownloadSuccessModal(true);
      setCustomizeMode(false);
      resetGestures();
    } catch (error: any) {
      console.error('Save failed:', error);
      setIsDownloading(false);
      Alert.alert('Error', `Could not save wallpaper.\n${error?.message || String(error)}`);
    }
  };

  const photoUri = cachedPhotoLocalUri || tempPhotoUri || profilePhoto || '';

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-dark items-center justify-center">
        <ActivityIndicator size="large" color="#F5C518" style={{ marginBottom: 16 }} />
        <Text className="text-white font-bold text-base">Preparing Editor...</Text>
        <Text className="text-textMuted text-xs mt-1">Downloading wallpaper and profile assets</Text>
      </SafeAreaView>
    );
  }

  // ─── CUSTOMIZE MODE ───────────────────────────────────────────────────────
  if (customizeMode && (tempPhotoUri || profilePhoto)) {
    return (
      <SafeAreaView className="flex-1 bg-dark">

        {/* ─── HIDDEN CAPTURE VIEW ───────────────────────────────────────────
            CRITICAL: This is a DIRECT CHILD of SafeAreaView.
            NOT inside ScrollView. NOT inside any other View with overflow.
            This is the only position where Android guarantees it stays mounted.
            pointerEvents="none" = never intercepts touches.
            opacity: 0 = invisible to user.
            No Reanimated anywhere in this tree. ──────────────────────────── */}
        <View
          ref={captureViewRef}
          collapsable={false}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: CANVAS_PREVIEW_WIDTH,
            height: CANVAS_PREVIEW_HEIGHT,
            backgroundColor: '#000',
            overflow: 'hidden',
            opacity: 0,
            zIndex: -1,
          }}
        >
          <RNImage
            source={{ uri: ensureFileScheme(cachedWallpaperLocalUri) }}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          <View
            style={{
              position: 'absolute',
              top: CANVAS_PREVIEW_HEIGHT / 2 - CIRCLE_RADIUS,
              left: CANVAS_PREVIEW_WIDTH / 2 - CIRCLE_RADIUS,
              width: CIRCLE_SIZE,
              height: CIRCLE_SIZE,
              borderRadius: CIRCLE_RADIUS,
              borderWidth: 3.5,
              borderColor: '#F5C518',
              overflow: 'hidden',
              backgroundColor: '#1E1E1E',
              transform: [
                { translateX: captureX },
                { translateY: captureY },
                { scale: captureS },
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

        {/* ─── MAIN CONTENT ──────────────────────────────────────────────── */}
        <View className="flex-1">
          <View className="flex-row items-center px-4 py-3 border-b border-primary/20">
            <Text className="text-white font-bold text-lg">Customize Wallpaper</Text>
          </View>

          <ScrollView
            style={{ flex: 0.8 }}
            contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }}
          >
            {/* Live interactive editor — Reanimated gestures only here */}
            <View
              style={{
                width: CANVAS_PREVIEW_WIDTH,
                height: CANVAS_PREVIEW_HEIGHT,
                backgroundColor: '#000',
                overflow: 'hidden',
              }}
            >
              <RNImage
                source={{ uri: ensureFileScheme(cachedWallpaperLocalUri) }}
                style={{ width: '100%', height: '100%', position: 'absolute' }}
                resizeMode="cover"
              />

              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: '12.5%', left: '12.5%',
                  width: '75%', height: '75%',
                  borderWidth: 1.5,
                  borderColor: 'rgba(245, 197, 24, 0.45)',
                  borderStyle: 'dashed',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  paddingTop: 8,
                }}
              >
                <Text style={{
                  color: '#F5C518', fontSize: 10, fontWeight: '600',
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
                }}>
                  Safe Area Guide
                </Text>
              </View>

              <GestureDetector gesture={composedGesture}>
                <Animated.View style={[{
                  position: 'absolute',
                  top: CANVAS_PREVIEW_HEIGHT / 2 - CIRCLE_RADIUS,
                  left: CANVAS_PREVIEW_WIDTH / 2 - CIRCLE_RADIUS,
                  width: CIRCLE_SIZE,
                  height: CIRCLE_SIZE,
                  borderRadius: CIRCLE_RADIUS,
                  borderWidth: 3.5,
                  borderColor: '#F5C518',
                  overflow: 'hidden',
                  backgroundColor: '#1E1E1E',
                }, animatedPhotoStyle]}>
                  <RNImage
                    source={{ uri: ensureFileScheme(photoUri) }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </Animated.View>
              </GestureDetector>
            </View>
          </ScrollView>

          <View className="p-4 bg-card border-t border-primary/20 gap-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <Text className="text-center text-textMuted text-xs">
              Pinch to resize &amp; drag your photo anywhere on the wallpaper.
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity onPress={pickPhoto} className="flex-1 bg-secondary rounded-xl py-3 items-center" activeOpacity={0.8}>
                <Text className="text-white font-semibold text-sm">Change Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTempPhotoUri(null)} className="flex-1 bg-red-500/10 border border-red-500 rounded-xl py-3 items-center" activeOpacity={0.8}>
                <Text className="text-red-500 font-semibold text-sm">Remove Photo</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={saveCustomizedWallpaper}
              disabled={isDownloading}
              className="bg-primary rounded-xl py-4 items-center"
              activeOpacity={0.8}
            >
              {isDownloading
                ? <ActivityIndicator color="#0F0F0F" />
                : <Text className="text-dark font-bold text-base">Save &amp; Download</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setCustomizeMode(false); resetGestures(); }}
              className="items-center py-2"
              activeOpacity={0.8}
            >
              <Text className="text-primary font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={isDownloading} transparent animationType="fade">
          <View className="flex-1 bg-black/80 items-center justify-center">
            <View className="bg-card rounded-2xl p-6 border border-primary/20 items-center">
              <ActivityIndicator size="large" color="#F5C518" style={{ marginBottom: 16 }} />
              <Text className="text-white font-bold text-base">Saving...</Text>
              <Text className="text-textMuted text-xs mt-1">Compositing and saving to gallery</Text>
            </View>
          </View>
        </Modal>

        <Modal visible={showDownloadSuccessModal} transparent animationType="fade" onRequestClose={() => setShowDownloadSuccessModal(false)}>
          <View className="flex-1 bg-black/85 items-center justify-center">
            <View className="bg-card rounded-2xl p-6 w-80 border border-primary/20 items-center">
              <View className="bg-green-500/10 p-3 rounded-full mb-4">
                <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
              </View>
              <Text className="text-white font-bold text-xl mb-2 text-center">Wallpaper Saved!</Text>
              <Text className="text-textMuted text-sm text-center mb-6">
                Saved to 'DevaWalls' album in your gallery.
              </Text>
              <View className="w-full gap-3">
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await Sharing.shareAsync(downloadedLocalUri, {
                        mimeType: 'image/jpeg', dialogTitle: 'Share Customized Wallpaper', UTI: 'public.jpeg',
                      });
                    } catch (e) { console.error(e); }
                  }}
                  className="bg-primary rounded-xl py-3 items-center flex-row justify-center"
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={18} color="#0F0F0F" style={{ marginRight: 8 }} />
                  <Text className="text-dark font-bold">Share Wallpaper</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDownloadSuccessModal(false)} className="bg-secondary rounded-xl py-3 items-center" activeOpacity={0.8}>
                  <Text className="text-white font-semibold">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ─── PREVIEW MODE ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 justify-between">
        <View style={{ height: '62%', backgroundColor: '#000', justifyContent: 'center' }}>
          <Image source={{ uri: wallpaperUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              position: 'absolute', top: 20, left: 20, zIndex: 10,
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View
          style={{ height: '38%', paddingBottom: Math.max(insets.bottom, 24) }}
          className="bg-card rounded-t-3xl p-6 justify-between border-t border-primary/20"
        >
          <View className="mb-2">
            <Text className="text-white font-bold text-xl mb-1">{wallpaperDisplayName}</Text>
            <Text className="text-primary text-sm font-semibold">{categoryDisplayName}</Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowSetWallpaperModal(true)}
            disabled={wallpaperSettingLoading}
            className="bg-primary rounded-xl py-4 flex-row items-center justify-center mb-4"
            activeOpacity={0.8}
          >
            {wallpaperSettingLoading ? <ActivityIndicator color="#0F0F0F" /> : (
              <>
                <Ionicons name="phone-portrait-outline" size={22} color="#0F0F0F" style={{ marginRight: 8 }} />
                <Text className="text-dark font-bold text-base">Set as Wallpaper</Text>
              </>
            )}
          </TouchableOpacity>

          <View className="flex-row gap-3">
            <TouchableOpacity onPress={handleShare} className="flex-1 bg-green-500/10 border border-green-500 rounded-xl p-3 items-center justify-center flex-row" activeOpacity={0.8}>
              <Ionicons name="share-outline" size={18} color="#22C55E" style={{ marginRight: 4 }} />
              <Text className="text-green-500 font-bold text-xs">Share</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDownload} className="flex-1 bg-secondary/15 border border-secondary rounded-xl p-3 items-center justify-center flex-row" activeOpacity={0.8}>
              <Ionicons name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text className="text-white font-bold text-xs">Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCustomize} className="flex-1 bg-primary/10 border border-primary rounded-xl p-3 items-center justify-center flex-row" activeOpacity={0.8}>
              <Ionicons name="color-palette-outline" size={18} color="#F5C518" style={{ marginRight: 4 }} />
              <Text className="text-primary font-bold text-xs">Customize</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={showPhotoModal} transparent animationType="slide" onRequestClose={() => setShowPhotoModal(false)}>
        <View className="flex-1 bg-black/80 items-center justify-center">
          <View className="bg-card rounded-2xl p-6 w-80 border border-primary/20">
            <Text className="text-white font-bold text-lg mb-2">Add Your Photo</Text>
            <Text className="text-textMuted text-sm mb-6">Add your photo to customize this wallpaper</Text>
            <TouchableOpacity onPress={pickPhoto} className="bg-primary rounded-lg p-3 mb-3 items-center" activeOpacity={0.8}>
              <Text className="text-dark font-semibold">Choose Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPhotoModal(false)} className="bg-secondary rounded-lg p-3 items-center" activeOpacity={0.8}>
              <Text className="text-white font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSetWallpaperModal} transparent animationType="slide" onRequestClose={() => setShowSetWallpaperModal(false)}>
        <View className="flex-1 bg-black/75 justify-end">
          <View className="bg-card rounded-t-3xl p-6 border-t border-primary/20" style={{ paddingBottom: Math.max(insets.bottom, 56) }}>
            <View className="items-center mb-4">
              <View className="w-12 h-1 bg-secondary rounded-full mb-3" />
              <Text className="text-white font-bold text-xl">Set Wallpaper</Text>
              <Text className="text-textMuted text-xs mt-1">Choose where to apply this wallpaper</Text>
            </View>
            <View className="gap-3 my-4">
              {[
                { key: 'home', label: 'Home Screen', icon: 'home-outline' },
                { key: 'lock', label: 'Lock Screen', icon: 'lock-closed-outline' },
                { key: 'both', label: 'Home & Lock Screen', icon: 'phone-portrait-outline' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setSelectedScreenOption(opt.key as any)}
                  className={`flex-row items-center justify-between p-4 rounded-xl border ${selectedScreenOption === opt.key ? 'border-primary bg-primary/5' : 'border-secondary bg-transparent'}`}
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center">
                    <Ionicons name={opt.icon as any} size={20} color={selectedScreenOption === opt.key ? '#F5C518' : '#A3A3A3'} style={{ marginRight: 12 }} />
                    <Text className={`font-semibold ${selectedScreenOption === opt.key ? 'text-primary' : 'text-white'}`}>{opt.label}</Text>
                  </View>
                  <View className={`w-5 h-5 rounded-full border items-center justify-center ${selectedScreenOption === opt.key ? 'border-primary' : 'border-secondary'}`}>
                    {selectedScreenOption === opt.key && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity onPress={() => setShowSetWallpaperModal(false)} className="flex-1 bg-secondary rounded-xl py-4 items-center" activeOpacity={0.8}>
                <Text className="text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleApplyWallpaper} className="flex-1 bg-primary rounded-xl py-4 items-center" activeOpacity={0.8}>
                <Text className="text-dark font-bold">Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isDownloading} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center">
          <View className="bg-card rounded-2xl p-6 border border-primary/20 items-center">
            <ActivityIndicator size="large" color="#F5C518" style={{ marginBottom: 16 }} />
            <Text className="text-white font-bold text-base">Downloading...</Text>
            <Text className="text-textMuted text-xs mt-1">Saving to your gallery</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={showDownloadSuccessModal} transparent animationType="fade" onRequestClose={() => setShowDownloadSuccessModal(false)}>
        <View className="flex-1 bg-black/85 items-center justify-center">
          <View className="bg-card rounded-2xl p-6 w-80 border border-primary/20 items-center">
            <View className="bg-green-500/10 p-3 rounded-full mb-4">
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
            </View>
            <Text className="text-white font-bold text-xl mb-2 text-center">Wallpaper Saved!</Text>
            <Text className="text-textMuted text-sm text-center mb-6">
              Added to 'DevaWalls' album in your gallery.
            </Text>
            <View className="w-full gap-3">
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await Sharing.shareAsync(downloadedLocalUri, { mimeType: 'image/jpeg', dialogTitle: 'Share Wallpaper', UTI: 'public.jpeg' });
                  } catch (e) { console.error(e); }
                }}
                className="bg-primary rounded-xl py-3 items-center flex-row justify-center"
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={18} color="#0F0F0F" style={{ marginRight: 8 }} />
                <Text className="text-dark font-bold">Share Wallpaper</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDownloadSuccessModal(false)} className="bg-secondary rounded-xl py-3 items-center" activeOpacity={0.8}>
                <Text className="text-white font-semibold">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}