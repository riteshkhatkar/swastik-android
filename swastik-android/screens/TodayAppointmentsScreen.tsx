// swastik-android/screens/TodayAppointmentsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Colors } from '../constants/theme';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { appointmentApi } from '../services/api';

const { width } = Dimensions.get('window');

interface TodayAppointmentsScreenProps {
  onOpenDrawer: () => void;
  onOpenConsultation?: (appointment: any) => void;
}

export const TodayAppointmentsScreen: React.FC<TodayAppointmentsScreenProps> = ({
  onOpenDrawer,
  onOpenConsultation,
}) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await appointmentApi.getAppointments();
      if (res && Array.isArray(res)) {
        setAppointments(res);
      }
    } catch (err) {
      console.log('Error fetching appointments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  return (
    <View style={styles.root}>
      {/* Header with Hamburger & Swastik Logo (NO back button) */}
      <AppHeader onOpenDrawer={onOpenDrawer} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        {/* Screen Title */}
        <Text style={styles.screenTitle}>Today’s Appointments</Text>

        {/* Appointments Table Card */}
        <View style={styles.card}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tableInner}>
              {/* Table Header Row */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thText, { width: 85 }]}>TIME</Text>
                <Text style={[styles.thText, { width: 150 }]}>PATIENT</Text>
                <Text style={[styles.thText, { width: 140 }]}>UHID</Text>
                <Text style={[styles.thText, { width: 130 }]}>TYPE</Text>
                <Text style={[styles.thText, { width: 100 }]}>STATUS</Text>
              </View>

              {/* Table Body */}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#1A7B76" />
                </View>
              ) : appointments.length === 0 ? (
                <View style={{ width: Math.max(width - 48, 605) }}>
                  <EmptyState
                    iconType="calendar"
                    message="No appointments scheduled for today."
                  />
                </View>
              ) : (
                appointments.map((item, idx) => (
                  <TouchableOpacity
                    key={item._id || item.id || idx}
                    style={styles.tableRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      onOpenConsultation &&
                      onOpenConsultation({
                        name: item.patient_name || item.patientName,
                        uhid: item.uhid,
                        age: item.age || 30,
                        gender: item.gender || 'General',
                      })
                    }
                  >
                    <Text style={[styles.tdText, { width: 85, fontWeight: '600' }]}>
                      {item.appointment_time || item.time || '09:30 AM'}
                    </Text>
                    <Text style={[styles.tdBold, { width: 150 }]} numberOfLines={1}>
                      {item.patient_name || item.patientName || 'Prerana Suryawanshi'}
                    </Text>
                    <Text style={[styles.tdText, { width: 140 }]} numberOfLines={1}>
                      {item.uhid || 'SWASTIK-2026-00001'}
                    </Text>
                    <Text style={[styles.tdText, { width: 130 }]} numberOfLines={1}>
                      {item.type || 'Consultation'}
                    </Text>
                    <View style={{ width: 100 }}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>
                          {item.status || 'Scheduled'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
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
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F1E36',
    marginTop: 6,
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  tableInner: {
    minWidth: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
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
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
