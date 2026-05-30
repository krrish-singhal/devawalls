import { View, Text, SafeAreaView, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useRef, useMemo } from 'react';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import ViewShot from 'react-native-view-shot';
import { useUserStore } from '@/stores/userStore';
import { CustomizeOverlay } from '@/components/CustomizeOverlay';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000';
const screenWidth = Dimensions.get('window').width;
const WALLPAPER_WIDTH = screenWidth;
const WALLPAPER_HEIGHT = screenWidth * (16 / 9);

export default function WallpaperScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profilePhoto = useUserStore((state) => state.profilePhoto);
  const setProfilePhoto = useUserStore((state) => state.setProfilePhoto);

  const [customizeMode, setCustomizeMode] = useState(false);
  const [photoSize, setPhotoSize] = useState(100);
  const [bottomOffset, setBottomOffset] = useState(60);
  const [leftOffset, setLeftOffset] = useState(20);
  const [tempPhotoUri, setTempPhotoUri] = useState(profilePhoto);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const captureRef = useRef<ViewShot>(null);

  const wallpaperUrl = useMemo(() => {
    if (!id) return '';
    const parts = id.split('_');
    const category = parts[0];
    const index = parts[1] || '1';
    return `${API_BASE_URL}/wallpapers/${category}/${index}.jpg`;
  }, [id]);

  const handleShare = async () => {
    try {
      const localUri = FileSystem.cacheDirectory + `wallpaper_${Date.now()}.jpg`;
      await FileSystem.downloadAsync(wallpaperUrl, localUri);

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        alert('Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(localUri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share this wallpaper',
        UTI: 'public.jpeg',
      });
    } catch (error) {
      console.error('Share failed:', error);
      alert('Could not share the image. Please try again.');
    }
  };

  const handleDownload = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission denied. Please allow gallery access in Settings.');
        return;
      }

      const localUri = FileSystem.cacheDirectory + `wallpaper_${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(wallpaperUrl, localUri);
      await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
      alert('✅ Wallpaper saved to your gallery!');
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const handleCustomize = async () => {
    if (!profilePhoto && !tempPhotoUri) {
      setShowPhotoModal(true);
    } else {
      setCustomizeMode(true);
    }
  };

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setTempPhotoUri(result.assets[0].uri);
        setProfilePhoto(result.assets[0].uri);
        setShowPhotoModal(false);
        setCustomizeMode(true);
      }
    } catch (err) {
      console.error('Photo picker error:', err);
    }
  };

  const saveCustomizedWallpaper = async () => {
    try {
      setLoading(true);
      const uri = await captureRef.current?.capture({
        format: 'jpg',
        quality: 1.0,
        result: 'tmpfile',
      });

      if (!uri) throw new Error('Capture failed');

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Please allow gallery access to save the wallpaper.');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      alert('🎉 Your customized wallpaper has been saved to gallery!');
      setCustomizeMode(false);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Could not save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const controls = {
    onBigger: () => setPhotoSize((s) => Math.min(s + 10, 200)),
    onSmaller: () => setPhotoSize((s) => Math.max(s - 10, 60)),
    onUp: () => setBottomOffset((b) => b + 10),
    onDown: () => setBottomOffset((b) => Math.max(b - 10, 0)),
    onLeft: () => setLeftOffset((l) => Math.max(l - 10, 0)),
    onRight: () => setLeftOffset((l) => l + 10),
    onChangePhoto: pickPhoto,
    onRemove: () => setTempPhotoUri(null),
  };

  if (customizeMode && tempPhotoUri) {
    return (
      <SafeAreaView className="flex-1 bg-dark">
        <View className="flex-1">
          {/* Top section - Canvas */}
          <ScrollView style={{ flex: 0.85 }} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }}>
            <ViewShot ref={captureRef} options={{ format: 'jpg', quality: 1.0 }}>
              <View style={{ width: WALLPAPER_WIDTH, height: WALLPAPER_HEIGHT, backgroundColor: '#000' }}>
                <Image
                  source={{ uri: wallpaperUrl }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: bottomOffset,
                    left: leftOffset,
                    width: photoSize,
                    height: photoSize,
                    borderRadius: photoSize / 2,
                    borderWidth: 3,
                    borderColor: '#F5C518',
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: tempPhotoUri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
              </View>
            </ViewShot>
          </ScrollView>

          {/* Control buttons */}
          <CustomizeOverlay {...controls} photoSize={photoSize} />

          {/* Save button */}
          <TouchableOpacity
            onPress={saveCustomizedWallpaper}
            disabled={loading}
            className="bg-primary mx-4 my-4 rounded-lg p-4 items-center"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#0F0F0F" />
            ) : (
              <Text className="text-dark font-bold text-base">Save & Download</Text>
            )}
          </TouchableOpacity>

          {/* Back button */}
          <TouchableOpacity
            onPress={() => {
              setCustomizeMode(false);
              setPhotoSize(100);
              setBottomOffset(60);
              setLeftOffset(20);
            }}
            className="mb-4 items-center"
          >
            <Text className="text-primary font-semibold">← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Preview Mode */}
      <View className="flex-1">
        {/* Top section - Wallpaper preview */}
        <View style={{ height: '60%', backgroundColor: '#000' }}>
          <Image
            source={{ uri: wallpaperUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
          />
        </View>

        {/* Bottom section - Action buttons */}
        <View style={{ height: '40%' }} className="bg-card rounded-t-3xl p-6 justify-between">
          <View>
            <Text className="text-white font-semibold text-base mb-1">Wallpaper</Text>
            <Text className="text-primary text-sm">Category</Text>
          </View>

          {/* Action buttons row */}
          <View className="flex-row gap-3">
            {/* Share */}
            <TouchableOpacity
              onPress={handleShare}
              className="flex-1 bg-green-500 rounded-lg p-3 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-sm">📱 Share</Text>
            </TouchableOpacity>

            {/* Download */}
            <TouchableOpacity
              onPress={handleDownload}
              className="flex-1 bg-secondary rounded-lg p-3 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-sm">⬇️ Download</Text>
            </TouchableOpacity>

            {/* Customize */}
            <TouchableOpacity
              onPress={handleCustomize}
              className="flex-1 bg-primary rounded-lg p-3 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-dark font-semibold text-sm">✏️ Customize</Text>
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
          <View className="bg-card rounded-2xl p-6 w-80">
            <Text className="text-white font-bold text-lg mb-4">Add Your Photo</Text>
            <Text className="text-textMuted text-sm mb-6">Add your photo to customize the wallpaper</Text>

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
    </SafeAreaView>
  );
}
