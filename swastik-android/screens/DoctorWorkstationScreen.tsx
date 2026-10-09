// swastik-android/screens/DoctorWorkstationScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { MetricCard } from '../components/MetricCard';
import { EmptyState } from '../components/EmptyState';
import { DoctorScreenKey } from '../components/NavigationDrawer';
import { appointmentApi, patientApi } from '../services/api';

const { width } = Dimensions.get('window');

interface DoctorWorkstationScreenProps {
  onOpenDrawer: () => void;
  onNavigate: (screen: DoctorScreenKey, patientData?: any) => void;
}

export const DoctorWorkstationScreen: React.FC<DoctorWorkstationScreenProps> = ({
  onOpenDrawer,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'opd' | 'ipd'>('opd');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    highRiskPatients: 0,
    pendingFollowUps: 0,
  });

  useEffect(() => {
    loadWorkstationData();
  }, []);

  const loadWorkstationData = async () => {
    try {
      setLoading(true);
      // Fetch real appointments from database
      const apts = await appointmentApi.getAppointments();
      if (apts && Array.isArray(apts)) {
        setAppointments(apts);
        setStats({
          todayAppointments: apts.length,
          highRiskPatients: apts.filter((a) => a.priority === 'urgent' || a.priority === 'high').length,
          pendingFollowUps: apts.filter((a) => a.status === 'scheduled').length,
        });
      }
    } catch (err) {
      console.log('Error fetching live workstation data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkstationData();
  };

  const handleTabPress = (tab: 'opd' | 'ipd') => {
    setActiveTab(tab);
    if (tab === 'ipd') {
      onNavigate('WardRounds');
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Header with Hamburger and Swastik Logo (NO back button) */}
      <AppHeader onOpenDrawer={onOpenDrawer} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        {/* Title and OPD/IPD toggle row */}
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Doctor Workstation</Text>

          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'opd' && styles.toggleBtnActive]}
              activeOpacity={0.7}
              onPress={() => handleTabPress('opd')}
            >
              <Text
                style={[
                  styles.toggleText,
                  activeTab === 'opd' && styles.toggleTextActive,
                ]}
              >
                OPD Clinic
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'ipd' && styles.toggleBtnActive]}
              activeOpacity={0.7}
              onPress={() => handleTabPress('ipd')}
            >
              <Text
                style={[
                  styles.toggleText,
                  activeTab === 'ipd' && styles.toggleTextActive,
                ]}
              >
                Ward Rounds (IPD)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3 Metric Cards Row */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="Today's Appointments"
            value={stats.todayAppointments}
            iconName="calendar"
          />
          <MetricCard
            label="High Risk Patients"
            value={stats.highRiskPatients}
            iconName="alert-triangle"
          />
          <MetricCard
            label="Pending Follow-ups"
            value={stats.pendingFollowUps}
            iconName="clock"
          />
        </View>

        {/* Today's Appointment Schedule Card */}
        <View style={styles.scheduleCard}>
          <Text style={styles.cardHeaderTitle}>Today's Appointment Schedule</Text>

          {/* Table Container */}
          <View style={styles.tableWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tableInner}>
                {/* Table Header Row */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thText, { width: 85 }]}>TIME</Text>
                  <Text style={[styles.thText, { width: 150 }]}>PATIENT</Text>
                  <Text style={[styles.thText, { width: 140 }]}>UHID</Text>
                  <Text style={[styles.thText, { width: 130 }]}>TYPE</Text>
                  <Text style={[styles.thText, { width: 110 }]}>RISK STATUS</Text>
                  <Text style={[styles.thText, { width: 90 }]}>ACTION</Text>
                </View>

                {/* Table Body or Empty State */}
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#1A7B76" />
                  </View>
                ) : appointments.length === 0 ? (
                  <View style={{ width: Math.max(width - 48, 705) }}>
                    <EmptyState
                      iconType="calendar"
                      message="No appointments scheduled for today."
                    />
                  </View>
                ) : (
                  appointments.map((apt, index) => (
                    <View key={apt._id || apt.id || index} style={styles.tableRow}>
                      <Text style={[styles.tdText, { width: 85, fontWeight: '600' }]}>
                        {apt.appointment_time || apt.time || '09:30 AM'}
                      </Text>
                      <Text style={[styles.tdBold, { width: 150 }]} numberOfLines={1}>
                        {apt.patient_name || apt.patientName || 'Patient'}
                      </Text>
                      <Text style={[styles.tdText, { width: 140 }]} numberOfLines={1}>
                        {apt.uhid || '—'}
                      </Text>
                      <Text style={[styles.tdText, { width: 130 }]} numberOfLines={1}>
                        {apt.type || 'Consultation'}
                      </Text>
                      <View style={{ width: 110 }}>
                        <View style={styles.normalRiskBadge}>
                          <Text style={styles.normalRiskText}>Normal</Text>
                        </View>
                      </View>
                      <View style={{ width: 90 }}>
                        <TouchableOpacity
                          style={styles.openBtn}
                          activeOpacity={0.8}
                          onPress={() =>
                            onNavigate('NewConsultation', {
                              name: apt.patient_name || apt.patientName,
                              uhid: apt.uhid,
                              age: apt.age || 30,
                              gender: apt.gender || 'General',
                            })
                          }
                        >
                          <Text style={styles.openBtnText}>Open EMR</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F1E36',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1A7B76',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#1A7B76',
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    paddingTop: 16,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1E36',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  tableWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tableInner: {
    minWidth: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  tdText: {
    fontSize: 12,
    color: '#475569',
  },
  tdBold: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  normalRiskBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  normalRiskText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
  },
  openBtn: {
    backgroundColor: '#1A7B76',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
  },
  openBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
});
