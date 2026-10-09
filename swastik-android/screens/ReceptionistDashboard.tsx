// swastik-android/screens/ReceptionistDashboard.tsx
// Phase 2: Receptionist Dashboard with OPD/IPD Patient Registration & Live Appointment Queue

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  Alert 
} from 'react-native';
import { Colors } from '../constants/theme';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { WhatsAppFloat } from '../components/WhatsAppFloat';

interface AppointmentItem {
  id: string;
  uhid: string;
  name: string;
  age: number;
  doctor: string;
  department: string;
  time: string;
  status: 'pending' | 'confirmed' | 'rescheduled';
}

export const ReceptionistDashboard: React.FC = () => {
  // Live Dashboard Counters
  const [stats, setStats] = useState({
    todayAdmissions: 18,
    currentInpatients: 34,
    availableRooms: 12,
    pendingDischarges: 5,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'appointments' | 'beds'>('appointments');

  // Appointments List
  const [appointments, setAppointments] = useState<AppointmentItem[]>([
    { id: '1', uhid: 'SW-2026-104', name: 'Manish Tyagi', age: 38, doctor: 'Dr. Anand Rao', department: 'Psychiatry', time: '10:30 AM', status: 'pending' },
    { id: '2', uhid: 'SW-2026-109', name: 'Deepika Joshi', age: 29, doctor: 'Dr. Neha Deshmukh', department: 'Psychology', time: '11:15 AM', status: 'confirmed' },
    { id: '3', uhid: 'SW-2026-112', name: 'Karan Mehra', age: 45, doctor: 'Dr. Anand Rao', department: 'Psychiatry', time: '12:00 PM', status: 'pending' },
    { id: '4', uhid: 'SW-2026-120', name: 'Suman Lata', age: 52, doctor: 'Dr. Nikhil Chougule', department: 'De-addiction', time: '02:30 PM', status: 'confirmed' },
  ]);

  // Registration Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '',
    age: '',
    gender: 'Male',
    visitType: 'OPD' as 'OPD' | 'IPD',
    doctor: 'Dr. Anand Rao',
    room: 'Ward 1 - Bed 05',
    isEmergency: false,
  });

  // Confirm Appointment
  const handleConfirmAppointment = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmed' } : a));
    Alert.alert('Appointment Confirmed ✅', 'Token generated and dispatched to doctor consultation room.');
  };

  // Cancel Appointment
  const handleCancelAppointment = (id: string) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment slot?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => {
            setAppointments(prev => prev.filter(a => a.id !== id));
            Alert.alert('Slot Freed', 'Appointment slot released for emergency walk-ins.');
          }
        }
      ]
    );
  };

  // Submit Patient Registration
  const handleRegisterPatient = () => {
    if (!regForm.name.trim() || !regForm.phone.trim()) {
      Alert.alert('Missing Fields', 'Please enter Patient Full Name and Contact Phone.');
      return;
    }

    const newUHID = `SW-2026-${Math.floor(100 + Math.random() * 900)}`;
    Alert.alert(
      'Patient Registered Successfully! 🏥',
      `UHID Assigned: ${newUHID}\nPatient: ${regForm.name}\nVisit: ${regForm.visitType}\nDoctor: ${regForm.doctor}${regForm.visitType === 'IPD' ? `\nBed: ${regForm.room}` : ''}`,
      [
        {
          text: 'OK',
          onPress: () => {
            if (regForm.visitType === 'IPD') {
              setStats(prev => ({
                ...prev,
                todayAdmissions: prev.todayAdmissions + 1,
                currentInpatients: prev.currentInpatients + 1,
                availableRooms: Math.max(0, prev.availableRooms - 1),
              }));
            }
            setShowRegModal(false);
            setRegForm({
              name: '',
              phone: '',
              age: '',
              gender: 'Male',
              visitType: 'OPD',
              doctor: 'Dr. Anand Rao',
              room: 'Ward 1 - Bed 05',
              isEmergency: false,
            });
          }
        }
      ]
    );
  };

  const filteredAppointments = appointments.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.uhid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section Header */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.screenTitle}>Receptionist Portal</Text>
            <Text style={styles.screenSub}>Front Desk Operations &amp; Inpatient Admissions</Text>
          </View>
          <TouchableOpacity 
            style={styles.newRegBtn}
            onPress={() => setShowRegModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add" size={16} color="#ffffff" />
            <Text style={styles.newRegBtnText}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* 4 Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <Text style={styles.statLabel}>Today Admissions</Text>
              <FontAwesome5 name="hospital-user" size={14} color={Colors.headerTeal} />
            </View>
            <Text style={[styles.statVal, { color: Colors.headerTeal }]}>{stats.todayAdmissions}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <Text style={styles.statLabel}>Current Inpatients</Text>
              <FontAwesome5 name="bed" size={14} color={Colors.blue} />
            </View>
            <Text style={[styles.statVal, { color: Colors.blue }]}>{stats.currentInpatients}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <Text style={styles.statLabel}>Available Beds</Text>
              <FontAwesome5 name="door-open" size={14} color={Colors.green} />
            </View>
            <Text style={[styles.statVal, { color: Colors.green }]}>{stats.availableRooms}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <Text style={styles.statLabel}>Pending Discharges</Text>
              <FontAwesome5 name="clipboard-check" size={14} color={Colors.amber} />
            </View>
            <Text style={[styles.statVal, { color: Colors.amber }]}>{stats.pendingDischarges}</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by UHID (e.g. SW-2026) or Name..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation Tabs (Appointments vs Bed Grid) */}
        <View style={styles.tabToggleRow}>
          <TouchableOpacity 
            style={[styles.toggleBtn, activeTab === 'appointments' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('appointments')}
          >
            <Text style={[styles.toggleText, activeTab === 'appointments' && styles.toggleTextActive]}>
              Today's Appointments ({filteredAppointments.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, activeTab === 'beds' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('beds')}
          >
            <Text style={[styles.toggleText, activeTab === 'beds' && styles.toggleTextActive]}>
              Ward Bed Grid (34/46)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Appointments Queue */}
        {activeTab === 'appointments' && (
          <View>
            {filteredAppointments.map((item) => (
              <View key={item.id} style={styles.appointmentCard}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.patientName}>{item.name}, {item.age}y</Text>
                    <Text style={styles.uhidCode}>UHID: {item.uhid}</Text>
                  </View>
                  <View style={[
                    styles.statusPill, 
                    item.status === 'confirmed' ? styles.statusConfirmed : styles.statusPending
                  ]}>
                    <Text style={[
                      styles.statusPillText, 
                      item.status === 'confirmed' ? { color: Colors.green } : { color: Colors.amber }
                    ]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardMetaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="medical-outline" size={13} color={Colors.headerTeal} />
                    <Text style={styles.metaText}>{item.doctor} ({item.department})</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={13} color="#64748b" />
                    <Text style={styles.metaText}>{item.time}</Text>
                  </View>
                </View>

                <View style={styles.cardBtnRow}>
                  {item.status === 'pending' ? (
                    <TouchableOpacity 
                      style={styles.confirmBtn}
                      onPress={() => handleConfirmAppointment(item.id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={15} color="#ffffff" />
                      <Text style={styles.confirmBtnText}>Confirm Token</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.confirmedNotice}>
                      <Ionicons name="checkmark-done" size={15} color={Colors.green} />
                      <Text style={styles.confirmedNoticeText}>Token Active in Queue</Text>
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.cancelBtn}
                    onPress={() => handleCancelAppointment(item.id)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tab 2: Ward Bed Grid */}
        {activeTab === 'beds' && (
          <View style={styles.bedGridContainer}>
            <Text style={styles.wardHeading}>Ward 1 — Acute Psychiatric Care</Text>
            <View style={styles.bedTilesRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(bed => {
                const isOccupied = bed !== 5 && bed !== 8;
                return (
                  <View 
                    key={bed} 
                    style={[styles.bedTile, isOccupied ? styles.bedOccupied : styles.bedAvailable]}
                  >
                    <Ionicons name="bed" size={18} color={isOccupied ? '#b91c1c' : '#047857'} />
                    <Text style={styles.bedNumber}>Bed {bed}</Text>
                    <Text style={[styles.bedStateText, { color: isOccupied ? '#b91c1c' : '#047857' }]}>
                      {isOccupied ? 'Occupied' : 'Vacant'}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.wardHeading}>Ward 2 — Rehabilitation &amp; Recovery</Text>
            <View style={styles.bedTilesRow}>
              {[9, 10, 11, 12, 13, 14].map(bed => {
                const isOccupied = bed === 9 || bed === 10 || bed === 12;
                return (
                  <View 
                    key={bed} 
                    style={[styles.bedTile, isOccupied ? styles.bedOccupied : styles.bedAvailable]}
                  >
                    <Ionicons name="bed" size={18} color={isOccupied ? '#b91c1c' : '#047857'} />
                    <Text style={styles.bedNumber}>Bed {bed}</Text>
                    <Text style={[styles.bedStateText, { color: isOccupied ? '#b91c1c' : '#047857' }]}>
                      {isOccupied ? 'Occupied' : 'Vacant'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Patient Registration Native Modal Form */}
      <Modal
        visible={showRegModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRegModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>New Patient Registration</Text>
                <Text style={styles.modalSub}>OPD Outpatient &amp; IPD Inpatient Admission</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRegModal(false)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
              {/* Emergency Flag */}
              <TouchableOpacity 
                style={[styles.emergencyBanner, regForm.isEmergency && styles.emergencyBannerActive]}
                onPress={() => setRegForm(p => ({ ...p, isEmergency: !p.isEmergency }))}
              >
                <Ionicons name="warning" size={18} color={regForm.isEmergency ? '#dc2626' : '#d97706'} />
                <Text style={[styles.emergencyText, regForm.isEmergency && { color: '#dc2626', fontWeight: '800' }]}>
                  {regForm.isEmergency ? '🔴 EMERGENCY PROTOCOL ACTIVATED' : 'Mark as Emergency Walk-In'}
                </Text>
              </TouchableOpacity>

              {/* Patient Name */}
              <Text style={styles.inputLabel}>Patient Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Ramesh Chandra"
                value={regForm.name}
                onChangeText={txt => setRegForm(p => ({ ...p, name: txt }))}
              />

              {/* Contact Phone & Age */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="10-digit mobile"
                    keyboardType="phone-pad"
                    value={regForm.phone}
                    onChangeText={txt => setRegForm(p => ({ ...p, phone: txt }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Years"
                    keyboardType="numeric"
                    value={regForm.age}
                    onChangeText={txt => setRegForm(p => ({ ...p, age: txt }))}
                  />
                </View>
              </View>

              {/* Visit Type Toggle: OPD vs IPD */}
              <Text style={styles.inputLabel}>Visit Category</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeBtn, regForm.visitType === 'OPD' && styles.typeBtnActive]}
                  onPress={() => setRegForm(p => ({ ...p, visitType: 'OPD' }))}
                >
                  <Text style={[styles.typeBtnText, regForm.visitType === 'OPD' && styles.typeBtnTextActive]}>
                    OPD Consultation
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, regForm.visitType === 'IPD' && styles.typeBtnActive]}
                  onPress={() => setRegForm(p => ({ ...p, visitType: 'IPD' }))}
                >
                  <Text style={[styles.typeBtnText, regForm.visitType === 'IPD' && styles.typeBtnTextActive]}>
                    IPD Hospital Admission
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Attending Doctor */}
              <Text style={styles.inputLabel}>Consulting Doctor</Text>
              <View style={styles.doctorPicker}>
                {['Dr. Anand Rao', 'Dr. Neha Deshmukh', 'Dr. Nikhil Chougule'].map(doc => (
                  <TouchableOpacity
                    key={doc}
                    style={[styles.docChip, regForm.doctor === doc && styles.docChipActive]}
                    onPress={() => setRegForm(p => ({ ...p, doctor: doc }))}
                  >
                    <Text style={[styles.docChipText, regForm.doctor === doc && styles.docChipTextActive]}>
                      {doc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* If IPD: Room Allocation */}
              {regForm.visitType === 'IPD' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.inputLabel}>Allocated Room &amp; Bed</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={regForm.room}
                    onChangeText={txt => setRegForm(p => ({ ...p, room: txt }))}
                  />
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.submitRegBtn}
              activeOpacity={0.85}
              onPress={handleRegisterPatient}
            >
              <Text style={styles.submitRegBtnText}>Confirm Registration &amp; Issue UHID</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <WhatsAppFloat />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 80 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  screenTitle: { fontSize: 18, fontWeight: '900', color: Colors.navy, letterSpacing: -0.3 },
  screenSub: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  newRegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.headerTeal,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  newRegBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: {
    flexBasis: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase' },
  statVal: { fontSize: 22, fontWeight: '900', marginTop: 6 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.navy },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
  },
  toggleBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#ffffff' },
  toggleText: { fontSize: 11, fontWeight: '700', color: Colors.muted },
  toggleTextActive: { color: Colors.headerTeal },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: 14, fontWeight: '800', color: Colors.navy },
  uhidCode: { fontSize: 11, color: Colors.muted, fontFamily: 'monospace', marginTop: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  statusPending: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  statusConfirmed: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  statusPillText: { fontSize: 9.5, fontWeight: '800' },
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11, color: Colors.slate, fontWeight: '600' },
  cardBtnRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 4,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.headerTeal,
    paddingVertical: 8,
    borderRadius: 6,
  },
  confirmBtnText: { color: '#ffffff', fontSize: 11.5, fontWeight: '700' },
  confirmedNotice: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  confirmedNoticeText: { color: Colors.green, fontSize: 11, fontWeight: '800' },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  cancelBtnText: { color: Colors.red, fontSize: 11.5, fontWeight: '700' },
  bedGridContainer: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  wardHeading: { fontSize: 12, fontWeight: '800', color: Colors.navy, marginVertical: 8 },
  bedTilesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  bedTile: {
    width: '23%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
  },
  bedOccupied: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  bedAvailable: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  bedNumber: { fontSize: 10.5, fontWeight: '800', color: Colors.navy, marginTop: 4 },
  bedStateText: { fontSize: 8.5, fontWeight: '700', marginTop: 1 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: Colors.navy },
  modalSub: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  emergencyBannerActive: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  emergencyText: { fontSize: 11.5, fontWeight: '700', color: '#92400e' },
  inputLabel: { fontSize: 11.5, fontWeight: '700', color: Colors.navy, marginTop: 8, marginBottom: 4 },
  modalInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    color: Colors.navy,
  },
  rowInputs: { flexDirection: 'row', gap: 10 },
  typeSelector: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 3, marginTop: 4 },
  typeBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 6 },
  typeBtnActive: { backgroundColor: Colors.headerTeal },
  typeBtnText: { fontSize: 11, fontWeight: '700', color: Colors.muted },
  typeBtnTextActive: { color: '#ffffff' },
  doctorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  docChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
  docChipActive: { borderColor: Colors.headerTeal, backgroundColor: '#f0fdfa' },
  docChipText: { fontSize: 11, color: Colors.slate, fontWeight: '600' },
  docChipTextActive: { color: Colors.headerTeal, fontWeight: '800' },
  submitRegBtn: {
    backgroundColor: Colors.headerTeal,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitRegBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
});
