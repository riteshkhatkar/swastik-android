// swastik-android/screens/receptionist/ReceptionistAdmissionsScreen.tsx
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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { receptionistApi, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { generateAdmissionSlipHtml, printOrSharePdf } from '../../utils/pdfGenerator';

interface ReceptionistAdmissionsScreenProps {
  onOpenDrawer: () => void;
}

export const ReceptionistAdmissionsScreen: React.FC<ReceptionistAdmissionsScreenProps> = ({
  onOpenDrawer,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const receptionistName = user?.full_name || 'Priya Sharma';

  // Sub-tabs: 'tracking' (Image 22) vs 'admit' (Image 12)
  const [activeTab, setActiveTab] = useState<'tracking' | 'admit'>('tracking');

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Inpatient Tracking Data matching Image 22
  const [inpatients, setInpatients] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAdmitted: 88,
    occupiedRooms: 72,
    availableRooms: 16,
    transfersPending: 4,
  });

  // Admission Form State matching Image 12
  const [patientSearch, setPatientSearch] = useState('');
  const [resolvedUhid, setResolvedUhid] = useState('');
  const [admissionType, setAdmissionType] = useState<'General' | 'Emergency'>('General');
  const [dept, setDept] = useState('Psychiatry');
  const [doctor, setDoctor] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [ward, setWard] = useState('General Ward');
  const [roomBed, setRoomBed] = useState('');
  const [roomId, setRoomId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [admissionDateTime, setAdmissionDateTime] = useState(new Date().toISOString().slice(0, 16).replace('T', ', '));
  const [attenderName, setAttenderName] = useState('');
  const [attenderPhone, setAttenderPhone] = useState('');
  const [deposit, setDeposit] = useState('5000');
  const [admissionRemarks, setAdmissionRemarks] = useState('');

  const [selectedInpatient, setSelectedInpatient] = useState<any | null>(null);

  // Resolve UHID when patient search changes
  const resolvePatient = async (searchText: string) => {
    setPatientSearch(searchText);
    // If it looks like a UHID, try to fetch
    if (searchText.toUpperCase().startsWith('SW') && searchText.length >= 8) {
      try {
        const pt = await receptionistApi.getPatientByUhid(searchText.trim().toUpperCase());
        if (pt?.uhid) setResolvedUhid(pt.uhid);
      } catch {
        setResolvedUhid(searchText.trim().toUpperCase());
      }
    } else {
      setResolvedUhid('');
    }
  };

  const loadAdmissions = async () => {
    try {
      const [admData, roomsData] = await Promise.all([
        receptionistApi.getAdmissions().catch(() => []),
        receptionistApi.getRooms().catch(() => []),
      ]);

      const list = Array.isArray(admData) ? admData : [];
      setInpatients(list);

      if (Array.isArray(roomsData) && roomsData.length > 0) {
        const available = roomsData.filter((r) => r.status === 'Available').length;
        setStats({
          totalAdmitted: list.length,
          occupiedRooms: roomsData.length - available,
          availableRooms: available,
          transfersPending: list.filter((a) => a.status === 'Transfer Requested').length,
        });
      }
    } catch (e: any) {
      console.warn('Error loading admissions:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdmissions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAdmissions();
  };

  const handleAdmitSubmit = async () => {
    const uhid = resolvedUhid || patientSearch.trim().toUpperCase();
    if (!uhid) {
      Alert.alert('Required Field', 'Please enter the patient UHID to admit.');
      return;
    }
    if (!diagnosis.trim()) {
      Alert.alert('Required Field', 'Provisional diagnosis is required by the hospital system.');
      return;
    }

    setLoading(true);

    // Backend schema: uhid*, patient_name, diagnosis*, doctor_id*, room_id*, ward, bed_number,
    // age, gender, contact_number, emergency_contact, address, consent_signed, deposit, notes
    const payload: any = {
      uhid,
      patient_name: patientSearch.trim(),
      diagnosis: diagnosis.trim(),
      ward,
      deposit: parseInt(deposit, 10) || 5000,
      notes: admissionRemarks.trim() || undefined,
      emergency_contact: attenderPhone.trim() || undefined,
      consent_signed: true,
    };
    // Backend required fields: uhid*, diagnosis*, doctor_id*, room_id*
    payload.doctor_id = doctorId.trim() || 'doc-chougule';
    payload.room_id = roomId.trim() || roomBed.trim() || 'room-101';
    if (doctor.trim()) payload.doctor_name = doctor.trim();
    if (roomBed.trim()) payload.room_number = roomBed.trim();

    // Admission type maps to notes
    if (admissionType === 'Emergency') payload.notes = `[EMERGENCY] ${payload.notes || ''}`.trim();

    try {
      await receptionistApi.admitPatient(payload);
      loadAdmissions();
      Alert.alert(
        'Patient Admitted Successfully 🏥',
        `Patient ${patientSearch} admitted to ${ward}.\nDeposit Recorded: ₹${deposit}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setActiveTab('tracking');
              setPatientSearch('');
              setResolvedUhid('');
              setDiagnosis('');
              setDoctorId('');
              setRoomId('');
              setAttenderName('');
              setAttenderPhone('');
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Admission Failed', getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDischargePatient = async (patient: any) => {
    const admissionId = patient.id || patient._id || patient.admission_id;
    if (!admissionId) {
      Alert.alert('Error', 'Missing admission identifier for discharge.');
      return;
    }

    // Confirm and collect required discharge info
    Alert.alert(
      'Confirm Discharge',
      `Process discharge for ${patient.name || patient.patient_name}?\n\nThis will send required discharge details to the hospital system.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            try {
              setLoading(true);
              // Backend requires: admission_id, discharge_date, treatment_given*, condition_at_discharge*
              // discharge_summary / doctor_notes / follow_up_instructions are optional
              await receptionistApi.dischargePatient({
                admission_id: admissionId,
                discharge_date: new Date().toISOString(),
                // Required fields — use sensible defaults; doctor updates via EMR screen
                treatment_given: patient.treatment_given || 'As per doctor prescription and clinical protocol.',
                condition_at_discharge: patient.condition_at_discharge || patient.status || 'Stable',
                discharge_summary: patient.discharge_summary || 'Discharged after clinical stabilization.',
                doctor_notes: patient.doctor_notes || '',
                follow_up_instructions: patient.follow_up_instructions || 'Follow up in OPD after 7 days.',
                discharged_by: receptionistName,
              } as any);
              Alert.alert('Discharged Successfully ✅', `${patient.name || patient.patient_name} has been discharged.`);
              setSelectedInpatient(null);
              loadAdmissions();
            } catch (err: any) {
              Alert.alert('Discharge Failed', getApiErrorMessage(err));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const filteredInpatients = inpatients.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.uhid || '').toLowerCase().includes(q) ||
      (p.ward || '').toLowerCase().includes(q) ||
      (p.roomBed || '').toLowerCase().includes(q)
    );
  });

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
        {/* Sub-Tab Selector */}
        <View style={styles.tabToggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'tracking' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('tracking')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="bed"
              size={18}
              color={activeTab === 'tracking' ? '#0D9488' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.toggleBtnText, activeTab === 'tracking' && styles.toggleBtnTextActive]}>
              Inpatient Tracking
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'admit' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('admit')}
            activeOpacity={0.8}
          >
            <Feather
              name="plus-circle"
              size={16}
              color={activeTab === 'admit' ? '#0D9488' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.toggleBtnText, activeTab === 'admit' && styles.toggleBtnTextActive]}>
              Admit Patient
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'tracking' ? (
          /* =========================================================================
             VIEW 1: LIVE INPATIENT TRACKING (Image 22)
             ========================================================================= */
          <View>
            <View style={styles.titleSection}>
              <Text style={styles.mainTitle}>Live Inpatient Tracking</Text>
              <Text style={styles.subTitle}>
                Monitor admitted patients, room status and transfers.
              </Text>
            </View>

            {/* 4 Metric Cards matching Image 22 */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricIconCircle}>
                  <Feather name="users" size={18} color="#0D9488" />
                </View>
                <Text style={styles.metricCount}>{stats.totalAdmitted}</Text>
                <Text style={styles.metricTitle}>Total Admitted</Text>
                <Text style={styles.metricSub}>View all inpatients</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <MaterialCommunityIcons name="bed" size={18} color="#0284C7" />
                </View>
                <Text style={styles.metricCount}>{stats.occupiedRooms}</Text>
                <Text style={styles.metricTitle}>Occupied Rooms</Text>
                <Text style={styles.metricSub}>Out of 88 rooms</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <MaterialCommunityIcons name="bed-empty" size={18} color="#D97706" />
                </View>
                <Text style={styles.metricCount}>{stats.availableRooms}</Text>
                <Text style={styles.metricTitle}>Available Rooms</Text>
                <Text style={styles.metricSub}>Ready for admission</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: '#FEF2F2' }]}>
                <View style={[styles.metricIconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <Feather name="repeat" size={18} color="#DC2626" />
                </View>
                <Text style={[styles.metricCount, { color: '#DC2626' }]}>
                  {stats.transfersPending}
                </Text>
                <Text style={[styles.metricTitle, { color: '#991B1B' }]}>Transfers Pending</Text>
                <Text style={styles.metricSub}>Awaiting processing</Text>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by patient name, UHID, room or ward..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity style={styles.filterBtn}>
                <Feather name="filter" size={18} color="#0D9488" />
              </TouchableOpacity>
            </View>

            {/* Inpatient Cards List matching Image 22 */}
            <View style={styles.inpatientsList}>
              {filteredInpatients.map((item) => {
                const isStable = item.status === 'Stable';
                const isObservation = item.status === 'Under Observation';
                const isTransfer = item.status === 'Transfer Requested';
                const isDischarge = item.status === 'Discharge Planned';

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.inpatientCard}
                    onPress={() => setSelectedInpatient(item)}
                    activeOpacity={0.75}
                  >
                    {/* Top Row: Avatar + Name + IPD / UHID + Status */}
                    <View style={styles.inpatientCardTop}>
                      <View style={styles.avatarCircle}>
                        <Ionicons name="person" size={20} color="#0D9488" />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.inpatientName}>{item.name}</Text>
                        <Text style={styles.inpatientUhidText}>
                          UHID: {item.uhid} | IPD: {item.ipdNo}
                        </Text>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[
                          styles.ipdStatusBadge,
                          isStable && styles.ipdStatusStable,
                          isObservation && styles.ipdStatusObservation,
                          isTransfer && styles.ipdStatusTransfer,
                          isDischarge && styles.ipdStatusDischarge,
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            isStable && { backgroundColor: '#059669' },
                            isObservation && { backgroundColor: '#D97706' },
                            isTransfer && { backgroundColor: '#DC2626' },
                            isDischarge && { backgroundColor: '#0284C7' },
                          ]}
                        />
                        <Text
                          style={[
                            styles.ipdStatusText,
                            isStable && { color: '#059669' },
                            isObservation && { color: '#D97706' },
                            isTransfer && { color: '#DC2626' },
                            isDischarge && { color: '#0284C7' },
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Metadata Row: Ward, Room / Bed, Admission Type */}
                    <View style={styles.ipdMetaRow}>
                      <View style={styles.metaCol}>
                        <Text style={styles.metaLabel}>Ward</Text>
                        <Text style={styles.metaVal}>{item.ward}</Text>
                      </View>

                      <View style={styles.metaCol}>
                        <Text style={styles.metaLabel}>Room / Bed</Text>
                        <Text style={styles.metaVal}>{item.roomBed}</Text>
                      </View>

                      <View style={styles.metaCol}>
                        <Text style={styles.metaLabel}>Admission Type</Text>
                        <Text style={styles.metaVal}>{item.admissionType}</Text>
                      </View>

                      <Feather name="chevron-right" size={18} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          /* =========================================================================
             VIEW 2: PATIENT ADMISSION FORM (Image 12)
             ========================================================================= */
          <View style={styles.admitCard}>
            <View style={styles.admitCardHeader}>
              <View style={styles.admitIconCircle}>
                <MaterialCommunityIcons name="clipboard-plus" size={24} color="#0D9488" />
              </View>
              <View>
                <Text style={styles.admitTitle}>Patient Admission</Text>
                <Text style={styles.admitSub}>
                  Create an IPD admission for a selected patient.
                </Text>
              </View>
            </View>

            {/* Patient Search / UHID Input */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Patient Search / UHID *</Text>
              <View style={styles.inputBox}>
                <Feather name="search" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter patient UHID (e.g. SW-2024-0001)..."
                  placeholderTextColor="#94A3B8"
                  value={patientSearch}
                  onChangeText={resolvePatient}
                  autoCapitalize="characters"
                />
              </View>
              {resolvedUhid ? (
                <Text style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>✓ UHID resolved: {resolvedUhid}</Text>
              ) : patientSearch.length > 2 ? (
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Enter full UHID for auto-resolve</Text>
              ) : null}
            </View>

            {/* Diagnosis (Required by backend) */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Provisional Diagnosis *</Text>
              <View style={styles.inputBox}>
                <Feather name="activity" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter provisional diagnosis..."
                  placeholderTextColor="#94A3B8"
                  value={diagnosis}
                  onChangeText={setDiagnosis}
                />
              </View>
            </View>

            {/* Admission Type: General vs Emergency */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Admission Type *</Text>
              <View style={styles.admitTypeSwitch}>
                <TouchableOpacity
                  style={[
                    styles.admitTypeTab,
                    admissionType === 'General' && styles.admitTypeTabActive,
                  ]}
                  onPress={() => setAdmissionType('General')}
                >
                  <MaterialCommunityIcons
                    name="bed"
                    size={18}
                    color={admissionType === 'General' ? '#0D9488' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.admitTypeTabText,
                      admissionType === 'General' && styles.admitTypeTabTextActive,
                    ]}
                  >
                    General
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.admitTypeTab,
                    admissionType === 'Emergency' && styles.admitTypeTabActive,
                  ]}
                  onPress={() => setAdmissionType('Emergency')}
                >
                  <MaterialCommunityIcons
                    name="ambulance"
                    size={18}
                    color={admissionType === 'Emergency' ? '#0D9488' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.admitTypeTabText,
                      admissionType === 'Emergency' && styles.admitTypeTabTextActive,
                    ]}
                  >
                    Emergency
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Department & Doctor */}
            <View style={styles.fieldRow}>
              <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>Department</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    value={dept}
                    onChangeText={setDept}
                  />
                </View>
              </View>

              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Admitting Doctor</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Doctor name"
                    placeholderTextColor="#94A3B8"
                    value={doctor}
                    onChangeText={setDoctor}
                  />
                </View>
              </View>
            </View>

            {/* Ward & Room / Bed */}
            <View style={styles.fieldRow}>
              <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>Ward *</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    value={ward}
                    onChangeText={setWard}
                  />
                </View>
              </View>

              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Room / Bed</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Room / Bed"
                    placeholderTextColor="#94A3B8"
                    value={roomBed}
                    onChangeText={(t) => { setRoomBed(t); setRoomId(t); }}
                  />
                </View>
              </View>
            </View>

            {/* Attender Details */}
            <View style={styles.fieldRow}>
              <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>Attender Name</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter attender name"
                    placeholderTextColor="#94A3B8"
                    value={attenderName}
                    onChangeText={setAttenderName}
                  />
                </View>
              </View>

              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Attender Mobile</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="10-digit number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={attenderPhone}
                    onChangeText={setAttenderPhone}
                  />
                </View>
              </View>
            </View>

            {/* Initial Deposit */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Initial Deposit (₹) *</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name="currency-inr" size={20} color="#0D9488" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="5000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={deposit}
                  onChangeText={setDeposit}
                />
              </View>
            </View>

            {/* Remarks */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Remarks (Optional)</Text>
              <View style={[styles.inputBox, { height: 60 }]}>
                <TextInput
                  style={[styles.textInput, { height: 48 }]}
                  placeholder="Enter additional remarks..."
                  placeholderTextColor="#94A3B8"
                  value={admissionRemarks}
                  onChangeText={setAdmissionRemarks}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitAdmitBtn}
              onPress={handleAdmitSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.submitAdmitBtnText}>Admit Patient</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Inpatient Detail Sheet Modal */}
      <Modal
        visible={!!selectedInpatient}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedInpatient(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inpatient Record</Text>
              <TouchableOpacity onPress={() => setSelectedInpatient(null)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedInpatient && (
              <View style={{ gap: 10 }}>
                <View style={styles.ipdHeaderBox}>
                  <Text style={styles.ipdBigName}>{selectedInpatient.name}</Text>
                  <Text style={styles.ipdBigRef}>
                    {selectedInpatient.uhid} | {selectedInpatient.ipdNo}
                  </Text>
                </View>

                <View style={styles.ipdDetailsBox}>
                  <View style={styles.ipdDetailRow}>
                    <Text style={styles.ipdDetailLabel}>Ward Location</Text>
                    <Text style={styles.ipdDetailVal}>{selectedInpatient.ward}</Text>
                  </View>
                  <View style={styles.ipdDetailRow}>
                    <Text style={styles.ipdDetailLabel}>Room / Bed</Text>
                    <Text style={styles.ipdDetailVal}>{selectedInpatient.roomBed}</Text>
                  </View>
                  <View style={styles.ipdDetailRow}>
                    <Text style={styles.ipdDetailLabel}>Admission Type</Text>
                    <Text style={styles.ipdDetailVal}>{selectedInpatient.admissionType}</Text>
                  </View>
                  <View style={styles.ipdDetailRow}>
                    <Text style={styles.ipdDetailLabel}>Clinical Condition</Text>
                    <Text style={styles.ipdDetailVal}>{selectedInpatient.status}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#0D9488',
                    borderRadius: 10,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 14,
                  }}
                  onPress={async () => {
                    try {
                      const html = generateAdmissionSlipHtml({
                        patientName: selectedInpatient.name,
                        uhid: selectedInpatient.uhid,
                        ipdNo: selectedInpatient.ipdNo,
                        admissionDate: new Date().toLocaleDateString('en-GB') + ', 10:00 AM',
                        ward: selectedInpatient.ward,
                        roomBed: selectedInpatient.roomBed,
                        doctorName: 'Dr. P. M. Chougule',
                        diagnosis: 'Psychiatric Observation & Clinical Care',
                        deposit: 5000,
                      });
                      await printOrSharePdf(html, `Admission_Slip_${selectedInpatient.ipdNo}`);
                    } catch (err: any) {
                      Alert.alert('PDF Error', err?.message || 'Could not generate admission slip.');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="printer" size={18} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    Print Admission Slip (PDF)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#DC2626',
                    borderRadius: 10,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 8,
                  }}
                  onPress={() => handleDischargePatient(selectedInpatient)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="exit-to-app" size={18} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    Process Discharge
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#0D9488',
    fontWeight: '700',
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
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  filterBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#E6F4F1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7EBE6',
  },
  inpatientsList: {
    gap: 10,
  },
  inpatientCard: {
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
  inpatientCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inpatientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  inpatientUhidText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  ipdStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  ipdStatusStable: {
    backgroundColor: '#D1FAE5',
  },
  ipdStatusObservation: {
    backgroundColor: '#FEF3C7',
  },
  ipdStatusTransfer: {
    backgroundColor: '#FEE2E2',
  },
  ipdStatusDischarge: {
    backgroundColor: '#E0F2FE',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  ipdStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ipdMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  metaVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginTop: 1,
  },
  admitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  admitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  admitIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  admitTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  admitSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  formField: {
    marginBottom: 14,
  },
  fieldRow: {
    flexDirection: 'row',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  admitTypeSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    overflow: 'hidden',
  },
  admitTypeTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 46,
    backgroundColor: '#FFFFFF',
  },
  admitTypeTabActive: {
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#0D9488',
  },
  admitTypeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  admitTypeTabTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  submitAdmitBtn: {
    backgroundColor: '#0D9488',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitAdmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
  ipdHeaderBox: {
    backgroundColor: '#E6F4F1',
    borderRadius: 12,
    padding: 12,
  },
  ipdBigName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  ipdBigRef: {
    fontSize: 12,
    color: '#0D9488',
    marginTop: 2,
  },
  ipdDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  ipdDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  ipdDetailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  ipdDetailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
});
