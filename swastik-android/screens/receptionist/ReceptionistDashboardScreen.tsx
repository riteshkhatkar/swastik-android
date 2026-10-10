// swastik-android/screens/receptionist/ReceptionistDashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { receptionistApi } from '../../services/api';
import { ReceptionistScreenKey } from '../../components/ReceptionistDrawer';
import { useAuthStore } from '../../store/authStore';

interface ReceptionistDashboardScreenProps {
  onOpenDrawer: () => void;
  onNavigate: (screen: ReceptionistScreenKey) => void;
}

export const ReceptionistDashboardScreen: React.FC<ReceptionistDashboardScreenProps> = ({
  onOpenDrawer,
  onNavigate,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const receptionistName = user?.full_name || 'Priya Sharma';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live state
  const [counts, setCounts] = useState({
    registrations: 0,
    appointments: 0,
    waitingQueue: 0,
    inConsultation: 0,
  });

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [inpatientStats, setInpatientStats] = useState({
    total: 0,
    icu: 0,
    ward: 0,
    critical: 0,
  });

  const loadData = async () => {
    try {
      const [countsData, appointmentsData, admissionsData] = await Promise.all([
        receptionistApi.getDashboardCounts().catch(() => null),
        receptionistApi.getAppointments().catch(() => []),
        receptionistApi.getAdmissions().catch(() => []),
      ]);

      const aptList = Array.isArray(appointmentsData) ? appointmentsData : [];
      const admList = Array.isArray(admissionsData) ? admissionsData : [];

      // Calculate dynamic counts from real data
      const scheduled = aptList.filter((a) => a.status === 'scheduled' || a.status === 'pending');
      const inConsult = aptList.filter((a) => a.status === 'in_consultation' || a.status === 'checked_in');

      setCounts({
        registrations: countsData?.patients ?? 0,
        appointments: countsData?.appointments ?? aptList.length,
        waitingQueue: scheduled.length,
        inConsultation: inConsult.length,
      });

      // Populate pending requests
      setPendingRequests(scheduled.slice(0, 5));

      // Populate inpatient stats from real admissions
      const icu = admList.filter((a) => a.ward?.toLowerCase().includes('icu')).length;
      const critical = admList.filter(
        (a) => a.clinical_status === 'Critical' || a.admission_type === 'Emergency'
      ).length;
      setInpatientStats({
        total: admList.length,
        icu: icu,
        ward: Math.max(admList.length - icu, 0),
        critical: critical,
      });
    } catch (e) {
      console.warn('Dashboard load failed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <View style={styles.container}>
      {/* Global Doctor/Receptionist Header */}
      <View
        style={[
          styles.headerContainer,
          { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 20) },
        ]}
      >
        <View style={styles.topRow}>
          {/* Hamburger Menu */}
          <TouchableOpacity
            onPress={onOpenDrawer}
            style={styles.hamburgerButton}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={26} color="#1E293B" />
          </TouchableOpacity>

          {/* Swastik Hospital Logo */}
          <Image
            source={require('../../assets/swastik_brand_header_transparent.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />

          {/* Right Profile Pill */}
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
        {/* Title & Subtitle */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Reception Control Tower</Text>
          <Text style={styles.subTitle}>
            Manage registrations, appointments and patient services.
          </Text>
        </View>

        {/* 4 Stat Cards Grid (Row of 4) */}
        <View style={styles.statsRow}>
          {/* Stat 1: Registrations */}
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Feather name="file-plus" size={18} color="#0D9488" />
            </View>
            <Text style={styles.statCount}>{counts.registrations}</Text>
            <Text style={styles.statLabel}>Today's</Text>
            <Text style={styles.statSubLabel}>Registrations</Text>
          </View>

          {/* Stat 2: Appointments */}
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Feather name="calendar" size={18} color="#0D9488" />
            </View>
            <Text style={styles.statCount}>{counts.appointments}</Text>
            <Text style={styles.statLabel}>Today's</Text>
            <Text style={styles.statSubLabel}>Appointments</Text>
          </View>

          {/* Stat 3: Waiting in Queue */}
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Feather name="users" size={18} color="#0D9488" />
            </View>
            <Text style={styles.statCount}>{counts.waitingQueue}</Text>
            <Text style={styles.statLabel}>Waiting</Text>
            <Text style={styles.statSubLabel}>in Queue</Text>
          </View>

          {/* Stat 4: In Consultation */}
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <FontAwesome5 name="stethoscope" size={16} color="#0D9488" />
            </View>
            <Text style={styles.statCount}>{counts.inConsultation}</Text>
            <Text style={styles.statLabel}>In</Text>
            <Text style={styles.statSubLabel}>Consultation</Text>
          </View>
        </View>

        {/* Quick Actions Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionSubtitle}>Common tasks for receptionist operations.</Text>

          <View style={styles.quickActionsGrid}>
            {/* Action 1: New Registration */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => onNavigate('NewRegistration')}
              activeOpacity={0.75}
            >
              <View style={styles.actionIconCircle}>
                <Feather name="user-plus" size={20} color="#0D9488" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>New Registration</Text>
                <Text style={styles.actionDesc}>Register a new patient</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Action 2: Book Appointment */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => onNavigate('Appointments')}
              activeOpacity={0.75}
            >
              <View style={styles.actionIconCircle}>
                <Feather name="calendar" size={20} color="#0D9488" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Book Appointment</Text>
                <Text style={styles.actionDesc}>Schedule a patient visit</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Action 3: Patient Search */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => onNavigate('PatientSearch')}
              activeOpacity={0.75}
            >
              <View style={styles.actionIconCircle}>
                <Feather name="search" size={20} color="#0D9488" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Patient Search</Text>
                <Text style={styles.actionDesc}>Find patient records</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Action 4: Billing */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => onNavigate('Billing')}
              activeOpacity={0.75}
            >
              <View style={styles.actionIconCircle}>
                <MaterialCommunityIcons name="currency-inr" size={22} color="#0D9488" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Billing</Text>
                <Text style={styles.actionDesc}>Create bill or collect payments</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Appointment Requests Section */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardHeaderIcon}>
                <Feather name="calendar" size={18} color="#0D9488" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Pending Appointment Requests</Text>
                <Text style={styles.sectionSubtitle}>
                  Requests from patients awaiting confirmation.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => onNavigate('Appointments')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Feather name="chevron-right" size={14} color="#0D9488" />
            </TouchableOpacity>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thText, { flex: 2 }]}>PATIENT NAME</Text>
            <Text style={[styles.thText, { flex: 2 }]}>REQUESTED DOCTOR</Text>
            <Text style={[styles.thText, { flex: 2 }]}>DATE & TIME</Text>
            <Text style={[styles.thText, { flex: 1.5, textAlign: 'right' }]}>STATUS</Text>
          </View>

          {/* Table Rows */}
          {pendingRequests.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Feather name="check-circle" size={24} color="#94A3B8" style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 13, color: '#64748B' }}>No pending appointment requests</Text>
            </View>
          ) : (
            pendingRequests.map((item, idx) => (
              <TouchableOpacity
                key={item.id || idx}
                style={styles.tableRow}
                onPress={() => onNavigate('Appointments')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tdBold, { flex: 2 }]} numberOfLines={1}>
                  {item.patient_name || item.name || 'Patient'}
                </Text>
                <Text style={[styles.tdText, { flex: 2 }]} numberOfLines={1}>
                  {item.doctor_name || 'Assigned Doctor'}
                </Text>
                <Text style={[styles.tdMuted, { flex: 2 }]} numberOfLines={1}>
                  {item.appointment_date || '-'} {item.appointment_time || item.time || ''}
                </Text>
                <View style={[styles.statusCell, { flex: 1.5 }]}>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>PENDING</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color="#94A3B8" style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Live Inpatient Tracking Section */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardHeaderIcon}>
                <MaterialCommunityIcons name="bed" size={20} color="#0D9488" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Live Inpatient Tracking</Text>
                <Text style={styles.sectionSubtitle}>
                  Real-time status of admitted patients.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => onNavigate('Admission')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Feather name="chevron-right" size={14} color="#0D9488" />
            </TouchableOpacity>
          </View>

          {/* 4 Inpatient Metric Boxes */}
          <View style={styles.inpatientGrid}>
            <View style={styles.inpatientMetricBox}>
              <View style={styles.inpatientIconCircle}>
                <MaterialCommunityIcons name="bed" size={18} color="#0D9488" />
              </View>
              <View>
                <Text style={styles.inpatientCount}>{inpatientStats.total}</Text>
                <Text style={styles.inpatientLabel}>Total Inpatients</Text>
              </View>
            </View>

            <View style={styles.inpatientMetricBox}>
              <View style={[styles.inpatientIconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Feather name="activity" size={18} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.inpatientCount}>{inpatientStats.icu}</Text>
                <Text style={styles.inpatientLabel}>In ICU</Text>
              </View>
            </View>

            <View style={styles.inpatientMetricBox}>
              <View style={[styles.inpatientIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="clock" size={18} color="#D97706" />
              </View>
              <View>
                <Text style={styles.inpatientCount}>{inpatientStats.ward}</Text>
                <Text style={styles.inpatientLabel}>In Ward</Text>
              </View>
            </View>

            <View style={[styles.inpatientMetricBox, { backgroundColor: '#FEF2F2' }]}>
              <View style={[styles.inpatientIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Feather name="alert-triangle" size={18} color="#DC2626" />
              </View>
              <View>
                <Text style={[styles.inpatientCount, { color: '#DC2626' }]}>
                  {inpatientStats.critical}
                </Text>
                <Text style={[styles.inpatientLabel, { color: '#991B1B' }]}>Critical Cases</Text>
              </View>
            </View>
          </View>
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  statSubLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  quickActionsGrid: {
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  viewAllText: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: '600',
    marginRight: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 6,
  },
  thText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  tdText: {
    fontSize: 11,
    color: '#334155',
  },
  tdMuted: {
    fontSize: 11,
    color: '#64748B',
  },
  statusCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
  },
  inpatientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inpatientMetricBox: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inpatientIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inpatientCount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  inpatientLabel: {
    fontSize: 11,
    color: '#64748B',
  },
});
