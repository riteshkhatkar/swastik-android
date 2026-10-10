// swastik-android/screens/receptionist/ReceptionistAppointmentsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { receptionistApi, tokenApi, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface ReceptionistAppointmentsScreenProps {
  onOpenDrawer: () => void;
}

export const ReceptionistAppointmentsScreen: React.FC<ReceptionistAppointmentsScreenProps> = ({
  onOpenDrawer,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const receptionistName = user?.full_name || 'Priya Sharma';

  // Primary tab: 'today' | 'requests' | 'tokens'
  const [activeTab, setActiveTab] = useState<'today' | 'requests' | 'tokens'>('today');

  // Today tab filters & state
  const [todayFilter, setTodayFilter] = useState<'All' | 'Checked In' | 'Waiting' | 'Scheduled' | 'Completed'>('All');
  const [selectedDate, setSelectedDate] = useState('Today');
  const [searchQuery, setSearchQuery] = useState('');

  // Requests tab filters
  const [requestFilter, setRequestFilter] = useState<'All' | 'Pending' | 'Confirmed'>('Pending');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  // Tokens state
  const [tokens, setTokens] = useState<any[]>([]);
  const [tokenDoctorFilter, setTokenDoctorFilter] = useState('All');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [tokenPatientId, setTokenPatientId] = useState('');
  const [tokenDocId, setTokenDocId] = useState('');

  // Modals
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ date: '2026-10-07', time: '11:00 AM' });

  // Cancel with reason modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('Patient requested cancellation');

  // Block Slot modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDoctorId, setBlockDoctorId] = useState('');
  const [blockDate, setBlockDate] = useState(new Date().toISOString().split('T')[0]);
  const [blockTime, setBlockTime] = useState('11:00 AM');
  const [blockReason, setBlockReason] = useState('Doctor in conference / surgery');

  const loadDoctors = async () => {
    try {
      const data = await receptionistApi.getDoctors();
      if (Array.isArray(data) && data.length > 0) {
        setDoctors(data);
        if (!blockDoctorId) setBlockDoctorId(data[0].id || data[0]._id || 'doc-chougule');
        if (!tokenDocId) setTokenDocId(data[0].id || data[0]._id || 'doc-chougule');
      }
    } catch (e) {
      console.warn('Error fetching doctors:', e);
    }
  };

  const loadTokens = async () => {
    try {
      const data = await receptionistApi.getTokensToday();
      setTokens(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Error fetching tokens:', e);
    }
  };

  const loadAppointments = async () => {
    try {
      const data = await receptionistApi.getAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.warn('Error fetching appointments:', e);
      Alert.alert('Load Notice', getApiErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadDoctors();
    loadTokens();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
    loadTokens();
  };

  // Actions
  const handleCheckIn = async (item: any) => {
    const aptId = item.id || item._id;
    try {
      await receptionistApi.updateAppointmentStatus(aptId, 'checked_in');
      let tokenNotice = '';
      try {
        const tokenRes = await receptionistApi.generateToken({
          patient_id: item.uhid || item.patient_id || item.patientId || 'patient-1',
          doctor_id: item.doctor_id || item.doctorId || 'doc-chougule',
          appointment_id: aptId,
        });
        if (tokenRes?.token_number) {
          tokenNotice = `\nQueue Token #${tokenRes.token_number} generated.`;
          loadTokens();
        }
      } catch (tokErr) {
        console.log('Token generation notice:', tokErr);
      }

      setAppointments((prev) =>
        prev.map((a) => ((a.id || a._id) === aptId ? { ...a, status: 'checked_in' } : a))
      );
      Alert.alert('Checked In ✅', `${item.patient_name || item.patientName} marked as Checked In.${tokenNotice}`);
    } catch (e: any) {
      Alert.alert('Check-In Failed', getApiErrorMessage(e));
    }
  };

  const handleApproveRequest = async (item: any) => {
    const aptId = item.id || item._id;
    try {
      await receptionistApi.updateAppointmentStatus(aptId, 'confirmed');
      setAppointments((prev) =>
        prev.map((a) => ((a.id || a._id) === aptId ? { ...a, status: 'confirmed' } : a))
      );
      Alert.alert('Appointment Confirmed ✅', `Confirmed slot for ${item.patient_name || item.patientName}.`);
    } catch (e: any) {
      Alert.alert('Confirmation Failed', getApiErrorMessage(e));
    }
  };

  const openCancelModal = (item: any) => {
    setCancelTarget(item);
    setCancelReason('Patient requested cancellation');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    const aptId = cancelTarget.id || cancelTarget._id;
    try {
      await receptionistApi.cancelAppointment(aptId, cancelReason.trim() || 'Patient requested');
      setAppointments((prev) =>
        prev.map((a) => ((a.id || a._id) === aptId ? { ...a, status: 'cancelled' } : a))
      );
      setShowCancelModal(false);
      setSelectedAppointment(null);
      Alert.alert('Appointment Cancelled', `Appointment for ${cancelTarget.patient_name || cancelTarget.patientName} has been cancelled.`);
    } catch (e: any) {
      Alert.alert('Cancellation Failed', getApiErrorMessage(e));
    }
  };

  const handleCallPatient = (phone?: string) => {
    if (!phone) {
      Alert.alert('Contact Error', 'Phone number not available for this patient.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedAppointment) return;
    const aptId = selectedAppointment.id || selectedAppointment._id;
    const docId = selectedAppointment.doctor_id || selectedAppointment.doctorId || 'doc-chougule';
    try {
      // Validate booked slots
      const bookedSlots = await receptionistApi.getBookedSlots(docId, rescheduleData.date);
      if (Array.isArray(bookedSlots) && bookedSlots.includes(rescheduleData.time)) {
        Alert.alert(
          'Slot Unavailable ⚠️',
          `The slot "${rescheduleData.time}" on ${rescheduleData.date} is already booked or blocked. Please choose an alternative time slot.`
        );
        return;
      }

      await receptionistApi.rescheduleAppointment(aptId, rescheduleData);
      setAppointments((prev) =>
        prev.map((a) =>
          (a.id || a._id) === aptId
            ? {
                ...a,
                appointment_date: rescheduleData.date,
                appointment_time: rescheduleData.time,
                preferred_time: `${rescheduleData.date}, ${rescheduleData.time}`,
                status: 'scheduled',
              }
            : a
        )
      );
      setShowRescheduleModal(false);
      Alert.alert('Rescheduled 📅', `New appointment set for ${selectedAppointment.patient_name || selectedAppointment.patientName}.`);
    } catch (e: any) {
      Alert.alert('Reschedule Failed', getApiErrorMessage(e));
    }
  };

  const handleBlockSlotSubmit = async () => {
    if (!blockDoctorId || !blockDate || !blockTime) {
      Alert.alert('Validation Error', 'Please select a doctor, date, and time slot.');
      return;
    }
    try {
      await receptionistApi.blockSlot(
        blockDoctorId,
        blockDate,
        blockTime,
        blockReason.trim() || 'Blocked by reception'
      );
      setShowBlockModal(false);
      Alert.alert('Slot Blocked 🚫', `Slot ${blockTime} on ${blockDate} has been blocked.`);
      loadAppointments();
    } catch (e: any) {
      Alert.alert('Block Slot Failed', getApiErrorMessage(e));
    }
  };

  const handleUpdateTokenStatus = async (tokenId: string, newStatus: string) => {
    try {
      await receptionistApi.updateTokenStatus(tokenId, newStatus);
      setTokens((prev) =>
        prev.map((t) => ((t.id || t._id) === tokenId ? { ...t, status: newStatus } : t))
      );
      Alert.alert('Token Updated', `Token status changed to ${newStatus}.`);
    } catch (e: any) {
      Alert.alert('Update Failed', getApiErrorMessage(e));
    }
  };

  const handleGenerateTokenSubmit = async () => {
    if (!tokenPatientId.trim() || !tokenDocId) {
      Alert.alert('Validation', 'Please provide a valid Patient UHID and select a Doctor.');
      return;
    }
    try {
      const res = await receptionistApi.generateToken({
        patient_id: tokenPatientId.trim(),
        doctor_id: tokenDocId,
      });
      setShowGenerateModal(false);
      setTokenPatientId('');
      Alert.alert('Token Generated 🎫', `Token #${res?.token_number || 'Next'} created.`);
      loadTokens();
    } catch (e: any) {
      Alert.alert('Generation Failed', getApiErrorMessage(e));
    }
  };

  // Filter Today's Appointments
  const filteredTodayAppointments = appointments.filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        (item.patient_name || '').toLowerCase().includes(q) ||
        (item.uhid || '').toLowerCase().includes(q) ||
        (item.phone || '').includes(q);
      if (!match) return false;
    }
    if (todayFilter === 'All') return true;
    if (todayFilter === 'Checked In') return item.status === 'checked_in';
    if (todayFilter === 'Waiting') return item.status === 'waiting';
    if (todayFilter === 'Scheduled') return item.status === 'scheduled';
    if (todayFilter === 'Completed') return item.status === 'completed';
    return true;
  });

  // Filter Requests
  const filteredRequests = appointments.filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        (item.patient_name || '').toLowerCase().includes(q) ||
        (item.uhid || '').toLowerCase().includes(q) ||
        (item.phone || '').includes(q);
      if (!match) return false;
    }
    if (requestFilter === 'All') return true;
    if (requestFilter === 'Pending')
      return item.status === 'pending' || item.status === 'scheduled';
    if (requestFilter === 'Confirmed')
      return item.status === 'confirmed' || item.status === 'checked_in';
    return true;
  });

  const pendingCount = appointments.filter(
    (a) => a.status === 'pending' || a.status === 'scheduled'
  ).length;
  const confirmedCount = appointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'checked_in'
  ).length;

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
        {/* Top Tab Selector: Today's Appointments vs Appointment Requests vs Queue Tokens */}
        <View style={styles.topTabContainer}>
          <TouchableOpacity
            style={[styles.topTabButton, activeTab === 'today' && styles.activeTopTabButton]}
            onPress={() => setActiveTab('today')}
            activeOpacity={0.8}
          >
            <Feather
              name="calendar"
              size={15}
              color={activeTab === 'today' ? '#0D9488' : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[styles.topTabText, activeTab === 'today' && styles.activeTopTabText]}
            >
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topTabButton, activeTab === 'requests' && styles.activeTopTabButton]}
            onPress={() => setActiveTab('requests')}
            activeOpacity={0.8}
          >
            <Feather
              name="clock"
              size={15}
              color={activeTab === 'requests' ? '#0D9488' : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[styles.topTabText, activeTab === 'requests' && styles.activeTopTabText]}
            >
              Requests ({pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topTabButton, activeTab === 'tokens' && styles.activeTopTabButton]}
            onPress={() => setActiveTab('tokens')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="ticket-account"
              size={17}
              color={activeTab === 'tokens' ? '#0D9488' : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[styles.topTabText, activeTab === 'tokens' && styles.activeTopTabText]}
            >
              Tokens ({tokens.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'today' ? (
          /* =========================================================================
             TAB 1: TODAY'S APPOINTMENTS (Matching Images 4 & 23)
             ========================================================================= */
          <View>
            <View style={styles.titleSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mainTitle}>Today's Appointments</Text>
                  <Text style={styles.subTitle}>
                    View and manage today's patient appointments.
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FEF2F2',
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#FEE2E2',
                  }}
                  onPress={() => setShowBlockModal(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="slash" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#DC2626' }}>Block Slot</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Navigator Bar */}
            <View style={styles.dateBar}>
              <TouchableOpacity style={styles.dateArrowBtn}>
                <Feather name="chevron-left" size={18} color="#64748B" />
              </TouchableOpacity>
              <View style={styles.dateCenter}>
                <Feather name="calendar" size={16} color="#0D9488" style={{ marginRight: 8 }} />
                <Text style={styles.dateText}>{selectedDate}</Text>
              </View>
              <TouchableOpacity style={styles.dateArrowBtn}>
                <Feather name="chevron-right" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {(['All', 'Checked In', 'Waiting', 'Scheduled', 'Completed'] as const).map(
                (filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterPill,
                      todayFilter === filter && styles.activeFilterPill,
                    ]}
                    onPress={() => setTodayFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        todayFilter === filter && styles.activeFilterPillText,
                      ]}
                    >
                      {filter}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>

            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, UHID or mobile..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.thCol, { flex: 1.2 }]}>Time</Text>
              <Text style={[styles.thCol, { flex: 2 }]}>Patient</Text>
              <Text style={[styles.thCol, { flex: 1.5 }]}>UHID</Text>
              <Text style={[styles.thCol, { flex: 1.8 }]}>Type</Text>
              <Text style={[styles.thCol, { flex: 1.6, textAlign: 'right' }]}>Status</Text>
            </View>

            {/* Appointment Rows */}
            {filteredTodayAppointments.map((apt, idx) => {
              const isCheckedIn = apt.status === 'checked_in';
              const isWaiting = apt.status === 'waiting';
              const isCompleted = apt.status === 'completed';
              const rowKey = String(apt.id || apt._id || `apt-${apt.uhid || ''}-${idx}`);

              return (
                <TouchableOpacity
                  key={rowKey}
                  style={styles.appointmentRow}
                  onPress={() => setSelectedAppointment(apt)}
                  activeOpacity={0.7}
                >
                  {/* Time */}
                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.timeText}>{apt.appointment_time || '09:00 AM'}</Text>
                  </View>

                  {/* Patient Info */}
                  <View style={{ flex: 2 }}>
                    <Text style={styles.patientName} numberOfLines={1}>
                      {apt.patient_name}
                    </Text>
                    <Text style={styles.patientMeta}>
                      {apt.age ? `${apt.age} Y` : ''} {apt.gender ? `/ ${apt.gender}` : ''}
                    </Text>
                  </View>

                  {/* UHID */}
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.uhidText} numberOfLines={1}>
                      {apt.uhid}
                    </Text>
                  </View>

                  {/* Type */}
                  <View style={{ flex: 1.8 }}>
                    <Text style={styles.typeText} numberOfLines={1}>
                      {apt.type || 'OPD Consultation'}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View style={{ flex: 1.6, alignItems: 'flex-end' }}>
                    <View
                      style={[
                        styles.statusPill,
                        isCheckedIn && styles.statusCheckedIn,
                        isWaiting && styles.statusWaiting,
                        isCompleted && styles.statusCompleted,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          isCheckedIn && styles.statusCheckedInText,
                          isWaiting && styles.statusWaitingText,
                          isCompleted && styles.statusCompletedText,
                        ]}
                      >
                        {isCheckedIn
                          ? 'Checked In'
                          : isWaiting
                          ? 'Waiting'
                          : isCompleted
                          ? 'Completed'
                          : 'Scheduled'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* =========================================================================
             TAB 2: APPOINTMENT REQUESTS (Matching Images 20 & 24)
             ========================================================================= */
          <View>
            <View style={styles.titleSection}>
              <Text style={styles.mainTitle}>Appointment Requests</Text>
              <Text style={styles.subTitle}>
                Manage and respond to patient appointment requests.
              </Text>
            </View>

            {/* Filter Tabs matching Image 24 */}
            <View style={styles.requestsFilterRow}>
              <TouchableOpacity
                style={[
                  styles.reqFilterCard,
                  requestFilter === 'All' && styles.reqFilterCardActive,
                ]}
                onPress={() => setRequestFilter('All')}
              >
                <Feather
                  name="list"
                  size={16}
                  color={requestFilter === 'All' ? '#0D9488' : '#64748B'}
                />
                <Text style={styles.reqFilterTitle}>All</Text>
                <Text style={styles.reqFilterCount}>{appointments.length}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reqFilterCard,
                  requestFilter === 'Pending' && styles.reqFilterCardActive,
                ]}
                onPress={() => setRequestFilter('Pending')}
              >
                <Feather
                  name="clock"
                  size={16}
                  color={requestFilter === 'Pending' ? '#0D9488' : '#64748B'}
                />
                <Text style={styles.reqFilterTitle}>Pending</Text>
                <Text style={styles.reqFilterCount}>{pendingCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reqFilterCard,
                  requestFilter === 'Confirmed' && styles.reqFilterCardActive,
                ]}
                onPress={() => setRequestFilter('Confirmed')}
              >
                <Feather
                  name="check-circle"
                  size={16}
                  color={requestFilter === 'Confirmed' ? '#0D9488' : '#64748B'}
                />
                <Text style={styles.reqFilterTitle}>Confirmed</Text>
                <Text style={styles.reqFilterCount}>{confirmedCount}</Text>
              </TouchableOpacity>
            </View>

            {/* Request Cards matching Image 24 & 20 */}
            <View style={styles.requestCardsList}>
              {filteredRequests.map((req, idx) => {
                const isConfirmed = req.status === 'confirmed' || req.status === 'checked_in';
                const reqKey = String(req.id || req._id || `req-${req.phone || ''}-${idx}`);
                const initials = (req.patient_name || 'PT')
                  .split(' ')
                  .map((w: string) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <View key={reqKey} style={styles.requestCard}>
                    {/* Top Row: Initials avatar + Info + Status badge */}
                    <View style={styles.requestCardTop}>
                      <View style={styles.initialsCircle}>
                        <Text style={styles.initialsText}>{initials}</Text>
                      </View>

                      <View style={styles.requestMainInfo}>
                        <Text style={styles.requestPatientName}>{req.patient_name}</Text>
                        <Text style={styles.requestContact}>
                          📞 {req.phone || '+91 98765 43210'}
                        </Text>
                        <Text style={styles.requestMeta}>
                          {req.gender || 'Male'}, {req.age || 30} yrs
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.reqBadge,
                          isConfirmed ? styles.reqBadgeConfirmed : styles.reqBadgePending,
                        ]}
                      >
                        <Feather
                          name={isConfirmed ? 'check' : 'clock'}
                          size={12}
                          color={isConfirmed ? '#0D9488' : '#D97706'}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.reqBadgeText,
                            isConfirmed ? styles.reqBadgeTextConfirmed : styles.reqBadgeTextPending,
                          ]}
                        >
                          {isConfirmed ? 'Confirmed' : 'Pending'}
                        </Text>
                      </View>
                    </View>

                    {/* Middle Row: Doctor, Department & Scheduled Slot */}
                    <View style={styles.requestDetailBox}>
                      <View style={styles.requestDetailItem}>
                        <Feather name="user" size={14} color="#0D9488" style={{ marginRight: 6 }} />
                        <Text style={styles.reqDetailText}>
                          {req.doctor_name || 'Dr. P. M. Chougule'}
                        </Text>
                      </View>

                      <View style={styles.requestDetailItem}>
                        <Feather name="calendar" size={14} color="#0D9488" style={{ marginRight: 6 }} />
                        <Text style={styles.reqDetailText}>
                          {req.preferred_time || `${req.appointment_date} ${req.appointment_time}`}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons Row matching Images 20 & 24: [Confirm] [Call] [View] */}
                    <View style={styles.requestActionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.reqActionBtn,
                          isConfirmed ? styles.reqActionBtnDisabled : styles.reqActionBtnPrimary,
                        ]}
                        onPress={() => !isConfirmed && handleApproveRequest(req)}
                        disabled={isConfirmed}
                        activeOpacity={0.8}
                      >
                        <Feather
                          name="check"
                          size={15}
                          color={isConfirmed ? '#64748B' : '#FFFFFF'}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.reqActionBtnText,
                            isConfirmed && styles.reqActionBtnTextDisabled,
                          ]}
                        >
                          {isConfirmed ? 'Approved' : 'Confirm'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.reqActionBtn, styles.reqActionBtnCall]}
                        onPress={() => handleCallPatient(req.phone)}
                        activeOpacity={0.8}
                      >
                        <Feather name="phone" size={15} color="#0D9488" style={{ marginRight: 4 }} />
                        <Text style={styles.reqActionBtnCallText}>Call</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.reqActionBtn, styles.reqActionBtnView]}
                        onPress={() => setSelectedAppointment(req)}
                        activeOpacity={0.8}
                      >
                        <Feather name="eye" size={15} color="#475569" style={{ marginRight: 4 }} />
                        <Text style={styles.reqActionBtnViewText}>View</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.reqActionBtn, styles.reqActionBtnReschedule]}
                        onPress={() => {
                          setSelectedAppointment(req);
                          setShowRescheduleModal(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Feather name="calendar" size={15} color="#475569" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.reqActionBtn, { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }]}
                        onPress={() => openCancelModal(req)}
                        activeOpacity={0.8}
                      >
                        <Feather name="x" size={15} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB 3: LIVE QUEUE TOKENS */}
        {activeTab === 'tokens' && (
          <View>
            <View style={styles.titleSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mainTitle}>Live Consultation Queue</Text>
                  <Text style={styles.subTitle}>
                    Manage queue tokens and per-doctor patient call workflow.
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#0D9488',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                  onPress={() => setShowGenerateModal(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="plus-circle" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>New Token</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Doctor Filter Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  tokenDoctorFilter === 'All' && styles.activeFilterPill,
                ]}
                onPress={() => setTokenDoctorFilter('All')}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    tokenDoctorFilter === 'All' && styles.activeFilterPillText,
                  ]}
                >
                  All Doctors
                </Text>
              </TouchableOpacity>
              {doctors.map((doc) => {
                const docId = doc.id || doc._id || doc.name;
                return (
                  <TouchableOpacity
                    key={docId}
                    style={[
                      styles.filterPill,
                      tokenDoctorFilter === docId && styles.activeFilterPill,
                    ]}
                    onPress={() => setTokenDoctorFilter(docId)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        tokenDoctorFilter === docId && styles.activeFilterPillText,
                      ]}
                    >
                      {doc.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Token Cards List */}
            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
              {tokens.filter(
                (tok) => tokenDoctorFilter === 'All' || tok.doctor_id === tokenDoctorFilter
              ).length === 0 ? (
                <View
                  style={{
                    paddingVertical: 40,
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#F1F5F9',
                  }}
                >
                  <MaterialCommunityIcons
                    name="ticket-outline"
                    size={32}
                    color="#94A3B8"
                    style={{ marginBottom: 8 }}
                  />
                  <Text style={{ fontSize: 14, color: '#64748B' }}>
                    No queue tokens active today
                  </Text>
                  <TouchableOpacity
                    style={{
                      marginTop: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      backgroundColor: '#0D9488',
                      borderRadius: 8,
                    }}
                    onPress={() => setShowGenerateModal(true)}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
                      Generate Token
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                tokens
                  .filter(
                    (tok) => tokenDoctorFilter === 'All' || tok.doctor_id === tokenDoctorFilter
                  )
                  .map((tok, idx) => {
                    const statusStr = String(tok.status || 'waiting').toLowerCase();
                    const isWaiting = statusStr === 'waiting' || statusStr === 'pending';
                    const isInConsult =
                      statusStr === 'in_consultation' || statusStr === 'in-consultation';
                    const isDone = statusStr === 'completed';

                    return (
                      <View
                        key={tok.id || tok._id || idx}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 12,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 24,
                              backgroundColor: isInConsult
                                ? '#FEF3C7'
                                : isDone
                                ? '#DCFCE7'
                                : '#E0F2FE',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 14,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 18,
                                fontWeight: '700',
                                color: isInConsult
                                  ? '#D97706'
                                  : isDone
                                  ? '#15803D'
                                  : '#0284C7',
                              }}
                            >
                              #{tok.token_number || idx + 1}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }}
                            >
                              {tok.patient_name || tok.patient_id || 'Patient'}
                            </Text>
                            <Text
                              style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}
                            >
                              UHID: {tok.patient_id || tok.uhid || '—'} | Dr:{' '}
                              {tok.doctor_name || tok.doctor_id || 'Assigned'}
                            </Text>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: 6,
                              }}
                            >
                              <View
                                style={{
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                  backgroundColor: isInConsult
                                    ? '#FEF3C7'
                                    : isDone
                                    ? '#DCFCE7'
                                    : '#F1F5F9',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: '700',
                                    color: isInConsult
                                      ? '#B45309'
                                      : isDone
                                      ? '#15803D'
                                      : '#475569',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {tok.status || 'WAITING'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>

                        {/* Status update actions */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginLeft: 8,
                          }}
                        >
                          {isWaiting && (
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#0D9488',
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 6,
                              }}
                              onPress={() =>
                                handleUpdateTokenStatus(tok.id || tok._id, 'in_consultation')
                              }
                            >
                              <Text
                                style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}
                              >
                                Call In
                              </Text>
                            </TouchableOpacity>
                          )}
                          {isInConsult && (
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#10B981',
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 6,
                              }}
                              onPress={() =>
                                handleUpdateTokenStatus(tok.id || tok._id, 'completed')
                              }
                            >
                              <Text
                                style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}
                              >
                                Complete
                              </Text>
                            </TouchableOpacity>
                          )}
                          {isDone && (
                            <View style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
                              <Feather name="check-circle" size={20} color="#10B981" />
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Appointment Detail Modal */}
      <Modal
        visible={!!selectedAppointment && !showRescheduleModal && !showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedAppointment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appointment Details</Text>
              <TouchableOpacity onPress={() => setSelectedAppointment(null)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (
              <View style={styles.modalBody}>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalLabel}>Patient Name</Text>
                  <Text style={styles.modalValue}>{selectedAppointment.patient_name}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalLabel}>UHID</Text>
                  <Text style={styles.modalValue}>{selectedAppointment.uhid || 'SW-00001'}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalLabel}>Doctor</Text>
                  <Text style={styles.modalValue}>{selectedAppointment.doctor_name || 'Assigned Doctor'}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalLabel}>Department</Text>
                  <Text style={styles.modalValue}>{selectedAppointment.department || 'Psychiatry'}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalLabel}>Scheduled Date & Time</Text>
                  <Text style={styles.modalValue}>
                    {selectedAppointment.appointment_date} at {selectedAppointment.appointment_time}
                  </Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <Text style={[styles.modalValue, { textTransform: 'capitalize' }]}>{selectedAppointment.status || 'Scheduled'}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalLabel}>Phone Number</Text>
                  <Text style={styles.modalValue}>{selectedAppointment.phone || '+91 98765 43210'}</Text>
                </View>

                {/* Modal Action Buttons */}
                <View style={styles.modalActions}>
                  {selectedAppointment.status !== 'checked_in' && (
                    <TouchableOpacity
                      style={styles.modalCheckInBtn}
                      onPress={() => {
                        handleCheckIn(selectedAppointment);
                        setSelectedAppointment(null);
                      }}
                    >
                      <Text style={styles.modalBtnText}>Check In Patient</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.modalCallBtn}
                    onPress={() => handleCallPatient(selectedAppointment.phone)}
                  >
                    <Feather name="phone" size={16} color="#0D9488" style={{ marginRight: 6 }} />
                    <Text style={styles.modalCallText}>Call Patient</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalCallBtn, { borderColor: '#0284C7' }]}
                    onPress={() => {
                      setShowRescheduleModal(true);
                    }}
                  >
                    <Feather name="calendar" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                    <Text style={[styles.modalCallText, { color: '#0284C7' }]}>Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalCallBtn, { borderColor: '#DC2626' }]}
                    onPress={() => {
                      const apt = selectedAppointment;
                      setSelectedAppointment(null);
                      openCancelModal(apt);
                    }}
                  >
                    <Feather name="x-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={[styles.modalCallText, { color: '#DC2626' }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        visible={showRescheduleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Appointment</Text>
              <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.formLabel}>New Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                value={rescheduleData.date}
                onChangeText={(text) => setRescheduleData({ ...rescheduleData, date: text })}
                placeholder="2026-10-07"
              />

              <Text style={[styles.formLabel, { marginTop: 12 }]}>New Time Slot</Text>
              <TextInput
                style={styles.formInput}
                value={rescheduleData.time}
                onChangeText={(text) => setRescheduleData({ ...rescheduleData, time: text })}
                placeholder="11:00 AM"
              />

              <TouchableOpacity
                style={styles.confirmRescheduleBtn}
                onPress={handleRescheduleSubmit}
              >
                <Text style={styles.modalBtnText}>Confirm Reschedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Appointment Modal with Reason */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Cancel Appointment</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={{ fontSize: 14, color: '#475569', marginBottom: 12 }}>
                Please specify the reason for cancelling the appointment for{' '}
                <Text style={{ fontWeight: '700' }}>
                  {cancelTarget?.patient_name || cancelTarget?.patientName || 'this patient'}
                </Text>
                :
              </Text>

              <Text style={styles.formLabel}>Cancellation Reason *</Text>
              <TextInput
                style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                placeholder="e.g. Patient requested, Doctor unavailable, Duplicate booking"
              />

              <TouchableOpacity
                style={[styles.confirmRescheduleBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleConfirmCancel}
              >
                <Text style={styles.modalBtnText}>Confirm Cancellation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Block Slot Modal */}
      <Modal
        visible={showBlockModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBlockModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Block Doctor Slot</Text>
              <TouchableOpacity onPress={() => setShowBlockModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.formLabel}>Doctor ID / Name *</Text>
              <TextInput
                style={styles.formInput}
                value={blockDoctorId}
                onChangeText={setBlockDoctorId}
                placeholder="doc-chougule"
              />

              <Text style={[styles.formLabel, { marginTop: 12 }]}>Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.formInput}
                value={blockDate}
                onChangeText={setBlockDate}
                placeholder="2026-10-06"
              />

              <Text style={[styles.formLabel, { marginTop: 12 }]}>Time Slot *</Text>
              <TextInput
                style={styles.formInput}
                value={blockTime}
                onChangeText={setBlockTime}
                placeholder="10:00 AM"
              />

              <Text style={[styles.formLabel, { marginTop: 12 }]}>Reason *</Text>
              <TextInput
                style={styles.formInput}
                value={blockReason}
                onChangeText={setBlockReason}
                placeholder="Emergency rounds / surgery"
              />

              <TouchableOpacity
                style={[styles.confirmRescheduleBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleBlockSlotSubmit}
              >
                <Text style={styles.modalBtnText}>Confirm Block Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Generate Queue Token Modal */}
      <Modal
        visible={showGenerateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGenerateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Queue Token</Text>
              <TouchableOpacity onPress={() => setShowGenerateModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.formLabel}>Patient UHID *</Text>
              <TextInput
                style={styles.formInput}
                value={tokenPatientId}
                onChangeText={setTokenPatientId}
                placeholder="e.g. SWH-2026-0001"
                autoCapitalize="characters"
              />

              <Text style={[styles.formLabel, { marginTop: 12 }]}>Doctor ID *</Text>
              <TextInput
                style={styles.formInput}
                value={tokenDocId}
                onChangeText={setTokenDocId}
                placeholder="doc-chougule"
              />

              <TouchableOpacity
                style={styles.confirmRescheduleBtn}
                onPress={handleGenerateTokenSubmit}
              >
                <Text style={styles.modalBtnText}>Issue Token</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  topTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  topTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTopTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTopTabText: {
    color: '#0D9488',
    fontWeight: '700',
  },
  titleSection: {
    marginBottom: 14,
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
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateArrowBtn: {
    padding: 6,
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeFilterPill: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeFilterPillText: {
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    marginBottom: 4,
  },
  thCol: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  patientName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  patientMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  uhidText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  typeText: {
    fontSize: 11,
    color: '#334155',
  },
  statusPill: {
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#E0F2FE',
  },
  statusCheckedIn: {
    backgroundColor: '#D1FAE5',
  },
  statusWaiting: {
    backgroundColor: '#FEF3C7',
  },
  statusCompleted: {
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  statusCheckedInText: {
    color: '#059669',
  },
  statusWaitingText: {
    color: '#D97706',
  },
  statusCompletedText: {
    color: '#64748B',
  },
  requestsFilterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  reqFilterCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reqFilterCardActive: {
    backgroundColor: '#E6F4F1',
    borderColor: '#0D9488',
  },
  reqFilterTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  reqFilterCount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  requestCardsList: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  requestCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  initialsCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  initialsText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D9488',
  },
  requestMainInfo: {
    flex: 1,
  },
  requestPatientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  requestContact: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  requestMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  reqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  reqBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  reqBadgeConfirmed: {
    backgroundColor: '#D1FAE5',
  },
  reqBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reqBadgeTextPending: {
    color: '#D97706',
  },
  reqBadgeTextConfirmed: {
    color: '#059669',
  },
  requestDetailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 6,
  },
  requestDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reqDetailText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  requestActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reqActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  reqActionBtnPrimary: {
    flex: 1.5,
    backgroundColor: '#0D9488',
  },
  reqActionBtnDisabled: {
    flex: 1.5,
    backgroundColor: '#E2E8F0',
  },
  reqActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  reqActionBtnTextDisabled: {
    color: '#64748B',
  },
  reqActionBtnCall: {
    flex: 1,
    backgroundColor: '#E6F4F1',
  },
  reqActionBtnCallText: {
    color: '#0D9488',
    fontSize: 12,
    fontWeight: '600',
  },
  reqActionBtnView: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  reqActionBtnViewText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  reqActionBtnReschedule: {
    width: 38,
    backgroundColor: '#F1F5F9',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalBody: {
    gap: 10,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  modalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalCheckInBtn: {
    flex: 1,
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCallBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E6F4F1',
    borderRadius: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCallText: {
    color: '#0D9488',
    fontSize: 13,
    fontWeight: '600',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#1E293B',
    marginTop: 4,
  },
  confirmRescheduleBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
});
