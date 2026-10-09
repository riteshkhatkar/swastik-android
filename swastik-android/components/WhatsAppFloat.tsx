// swastik-android/components/WhatsAppFloat.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export const WhatsAppFloat: React.FC = () => {
  const handleOpenWhatsApp = () => {
    const hospitalPhone = process.env.EXPO_PUBLIC_WHATSAPP_NUMBER || '+919876543210';
    const url = `whatsapp://send?phone=${hospitalPhone}&text=Hello Swastik Hospital, I need assistance.`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Swastik Hospital Support', 'WhatsApp Helpline: +91 98765 43210\nEmergency: 24/7 Available');
      }
    });
  };

  return (
    <TouchableOpacity 
      style={styles.floatingButton} 
      activeOpacity={0.85}
      onPress={handleOpenWhatsApp}
    >
      <Ionicons name="logo-whatsapp" size={28} color="#ffffff" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.whatsapp,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 999,
  },
});
