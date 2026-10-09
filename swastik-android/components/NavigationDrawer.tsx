// swastik-android/components/NavigationDrawer.tsx
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
// Overlay covers approximately 45-52% of screen width as requested in specification
const DRAWER_WIDTH = Math.min(Math.max(SCREEN_WIDTH * 0.48, 250), 320);

export type DoctorScreenKey =
  | 'Dashboard'
  | 'WardRounds'
  | 'TodayAppointments'
  | 'PatientList'
  | 'NewConsultation'
  | 'LabOrders'
  | 'Prescriptions'
  | 'Reports'
  | 'Settings';

interface NavigationDrawerProps {
  isOpen: boolean;
  activeScreen: DoctorScreenKey;
  onNavigate: (screen: DoctorScreenKey) => void;
  onClose: () => void;
  onLogout: () => void;
  doctorName?: string;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  activeScreen,
  onNavigate,
  onClose,
  onLogout,
  doctorName = 'Dr. P. M. Chougule',
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
    key: DoctorScreenKey;
    label: string;
    iconType: 'feather' | 'material' | 'ionicons';
    iconName: any;
  }[] = [
    { key: 'Dashboard', label: 'Dashboard', iconType: 'feather', iconName: 'home' },
    { key: 'WardRounds', label: 'Ward Rounds', iconType: 'material', iconName: 'bed' },
    { key: 'TodayAppointments', label: "Today's Appointments", iconType: 'feather', iconName: 'calendar' },
    { key: 'PatientList', label: 'Patient List', iconType: 'feather', iconName: 'users' },
    { key: 'NewConsultation', label: 'New Consultation', iconType: 'feather', iconName: 'file-plus' },
    { key: 'LabOrders', label: 'Lab Orders', iconType: 'material', iconName: 'flask-outline' },
    { key: 'Prescriptions', label: 'Prescriptions', iconType: 'material', iconName: 'pill' },
    { key: 'Reports', label: 'Reports', iconType: 'feather', iconName: 'bar-chart-2' },
    { key: 'Settings', label: 'Settings', iconType: 'feather', iconName: 'settings' },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Semi-transparent dimmed scrim over the current page */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.scrim,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.45],
              }),
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Drawer content sliding in from left */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            transform: [{ translateX: slideAnim }],
            paddingTop: Math.max(insets.top, 14),
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        {/* Drawer Header with Logo & Close X */}
        <View style={styles.header}>
          <Image
            source={require('../assets/swastik_brand_header_transparent.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Navigation Items List */}
        <ScrollView
          style={styles.menuList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuContent}
        >
          {menuItems.map((item) => {
            const isActive = activeScreen === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.menuItem, isActive && styles.activeMenuItem]}
                activeOpacity={0.7}
                onPress={() => {
                  onNavigate(item.key);
                  onClose();
                }}
              >
                <View style={styles.iconContainer}>
                  {item.iconType === 'feather' && (
                    <Feather
                      name={item.iconName}
                      size={20}
                      color={isActive ? '#1A7B76' : '#334155'}
                    />
                  )}
                  {item.iconType === 'material' && (
                    <MaterialCommunityIcons
                      name={item.iconName}
                      size={22}
                      color={isActive ? '#1A7B76' : '#334155'}
                    />
                  )}
                  {item.iconType === 'ionicons' && (
                    <Ionicons
                      name={item.iconName}
                      size={20}
                      color={isActive ? '#1A7B76' : '#334155'}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.menuText,
                    isActive ? styles.activeMenuText : styles.inactiveMenuText,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Footer: Doctor Profile & Logout Button */}
        <View style={styles.footer}>
          <View style={styles.divider} />
          
          {/* Profile row */}
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={20} color="#1A7B76" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.doctorName} numberOfLines={1}>
                {doctorName}
              </Text>
              <Text style={styles.roleText}>Doctor</Text>
            </View>
          </View>

          {/* Logout button */}
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.7}
            onPress={onLogout}
          >
            <Feather name="log-out" size={17} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 90,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logo: {
    width: 130,
    height: 36,
  },
  closeButton: {
    padding: 6,
  },
  menuList: {
    flex: 1,
  },
  menuContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  activeMenuItem: {
    backgroundColor: '#E8F5F4',
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  menuText: {
    fontSize: 14,
    flex: 1,
  },
  activeMenuText: {
    color: '#1A7B76',
    fontWeight: '700',
  },
  inactiveMenuText: {
    color: '#334155',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  profileInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  roleText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
});
