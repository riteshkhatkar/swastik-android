// swastik-android/screens/receptionist/ReceptionistNotificationsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { receptionistApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface ReceptionistNotificationsScreenProps {
  onOpenDrawer: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
}

export const ReceptionistNotificationsScreen: React.FC<ReceptionistNotificationsScreenProps> = ({
  onOpenDrawer,
  onNavigateToModule,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const receptionistName = user?.full_name || 'Priya Sharma';

  const [activeTab, setActiveTab] = useState<'All' | 'Unread' | 'Important'>('All');
  const [refreshing, setRefreshing] = useState(false);

  // Notifications List matching Image 15
  const [notifications, setNotifications] = useState<any[]>([
    {
      id: '1',
      title: "Today's Appointments",
      description: 'You have 6 appointments scheduled today. First appointment at 09:00 AM.',
      time: '10 min ago',
      iconType: 'calendar',
      isUnread: true,
      badge: null,
      module: 'Appointments',
    },
    {
      id: '2',
      title: 'New Patient Registration',
      description: 'A new patient registration is pending review and completion.',
      time: '25 min ago',
      iconType: 'user-plus',
      isUnread: true,
      badge: { label: 'Important', type: 'important' },
      module: 'NewRegistration',
    },
    {
      id: '3',
      title: 'Admission Created',
      description: 'Admission for Virat Kohli has been created successfully (IPD-2024-0007).',
      time: '1 hour ago',
      iconType: 'file-text',
      isUnread: false,
      badge: { label: 'Success', type: 'success' },
      module: 'Admission',
    },
    {
      id: '4',
      title: 'Payment Pending',
      description: '₹600.00 payment is pending for UHID: SWASTIK-2024-0005.',
      time: '2 hours ago',
      iconType: 'credit-card',
      isUnread: true,
      badge: { label: 'Payment Due', type: 'warning' },
      module: 'Billing',
    },
    {
      id: '5',
      title: 'Lab Report Ready',
      description: 'Lab report for Rohit Sharma is now available. (LBR-2024-0012)',
      time: '3 hours ago',
      iconType: 'flask',
      isUnread: false,
      badge: null,
      module: 'PatientSearch',
    },
    {
      id: '6',
      title: 'Follow-up Reminder',
      description: 'A follow-up is due for Atharva Bembane tomorrow (10 Oct 2024).',
      time: '5 hours ago',
      iconType: 'calendar-check',
      isUnread: false,
      badge: { label: 'Reminder', type: 'info' },
      module: 'Appointments',
    },
  ]);

  const loadNotifications = async () => {
    try {
      const data = await receptionistApi.getNotifications();
      if (Array.isArray(data) && data.length > 0) {
        setNotifications(data);
      }
    } catch {
      // baseline preserved
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    Alert.alert('Marked as Read', 'All front-desk notifications marked as read.');
  };

  const handleNotificationPress = (item: any) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isUnread: false } : n))
    );
    if (onNavigateToModule && item.module) {
      onNavigateToModule(item.module);
    } else {
      Alert.alert(item.title, item.description);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'Unread') return n.isUnread;
    if (activeTab === 'Important') return n.badge?.type === 'important';
    return true;
  });

  const renderIcon = (type: string) => {
    switch (type) {
      case 'calendar':
        return <Feather name="calendar" size={18} color="#0D9488" />;
      case 'user-plus':
        return <Feather name="user-plus" size={18} color="#0D9488" />;
      case 'file-text':
        return <Feather name="file-text" size={18} color="#0D9488" />;
      case 'credit-card':
        return <Feather name="credit-card" size={18} color="#0D9488" />;
      case 'flask':
        return <MaterialCommunityIcons name="flask-outline" size={20} color="#0D9488" />;
      default:
        return <Feather name="clock" size={18} color="#0D9488" />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Global Header */}
      <View
        style={[
          styles.headerContainer,
          { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 20) },
        ]}
      >

        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={onOpenDrawer}
            style={styles.hamburgerButton}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={26} color="#1E293B" />
          </TouchableOpacity>

          <Image
            source={require('../../assets/swastik_brand_header_transparent.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />

          <View style={styles.profilePill}>
            <View style={styles.profileAvatarMini}>
              <Ionicons name="person" size={14} color="#0D9488" />
            </View>
            <View>
              <Text style={styles.profilePillName} numberOfLines={1}>
                {receptionistName}
              </Text>
              <Text style={styles.profilePillRole}>Receptionist</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
        }
      >
        {/* Title Section matching Image 15 */}
        <View style={styles.headerInfoSection}>
          <View style={styles.bellIconCircle}>
            <Feather name="bell" size={28} color="#0D9488" />
          </View>
          <Text style={styles.mainTitle}>Notifications Center</Text>
          <Text style={styles.subTitle}>
            Review alerts and front-desk updates.
          </Text>
        </View>

        {/* Filter Tabs + "Mark all as read" link */}
        <View style={styles.tabsActionRow}>
          <View style={styles.tabPillsGroup}>
            {(['All', 'Unread', 'Important'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[styles.tabPillText, activeTab === tab && styles.tabPillTextActive]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={styles.markAllReadText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Cards List matching Image 15 */}
        <View style={styles.notificationsList}>
          {filteredNotifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.notificationCard}
              onPress={() => handleNotificationPress(item)}
              activeOpacity={0.75}
            >
              {/* Category Icon */}
              <View style={styles.notifIconCircle}>{renderIcon(item.iconType)}</View>

              {/* Main Content */}
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifDesc}>{item.description}</Text>
                <View style={styles.notifMetaRow}>
                  <Feather name="clock" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                  <Text style={styles.notifTime}>{item.time}</Text>
                </View>
              </View>

              {/* Right Badges & Indicators */}
              <View style={styles.notifRightCol}>
                {item.badge && (
                  <View
                    style={[
                      styles.badgeBox,
                      item.badge.type === 'important' && styles.badgeImportant,
                      item.badge.type === 'success' && styles.badgeSuccess,
                      item.badge.type === 'warning' && styles.badgeWarning,
                      item.badge.type === 'info' && styles.badgeInfo,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        item.badge.type === 'important' && styles.badgeTextImportant,
                        item.badge.type === 'success' && styles.badgeTextSuccess,
                        item.badge.type === 'warning' && styles.badgeTextWarning,
                        item.badge.type === 'info' && styles.badgeTextInfo,
                      ]}
                    >
                      {item.badge.label}
                    </Text>
                  </View>
                )}

                <View style={styles.chevronDotRow}>
                  {item.isUnread && <View style={styles.unreadDot} />}
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  stethoscopeBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 250,
    height: 72,
    opacity: 0.95,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    zIndex: 2,
  },
  hamburgerButton: {
    padding: 6,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogo: {
    width: 155,
    height: 42,
  },
  profilePill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileAvatarMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  profilePillName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  profilePillRole: {
    fontSize: 9,
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerInfoSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bellIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  tabsActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabPillsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  tabPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  markAllReadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  notificationsList: {
    gap: 10,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  notifIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
    marginRight: 8,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  notifDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  notifMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  notifRightCol: {
    alignItems: 'flex-end',
    gap: 10,
  },
  badgeBox: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  badgeImportant: {
    backgroundColor: '#FEE2E2',
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeInfo: {
    backgroundColor: '#E0F2FE',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextImportant: {
    color: '#DC2626',
  },
  badgeTextSuccess: {
    color: '#059669',
  },
  badgeTextWarning: {
    color: '#D97706',
  },
  badgeTextInfo: {
    color: '#0284C7',
  },
  chevronDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0D9488',
    marginRight: 6,
  },
});
