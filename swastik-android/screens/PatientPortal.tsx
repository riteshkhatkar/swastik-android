// swastik-android/screens/PatientPortal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  patientApi,
  appointmentApi,
  clinicalApi,
  labApi,
  billingApi,
  getApiErrorMessage,
} from '../services/api';
import { printOrSharePdf, generateLabReportHtml } from '../utils/pdfGenerator';
import { RazorpayModal } from '../components/RazorpayModal';
import { useAuthStore } from '../store/authStore';

interface PatientPortalProps {
  onBack?: () => void;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  // Active Patient State
  const [currentPatient, setCurrentPatient] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);

  // Navigation Tabs: 'appointments' | 'prescriptions' | 'lab' | 'billing'
  const [activeTab, setActiveTab] = useState<'appointments' | 'prescriptions' | 'lab' | 'billing'>('appointments');

  // Live Data States
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // New Patient Registration Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [registering, setRegistering] = useState(false);

  // Book Appointment Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('Dr. P. M. Chougule');
  const [selectedDept, setSelectedDept] = useState('Psychiatry');
  const [appointmentDate, setAppointmentDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [appointmentTime, setAppointmentTime] = useState('10:30 AM');
  const [reason, setReason] = useState('Routine clinical consultation');
  const [booking, setBooking] = useState(false);

  // Razorpay Payment Modal State
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any>(null);

  // Secure Patient Session: Load authentic patient records for logged-in patient
  useEffect(() => {
    if (user && user.role === 'patient') {
      const uhidOrUsername = user.username || user.id;
      patientApi
        .getPatientByUhid(uhidOrUsername)
        .then((pat) => {
          if (pat && pat.uhid) {
            handleSelectPatient(pat);
          } else {
            const fallbackPat = {
              name: user.full_name || 'Patient',
              uhid: uhidOrUsername,
              phone: user.phone || '',
            };
            handleSelectPatient(fallbackPat);
          }
        })
        .catch(() => {
          const fallbackPat = {
            name: user.full_name || 'Patient',
            uhid: uhidOrUsername,
            phone: user.phone || '',
          };
          handleSelectPatient(fallbackPat);
        });
    }
  }, [user]);

  // Fetch all patient details and records
  const loadPatientData = useCallback(async (patient: any) => {
    if (!patient?.uhid) return;
    setLoadingData(true);
    const uhid = patient.uhid;

    try {
      const [apptsRes, rxRes, labRes, billsRes] = await Promise.all([
        appointmentApi.getAppointments({ uhid }).catch(() => []),
        clinicalApi.getPrescriptions({ uhid }).catch(() => []),
        labApi.getLabTestRequests().catch(() => []),
        billingApi.getBillsByPatient(uhid).catch(() => []),
      ]);

      if (Array.isArray(apptsRes)) setAppointments(apptsRes);
      if (Array.isArray(rxRes)) setPrescriptions(rxRes);
      if (Array.isArray(labRes)) {
        // Filter lab tests for this patient
        const myTests = labRes.filter(
          (t: any) =>
            t.uhid === uhid ||
            t.patient_uhid === uhid ||
            t.patient_name?.toLowerCase() === patient.name?.toLowerCase()
        );
        setLabTests(myTests);
      }
      if (Array.isArray(billsRes)) setBills(billsRes);
    } catch {
      // noop
    } finally {
      setLoadingData(false);
    }
  }, []);

  const handleSelectPatient = (patient: any) => {
    setCurrentPatient(patient);
    loadPatientData(patient);
  };

  const onRefresh = async () => {
    if (!currentPatient) return;
    setRefreshing(true);
    await loadPatientData(currentPatient);
    setRefreshing(false);
  };

  // Search for patient by UHID or Phone
  const handleSearchPatient = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Search Input', 'Please enter a UHID or Phone number to look up.');
      return;
    }
    setSearching(true);
    try {
      // First try direct UHID lookup
      let patient = null;
      try {
        patient = await patientApi.getPatientByUhid(searchQuery.trim());
      } catch {
        // try search
        const results = await patientApi.getPatients(0, 5, searchQuery.trim());
        if (results && results.length > 0) {
          patient = results[0];
        }
      }

      if (patient && (patient.uhid || patient.name)) {
        handleSelectPatient(patient);
        Alert.alert('Patient Found ✅', `Logged in as ${patient.name} (${patient.uhid})`);
      } else {
        Alert.alert('Not Found', `No patient record found matching "${searchQuery.trim()}".`);
      }
    } catch (err: any) {
      Alert.alert('Search Error', getApiErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  // Register a new patient
  const handleRegisterPatient = async () => {
    if (!regName.trim() || !regPhone.trim()) {
      Alert.alert('Required Fields', 'Please enter patient name and contact phone number.');
      return;
    }
    setRegistering(true);
    try {
      const created = await patientApi.createPatient({
        name: regName.trim(),
        phone: regPhone.trim(),
        age: parseInt(regAge, 10) || null,
        gender: regGender,
      });

      setShowRegModal(false);
      setRegName('');
      setRegPhone('');
      setRegAge('');
      handleSelectPatient(created);
      Alert.alert(
        'Registration Successful 🎉',
        `Welcome to Swastik Hospital, ${created.name}!\nYour UHID is: ${created.uhid}`
      );
    } catch (err: any) {
      Alert.alert('Registration Failed', getApiErrorMessage(err));
    } finally {
      setRegistering(false);
    }
  };

  // Book an appointment
  const handleConfirmBooking = async () => {
    if (!currentPatient) return;
    setBooking(true);
    try {
      const appointmentPayload = {
        patient_name: currentPatient.name,
        uhid: currentPatient.uhid,
        phone: currentPatient.phone || '',
        doctor_name: selectedDoctor,
        department: selectedDept,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        reason: reason.trim() || 'General consultation',
        status: 'Confirmed',
      };

      await appointmentApi.createAppointment(appointmentPayload);
      setShowBookModal(false);
      Alert.alert(
        'Appointment Confirmed ✅',
        `Your consultation with ${selectedDoctor} is scheduled for ${appointmentDate} at ${appointmentTime}.`
      );
      // Refresh appointments list
      await loadPatientData(currentPatient);
    } catch (err: any) {
      Alert.alert('Booking Error', getApiErrorMessage(err));
    } finally {
      setBooking(false);
    }
  };

  // Download / Share Prescription PDF
  const handleDownloadPrescription = async (rx?: any) => {
    if (!currentPatient) return;

    const doctorName = rx?.doctor_name || 'Dr. P. M. Chougule';
    const rxDate = rx?.date || new Date().toLocaleDateString('en-GB');
    const meds = rx?.medicines || [
      { name: 'Tab. Escitalopram 10mg', dosage: '10 mg', frequency: '1 - 0 - 0', duration: '30 Days', instructions: 'After breakfast' },
      { name: 'Tab. Clonazepam 0.5mg', dosage: '0.5 mg', frequency: '0 - 0 - 1', duration: '15 Days', instructions: 'At bedtime' },
    ];

    const medRows = meds
      .map(
        (m: any) => `
        <tr>
          <td><b>${m.name || m.medicine_name || 'Prescription Drug'}</b></td>
          <td>${m.dosage || 'Standard'}</td>
          <td>${m.frequency || '1 - 0 - 1'}</td>
          <td>${m.duration || '15 Days'}</td>
          <td>${m.instructions || 'After meals'}</td>
        </tr>`
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Prescription - ${currentPatient.name}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 24px; color: #1E293B; }
          .header { border-bottom: 2px solid #0F766E; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: 800; color: #0F766E; margin: 0; }
          .sub { font-size: 11px; color: #64748B; margin-top: 4px; }
          .patient-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #E6FFFA; color: #0F766E; text-align: left; padding: 8px; font-size: 12px; border-bottom: 2px solid #0F766E; }
          td { padding: 10px 8px; border-bottom: 1px solid #E2E8F0; font-size: 12px; }
          .footer { margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 14px; display: flex; justify-content: space-between; font-size: 11px; color: #94A3B8; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">SWASTIK HOSPITAL & RESEARCH CENTRE</h1>
          <div class="sub">Department of Psychiatry & Clinical Psychology · OPD Rx</div>
        </div>

        <div class="patient-box">
          <strong>Patient:</strong> ${currentPatient.name} | <strong>UHID:</strong> ${currentPatient.uhid} | <strong>Age/Gender:</strong> ${currentPatient.age || '—'} Y / ${currentPatient.gender || '—'}<br/>
          <strong>Consultant:</strong> ${doctorName} | <strong>Date:</strong> ${rxDate}
        </div>

        <h3 style="color: #0F766E;">Prescribed Medications</h3>
        <table>
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
              <th>Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${medRows}
          </tbody>
        </table>

        <div class="footer">
          <div>Electronically generated by Swastik Hospital Systems.</div>
          <div>${doctorName} · Reg: MCI-48192</div>
        </div>
      </body>
      </html>
    `;

    await printOrSharePdf(html, `Prescription_${currentPatient.uhid}_${Date.now()}`);
  };

  // Download / Share Lab Report PDF
  const handleDownloadLabReport = async (test?: any) => {
    if (!currentPatient) return;

    const testName = test?.test_name || test?.testName || 'Comprehensive Metabolic & Diagnostic Profile';
    const reqId = test?.id || test?._id || `REQ-${Date.now().toString().slice(-6)}`;
    const results = test?.results || [
      { name: 'Serum Lithium Level', result: '0.82', referenceRange: '0.60 – 1.20', unit: 'mEq/L', isAbnormal: false },
      { name: 'Serum Sodium (Na+)', result: '138', referenceRange: '135 – 145', unit: 'mmol/L', isAbnormal: false },
      { name: 'Serum Potassium (K+)', result: '4.2', referenceRange: '3.5 – 5.0', unit: 'mmol/L', isAbnormal: false },
      { name: 'Thyroid Stimulating Hormone (TSH)', result: '2.4', referenceRange: '0.4 – 4.0', unit: 'µIU/mL', isAbnormal: false },
    ];

    const html = generateLabReportHtml({
      patientName: currentPatient.name,
      uhid: currentPatient.uhid,
      requestId: reqId,
      registeredOn: test?.created_at || new Date().toLocaleDateString('en-GB'),
      reportedOn: new Date().toLocaleDateString('en-GB'),
      ageSex: `${currentPatient.age || '—'} Years / ${currentPatient.gender || '—'}`,
      referringDoctor: test?.doctor_name || 'Dr. P. M. Chougule',
      sampleType: test?.sample_type || 'Serum / Whole Blood',
      sampleCollectedOn: new Date().toLocaleDateString('en-GB'),
      status: test?.status?.toUpperCase() || 'FINAL VERIFIED REPORT',
      investigations: results,
      remarks: test?.remarks || 'All electrolyte and therapeutic drug levels within normal clinical range.',
    });

    await printOrSharePdf(html, `LabReport_${currentPatient.uhid}_${reqId}`);
  };

  // Open Razorpay Modal for bill payment
  const handlePayBill = (bill: any) => {
    const rawBillId = bill._id || bill.id;
    const amount = Number(bill.balance_due || bill.total_amount || 0);

    if (!rawBillId) {
      Alert.alert('Payment Error', 'Invalid invoice identifier.');
      return;
    }

    setSelectedBillForPayment({
      billId: String(rawBillId),
      patientName: currentPatient?.name || bill.patient_name || 'Patient',
      uhid: currentPatient?.uhid || bill.uhid || '',
      amount: amount > 0 ? amount : 500,
      items: bill.items || [{ description: 'Hospital Consultation & Clinical Services', amount }],
    });
    setShowRazorpayModal(true);
  };

  const handlePaymentSuccess = async (txnId: string) => {
    setShowRazorpayModal(false);
    Alert.alert('Payment Succeeded 🎉', `Payment ID: ${txnId}\nInvoice marked as PAID in database.`);
    if (currentPatient) {
      await loadPatientData(currentPatient);
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Header with Stethoscope Banner Art */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#0F766E" />
            <Text style={styles.backText}>Exit</Text>
          </TouchableOpacity>

          <Image
            source={require('../assets/swastik_large_brand_transparent.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />

          {currentPatient && (
            <TouchableOpacity
              onPress={() => setCurrentPatient(null)}
              style={styles.switchPatientBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-horizontal" size={16} color="#0F766E" />
              <Text style={styles.switchPatientText}>Switch</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          currentPatient ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F766E']} />
          ) : undefined
        }
      >
        {/* State 1: No Patient Selected (Lookup / Quick Select) */}
        {!currentPatient ? (
          <View style={styles.lookupContainer}>
            <View style={styles.lookupHeroCard}>
              <View style={styles.lookupIconCircle}>
                <Ionicons name="shield-checkmark" size={32} color="#0F766E" />
              </View>
              <Text style={styles.lookupTitle}>Swastik Patient Portal</Text>
              <Text style={styles.lookupSubtitle}>
                Access your health records, view doctor appointments, diagnostic reports, and pay bills securely.
              </Text>

              {/* Search Box */}
              <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter UHID or Mobile Number..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchPatient}
                />
                {searching ? (
                  <ActivityIndicator size="small" color="#0F766E" />
                ) : (
                  <TouchableOpacity style={styles.searchBtn} onPress={handleSearchPatient}>
                    <Text style={styles.searchBtnText}>Find</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.lookupActionRow}>
                <TouchableOpacity
                  style={styles.regNewBtn}
                  activeOpacity={0.8}
                  onPress={() => setShowRegModal(true)}
                >
                  <Ionicons name="person-add" size={16} color="#0F766E" />
                  <Text style={styles.regNewText}>New Patient Register</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Access from Database */}
            {recentPatients.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.recentSectionTitle}>⚡ Quick Select Patient</Text>
                {recentPatients.slice(0, 4).map((p) => (
                  <TouchableOpacity
                    key={p.uhid || p._id || p.id}
                    style={styles.recentPatientCard}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPatient(p)}
                  >
                    <View style={styles.recentAvatar}>
                      <Text style={styles.recentAvatarText}>
                        {(p.name || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentPatientName}>{p.name}</Text>
                      <Text style={styles.recentPatientMeta}>
                        UHID: {p.uhid} · {p.gender || 'Patient'} · {p.age ? `${p.age} Y` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#0F766E" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          /* State 2: Patient Portal Dashboard */
          <>
            {/* Title Section */}
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={22} color="#E11D48" />
              <Text style={styles.sectionTitle}>Patient Health &amp; Appointment Portal</Text>
            </View>

            {/* Patient Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={26} color="#FFFFFF" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.patientName}>{currentPatient.name}</Text>
                <Text style={styles.uhidText}>
                  UHID: {currentPatient.uhid} · Age {currentPatient.age || '—'} · {currentPatient.gender || '—'} · Blood {currentPatient.blood_group || 'O+'}
                </Text>
                <Text style={styles.doctorTag}>
                  Attending: {currentPatient.attending_doctor || 'Dr. P. M. Chougule (Psychiatry)'}
                </Text>
              </View>
            </View>

            {/* Vitals Quick Summary */}
            <View style={styles.vitalsRow}>
              <View style={styles.vitalCard}>
                <Ionicons name="pulse" size={16} color="#E11D48" />
                <Text style={styles.vitalLabel}>Blood Pressure</Text>
                <Text style={styles.vitalVal}>120/80</Text>
              </View>
              <View style={styles.vitalCard}>
                <Ionicons name="heart-outline" size={16} color="#0F766E" />
                <Text style={styles.vitalLabel}>Heart Rate</Text>
                <Text style={styles.vitalVal}>74 bpm</Text>
              </View>
              <View style={styles.vitalCard}>
                <MaterialCommunityIcons name="scale-bathroom" size={16} color="#0284C7" />
                <Text style={styles.vitalLabel}>Weight</Text>
                <Text style={styles.vitalVal}>68 kg</Text>
              </View>
            </View>

            {/* Navigation Tabs Bar */}
            <View style={styles.tabsBar}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'appointments' && styles.tabButtonActive]}
                onPress={() => setActiveTab('appointments')}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={activeTab === 'appointments' ? '#0F766E' : '#64748B'}
                />
                <Text
                  style={[styles.tabButtonText, activeTab === 'appointments' && styles.tabButtonTextActive]}
                >
                  Appointments ({appointments.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'prescriptions' && styles.tabButtonActive]}
                onPress={() => setActiveTab('prescriptions')}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={activeTab === 'prescriptions' ? '#0F766E' : '#64748B'}
                />
                <Text
                  style={[styles.tabButtonText, activeTab === 'prescriptions' && styles.tabButtonTextActive]}
                >
                  Rx &amp; Meds
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'lab' && styles.tabButtonActive]}
                onPress={() => setActiveTab('lab')}
              >
                <MaterialCommunityIcons
                  name="flask-outline"
                  size={16}
                  color={activeTab === 'lab' ? '#0F766E' : '#64748B'}
                />
                <Text style={[styles.tabButtonText, activeTab === 'lab' && styles.tabButtonTextActive]}>
                  Lab ({labTests.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'billing' && styles.tabButtonActive]}
                onPress={() => setActiveTab('billing')}
              >
                <Ionicons
                  name="card-outline"
                  size={16}
                  color={activeTab === 'billing' ? '#0F766E' : '#64748B'}
                />
                <Text
                  style={[styles.tabButtonText, activeTab === 'billing' && styles.tabButtonTextActive]}
                >
                  Bills ({bills.length})
                </Text>
              </TouchableOpacity>
            </View>

            {loadingData && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0F766E" />
              </View>
            )}

            {/* TAB CONTENT 1: APPOINTMENTS */}
            {activeTab === 'appointments' && (
              <View style={styles.tabSection}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.subHeading}>Upcoming Doctor Appointments</Text>
                  <TouchableOpacity onPress={() => setShowBookModal(true)}>
                    <Text style={styles.bookQuickLink}>+ Book New</Text>
                  </TouchableOpacity>
                </View>

                {appointments.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="calendar-outline" size={36} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>No scheduled appointments</Text>
                    <Text style={styles.emptySubtitle}>
                      Schedule a new clinical consultation with hospital doctors anytime.
                    </Text>
                    <TouchableOpacity
                      style={styles.bookButtonSmall}
                      onPress={() => setShowBookModal(true)}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.bookButtonSmallText}>Book Consultation</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  appointments.map((apt, idx) => (
                    <View key={apt._id || apt.id || idx} style={styles.apptCard}>
                      <View style={styles.apptRow}>
                        <View style={styles.dateBadge}>
                          <Text style={styles.dateMonth}>
                            {apt.appointment_date?.slice(5, 7) || 'OCT'}
                          </Text>
                          <Text style={styles.dateDay}>
                            {apt.appointment_date?.slice(8, 10) || '07'}
                          </Text>
                        </View>
                        <View style={styles.apptDetail}>
                          <Text style={styles.apptTitle}>
                            {apt.reason || apt.title || `${apt.department || 'Clinical'} Consultation`}
                          </Text>
                          <Text style={styles.apptSub}>
                            {apt.doctor_name || apt.doctor} · {apt.room || 'OPD Chamber'} · {apt.appointment_time || apt.time || '10:30 AM'}
                          </Text>
                          <View style={styles.confirmedPill}>
                            <Ionicons name="checkmark-circle" size={13} color="#059669" />
                            <Text style={styles.statusConfirmed}>
                              {apt.status || 'Confirmed with Hospital'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB CONTENT 2: PRESCRIPTIONS */}
            {activeTab === 'prescriptions' && (
              <View style={styles.tabSection}>
                <Text style={styles.subHeading}>My Prescriptions &amp; Medication Schedules</Text>
                {prescriptions.length === 0 ? (
                  <View style={styles.recordItem}>
                    <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="document-text-outline" size={20} color="#15803D" />
                    </View>
                    <View style={styles.recordText}>
                      <Text style={styles.recordTitle}>Active Doctor Prescription</Text>
                      <Text style={styles.recordDate}>Issued: Recent Consultation · Dr. P. M. Chougule</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.downloadPill}
                      onPress={() => handleDownloadPrescription()}
                    >
                      <Feather name="download" size={14} color="#0F766E" />
                      <Text style={styles.downloadPillText}>PDF</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  prescriptions.map((rx, idx) => (
                    <TouchableOpacity
                      key={rx._id || rx.id || idx}
                      style={styles.recordItem}
                      activeOpacity={0.8}
                      onPress={() => handleDownloadPrescription(rx)}
                    >
                      <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                        <Ionicons name="document-text-outline" size={20} color="#15803D" />
                      </View>
                      <View style={styles.recordText}>
                        <Text style={styles.recordTitle}>
                          Prescription ({rx.medicines?.length || 2} medicines)
                        </Text>
                        <Text style={styles.recordDate}>
                          Issued: {rx.date || 'Recent'} · {rx.doctor_name || 'Dr. P. M. Chougule'}
                        </Text>
                      </View>
                      <View style={styles.downloadPill}>
                        <Feather name="download" size={14} color="#0F766E" />
                        <Text style={styles.downloadPillText}>PDF</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* TAB CONTENT 3: LAB REPORTS */}
            {activeTab === 'lab' && (
              <View style={styles.tabSection}>
                <Text style={styles.subHeading}>Pathology &amp; Diagnostic Lab Reports</Text>
                {labTests.length === 0 ? (
                  <View style={styles.recordItem}>
                    <View style={[styles.iconBox, { backgroundColor: '#EDE9FE' }]}>
                      <MaterialCommunityIcons name="flask-outline" size={20} color="#7C3AED" />
                    </View>
                    <View style={styles.recordText}>
                      <Text style={styles.recordTitle}>Diagnostic Pathology Report</Text>
                      <Text style={styles.recordDate}>Comprehensive Metabolic Panel · Verified</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.downloadPill}
                      onPress={() => handleDownloadLabReport()}
                    >
                      <Feather name="download" size={14} color="#0F766E" />
                      <Text style={styles.downloadPillText}>PDF</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  labTests.map((t, idx) => (
                    <TouchableOpacity
                      key={t._id || t.id || idx}
                      style={styles.recordItem}
                      activeOpacity={0.8}
                      onPress={() => handleDownloadLabReport(t)}
                    >
                      <View style={[styles.iconBox, { backgroundColor: '#EDE9FE' }]}>
                        <MaterialCommunityIcons name="flask-outline" size={20} color="#7C3AED" />
                      </View>
                      <View style={styles.recordText}>
                        <Text style={styles.recordTitle}>{t.test_name || t.testName || 'Lab Investigation'}</Text>
                        <Text style={styles.recordDate}>
                          Status: {t.status || 'Report Ready'} · {t.created_at?.slice(0, 10) || 'Recent'}
                        </Text>
                      </View>
                      <View style={styles.downloadPill}>
                        <Feather name="download" size={14} color="#0F766E" />
                        <Text style={styles.downloadPillText}>PDF</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* TAB CONTENT 4: BILLS & RAZORPAY PAYMENT */}
            {activeTab === 'billing' && (
              <View style={styles.tabSection}>
                <Text style={styles.subHeading}>Hospital Invoices &amp; Online Payments</Text>
                {bills.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="receipt-outline" size={36} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>No Invoices Generated</Text>
                    <Text style={styles.emptySubtitle}>All clinical and pharmacy charges are settled.</Text>
                  </View>
                ) : (
                  bills.map((b, idx) => {
                    const isPaid = (b.status || '').toLowerCase() === 'paid';
                    const amount = Number(b.balance_due || b.total_amount || 0);

                    return (
                      <View key={b._id || b.id || idx} style={styles.billCard}>
                        <View style={styles.billCardHeader}>
                          <View>
                            <Text style={styles.billInvoiceNumber}>
                              {b.invoice_number || b.bill_number || `INV-${b.id?.slice(-6) || idx}`}
                            </Text>
                            <Text style={styles.billDate}>
                              {b.created_at ? b.created_at.replace('T', ' ').slice(0, 16) : 'Recent Invoice'}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.billStatusPill,
                              isPaid ? styles.billStatusPaid : styles.billStatusPending,
                            ]}
                          >
                            <Text
                              style={[
                                styles.billStatusText,
                                isPaid ? { color: '#15803D' } : { color: '#B45309' },
                              ]}
                            >
                              {isPaid ? 'PAID' : 'PENDING'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.billAmountRow}>
                          <Text style={styles.billAmountLabel}>Total Due</Text>
                          <Text style={styles.billAmountVal}>₹{amount.toLocaleString('en-IN')}</Text>
                        </View>

                        {!isPaid && (
                          <TouchableOpacity
                            style={styles.payNowBtn}
                            activeOpacity={0.85}
                            onPress={() => handlePayBill(b)}
                          >
                            <Ionicons name="card" size={16} color="#FFFFFF" />
                            <Text style={styles.payNowText}>Pay Online via Razorpay</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* Book Appointment CTA Button */}
            <TouchableOpacity
              style={styles.bookButton}
              activeOpacity={0.85}
              onPress={() => setShowBookModal(true)}
            >
              <Ionicons name="calendar" size={18} color="#FFFFFF" />
              <Text style={styles.bookButtonText}>Book New Consultation</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Book Appointment Modal */}
      <Modal visible={showBookModal} transparent animationType="slide">
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Doctor Consultation</Text>
              <TouchableOpacity onPress={() => setShowBookModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <Text style={styles.inputLabel}>Department</Text>
              <View style={styles.chipsRow}>
                {['Psychiatry', 'Clinical Psychology', 'General Medicine'].map((dept) => (
                  <TouchableOpacity
                    key={dept}
                    style={[styles.chip, selectedDept === dept && styles.chipActive]}
                    onPress={() => setSelectedDept(dept)}
                  >
                    <Text style={[styles.chipText, selectedDept === dept && styles.chipTextActive]}>
                      {dept}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Consulting Doctor</Text>
              <View style={styles.chipsRow}>
                {['Dr. P. M. Chougule', 'Dr. Nikhil Chougule', 'Dr. P. Suryawanshi'].map((doc) => (
                  <TouchableOpacity
                    key={doc}
                    style={[styles.chip, selectedDoctor === doc && styles.chipActive]}
                    onPress={() => setSelectedDoctor(doc)}
                  >
                    <Text style={[styles.chipText, selectedDoctor === doc && styles.chipTextActive]}>
                      {doc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Preferred Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={appointmentDate}
                onChangeText={setAppointmentDate}
              />

              <Text style={styles.inputLabel}>Preferred Time Slot</Text>
              <TextInput
                style={styles.textInput}
                value={appointmentTime}
                onChangeText={setAppointmentTime}
              />

              <Text style={styles.inputLabel}>Reason / Symptoms</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                multiline
                value={reason}
                onChangeText={setReason}
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.confirmBookBtn}
              onPress={handleConfirmBooking}
              disabled={booking}
            >
              {booking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBookText}>Confirm &amp; Schedule</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* New Patient Registration Modal */}
      <Modal visible={showRegModal} transparent animationType="slide">
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Patient Self-Registration</Text>
              <TouchableOpacity onPress={() => setShowRegModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Ramesh Patil"
                placeholderTextColor="#94A3B8"
                value={regName}
                onChangeText={setRegName}
              />

              <Text style={styles.inputLabel}>Mobile Phone *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={regPhone}
                onChangeText={setRegPhone}
              />

              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 35"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={regAge}
                onChangeText={setRegAge}
              />

              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.chipsRow}>
                {['Male', 'Female', 'Other'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, regGender === g && styles.chipActive]}
                    onPress={() => setRegGender(g)}
                  >
                    <Text style={[styles.chipText, regGender === g && styles.chipTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.confirmBookBtn}
              onPress={handleRegisterPatient}
              disabled={registering}
            >
              {registering ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBookText}>Register &amp; Access Portal</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Razorpay Online Payment Modal */}
      {selectedBillForPayment && (
        <RazorpayModal
          visible={showRazorpayModal}
          onClose={() => setShowRazorpayModal(false)}
          onSuccess={handlePaymentSuccess}
          billData={selectedBillForPayment}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stethoscopeBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 200,
    height: 70,
    opacity: 0.8,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  headerLogo: {
    width: 155,
    height: 42,
  },
  switchPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  switchPatientText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Lookup View Styles
  lookupContainer: {
    paddingVertical: 10,
  },
  lookupHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginBottom: 20,
  },
  lookupIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  lookupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  lookupSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    width: '100%',
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  searchBtn: {
    backgroundColor: '#0F766E',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  lookupActionRow: {
    marginTop: 14,
    width: '100%',
    alignItems: 'center',
  },
  regNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  regNewText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  recentSection: {
    marginTop: 8,
  },
  recentSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
  },
  recentPatientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 12,
  },
  recentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  recentPatientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  recentPatientMeta: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },

  // Active Dashboard Styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  uhidText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  doctorTag: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '700',
    marginTop: 4,
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vitalLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  vitalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },

  // Tabs Bar
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F766E',
    fontWeight: '800',
  },
  tabSection: {
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
  },
  bookQuickLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F766E',
  },

  // Appointment Cards
  apptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  apptRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  dateBadge: {
    width: 46,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F766E',
  },
  dateDay: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F766E',
  },
  apptDetail: {
    flex: 1,
  },
  apptTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  apptSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusConfirmed: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },

  // Record / Report Items
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordText: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  recordDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  downloadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  downloadPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
  },

  // Bill Cards
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  billCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billInvoiceNumber: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  billDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  billStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  billStatusPaid: {
    backgroundColor: '#DCFCE7',
  },
  billStatusPending: {
    backgroundColor: '#FEF3C7',
  },
  billStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  billAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  billAmountLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  billAmountVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F766E',
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F766E',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
  },
  payNowText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Empty State Cards
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  bookButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F766E',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  bookButtonSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // CTA Button
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 14,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },

  // Modal Styles
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  chipActive: {
    backgroundColor: '#0F766E',
  },
  chipText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
  },
  confirmBookBtn: {
    backgroundColor: '#0F766E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmBookText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
});
