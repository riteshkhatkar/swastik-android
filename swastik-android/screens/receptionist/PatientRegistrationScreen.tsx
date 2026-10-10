// swastik-android/screens/receptionist/PatientRegistrationScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { receptionistApi, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { generateCasePaperHtml, printOrSharePdf } from '../../utils/pdfGenerator';

interface PatientRegistrationScreenProps {
  onOpenDrawer: () => void;
  onNavigateToBilling?: (uhid: string) => void;
}

export const PatientRegistrationScreen: React.FC<PatientRegistrationScreenProps> = ({
  onOpenDrawer,
  onNavigateToBilling,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const receptionistName = user?.full_name || 'Priya Sharma';

  // Stepper state: 1, 2, 3, 4, or 'success'
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 'success'>(1);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);

  // Form Fields
  // Step 1: Patient Details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [bloodGroup, setBloodGroup] = useState('B+');

  // Step 2: Contact Information
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('Kolhapur');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('416001');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRel, setEmergencyRel] = useState('Parent');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Step 3: Guardian & Consent
  const [guardianName, setGuardianName] = useState('');
  const [guardianRel, setGuardianRel] = useState('Father');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [consentEvaluation, setConsentEvaluation] = useState(true);
  const [consentNomination, setConsentNomination] = useState(true);
  const [consentEmergency, setConsentEmergency] = useState(true);

  // Step 4: Visit Details
  const [department, setDepartment] = useState('General Medicine');
  const [selectedDoctor, setSelectedDoctor] = useState('Dr. P. M. Chougule');
  const [visitType, setVisitType] = useState<'OPD' | 'IPD'>('OPD');
  const [visitDate, setVisitDate] = useState('06 Oct 2026');
  const [paymentCategory, setPaymentCategory] = useState('Cash (General)');
  const [remarks, setRemarks] = useState('');

  // Generated Registration Result
  const [registeredPatient, setRegisteredPatient] = useState<any>(null);

  useEffect(() => {
    // Load live doctors from backend
    receptionistApi.getDoctors().then((docs) => {
      if (Array.isArray(docs) && docs.length > 0) {
        setDoctors(docs);
        setSelectedDoctor(docs[0].name || 'Dr. P. M. Chougule');
      }
    });
  }, []);

  const resetForm = () => {
    setStep(1);
    setFirstName('');
    setLastName('');
    setAge('');
    setDob('');
    setMobile('');
    setAlternateMobile('');
    setEmail('');
    setAddress1('');
    setAddress2('');
    setEmergencyName('');
    setEmergencyPhone('');
    setGuardianName('');
    setGuardianPhone('');
    setGuardianAddress('');
    setIdNumber('');
    setRemarks('');
    setRegisteredPatient(null);
  };

  const handleNextStep1 = () => {
    if (!firstName.trim()) {
      Alert.alert('Required Field', 'Please enter the patient full name.');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!mobile.trim() || mobile.length < 10) {
      Alert.alert('Required Field', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setStep(3);
  };

  const handleNextStep3 = () => {
    if (!consentEvaluation) {
      Alert.alert('Consent Required', 'Informed consent is mandatory for psychiatric care.');
      return;
    }
    setStep(4);
  };

  const handleCompleteRegistration = async () => {
    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const generatedUHID = `SHD${Math.floor(100000 + Math.random() * 900000)}`;

    const payload = {
      name: fullName,
      age: age ? parseInt(age, 10) : undefined,
      gender,
      phone: mobile,
      email: email || undefined,
      dob: dob || undefined,
      address: [address1, address2, city, state, pincode].filter(Boolean).join(', '),
      guardian_name: guardianName || emergencyName || undefined,
      department,
      doctor: selectedDoctor,
      visit_type: visitType,
      consultation_fee: 500,
      payment_mode: paymentCategory,
      remarks,
    };

    try {
      const res = await receptionistApi.registerPatient(payload);
      const actualUHID = res?.uhid || res?.patient?.uhid;
      if (!actualUHID) {
        throw new Error('Server registered patient but did not return a valid UHID.');
      }

      setRegisteredPatient({
        name: fullName,
        uhid: actualUHID,
        gender,
        age: age ? parseInt(age, 10) : undefined,
        visitType: `${visitType} - New Visit`,
        department,
        doctor: selectedDoctor,
        regDateTime: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        amount: res?.initial_bill?.total || 500,
        paymentMode: paymentCategory,
      });

      setStep('success');
    } catch (e: any) {
      Alert.alert(
        'Registration Failed',
        getApiErrorMessage(e)
      );
    } finally {
      setLoading(false);
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
        keyboardShouldPersistTaps="handled"
      >
        {step !== 'success' && (
          <View>
            {/* Stepper Header Bar matching Images 5, 10, 6, 7 */}
            <View style={styles.stepperContainer}>
              <View style={styles.stepTrack}>
                {/* Step 1 */}
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      step >= 1 && styles.stepCircleActive,
                      step > 1 && styles.stepCircleDone,
                    ]}
                  >
                    {step > 1 ? (
                      <Feather name="check" size={14} color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.stepNum, step === 1 && styles.stepNumActive]}>1</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      step === 1 ? styles.stepLabelActive : styles.stepLabelInactive,
                    ]}
                  >
                    Patient
                  </Text>
                </View>

                <View style={[styles.stepConnector, step >= 2 && styles.stepConnectorActive]} />

                {/* Step 2 */}
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      step >= 2 && styles.stepCircleActive,
                      step > 2 && styles.stepCircleDone,
                    ]}
                  >
                    {step > 2 ? (
                      <Feather name="check" size={14} color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.stepNum, step === 2 && styles.stepNumActive]}>2</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      step === 2 ? styles.stepLabelActive : styles.stepLabelInactive,
                    ]}
                  >
                    Contact
                  </Text>
                </View>

                <View style={[styles.stepConnector, step >= 3 && styles.stepConnectorActive]} />

                {/* Step 3 */}
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      step >= 3 && styles.stepCircleActive,
                      step > 3 && styles.stepCircleDone,
                    ]}
                  >
                    {step > 3 ? (
                      <Feather name="check" size={14} color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.stepNum, step === 3 && styles.stepNumActive]}>3</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      step === 3 ? styles.stepLabelActive : styles.stepLabelInactive,
                    ]}
                  >
                    Consent
                  </Text>
                </View>

                <View style={[styles.stepConnector, step >= 4 && styles.stepConnectorActive]} />

                {/* Step 4 */}
                <View style={styles.stepItem}>
                  <View style={[styles.stepCircle, step === 4 && styles.stepCircleActive]}>
                    <Text style={[styles.stepNum, step === 4 && styles.stepNumActive]}>4</Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      step === 4 ? styles.stepLabelActive : styles.stepLabelInactive,
                    ]}
                  >
                    Visit
                  </Text>
                </View>
              </View>
            </View>

            {/* Form Card Container */}
            <View style={styles.formCard}>
              {/* STEP 1: PATIENT DETAILS (Image 5) */}
              {step === 1 && (
                <View>
                  <Text style={styles.formSectionTitle}>Basic Information</Text>
                  <Text style={styles.formSectionSub}>
                    Enter patient's basic personal and demographic information.
                  </Text>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>First Name / Full Name *</Text>
                    <View style={styles.inputBox}>
                      <Feather name="user" size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Rajesh"
                        placeholderTextColor="#94A3B8"
                        value={firstName}
                        onChangeText={setFirstName}
                      />
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Last Name / Surname</Text>
                    <View style={styles.inputBox}>
                      <Feather name="user" size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Kumar"
                        placeholderTextColor="#94A3B8"
                        value={lastName}
                        onChangeText={setLastName}
                      />
                    </View>
                  </View>

                  {/* Gender Selector */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Gender *</Text>
                    <View style={styles.genderRow}>
                      {(['Male', 'Female', 'Other'] as const).map((g) => (
                        <TouchableOpacity
                          key={g}
                          style={[styles.genderPill, gender === g && styles.genderPillActive]}
                          onPress={() => setGender(g)}
                        >
                          <Text
                            style={[
                              styles.genderPillText,
                              gender === g && styles.genderPillTextActive,
                            ]}
                          >
                            {g}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Age & DOB */}
                  <View style={styles.fieldRow}>
                    <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.fieldLabel}>Age (Years) *</Text>
                      <View style={styles.inputBox}>
                        <Feather name="calendar" size={18} color="#64748B" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="32"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          value={age}
                          onChangeText={setAge}
                        />
                      </View>
                    </View>

                    <View style={[styles.formField, { flex: 1.5 }]}>
                      <Text style={styles.fieldLabel}>Date of Birth</Text>
                      <View style={styles.inputBox}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="DD/MM/YYYY"
                          placeholderTextColor="#94A3B8"
                          value={dob}
                          onChangeText={setDob}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Blood Group */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Blood Group</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                        <TouchableOpacity
                          key={bg}
                          style={[styles.bgPill, bloodGroup === bg && styles.bgPillActive]}
                          onPress={() => setBloodGroup(bg)}
                        >
                          <Text
                            style={[styles.bgPillText, bloodGroup === bg && styles.bgPillTextActive]}
                          >
                            {bg}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Next Button */}
                  <TouchableOpacity
                    style={styles.primaryNavBtn}
                    onPress={handleNextStep1}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryNavBtnText}>Next - Contact Details</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 2: CONTACT DETAILS (Image 10) */}
              {step === 2 && (
                <View>
                  <Text style={styles.formSectionTitle}>Contact Information</Text>
                  <Text style={styles.formSectionSub}>
                    Provide the patient's contact and emergency details.
                  </Text>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Address Line 1 *</Text>
                    <View style={styles.inputBox}>
                      <Feather name="home" size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="House No., Building, Street Name"
                        placeholderTextColor="#94A3B8"
                        value={address1}
                        onChangeText={setAddress1}
                      />
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Address Line 2 (Optional)</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Apartment, Landmark, Area"
                        placeholderTextColor="#94A3B8"
                        value={address2}
                        onChangeText={setAddress2}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.fieldLabel}>City *</Text>
                      <View style={styles.inputBox}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="City name"
                          placeholderTextColor="#94A3B8"
                          value={city}
                          onChangeText={setCity}
                        />
                      </View>
                    </View>

                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Pincode *</Text>
                      <View style={styles.inputBox}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="416001"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          value={pincode}
                          onChangeText={setPincode}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Mobile Number *</Text>
                    <View style={styles.inputBox}>
                      <Feather name="phone" size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="10-digit mobile number"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={mobile}
                        onChangeText={setMobile}
                      />
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Email Address (Optional)</Text>
                    <View style={styles.inputBox}>
                      <Feather name="mail" size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="patient@example.com"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                      />
                    </View>
                  </View>

                  {/* Emergency Contact */}
                  <View style={styles.sectionDivider}>
                    <Text style={styles.sectionDividerText}>Emergency Contact Details</Text>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Emergency Contact Name *</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Contact person name"
                        placeholderTextColor="#94A3B8"
                        value={emergencyName}
                        onChangeText={setEmergencyName}
                      />
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Emergency Contact Mobile *</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Emergency mobile number"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={emergencyPhone}
                        onChangeText={setEmergencyPhone}
                      />
                    </View>
                  </View>

                  {/* Buttons Row */}
                  <View style={styles.navButtonsRow}>
                    <TouchableOpacity
                      style={styles.backNavBtn}
                      onPress={() => setStep(1)}
                      activeOpacity={0.8}
                    >
                      <Feather name="arrow-left" size={16} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.backNavBtnText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.nextNavBtn}
                      onPress={handleNextStep2}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.primaryNavBtnText}>Next - Consent</Text>
                      <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 3: PSYCHIATRIC REGISTRATION & LEGAL CONSENT (Image 6) */}
              {step === 3 && (
                <View>
                  <Text style={styles.formSectionTitle}>Guardian & Legal Consent</Text>
                  <Text style={styles.formSectionSub}>
                    Mental Healthcare Act (MHCA 2017) compliance & guardian documentation.
                  </Text>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Guardian / Nominated Representative Name *</Text>
                    <View style={styles.inputBox}>
                      <Feather name="user-check" size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Guardian full name"
                        placeholderTextColor="#94A3B8"
                        value={guardianName}
                        onChangeText={setGuardianName}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.fieldLabel}>Relationship *</Text>
                      <View style={styles.inputBox}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Father / Spouse"
                          placeholderTextColor="#94A3B8"
                          value={guardianRel}
                          onChangeText={setGuardianRel}
                        />
                      </View>
                    </View>

                    <View style={[styles.formField, { flex: 1.2 }]}>
                      <Text style={styles.fieldLabel}>Guardian Mobile *</Text>
                      <View style={styles.inputBox}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Contact number"
                          placeholderTextColor="#94A3B8"
                          keyboardType="phone-pad"
                          value={guardianPhone}
                          onChangeText={setGuardianPhone}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Guardian Address</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Permanent residential address"
                        placeholderTextColor="#94A3B8"
                        value={guardianAddress}
                        onChangeText={setGuardianAddress}
                      />
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Identity Document (Aadhaar / National ID)</Text>
                    <View style={styles.inputBox}>
                      <Feather name="credit-card" size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="12-digit Aadhaar / Voter ID"
                        placeholderTextColor="#94A3B8"
                        value={idNumber}
                        onChangeText={setIdNumber}
                      />
                    </View>
                  </View>

                  {/* MHCA Legal Consent Checkboxes */}
                  <View style={styles.consentBox}>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setConsentEvaluation(!consentEvaluation)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.checkbox, consentEvaluation && styles.checkboxChecked]}>
                        {consentEvaluation && <Feather name="check" size={14} color="#FFFFFF" />}
                      </View>
                      <Text style={styles.checkboxText}>
                        Informed consent for psychiatric assessment & treatment (MHCA 2017).
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setConsentNomination(!consentNomination)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.checkbox, consentNomination && styles.checkboxChecked]}>
                        {consentNomination && <Feather name="check" size={14} color="#FFFFFF" />}
                      </View>
                      <Text style={styles.checkboxText}>
                        Nomination of legal Nominated Representative (NR) authorized.
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setConsentEmergency(!consentEmergency)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.checkbox, consentEmergency && styles.checkboxChecked]}>
                        {consentEmergency && <Feather name="check" size={14} color="#FFFFFF" />}
                      </View>
                      <Text style={styles.checkboxText}>
                        Agreement for emergency medical stabilization in acute crisis.
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Buttons Row */}
                  <View style={styles.navButtonsRow}>
                    <TouchableOpacity
                      style={styles.backNavBtn}
                      onPress={() => setStep(2)}
                      activeOpacity={0.8}
                    >
                      <Feather name="arrow-left" size={16} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.backNavBtnText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.nextNavBtn}
                      onPress={handleNextStep3}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.primaryNavBtnText}>Next - Visit Details</Text>
                      <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 4: VISIT DETAILS & FINALIZATION (Image 7) */}
              {step === 4 && (
                <View>
                  <Text style={styles.formSectionTitle}>Visit Details & Finalization</Text>
                  <Text style={styles.formSectionSub}>
                    Complete the visit details to finish patient registration.
                  </Text>

                  {/* Patient Summary Header Card matching Image 7 */}
                  <View style={styles.patientSummaryCard}>
                    <View style={styles.summaryAvatar}>
                      <Feather name="user" size={24} color="#0D9488" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.summaryName}>
                        {firstName} {lastName || ''}
                      </Text>
                      <Text style={styles.summaryDetails}>
                        {gender} | {age || 32} Years | PID: SHP001245
                      </Text>
                      <Text style={styles.summaryContact}>
                        📞 {mobile || '98765 43210'} | 📍 {city}, {state}
                      </Text>
                    </View>
                  </View>

                  {/* Department */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Department *</Text>
                    <View style={styles.inputBox}>
                      <MaterialCommunityIcons name="stethoscope" size={20} color="#0D9488" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={department}
                        onChangeText={setDepartment}
                      />
                    </View>
                  </View>

                  {/* Doctor */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Doctor *</Text>
                    <View style={styles.inputBox}>
                      <Feather name="user-check" size={18} color="#0D9488" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={selectedDoctor}
                        onChangeText={setSelectedDoctor}
                      />
                    </View>
                  </View>

                  {/* Visit Type: OPD vs IPD Segment */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Visit Type *</Text>
                    <View style={styles.visitTypeSwitch}>
                      <TouchableOpacity
                        style={[styles.visitTypeTab, visitType === 'OPD' && styles.visitTypeTabActive]}
                        onPress={() => setVisitType('OPD')}
                      >
                        <Feather
                          name="user"
                          size={16}
                          color={visitType === 'OPD' ? '#0D9488' : '#64748B'}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.visitTypeTabText,
                            visitType === 'OPD' && styles.visitTypeTabTextActive,
                          ]}
                        >
                          OPD
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.visitTypeTab, visitType === 'IPD' && styles.visitTypeTabActive]}
                        onPress={() => setVisitType('IPD')}
                      >
                        <MaterialCommunityIcons
                          name="bed"
                          size={18}
                          color={visitType === 'IPD' ? '#0D9488' : '#64748B'}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.visitTypeTabText,
                            visitType === 'IPD' && styles.visitTypeTabTextActive,
                          ]}
                        >
                          IPD
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Appointment Date */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Appointment / Visit Date *</Text>
                    <View style={styles.inputBox}>
                      <Feather name="calendar" size={18} color="#0D9488" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={visitDate}
                        onChangeText={setVisitDate}
                      />
                    </View>
                  </View>

                  {/* Payment Category */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Payment Category *</Text>
                    <View style={styles.inputBox}>
                      <MaterialCommunityIcons name="cash-multiple" size={20} color="#0D9488" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={paymentCategory}
                        onChangeText={setPaymentCategory}
                      />
                    </View>
                  </View>

                  {/* Remarks */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Remarks (Optional)</Text>
                    <View style={[styles.inputBox, { height: 70, alignItems: 'flex-start', paddingTop: 8 }]}>
                      <TextInput
                        style={[styles.textInput, { height: 50, textAlignVertical: 'top' }]}
                        placeholder="Add any relevant notes about the visit..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        maxLength={250}
                        value={remarks}
                        onChangeText={setRemarks}
                      />
                    </View>
                  </View>

                  {/* Buttons Row */}
                  <View style={styles.navButtonsRow}>
                    <TouchableOpacity
                      style={styles.backNavBtn}
                      onPress={() => setStep(3)}
                      activeOpacity={0.8}
                    >
                      <Feather name="arrow-left" size={16} color="#0D9488" style={{ marginRight: 6 }} />
                      <Text style={styles.backNavBtnText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.completeRegBtn}
                      onPress={handleCompleteRegistration}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.primaryNavBtnText}>Complete Registration</Text>
                          <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* =========================================================================
           SUCCESS SCREEN (Matching Image 8)
           ========================================================================= */}
        {step === 'success' && registeredPatient && (
          <View style={styles.successContainer}>
            {/* Animated / Glowing Checkmark Icon */}
            <View style={styles.successCheckCircle}>
              <Feather name="check" size={42} color="#0D9488" />
            </View>

            <Text style={styles.successTitle}>Registration Successful</Text>
            <Text style={styles.successSub}>
              Patient registration completed successfully. Case paper has been generated.
            </Text>

            {/* Success Details Card matching Image 8 */}
            <View style={styles.successCard}>
              {/* Row 1: Patient Name */}
              <View style={styles.successItem}>
                <View style={styles.successItemIconBox}>
                  <Feather name="user" size={18} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.successItemLabel}>Patient Name</Text>
                  <Text style={styles.successItemValName}>{registeredPatient.name}</Text>
                </View>
                <Text style={styles.successItemMeta}>
                  {registeredPatient.gender}, {registeredPatient.age} Years
                </Text>
              </View>

              {/* Row 2: UHID */}
              <View style={styles.successItem}>
                <View style={styles.successItemIconBox}>
                  <Feather name="clipboard" size={18} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.successItemLabel}>UHID</Text>
                  <Text style={styles.successItemUhid}>{registeredPatient.uhid}</Text>
                </View>
              </View>

              {/* Row 3: Visit Type */}
              <View style={styles.successItem}>
                <View style={styles.successItemIconBox}>
                  <Feather name="file-text" size={18} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.successItemLabel}>Visit Type</Text>
                  <Text style={styles.successItemVal}>{registeredPatient.visitType}</Text>
                </View>
              </View>

              {/* Row 4: Department / Doctor */}
              <View style={styles.successItem}>
                <View style={styles.successItemIconBox}>
                  <MaterialCommunityIcons name="stethoscope" size={20} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.successItemLabel}>Department / Doctor</Text>
                  <Text style={styles.successItemValBold}>{registeredPatient.department}</Text>
                  <Text style={styles.successItemSubVal}>{registeredPatient.doctor}</Text>
                </View>
              </View>

              {/* Row 5: Registration Date & Time */}
              <View style={styles.successItem}>
                <View style={styles.successItemIconBox}>
                  <Feather name="calendar" size={18} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.successItemLabel}>Registration Date & Time</Text>
                  <Text style={styles.successItemVal}>{registeredPatient.regDateTime}</Text>
                </View>
              </View>

              {/* Row 6: Billing Summary */}
              <View style={styles.successItem}>
                <View style={styles.successItemIconBox}>
                  <MaterialCommunityIcons name="cash-multiple" size={20} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.successItemLabel}>Billing Summary</Text>
                  <Text style={styles.successItemPrice}>₹{registeredPatient.amount}</Text>
                  <Text style={styles.successItemSubVal}>Paid via {registeredPatient.paymentMode}</Text>
                </View>
                <View style={styles.paidBadge}>
                  <Feather name="check" size={12} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.paidBadgeText}>Paid</Text>
                </View>
              </View>
            </View>

            {/* Bottom 2 Action Cards */}
            <View style={styles.successActionCardsRow}>
              <TouchableOpacity
                style={styles.actionPaperCard}
                onPress={async () => {
                  try {
                    const html = generateCasePaperHtml({
                      patientName: registeredPatient.name || `${firstName} ${lastName}`.trim(),
                      uhid: registeredPatient.uhid,
                      age: registeredPatient.age || age,
                      gender: registeredPatient.gender || gender,
                      contact: registeredPatient.contact || mobile,
                      address: registeredPatient.address || address1,
                      guardianName: guardianName,
                      guardianRelation: guardianRel,
                      doctorName: typeof selectedDoctor === 'string' ? selectedDoctor : 'Dr. P. M. Chougule',
                      visitType: visitType || 'OPD',
                      date: new Date().toLocaleDateString('en-GB'),
                      consultationFee: 500,
                      casePaperFee: 100,
                      totalFee: 600,
                    });
                    await printOrSharePdf(html, `Case_Paper_${registeredPatient.uhid}`);
                  } catch (err: any) {
                    Alert.alert('Print Error', err?.message || 'Unable to generate Case Paper.');
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.actionPaperIcon}>
                  <Feather name="printer" size={20} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionPaperTitle}>Print Case Paper</Text>
                  <Text style={styles.actionPaperSub}>Generate & Share PDF</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionPaperCard}
                onPress={() => {
                  if (onNavigateToBilling) {
                    onNavigateToBilling(registeredPatient.uhid);
                  } else {
                    Alert.alert('Bill Details 💳', `Bill #INV-${registeredPatient.uhid.slice(3)} is marked Paid (₹500).`);
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.actionPaperIcon, { backgroundColor: '#E0F2FE' }]}>
                  <Feather name="file-text" size={20} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionPaperTitle}>View Bill</Text>
                  <Text style={styles.actionPaperSub}>View detailed bill</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* New Registration Button */}
            <TouchableOpacity
              style={styles.newRegistrationBtn}
              onPress={resetForm}
              activeOpacity={0.85}
            >
              <Feather name="user-plus" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.newRegistrationBtnText}>New Registration</Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingBottom: 50,
  },
  stepperContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  stepTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    zIndex: 2,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#0D9488',
  },
  stepCircleDone: {
    backgroundColor: '#0D9488',
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  stepNumActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  stepLabelInactive: {
    color: '#94A3B8',
  },
  stepConnector: {
    flex: 1,
    height: 3,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
    marginBottom: 14,
  },
  stepConnectorActive: {
    backgroundColor: '#0D9488',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  formSectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 18,
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
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  genderPillActive: {
    borderColor: '#0D9488',
    backgroundColor: '#E6F4F1',
  },
  genderPillText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  genderPillTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  bgPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    backgroundColor: '#F8FAFC',
  },
  bgPillActive: {
    borderColor: '#0D9488',
    backgroundColor: '#E6F4F1',
  },
  bgPillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  bgPillTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  sectionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6,
    marginVertical: 12,
  },
  sectionDividerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  consentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  navButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  backNavBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#0D9488',
    backgroundColor: '#FFFFFF',
  },
  backNavBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D9488',
  },
  nextNavBtn: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0D9488',
  },
  primaryNavBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0D9488',
    marginTop: 18,
  },
  completeRegBtn: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0D9488',
  },
  primaryNavBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  patientSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  summaryAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  summaryDetails: {
    fontSize: 12,
    color: '#475569',
    marginTop: 1,
  },
  summaryContact: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  visitTypeSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    overflow: 'hidden',
  },
  visitTypeTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#FFFFFF',
  },
  visitTypeTabActive: {
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#0D9488',
  },
  visitTypeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  visitTypeTabTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successCheckCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#C7EBE6',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  successSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
    marginBottom: 16,
  },
  successItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  successItemIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  successItemLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  successItemValName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  successItemMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  successItemUhid: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D9488',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  successItemVal: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  successItemValBold: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
  },
  successItemSubVal: {
    fontSize: 11,
    color: '#64748B',
  },
  successItemPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  successActionCardsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  actionPaperCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionPaperIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  actionPaperTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionPaperSub: {
    fontSize: 10,
    color: '#64748B',
  },
  newRegistrationBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#0D9488',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  newRegistrationBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
