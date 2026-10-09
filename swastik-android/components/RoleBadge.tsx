// mobile/components/RoleBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserRole } from '../types';
import { Colors } from '../constants/theme';

interface Props {
  role: UserRole;
  size?: 'small' | 'medium';
}

export const RoleBadge: React.FC<Props> = ({ role, size = 'medium' }) => {
  const roleStyle = Colors.roles[role] || Colors.roles.admin;
  const isSmall = size === 'small';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: roleStyle.bg, borderColor: roleStyle.border },
      isSmall && styles.badgeSmall
    ]}>
      <Text style={[
        styles.text,
        { color: roleStyle.text },
        isSmall && styles.textSmall
      ]}>
        {role.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textSmall: {
    fontSize: 9,
  },
});
