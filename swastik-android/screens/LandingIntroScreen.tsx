// swastik-android/screens/LandingIntroScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  Easing,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface LandingIntroScreenProps {
  onGetStarted: () => void;
}

export const LandingIntroScreen: React.FC<LandingIntroScreenProps> = ({ onGetStarted }) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Auto-advance after 2.8s
    const timer = setTimeout(() => {
      onGetStarted();
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4FAFA" translucent={false} />

      {/* Clean full-screen hospital background */}
      <Image
        source={require('../assets/landing_screen_bg.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Active Loading Section */}
      <Animated.View
        style={[
          styles.overlayContainer,
          {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 24),
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={styles.loadingContainer}>
          <View style={styles.spinnerWrapper}>
            <ActivityIndicator size="large" color="#0D9488" />
          </View>
          <Text style={styles.loadingTitle}>Loading...</Text>
          <Text style={styles.loadingSubtitle}>Preparing your workspace</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    zIndex: 1,
  },
  overlayContainer: {
    flex: 1,
    zIndex: 2,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    marginTop: height * 0.28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  loadingSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
});

