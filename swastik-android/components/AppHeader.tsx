// swastik-android/components/AppHeader.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface AppHeaderProps {
  onOpenDrawer?: () => void;
  showStethoscopeBanner?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenDrawer,
  showStethoscopeBanner = false,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 20) }]}>
      {/* Top action row */}
      <View style={styles.topRow}>
        {/* Hamburger Icon */}
        <TouchableOpacity
          onPress={onOpenDrawer}
          style={styles.hamburgerButton}
          activeOpacity={0.7}
          accessibilityLabel="Open Navigation Drawer"
        >
          <Ionicons name="menu" size={26} color="#1E293B" />
        </TouchableOpacity>

        {/* Swastik Hospital Brand Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/swastik_brand_header_transparent.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    paddingBottom: 8,
  },
  stethoscopeBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 250,
    height: 110,
    opacity: 0.95,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    zIndex: 2,
  },
  hamburgerButton: {
    padding: 6,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
  },
  brandLogo: {
    width: 155,
    height: 42,
  },
});
