// swastik-android/components/ReceptionistDrawer.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Overlay covers approximately 48-52% of screen width as shown in UI images 3 and 19
const DRAWER_WIDTH = Math.min(Math.max(SCREEN_WIDTH * 0.50, 260), 320);

export type ReceptionistScreenKey =
  | 'Dashboard'
  | 'Appointments'
  | 'NewRegistration'
  | 'PatientDirectory'
  | 'PatientSearch'
  | 'Admission'
  | 'RoomManagement'
  | 'Billing'
  | 'Notifications'
  | 'Metrics'
  | 'Profile';

interface ReceptionistDrawerProps {
  isOpen: boolean;
  activeScreen: ReceptionistScreenKey;
  onNavigate: (screen: ReceptionistScreenKey) => void;
  onClose: () => void;
  onLogout: () => void;
  receptionistName?: string;
}

export const ReceptionistDrawer: React.FC<ReceptionistDrawerProps> = ({
  isOpen,
  activeScreen,
  onNavigate,
  onClose,
  onLogout,
  receptionistName = 'Priya Sharma',
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

  if (!isOpen) {
    return null;
  }

  const menuItems: {
    key: ReceptionistScreenKey;
    label: string;
    iconType: 'feather' | 'material' | 'ionicons';
    iconName: any;
  }[] = [
    { key: 'Dashboard', label: 'Dashboard', iconType: 'feather', iconName: 'home' },
    { key: 'Appointments', label: 'Appointments', iconType: 'feather', iconName: 'calendar' },
    { key: 'NewRegistration', label: 'New Registration', iconType: 'feather', iconName: 'user-plus' },
    { key: 'PatientDirectory', label: 'Patient List', iconType: 'feather', iconName: 'users' },
    { key: 'PatientSearch', label: 'Patient Portal', iconType: 'feather', iconName: 'monitor' },
    { key: 'Admission', label: 'Admission', iconType: 'material', iconName: 'bed' },
    { key: 'RoomManagement', label: 'Live Bed & Rooms', iconType: 'material', iconName: 'door' },
    { key: 'Billing', label: 'Billing', iconType: 'material', iconName: 'file-document-outline' },
    { key: 'Notifications', label: 'Notifications', iconType: 'feather', iconName: 'bell' },
    { key: 'Metrics', label: 'Daily Metrics', iconType: 'feather', iconName: 'activity' },
    { key: 'Profile', label: 'My Profile & Settings', iconType: 'feather', iconName: 'user' },
  ];

  const renderIcon = (type: string, name: string, color: string) => {
    if (type === 'material') {
      return <MaterialCommunityIcons name={name as any} size={20} color={color} />;
    }
    if (type === 'ionicons') {
      return <Ionicons name={name as any} size={20} color={color} />;
    }
    return <Feather name={name as any} size={20} color={color} />;
  };

  return (
    <View style={styles.overlayContainer}>
      {/* Dimmed Scrim Backdrop (tapping closes drawer) */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.scrim, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sliding Drawer Container */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            transform: [{ translateX: slideAnim }],
            paddingTop: insets.top > 0 ? insets.top : Platform.OS === 'android' ? 16 : 24,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image
              source={require('../assets/swastik_brand_header_transparent.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Menu Items List */}
        <ScrollView
          style={styles.menuScroll}
          contentContainerStyle={styles.menuContent}
          showsVerticalScrollIndicator={false}
        >
          {menuItems.map((item) => {
            const isActive = activeScreen === item.key;
            const iconColor = isActive ? '#0D9488' : '#64748B';
            const textColor = isActive ? '#0D9488' : '#334155';

            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.menuItem, isActive && styles.activeMenuItem]}
                onPress={() => {
                  onNavigate(item.key);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.iconBox, isActive && styles.activeIconBox]}>
                    {renderIcon(item.iconType, item.iconName, iconColor)}
                  </View>
                  <Text
                    style={[styles.menuItemLabel, { color: textColor }, isActive && styles.activeLabel]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={isActive ? '#0D9488' : '#94A3B8'}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Profile and Logout Footer */}
        <View style={styles.footer}>
          {/* Receptionist Profile Card */}
          <TouchableOpacity
            style={styles.profileCard}
            activeOpacity={0.7}
            onPress={() => {
              onNavigate('Profile');
              onClose();
            }}
          >
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={18} color="#0D9488" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {receptionistName}
              </Text>
              <Text style={styles.profileRole}>Receptionist • View Profile</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Logout Action */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <View style={styles.logoutLeft}>
              <View style={styles.logoutIconBox}>
                <Feather name="log-out" size={18} color="#EF4444" />
              </View>
              <Text style={styles.logoutText}>Logout</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill as any,
    zIndex: 9999,
    flexDirection: 'row',
  },
  scrim: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  drawer: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logoRow: {
    height: 44,
    justifyContent: 'center',
  },
  brandLogo: {
    width: 140,
    height: 38,
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 2,
  },
  activeMenuItem: {
    backgroundColor: '#E6F4F1',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activeIconBox: {
    backgroundColor: '#D1EDE8',
  },
  menuItemLabel: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  activeLabel: {
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  profileRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  logoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutIconBox: {
    marginRight: 10,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
});
