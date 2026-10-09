// swastik-android/screens/receptionist/ReceptionistMetricsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';

interface ReceptionistMetricsScreenProps {
  onOpenDrawer: () => void;
  onNavigateToModule?: (key: string) => void;
}

export const ReceptionistMetricsScreen: React.FC<ReceptionistMetricsScreenProps> = ({
  onOpenDrawer,
  onNavigateToModule,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const receptionistName = user?.full_name || 'Priya Sharma';

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
      >
        {/* Title Section matching Image 21 */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Daily Patient Metrics</Text>
          <Text style={styles.subTitle}>
            Real-time overview of patient flow and critical updates.
          </Text>
        </View>

        {/* 6 Metric Cards Grid matching Image 21 */}
        <View style={styles.metricsGrid}>
          {/* Card 1: New Registrations */}
          <View style={styles.metricCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.iconCircle}>
                <Feather name="file-text" size={18} color="#0D9488" />
              </View>
            </View>
            <Text style={styles.cardTitle}>New Registrations</Text>
            <Text style={styles.cardValue}>6</Text>
            <View style={styles.trendRow}>
              <Feather name="trending-up" size={14} color="#059669" />
              <Text style={styles.trendTextPositive}>+20% vs. yesterday</Text>
            </View>
          </View>

          {/* Card 2: Walk-ins */}
          <View style={styles.metricCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="walk" size={20} color="#0D9488" />
              </View>
            </View>
            <Text style={styles.cardTitle}>Walk-ins</Text>
            <Text style={styles.cardValue}>12</Text>
            <View style={styles.trendRow}>
              <Feather name="trending-up" size={14} color="#059669" />
              <Text style={styles.trendTextPositive}>+33% vs. yesterday</Text>
            </View>
          </View>

          {/* Card 3: Follow-ups */}
          <View style={styles.metricCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.iconCircle}>
                <Feather name="users" size={18} color="#0D9488" />
              </View>
            </View>
            <Text style={styles.cardTitle}>Follow-ups</Text>
            <Text style={styles.cardValue}>8</Text>
            <View style={styles.trendRow}>
              <Feather name="trending-up" size={14} color="#059669" />
              <Text style={styles.trendTextPositive}>+14% vs. yesterday</Text>
            </View>
          </View>

          {/* Card 4: Critical Alerts */}
          <View style={[styles.metricCard, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
            <View style={styles.cardTopRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Feather name="alert-triangle" size={18} color="#DC2626" />
              </View>
            </View>
            <Text style={[styles.cardTitle, { color: '#991B1B' }]}>Critical Alerts</Text>
            <Text style={[styles.cardValue, { color: '#DC2626' }]}>3</Text>
            <View style={styles.trendRow}>
              <Feather name="trending-up" size={14} color="#DC2626" />
              <Text style={styles.trendTextNegative}>+200% vs. yesterday</Text>
            </View>
          </View>

          {/* Card 5: Average Wait Time */}
          <View style={styles.metricCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.iconCircle}>
                <Feather name="clock" size={18} color="#0D9488" />
              </View>
            </View>
            <Text style={styles.cardTitle}>Average Wait Time</Text>
            <Text style={styles.cardValue}>18 min</Text>
            <View style={styles.trendRow}>
              <Feather name="trending-down" size={14} color="#059669" />
              <Text style={styles.trendTextPositive}>-25% vs. yesterday</Text>
            </View>
          </View>

          {/* Card 6: Emergency Escalations */}
          <View style={styles.metricCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="ambulance" size={20} color="#0D9488" />
              </View>
            </View>
            <Text style={styles.cardTitle}>Emergency Escalations</Text>
            <Text style={styles.cardValue}>2</Text>
            <View style={styles.trendRow}>
              <Feather name="trending-up" size={14} color="#D97706" />
              <Text style={[styles.trendTextPositive, { color: '#D97706' }]}>+100% vs. yesterday</Text>
            </View>
          </View>
        </View>

        {/* Crisis Management Section matching Image 21 */}
        <View style={styles.crisisSection}>
          <View style={styles.crisisHeaderRow}>
            <View style={styles.crisisHeaderLeft}>
              <View style={styles.crisisIconBox}>
                <Feather name="bell" size={18} color="#DC2626" />
              </View>
              <View>
                <Text style={styles.crisisSectionTitle}>Crisis Management</Text>
                <Text style={styles.crisisSectionSub}>
                  High priority items that need immediate attention.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.crisisViewAllBtn}
              onPress={() => Alert.alert('Crisis Management', 'Viewing all 3 active front-desk alerts.')}
            >
              <Text style={styles.crisisViewAllText}>View All (3)</Text>
              <Feather name="chevron-right" size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>

          {/* Alert Item 1: Psychiatric Crisis */}
          <TouchableOpacity
            style={[styles.alertCard, styles.alertCardRed]}
            onPress={() => {
              Alert.alert(
                'Psychiatric Crisis Alert 🚨',
                'Patient in acute distress at OPD triage. Psychiatry emergency team Dr. P. M. Chougule notified.'
              );
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.alertIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="brain" size={20} color="#DC2626" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Psychiatric Crisis</Text>
              <Text style={styles.alertDesc}>
                Patient showing signs of acute distress. Requires immediate assessment.
              </Text>
              <Text style={styles.alertTime}>10:30 AM</Text>
            </View>
            <View style={styles.alertRight}>
              <View style={[styles.alertBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.alertBadgeText, { color: '#DC2626' }]}>HIGH</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          {/* Alert Item 2: Emergency Bed Request */}
          <TouchableOpacity
            style={[styles.alertCard, styles.alertCardAmber]}
            onPress={() => {
              if (onNavigateToModule) {
                onNavigateToModule('Admission');
              } else {
                Alert.alert('Emergency Bed Request', 'Directing to Ward / Bed allocation.');
              }
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.alertIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="bed" size={20} color="#D97706" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Emergency Bed Request</Text>
              <Text style={styles.alertDesc}>
                ER patient requires immediate ward allocation.
              </Text>
              <Text style={styles.alertTime}>09:45 AM</Text>
            </View>
            <View style={styles.alertRight}>
              <View style={[styles.alertBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.alertBadgeText, { color: '#D97706' }]}>MEDIUM</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          {/* Alert Item 3: Doctor Not Available */}
          <TouchableOpacity
            style={[styles.alertCard, styles.alertCardBlue]}
            onPress={() => {
              Alert.alert('Doctor Schedule Alert', 'Dr. P. M. Chougule is in emergency rounds. Pending appointments notified.');
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.alertIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Feather name="user-x" size={20} color="#0284C7" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Doctor Not Available</Text>
              <Text style={styles.alertDesc}>
                Dr. P. M. Chougule is currently out of office. Reassign pending consultations.
              </Text>
              <Text style={styles.alertTime}>09:20 AM</Text>
            </View>
            <View style={styles.alertRight}>
              <View style={[styles.alertBadge, { backgroundColor: '#E0F2FE' }]}>
                <Text style={[styles.alertBadgeText, { color: '#0284C7' }]}>INFO</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
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
  titleSection: {
    marginBottom: 16,
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
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
    marginBottom: 6,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendTextPositive: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 4,
  },
  trendTextNegative: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 4,
  },
  crisisSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  crisisHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  crisisHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  crisisIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  crisisSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  crisisSectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  crisisViewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  crisisViewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginRight: 2,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 4,
  },
  alertCardRed: {
    borderLeftColor: '#DC2626',
  },
  alertCardAmber: {
    borderLeftColor: '#D97706',
  },
  alertCardBlue: {
    borderLeftColor: '#0284C7',
  },
  alertIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  alertDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  alertTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  alertRight: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 8,
  },
  alertBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  alertBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
