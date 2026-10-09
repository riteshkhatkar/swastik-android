// swastik-android/components/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  iconType?: 'calendar' | 'document' | 'search';
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconType = 'calendar',
  message,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        {iconType === 'calendar' && (
          <Feather name="calendar" size={28} color="#64748B" />
        )}
        {iconType === 'document' && (
          <Ionicons name="document-text-outline" size={30} color="#64748B" />
        )}
        {iconType === 'search' && (
          <Feather name="search" size={28} color="#64748B" />
        )}
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 42,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF7F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  message: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },
});
