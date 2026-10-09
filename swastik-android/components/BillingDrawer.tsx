// swastik-android/components/BillingDrawer.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.54;

export type BillingScreenKey =
  | 'Dashboard'
  | 'Invoices'
  | 'CreateInvoice'
  | 'Payments'
  | 'Patients'
  | 'Reports'
  | 'Settings';

interface BillingDrawerProps {
  isOpen: boolean;
  activeScreen: BillingScreenKey;
  onNavigate: (screenKey: BillingScreenKey) => void;
  onClose: () => void;
  onLogout: () => void;
  deptName?: string;
}

export const BillingDrawer: React.FC<BillingDrawerProps> = ({
  isOpen,
  activeScreen,
  onNavigate,
  onClose,
  onLogout,
  deptName = 'Billing Dept',
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const menuItems: { key: BillingScreenKey; label: string; iconFamily: string; iconName: string }[] = [
    { key: 'Dashboard', label: 'Dashboard', iconFamily: 'ionicons', iconName: 'home-outline' },
    { key: 'Invoices', label: 'Invoices', iconFamily: 'ionicons', iconName: 'document-text-outline' },
    { key: 'CreateInvoice', label: 'Create Invoice', iconFamily: 'ionicons', iconName: 'document-attach-outline' },
    { key: 'Payments', label: 'Payments', iconFamily: 'ionicons', iconName: 'card-outline' },
    { key: 'Patients', label: 'Patients', iconFamily: 'ionicons', iconName: 'people-outline' },
    { key: 'Reports', label: 'Reports', iconFamily: 'feather', iconName: 'bar-chart-2' },
    { key: 'Settings', label: 'Settings', iconFamily: 'feather', iconName: 'settings' },
  ];

  if (!isOpen && (slideAnim as any)._value === -DRAWER_WIDTH) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill as any} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Scrim */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.scrim, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 16 : 24),
            paddingBottom: Math.max(insets.bottom, 20),
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Swastik Branding Top */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../assets/swastik_large_brand_transparent.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        {/* Menu Items */}
        <View style={styles.navSection}>
          {menuItems.map((item) => {
            const isActive = activeScreen === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                activeOpacity={0.7}
                onPress={() => {
                  onNavigate(item.key);
                  onClose();
                }}
              >
                {isActive && <View style={styles.activePill} />}
                <View style={[styles.menuIconCircle, isActive && styles.menuIconCircleActive]}>
                  {item.iconFamily === 'ionicons' && (
                    <Ionicons
                      name={item.iconName as any}
                      size={20}
                      color={isActive ? '#0F766E' : '#64748B'}
                    />
                  )}
                  {item.iconFamily === 'feather' && (
                    <Feather
                      name={item.iconName as any}
                      size={19}
                      color={isActive ? '#0F766E' : '#64748B'}
                    />
                  )}
                </View>
                <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Profile & Logout */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.profileRow}
            activeOpacity={0.7}
            onPress={() => {
              onNavigate('Settings');
              onClose();
            }}
          >
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={18} color="#0F766E" />
            </View>
            <View style={styles.profileTextCol}>
              <Text style={styles.profileName} numberOfLines={1}>
                {deptName}
              </Text>
              <Text style={styles.profileDept}>Finance • View Profile</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.7} onPress={onLogout}>
            <Feather name="log-out" size={18} color="#0F766E" />
            <Text style={styles.logoutLabel}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  scrim: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    zIndex: 998,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  brandContainer: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  brandLogo: {
    width: 140,
    height: 42,
  },
  navSection: {
    flex: 1,
    gap: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: '#E8F5F4',
  },
  activePill: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3.5,
    backgroundColor: '#0F766E',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  menuIconCircleActive: {
    backgroundColor: '#CCFBF1',
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  menuLabelActive: {
    color: '#0F766E',
    fontWeight: '800',
  },
  bottomSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
    gap: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextCol: {
    flex: 1,
  },
  profileName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  profileDept: {
    fontSize: 11,
    color: '#64748B',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  logoutLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
});
