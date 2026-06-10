import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { DIVINE_QUOTES } from '@/constants/quotes';

export default function SplashScreen() {
  const [quote, setQuote] = useState('');
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  useEffect(() => {
    setQuote(DIVINE_QUOTES[Math.floor(Math.random() * DIVINE_QUOTES.length)]);
    dot1Opacity.value = withDelay(
      0,
      withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true)
    );
    dot2Opacity.value = withDelay(
      200,
      withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true)
    );
    dot3Opacity.value = withDelay(
      400,
      withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true)
    );

    const timer = setTimeout(() => {
      router.replace('/(onboarding)/profile-setup');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1Opacity.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2Opacity.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3Opacity.value }));

  return (
    <SafeAreaView className="flex-1 bg-dark">
      <View className="flex-1 justify-center items-center">
        <Image
          source={require('../assets/logo.png')}
          style={{ width: 100, height: 100, marginBottom: 32, borderRadius: 16 }}
          contentFit="contain"
        />

        {/* App name */}
        <Text className="text-4xl font-bold text-primary text-center mb-2">Deva Walls</Text>

        {/* English subtitle */}
        <Text className="text-white text-base text-center mb-8">From the heart to your mobile home</Text>

        {/* Random Divine Quote */}
        <View className="px-8 mb-12">
          <Text className="text-textMuted text-sm text-center italic leading-6">"{quote}"</Text>
        </View>

        {/* Animated dots */}
        <View className="flex-row gap-2">
          <Animated.View style={[dot1Style, { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F5C518' }]} />
          <Animated.View style={[dot2Style, { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F5C518' }]} />
          <Animated.View style={[dot3Style, { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F5C518' }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}
