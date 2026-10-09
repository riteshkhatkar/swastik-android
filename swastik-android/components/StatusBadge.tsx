// swastik-android/components/StatusBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type LabOrderStatus =
  | 'Requested'
  | 'Sample collected'
  | 'Sample in progress'
  | 'Test in process'
  | 'Results entered'
  | 'Report ready'
  | 'Acknowledged'
  | string;

interface StatusBadgeProps {
  status: LabOrderStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeStyle = () => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('requested')) {
      return { bg: '#DBEAFE', text: '#1D4ED8' };
    }
    if (s.includes('sample collected')) {
      return { bg: '#D1FAE5', text: '#065F46' };
    }
    if (s.includes('sample in progress')) {
      return { bg: '#E0F2FE', text: '#0284C7' };
    }
    if (s.includes('test in process') || s.includes('in process')) {
      return { bg: '#FEF3C7', text: '#92400E' };
    }
    if (s.includes('results entered')) {
      return { bg: '#FEF9C3', text: '#854D0E' };
    }
    if (s.includes('report ready') || s.includes('ready') || s.includes('completed')) {
      return { bg: '#CCFBF1', text: '#0F766E' };
    }
    if (s.includes('acknowledged')) {
      return { bg: '#EEF2FF', text: '#4338CA' };
    }
    return { bg: '#F1F5F9', text: '#475569' };
  };

  const style = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
