// swastik-android/components/BottomWave.tsx
import React from 'react';
import { StyleSheet, Image, Dimensions, View } from 'react-native';

const { width } = Dimensions.get('window');

interface BottomWaveProps {
  height?: number;
}

export const BottomWave: React.FC<BottomWaveProps> = ({ height = 180 }) => {
  return (
    <View style={[styles.container, { height }]} pointerEvents="none">
      <Image
        source={require('../assets/bottom_waves.png')}
        style={[styles.waveImage, { height }]}
        resizeMode="stretch"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: width,
    zIndex: 0,
  },
  waveImage: {
    width: '100%',
    opacity: 0.9,
  },
});
