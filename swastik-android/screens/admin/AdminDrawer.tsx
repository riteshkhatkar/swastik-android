// swastik-android/screens/admin/AdminDrawer.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.82, 330);

export type AdminScreenKey =
  | 'Overview'
  | 'Users'
  | 'Departments'
  | 'Financials'
  | 'LabMonitoring'
  | 'Configuration'
  | 'AuditLogs'
  | 'SystemHealth'
  | 'Reports';

interface AdminDrawerProps {
  isOpen: boolean;
  activeScreen: AdminScreenKey;
  onNavigate: (screen: AdminScreenKey) => void;
  onClose: () => void;
  onLogout: () => void;
  adminName?: string;
}

interface MenuItem {
  key: AdminScreenKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'Overview', label: 'Hospital Overview', icon: 'home-outline' },
  { key: 'Users', label: 'User Management', icon: 'people-outline' },
  { key: 'Departments', label: 'Departments', icon: 'business-outline' },
  { key: 'Financials', label: 'Financials', icon: 'receipt-outline' },
  { key: 'LabMonitoring', label: 'Lab Monitoring', icon: 'flask-outline' },
  { key: 'Configuration', label: 'Configuration', icon: 'settings-outline' },
  { key: 'AuditLogs', label: 'Audit Logs', icon: 'shield-checkmark-outline' },
  { key: 'SystemHealth', label: 'System Health', icon: 'pulse-outline' },
  { key: 'Reports', label: 'Reports', icon: 'stats-chart-outline' },
];

export const AdminDrawer: React.FC<AdminDrawerProps> = ({
  isOpen,
  activeScreen,
  onNavigate,
  onClose,
  onLogout,
  adminName = 'System Admin',
}) => {
  const insets = useSafeAreaInsets();

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop touch to close */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Drawer Content */}
        <View style={[styles.drawerContainer, { paddingTop: Math.max(insets.top, 16) }]}>
          {/* Header branding */}
          <View style={styles.brandHeader}>
            <Image
              source={require('../../assets/swastik_large_brand_transparent.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>

          {/* Navigation Items List */}
          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={styles.menuScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {MENU_ITEMS.map((item) => {
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
                  {/* Left indicator stripe for active item */}
                  {isActive && <View style={styles.activeIndicator} />}

                  <View
                    style={[
                      styles.iconBox,
                      isActive ? styles.iconBoxActive : styles.iconBoxInactive,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={isActive ? '#0F766E' : '#64748B'}
                    />
                  </View>

                  <Text
                    style={[
                      styles.menuLabel,
                      isActive ? styles.menuLabelActive : styles.menuLabelInactive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer User Info & Logout */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.userProfileRow}>
              <View style={styles.userAvatar}>
                <Ionicons name="person-outline" size={20} color="#0F766E" />
              </View>
              <View style={styles.userMeta}>
                <Text style={styles.userName}>{adminName}</Text>
                <Text style={styles.userRole}>Administrator</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                onLogout();
              }}
            >
              <View style={styles.logoutIconBox}>
                <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              </View>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
    zIndex: 100,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  brandHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'flex-start',
  },
  brandLogo: {
    width: 170,
    height: 48,
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: '#F0FDFA',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 4,
    backgroundColor: '#0F766E',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconBoxActive: {
    backgroundColor: '#CCFBF1',
  },
  iconBoxInactive: {
    backgroundColor: '#F8FAFC',
  },
  menuLabel: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  menuLabelActive: {
    fontWeight: '800',
    color: '#0F766E',
  },
  menuLabelInactive: {
    fontWeight: '600',
    color: '#334155',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  userRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  logoutIconBox: {
    marginRight: 10,
  },
  logoutText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#DC2626',
  },
});
