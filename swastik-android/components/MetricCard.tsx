// swastik-android/components/MetricCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface MetricCardProps {
  label: string;
  value: number | string;
  iconName: 'calendar' | 'alert-triangle' | 'clock';
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, iconName }) => {
  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        {iconName === 'calendar' && (
          <Ionicons name="calendar-outline" size={20} color="#1A7B76" />
        )}
        {iconName === 'alert-triangle' && (
          <Feather name="alert-triangle" size={19} color="#1A7B76" />
        )}
        {iconName === 'clock' && (
          <Ionicons name="time-outline" size={21} color="#1A7B76" />
        )}
      </View>
      <Text style={styles.label} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
        {label}
      </Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 14,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A7B76',
  },
});
