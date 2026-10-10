// swastik-android/screens/NewConsultationScreen.tsx
// Complete Psychiatric EMR & Clinical Consultation Workstation
// Ported directly from Swastik Web EMR (DoctorConsultation.jsx & EMR.jsx)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { AppHeader } from '../components/AppHeader';
import { patientService, clinicalApi, labApi, getApiErrorMessage } from '../services/api';
import { generateConsultationReportHtml, printOrSharePdf } from '../utils/pdfGenerator';
import icd11Data from '../data/icd11Codes.json';
import dsm5Data from '../data/dsm5Codes.json';

interface NewConsultationScreenProps {
  onOpenDrawer: () => void;
  initialPatient?: any;
}

type EmrTab = 'symptoms' | 'diagnosis' | 'medications' | 'treatment' | 'soap' | 'vitals';

const SI_OPTIONS = ['None', 'Passive', 'Active', 'Intent', 'Plan'] as const;

const MSE_OPTIONS = {
  appearance: ['Well Groomed', 'Disheveled', 'Guarded', 'Agitated', 'Unkempt'],
  psychomotor: ['Normal', 'Retarded', 'Agitated', 'Restless', 'Catatonic'],
  speech: ['Normal', 'Pressured', 'Slow', 'Slurred', 'Muted'],
  mood: ['Euthymic', 'Depressed', 'Anxious', 'Irritable', 'Elevated', 'Dysphoric'],
  affect: ['Congruent', 'Flat', 'Labile', 'Restricted', 'Blunted'],
  thoughtProcess: ['Logical', 'Circumstantial', 'Tangential', 'Flight of Ideas', 'Disorganized'],
  thoughtContent: ['No SI/HI', 'Suicidal ideation', 'Homicidal ideation', 'Paranoid', 'Grandiose'],
  perception: ['None', 'Auditory hallucinations', 'Visual hallucinations', 'Command AH', 'Delusions'],
  cognition: ['Oriented', 'Impaired attention', 'Memory impaired', 'Executive dysfunction'],
  insight: ['Good', 'Partial', 'Poor', 'None'],
  judgment: ['Intact', 'Impaired'],
  attention: ['Normal', 'Distractible', 'Poor concentration', 'Span reduced'],
};

const MSE_DANGEROUS = ['Suicidal ideation', 'Homicidal ideation', 'Command AH'];

const ICD_DIAGNOSES = [
  'F32.1 Major Depressive Disorder, Moderate',
  'F41.1 Generalized Anxiety Disorder',
  'F20.0 Paranoid Schizophrenia',
  'F31.1 Bipolar Affective Disorder, Current Mania',
  'F31.3 Bipolar Affective Disorder, Current Depression',
  'F10.2 Alcohol Dependence Syndrome',
  'F43.1 Post-Traumatic Stress Disorder (PTSD)',
  'F42 Obsessive-Compulsive Disorder (OCD)',
  'F90.0 Attention-Deficit Hyperactivity Disorder (ADHD)',
  'F00 Dementia in Alzheimer Disease',
];

const THERAPY_MODALITIES = [
  'CBT',
  'DBT',
  'IPT',
  'Family Therapy',
  'Group Therapy',
  'Supportive Psychotherapy',
];

const LAB_INVESTIGATIONS = [
  'CBC',
  'LFT',
  'KFT',
  'Thyroid Profile (TSH)',
  'Serum Lithium Level',
  'Lipid Profile',
  'ECG',
  'CT Brain',
];

export const NewConsultationScreen: React.FC<NewConsultationScreenProps> = ({
  onOpenDrawer,
  initialPatient,
}) => {
  const [selectedPatient, setSelectedPatient] = useState<any>(initialPatient || null);
  const [livePatients, setLivePatients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<EmrTab>('symptoms');
  const [saving, setSaving] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(false);

  // 1. Symptoms & HPI State
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [onset, setOnset] = useState('');
  const [duration, setDuration] = useState('');
  const [precipitatingFactors, setPrecipitatingFactors] = useState('');
  const [perpetuatingFactors, setPerpetuatingFactors] = useState('');
  const [hpi, setHpi] = useState('');
  const [suicidalIdeation, setSuicidalIdeation] = useState('None');
  const [selfHarmHistory, setSelfHarmHistory] = useState('');
  const [harmToOthersRisk, setHarmToOthersRisk] = useState('');
  const [mseFindings, setMseFindings] = useState<Record<string, string[]>>({});

  // 2. Diagnosis & Risk State
  const [diagSystem, setDiagSystem] = useState<'icd11' | 'dsm5'>('icd11');
  const [diagSearch, setDiagSearch] = useState('');
  const [diagnosis, setDiagnosis] = useState('F32.1 Major Depressive Disorder, Moderate');
  const [severity, setSeverity] = useState('Moderate');
  const [suicideRisk, setSuicideRisk] = useState<'Low' | 'Moderate' | 'High' | 'Critical'>('Low');
  const [selfHarmRisk, setSelfHarmRisk] = useState<'Low' | 'Moderate' | 'High' | 'Critical'>('Low');
  const [aggressionRisk, setAggressionRisk] = useState<'Low' | 'Moderate' | 'High' | 'Critical'>('Low');

  const activeDataset: Array<{ code: string; title: string }> = diagSystem === 'icd11' ? (icd11Data as any) : (dsm5Data as any);
  const filteredDiagnoses = React.useMemo(() => {
    if (!diagSearch.trim()) return activeDataset.slice(0, 10);
    const q = diagSearch.toLowerCase();
    return activeDataset.filter(
      (d) =>
        (d.code || '').toLowerCase().includes(q) ||
        (d.title || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [activeDataset, diagSearch]);

  // 3. Medications (Rx)
  const [medications, setMedications] = useState<
    Array<{ name: string; dose: string; timing: string; duration: string; instructions: string }>
  >([
    {
      name: 'Tab. Escitalopram 10mg',
      dose: '1-0-0',
      timing: 'Morning after food',
      duration: '30 days',
      instructions: 'Take regularly at breakfast',
    },
    {
      name: 'Tab. Clonazepam 0.5mg',
      dose: '0-0-1',
      timing: 'At bedtime',
      duration: '15 days',
      instructions: 'For sleep; avoid driving',
    },
  ]);
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('1-0-1');
  const [newMedTiming, setNewMedTiming] = useState('After food');
  const [newMedDuration, setNewMedDuration] = useState('30 days');
  const [newMedInstructions, setNewMedInstructions] = useState('');

  // 4. Treatment Plan State
  const [pharmacotherapyPlan, setPharmacotherapyPlan] = useState('');
  const [selectedTherapies, setSelectedTherapies] = useState<string[]>(['CBT']);
  const [selectedLabs, setSelectedLabs] = useState<string[]>(['CBC', 'Thyroid Profile (TSH)']);
  const [followUp, setFollowUp] = useState('2 Weeks');

  // 5. SOAP Notes
  const [soapS, setSoapS] = useState('');
  const [soapO, setSoapO] = useState('');
  const [soapA, setSoapA] = useState('');
  const [soapP, setSoapP] = useState('');

  // 6. Vitals State
  const [bp, setBp] = useState('120/80');
  const [pulse, setPulse] = useState('72');
  const [temp, setTemp] = useState('98.6');
  const [weight, setWeight] = useState('68');
  const [height, setHeight] = useState('170');
  const [spo2, setSpo2] = useState('98');

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientEmr(selectedPatient.uhid || selectedPatient.id);
    }
  }, [selectedPatient]);

  const loadPatients = async () => {
    try {
      const res = await patientService.getPatients();
      if (res && Array.isArray(res) && res.length > 0) {
        setLivePatients(res);
      }
    } catch {
      // fallback
    }
  };

  const loadPatientEmr = async (uhid: string) => {
    try {
      const [emrCtx, mseData, diagData, riskData, rxData, vitalsData] = await Promise.all([
        clinicalApi.getEmrContext(uhid).catch(() => null),
        clinicalApi.getMse(uhid).catch(() => null),
        clinicalApi.getDiagnosis(uhid).catch(() => null),
        clinicalApi.getRisk(uhid).catch(() => null),
        clinicalApi.getPrescriptions({ uhid }).catch(() => null),
        clinicalApi.listVitals(uhid).catch(() => null),
      ]);

      if (mseData && mseData.mse) {
        setMseFindings(mseData.mse);
      }
      if (diagData && diagData.diagnosis) {
        setDiagnosis(diagData.diagnosis);
        if (diagData.severity) setSeverity(diagData.severity);
      }
      if (riskData) {
        if (riskData.suicide) setSuicideRisk(riskData.suicide);
        if (riskData.selfHarm) setSelfHarmRisk(riskData.selfHarm);
        if (riskData.aggression) setAggressionRisk(riskData.aggression);
      }
      if (rxData && Array.isArray(rxData) && rxData.length > 0) {
        const latestRx = rxData[0];
        if (Array.isArray(latestRx.medicines) && latestRx.medicines.length > 0) {
          setMedications(latestRx.medicines);
        }
      }
      if (vitalsData && Array.isArray(vitalsData) && vitalsData.length > 0) {
        const latestV = vitalsData[0];
        if (latestV.bp) setBp(latestV.bp);
        if (latestV.pulse) setPulse(String(latestV.pulse));
        if (latestV.temp) setTemp(String(latestV.temp));
        if (latestV.spo2) setSpo2(String(latestV.spo2));
        if (latestV.weight) setWeight(String(latestV.weight));
        if (latestV.height) setHeight(String(latestV.height));
      }
    } catch (err) {
      console.log('Error loading patient EMR context:', err);
    }
  };

  const handleToggleMse = (category: string, value: string) => {
    setMseFindings((prev) => {
      const current = prev[category] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const handleToggleTherapy = (modality: string) => {
    setSelectedTherapies((prev) =>
      prev.includes(modality) ? prev.filter((m) => m !== modality) : [...prev, modality]
    );
  };

  const handleToggleLab = (test: string) => {
    setSelectedLabs((prev) =>
      prev.includes(test) ? prev.filter((t) => t !== test) : [...prev, test]
    );
  };

  const handleAddMedication = () => {
    if (!newMedName.trim()) {
      Alert.alert('Required', 'Please enter medicine name.');
      return;
    }
    setMedications((prev) => [
      ...prev,
      {
        name: newMedName.trim(),
        dose: newMedDose.trim(),
        timing: newMedTiming.trim(),
        duration: newMedDuration.trim(),
        instructions: newMedInstructions.trim(),
      },
    ]);
    setNewMedName('');
    setNewMedInstructions('');
    setShowAddMedModal(false);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications((prev) => prev.filter((_, idx) => idx !== index));
  };

  const calculateBmi = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return '23.5';
  };

  const handleSaveConsultation = async () => {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const uhid = selectedPatient.uhid || selectedPatient.id || 'SWH001';
      const payload = {
        patient_name: selectedPatient.name,
        uhid: uhid,
        chief_complaint: chiefComplaint,
        onset,
        duration,
        precipitating_factors: precipitatingFactors,
        perpetuating_factors: perpetuatingFactors,
        hpi,
        suicidal_ideation: suicidalIdeation,
        self_harm_history: selfHarmHistory,
        harm_to_others_risk: harmToOthersRisk,
        mse: mseFindings,
        diagnosis,
        severity,
        risk: { suicide: suicideRisk, selfHarm: selfHarmRisk, aggression: aggressionRisk },
        medications,
        treatment_plan: {
          pharmacotherapy: pharmacotherapyPlan,
          modalities: selectedTherapies,
          lab_orders: selectedLabs,
          follow_up: followUp,
        },
        soap_notes: { s: soapS, o: soapO, a: soapA, p: soapP },
        vitals: { bp, pulse, temp, weight, height, bmi: calculateBmi(), spo2 },
        consultation_date: new Date().toISOString(),
      };

      // Resolve active admission_id for this patient (required for all backend EMR records)
      let admissionId = selectedPatient.admission_id || selectedPatient.id;
      try {
        const activeAdm = await clinicalApi.getActiveAdmission(uhid);
        if (activeAdm && (activeAdm.admission_id || activeAdm.id)) {
          admissionId = activeAdm.admission_id || activeAdm.id;
        } else if (!admissionId) {
          const newAdm = await clinicalApi.createAdmission(uhid, {
            admission_reason: 'OPD Psychiatric Consultation',
            clinical_status: 'Under Observation',
          }, 'Dr. P. M. Chougule');
          admissionId = newAdm?.admission_id || newAdm?.id;
        }
      } catch (admErr) {
        console.log('Admission resolution note:', admErr);
        if (!admissionId) admissionId = `ADM-${uhid}`;
      }

      await Promise.all([
        clinicalApi.saveConsultation(uhid, { ...payload, admission_id: admissionId }),
        clinicalApi.saveMse(uhid, { admission_id: admissionId, mse: mseFindings }),
        clinicalApi.saveDiagnosis(uhid, { admission_id: admissionId, diagnosis, severity }),
        clinicalApi.saveRisk(uhid, {
          admission_id: admissionId,
          suicide: suicideRisk,
          selfHarm: selfHarmRisk,
          aggression: aggressionRisk,
        }),
        clinicalApi.savePrescription(uhid, {
          admission_id: admissionId,
          medicines: medications,
          diagnosis,
        }),
        clinicalApi.addVitals(uhid, {
          admission_id: admissionId,
          bp,
          pulse,
          temp,
          weight,
          height,
          spo2,
        }),
      ]);

      if (selectedLabs && selectedLabs.length > 0) {
        try {
          await labApi.createLabTestRequest({
            patient_id: uhid,
            doctor_id: 'dr_chougule',
            admission_id: admissionId,
            tests_ordered: selectedLabs,
            clinical_notes: `Diagnosis: ${diagnosis}. Severity: ${severity}`,
          });
        } catch (labErr) {
          console.log('Lab sync notice:', labErr);
        }
      }

      Alert.alert(
        'EMR Record Saved',
        `Clinical consultation and psychiatric records synced with live backend for ${selectedPatient.name} (${selectedPatient.uhid}).`
      );
    } catch (err: any) {
      Alert.alert('Save Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePrintEmrReport = async () => {
    if (!selectedPatient) return;
    try {
      const html = generateConsultationReportHtml({
        patientName: selectedPatient.name,
        uhid: selectedPatient.uhid || 'SWH001',
        age: selectedPatient.age || 32,
        gender: selectedPatient.gender || 'General',
        date: new Date().toLocaleDateString('en-GB'),
        doctorName: 'Dr. P. M. Chougule',
        chiefComplaints: chiefComplaint || 'Psychiatric evaluation and review.',
        hpi,
        suicidalIdeation,
        mseFindings,
        diagnosis,
        severity,
        riskLevels: { suicide: suicideRisk, selfHarm: selfHarmRisk, aggression: aggressionRisk },
        vitals: { bp, pulse, temp, weight, bmi: calculateBmi() },
        medicines: medications,
        treatmentPlan: {
          pharmacotherapy: pharmacotherapyPlan,
          modalities: selectedTherapies,
          labOrders: selectedLabs,
          followUp,
        },
        soapNotes: { s: soapS, o: soapO, a: soapA, p: soapP },
      });
      await printOrSharePdf(html, `EMR_Report_${selectedPatient.uhid}`);
    } catch (err: any) {
      Alert.alert('Report Error', err?.message || 'Unable to print EMR report.');
    }
  };

  const handleToggleSessionLock = async () => {
    if (!selectedPatient) return;
    try {
      const pid = selectedPatient.uhid || selectedPatient.id;
      if (isSessionLocked) {
        await clinicalApi.endSession(pid);
        setIsSessionLocked(false);
        Alert.alert('Session Unlocked', 'Patient record unlocked for other clinicians.');
      } else {
        await clinicalApi.startSession(pid);
        setIsSessionLocked(true);
        Alert.alert('Session Active', 'Patient record is locked to you for this consultation.');
      }
    } catch {
      setIsSessionLocked(!isSessionLocked);
    }
  };

  const fallbackPatients = [
    { id: '1', name: 'Prerana Suryawanshi', uhid: 'SWASTIK-2026-00001', age: 35, gender: 'Female' },
    { id: '2', name: 'Shubham Kolekar', uhid: 'SWASTIK-2026-00002', age: 29, gender: 'Male' },
    { id: '3', name: 'Virat Kohli', uhid: 'SWASTIK-2026-00006', age: 26, gender: 'Male' },
    { id: '4', name: 'Rohit Sharma', uhid: 'SWASTIK-2026-00007', age: 42, gender: 'Male' },
  ];

  const patientChoices = livePatients.length > 0 ? livePatients : fallbackPatients;

  return (
    <View style={styles.root}>
      <AppHeader onOpenDrawer={onOpenDrawer} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.screenTitle}>Psychiatric EMR Consultation</Text>
            <Text style={styles.screenSub}>Full Clinical Workstation & Diagnostic Assessment</Text>
          </View>
        </View>

        {!selectedPatient ? (
          <View>
            <View style={styles.infoCard}>
              <View style={styles.infoIconBox}>
                <Ionicons name="folder-open" size={24} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoCardTitle}>Select Patient to Open EMR</Text>
                <Text style={styles.infoCardText}>
                  Choose a patient from the hospital database below or select from Today's Schedule to start comprehensive clinical evaluation.
                </Text>
              </View>
            </View>

            <View style={styles.patientSelectWrap}>
              <Text style={styles.secTitle}>Hospital Registry Patients</Text>
              {patientChoices.map((p, idx) => (
                <TouchableOpacity
                  key={p.uhid || p._id || p.id || idx}
                  style={styles.patientItem}
                  onPress={() => setSelectedPatient(p)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarLetter}>{(p.name || 'P')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{p.name}</Text>
                    <Text style={styles.patientMeta}>
                      {p.uhid} · {p.age || 30} Yrs · {p.gender || 'General'}
                    </Text>
                  </View>
                  <View style={styles.openPill}>
                    <Text style={styles.openPillText}>Open EMR</Text>
                    <Feather name="chevron-right" size={14} color="#0D9488" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View>
            {/* Patient Header Banner */}
            <View style={styles.patientBanner}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.bannerPatientName}>{selectedPatient.name}</Text>
                  <View style={[styles.sessionBadge, isSessionLocked && styles.sessionBadgeLocked]}>
                    <Feather name={isSessionLocked ? 'lock' : 'check-circle'} size={12} color="#FFF" />
                    <Text style={styles.sessionBadgeText}>{isSessionLocked ? 'Locked' : 'In Session'}</Text>
                  </View>
                </View>
                <Text style={styles.bannerPatientMeta}>
                  UHID: {selectedPatient.uhid} | {selectedPatient.age || 30} Yrs | {selectedPatient.gender || 'General'} | Ward: OPD
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.lockToggleBtn} onPress={handleToggleSessionLock}>
                  <Feather name={isSessionLocked ? 'unlock' : 'lock'} size={14} color="#0D9488" />
                  <Text style={styles.lockToggleText}>{isSessionLocked ? 'Unlock' : 'Lock'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.changePatientBtn} onPress={() => setSelectedPatient(null)}>
                  <Text style={styles.changePatientText}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* EMR Sub-Navigation Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emrTabsScroll} contentContainerStyle={styles.emrTabsContainer}>
              {[
                { key: 'symptoms', label: 'Symptoms & MSE', icon: 'file-text' },
                { key: 'diagnosis', label: 'Diagnosis & Risk', icon: 'activity' },
                { key: 'medications', label: `Rx Meds (${medications.length})`, icon: 'plus-circle' },
                { key: 'treatment', label: 'Treatment Plan', icon: 'clipboard' },
                { key: 'soap', label: 'SOAP Notes', icon: 'edit-3' },
                { key: 'vitals', label: 'Vitals', icon: 'heart' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.emrTabChip, activeTab === t.key && styles.emrTabChipActive]}
                  onPress={() => setActiveTab(t.key as EmrTab)}
                  activeOpacity={0.7}
                >
                  <Feather name={t.icon as any} size={14} color={activeTab === t.key ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.emrTabChipText, activeTab === t.key && styles.emrTabChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tab 1: Symptoms & Mental State Examination (MSE) */}
            {activeTab === 'symptoms' && (
              <View style={styles.tabContentCard}>
                <Text style={styles.tabHeading}>1. Chief Complaints & History of Illness</Text>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>Chief Complaint (Patient's Words)</Text>
                  <TextInput
                    style={styles.textInputArea}
                    multiline
                    numberOfLines={2}
                    value={chiefComplaint}
                    onChangeText={setChiefComplaint}
                    placeholder="e.g. Severe low mood, lack of sleep, crying spells since 3 weeks"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.twoColRow}>
                  <View style={[styles.fieldBox, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Onset</Text>
                    <TextInput
                      style={styles.textInputSingle}
                      value={onset}
                      onChangeText={setOnset}
                      placeholder="e.g. 3 weeks ago"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={[styles.fieldBox, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Duration</Text>
                    <TextInput
                      style={styles.textInputSingle}
                      value={duration}
                      onChangeText={setDuration}
                      placeholder="e.g. Continuous"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>Precipitating Factors</Text>
                  <TextInput
                    style={styles.textInputSingle}
                    value={precipitatingFactors}
                    onChangeText={setPrecipitatingFactors}
                    placeholder="Recent life events, work stress, loss, financial stressors"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>HPI (History of Present Illness)</Text>
                  <TextInput
                    style={styles.textInputArea}
                    multiline
                    numberOfLines={3}
                    value={hpi}
                    onChangeText={setHpi}
                    placeholder="Detailed psychiatric history, progression, biological functions (sleep, appetite, energy)..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>Suicidal Ideation (SI Assessment)</Text>
                  <View style={styles.chipsRow}>
                    {SI_OPTIONS.map((si) => (
                      <TouchableOpacity
                        key={si}
                        style={[
                          styles.siChip,
                          suicidalIdeation === si && styles.siChipActive,
                          si !== 'None' && suicidalIdeation === si && styles.siChipDanger,
                        ]}
                        onPress={() => setSuicidalIdeation(si)}
                      >
                        <Text
                          style={[
                            styles.siChipText,
                            suicidalIdeation === si && styles.siChipTextActive,
                          ]}
                        >
                          {si}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.twoColRow}>
                  <View style={[styles.fieldBox, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Self-Harm History</Text>
                    <TextInput
                      style={styles.textInputSingle}
                      value={selfHarmHistory}
                      onChangeText={setSelfHarmHistory}
                      placeholder="Past NSSI, deliberate attempts"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={[styles.fieldBox, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Harm to Others</Text>
                    <TextInput
                      style={styles.textInputSingle}
                      value={harmToOthersRisk}
                      onChangeText={setHarmToOthersRisk}
                      placeholder="Aggression, homicidal thoughts"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                {/* Mental Status Examination (MSE) Interactive Module */}
                <View style={styles.mseModuleBox}>
                  <View style={styles.mseHeaderRow}>
                    <MaterialCommunityIcons name="brain" size={20} color="#0D9488" />
                    <Text style={styles.mseHeading}>Mental Status Examination (MSE)</Text>
                  </View>
                  <Text style={styles.mseSub}>Tap findings to include in official clinical observation:</Text>

                  {Object.entries(MSE_OPTIONS).map(([catKey, options]) => (
                    <View key={catKey} style={styles.mseCategoryRow}>
                      <Text style={styles.mseCatLabel}>{catKey.replace(/([A-Z])/g, ' $1').trim()}</Text>
                      <View style={styles.chipsRow}>
                        {options.map((opt) => {
                          const isSelected = (mseFindings[catKey] || []).includes(opt);
                          const isDangerous = MSE_DANGEROUS.some((d) => opt.includes(d));

                          return (
                            <TouchableOpacity
                              key={opt}
                              style={[
                                styles.mseChip,
                                isSelected && styles.mseChipActive,
                                isDangerous && isSelected && styles.mseChipDanger,
                              ]}
                              onPress={() => handleToggleMse(catKey, opt)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.mseChipText,
                                  isSelected && styles.mseChipTextActive,
                                  isDangerous && isSelected && { color: '#FFFFFF' },
                                ]}
                              >
                                {opt}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Tab 2: Diagnosis & Clinical Risk */}
            {activeTab === 'diagnosis' && (
              <View style={styles.tabContentCard}>
                <Text style={styles.tabHeading}>2. Psychiatric Diagnosis & Risk Assessment</Text>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>Diagnostic Classification System</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    <TouchableOpacity
                      style={[styles.diagSysBtn, diagSystem === 'icd11' && styles.diagSysBtnActive]}
                      onPress={() => setDiagSystem('icd11')}
                    >
                      <Text style={[styles.diagSysText, diagSystem === 'icd11' && styles.diagSysTextActive]}>
                        ICD-11 (WHO)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.diagSysBtn, diagSystem === 'dsm5' && styles.diagSysBtnActive]}
                      onPress={() => setDiagSystem('dsm5')}
                    >
                      <Text style={[styles.diagSysText, diagSystem === 'dsm5' && styles.diagSysTextActive]}>
                        DSM-5 (APA)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Search Input */}
                  <View style={styles.diagSearchBox}>
                    <Feather name="search" size={16} color="#64748B" />
                    <TextInput
                      style={styles.diagSearchInput}
                      placeholder={`Search ${diagSystem.toUpperCase()} codes & psychiatric disorders...`}
                      placeholderTextColor="#94A3B8"
                      value={diagSearch}
                      onChangeText={setDiagSearch}
                    />
                    {diagSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setDiagSearch('')}>
                        <Feather name="x" size={16} color="#64748B" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Selected Diagnosis Badge */}
                  <View style={styles.selectedDiagBadge}>
                    <Text style={styles.selectedDiagLabel}>Selected Diagnosis:</Text>
                    <Text style={styles.selectedDiagVal}>{diagnosis}</Text>
                  </View>

                  <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                    {filteredDiagnoses.map((item: any, idx: number) => {
                      const itemText = `${item.code} ${item.title}`;
                      const isSelected = diagnosis === itemText;
                      return (
                        <TouchableOpacity
                          key={item.code || idx}
                          style={[styles.diagRow, isSelected && styles.diagRowActive]}
                          onPress={() => setDiagnosis(itemText)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSelected ? '#0D9488' : '#94A3B8'}
                          />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={[styles.diagText, isSelected && styles.diagTextActive]}>
                              {item.title}
                            </Text>
                            <Text style={styles.diagCodeSub}>Code: {item.code}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>Clinical Severity</Text>
                  <View style={styles.chipsRow}>
                    {['Mild', 'Moderate', 'Severe', 'In Remission'].map((sev) => (
                      <TouchableOpacity
                        key={sev}
                        style={[styles.sevChip, severity === sev && styles.sevChipActive]}
                        onPress={() => setSeverity(sev)}
                      >
                        <Text style={[styles.sevChipText, severity === sev && styles.sevChipTextActive]}>
                          {sev}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Risk Meters */}
                <View style={styles.riskMeterSection}>
                  <Text style={styles.riskSectionTitle}>Clinical Risk Meters</Text>

                  {/* Suicide Risk */}
                  <View style={styles.riskRow}>
                    <Text style={styles.riskName}>Suicide Risk:</Text>
                    <View style={styles.riskLevelsRow}>
                      {(['Low', 'Moderate', 'High', 'Critical'] as const).map((lvl) => (
                        <TouchableOpacity
                          key={lvl}
                          style={[
                            styles.riskLevelPill,
                            suicideRisk === lvl && styles.riskLevelPillActive,
                            suicideRisk === lvl && lvl === 'Critical' && { backgroundColor: '#DC2626' },
                          ]}
                          onPress={() => setSuicideRisk(lvl)}
                        >
                          <Text style={[styles.riskLevelText, suicideRisk === lvl && styles.riskLevelTextActive]}>
                            {lvl}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Self-Harm Risk */}
                  <View style={styles.riskRow}>
                    <Text style={styles.riskName}>Self-Harm Risk:</Text>
                    <View style={styles.riskLevelsRow}>
                      {(['Low', 'Moderate', 'High', 'Critical'] as const).map((lvl) => (
                        <TouchableOpacity
                          key={lvl}
                          style={[styles.riskLevelPill, selfHarmRisk === lvl && styles.riskLevelPillActive]}
                          onPress={() => setSelfHarmRisk(lvl)}
                        >
                          <Text style={[styles.riskLevelText, selfHarmRisk === lvl && styles.riskLevelTextActive]}>
                            {lvl}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Aggression Risk */}
                  <View style={styles.riskRow}>
                    <Text style={styles.riskName}>Aggression / Violence:</Text>
                    <View style={styles.riskLevelsRow}>
                      {(['Low', 'Moderate', 'High', 'Critical'] as const).map((lvl) => (
                        <TouchableOpacity
                          key={lvl}
                          style={[styles.riskLevelPill, aggressionRisk === lvl && styles.riskLevelPillActive]}
                          onPress={() => setAggressionRisk(lvl)}
                        >
                          <Text style={[styles.riskLevelText, aggressionRisk === lvl && styles.riskLevelTextActive]}>
                            {lvl}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Tab 3: Medications (Rx) */}
            {activeTab === 'medications' && (
              <View style={styles.tabContentCard}>
                <View style={styles.medsHeaderRow}>
                  <Text style={styles.tabHeading}>3. Pharmacotherapy Prescriptions</Text>
                  <TouchableOpacity
                    style={styles.addMedBtn}
                    onPress={() => setShowAddMedModal(true)}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={16} color="#FFF" />
                    <Text style={styles.addMedBtnText}>Add Drug</Text>
                  </TouchableOpacity>
                </View>

                {medications.length === 0 ? (
                  <View style={styles.emptyMeds}>
                    <Feather name="alert-circle" size={24} color="#94A3B8" />
                    <Text style={styles.emptyMedsText}>No medications added yet.</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {medications.map((m, idx) => (
                      <View key={idx} style={styles.medCard}>
                        <View style={styles.medCardHeader}>
                          <Text style={styles.medName}>{m.name}</Text>
                          <TouchableOpacity onPress={() => handleRemoveMedication(idx)}>
                            <Feather name="trash-2" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.medDetailsRow}>
                          <View style={styles.medBadge}>
                            <Text style={styles.medBadgeText}>Dose: {m.dose}</Text>
                          </View>
                          <View style={styles.medBadge}>
                            <Text style={styles.medBadgeText}>{m.timing}</Text>
                          </View>
                          <View style={styles.medBadge}>
                            <Text style={styles.medBadgeText}>{m.duration}</Text>
                          </View>
                        </View>
                        {m.instructions ? (
                          <Text style={styles.medInstructions}>Note: {m.instructions}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Tab 4: Treatment Plan & Lab Orders */}
            {activeTab === 'treatment' && (
              <View style={styles.tabContentCard}>
                <Text style={styles.tabHeading}>4. Multidisciplinary Treatment Plan</Text>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>Psychotherapy Modalities</Text>
                  <View style={styles.chipsRow}>
                    {THERAPY_MODALITIES.map((mod) => {
                      const active = selectedTherapies.includes(mod);
                      return (
                        <TouchableOpacity
                          key={mod}
                          style={[styles.therapyChip, active && styles.therapyChipActive]}
                          onPress={() => handleToggleTherapy(mod)}
                        >
                          <Text style={[styles.therapyChipText, active && styles.therapyChipTextActive]}>
                            {mod}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>Order Lab Monitoring & Investigations</Text>
                  <View style={styles.chipsRow}>
                    {LAB_INVESTIGATIONS.map((lb) => {
                      const active = selectedLabs.includes(lb);
                      return (
                        <TouchableOpacity
                          key={lb}
                          style={[styles.labChip, active && styles.labChipActive]}
                          onPress={() => handleToggleLab(lb)}
                        >
                          <Text style={[styles.labChipText, active && styles.labChipTextActive]}>
                            {lb}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>Follow-up Schedule</Text>
                  <View style={styles.chipsRow}>
                    {['3 Days', '1 Week', '2 Weeks', '1 Month', '3 Months'].map((fu) => (
                      <TouchableOpacity
                        key={fu}
                        style={[styles.sevChip, followUp === fu && styles.sevChipActive]}
                        onPress={() => setFollowUp(fu)}
                      >
                        <Text style={[styles.sevChipText, followUp === fu && styles.sevChipTextActive]}>
                          {fu}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Tab 5: SOAP Notes */}
            {activeTab === 'soap' && (
              <View style={styles.tabContentCard}>
                <Text style={styles.tabHeading}>5. SOAP Session Clinical Notes</Text>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>S — Subjective (Patient's reported feelings, sleep)</Text>
                  <TextInput
                    style={styles.textInputArea}
                    multiline
                    numberOfLines={2}
                    value={soapS}
                    onChangeText={setSoapS}
                    placeholder="Patient describes mood as 4/10; reports improved sleep..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>O — Objective (Observed behavior, MSE, vitals)</Text>
                  <TextInput
                    style={styles.textInputArea}
                    multiline
                    numberOfLines={2}
                    value={soapO}
                    onChangeText={setSoapO}
                    placeholder="Calm, congruent affect, no active perceptual disturbance..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>A — Assessment (Impression & progress)</Text>
                  <TextInput
                    style={styles.textInputArea}
                    multiline
                    numberOfLines={2}
                    value={soapA}
                    onChangeText={setSoapA}
                    placeholder="Depressive symptoms showing partial remission with current regimen..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>P — Plan (Therapy, med titration, review)</Text>
                  <TextInput
                    style={styles.textInputArea}
                    multiline
                    numberOfLines={2}
                    value={soapP}
                    onChangeText={setSoapP}
                    placeholder="Continue Escitalopram 10mg; start weekly CBT sessions..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            )}

            {/* Tab 6: Patient Vitals */}
            {activeTab === 'vitals' && (
              <View style={styles.tabContentCard}>
                <Text style={styles.tabHeading}>6. Patient Physical Vitals</Text>

                <View style={styles.vitalsGrid}>
                  <View style={styles.vitalCard}>
                    <Text style={styles.vitalTitle}>BP (mmHg)</Text>
                    <TextInput style={styles.vitalField} value={bp} onChangeText={setBp} />
                  </View>
                  <View style={styles.vitalCard}>
                    <Text style={styles.vitalTitle}>Pulse (bpm)</Text>
                    <TextInput style={styles.vitalField} value={pulse} onChangeText={setPulse} keyboardType="numeric" />
                  </View>
                  <View style={styles.vitalCard}>
                    <Text style={styles.vitalTitle}>Temp (°F)</Text>
                    <TextInput style={styles.vitalField} value={temp} onChangeText={setTemp} keyboardType="numeric" />
                  </View>
                  <View style={styles.vitalCard}>
                    <Text style={styles.vitalTitle}>SpO2 (%)</Text>
                    <TextInput style={styles.vitalField} value={spo2} onChangeText={setSpo2} keyboardType="numeric" />
                  </View>
                  <View style={styles.vitalCard}>
                    <Text style={styles.vitalTitle}>Weight (kg)</Text>
                    <TextInput style={styles.vitalField} value={weight} onChangeText={setWeight} keyboardType="numeric" />
                  </View>
                  <View style={styles.vitalCard}>
                    <Text style={styles.vitalTitle}>Height (cm)</Text>
                    <TextInput style={styles.vitalField} value={height} onChangeText={setHeight} keyboardType="numeric" />
                  </View>
                </View>

                <View style={styles.bmiDisplayCard}>
                  <Text style={styles.bmiLabel}>Calculated Body Mass Index (BMI):</Text>
                  <Text style={styles.bmiVal}>{calculateBmi()} kg/m²</Text>
                </View>
              </View>
            )}

            {/* Bottom Actions Row */}
            <View style={styles.actionsBottomRow}>
              <TouchableOpacity
                style={styles.printReportBtn}
                onPress={handlePrintEmrReport}
                activeOpacity={0.8}
              >
                <Feather name="printer" size={18} color="#0D9488" />
                <Text style={styles.printReportText}>Print EMR PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveEmrBtn}
                onPress={handleSaveConsultation}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Feather name="save" size={18} color="#FFF" />
                    <Text style={styles.saveEmrText}>Save Consultation</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Medication Modal */}
      <Modal visible={showAddMedModal} transparent animationType="fade">
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Drug Prescription</Text>
              <TouchableOpacity onPress={() => setShowAddMedModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>Drug Name & Strength *</Text>
              <TextInput
                style={styles.textInputSingle}
                value={newMedName}
                onChangeText={setNewMedName}
                placeholder="e.g. Tab. Lithium Carbonate 300mg"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.twoColRow}>
              <View style={[styles.fieldBox, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Dosage Frequency</Text>
                <TextInput
                  style={styles.textInputSingle}
                  value={newMedDose}
                  onChangeText={setNewMedDose}
                  placeholder="e.g. 1-0-1"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={[styles.fieldBox, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Duration</Text>
                <TextInput
                  style={styles.textInputSingle}
                  value={newMedDuration}
                  onChangeText={setNewMedDuration}
                  placeholder="e.g. 30 days"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>Timing</Text>
              <TextInput
                style={styles.textInputSingle}
                value={newMedTiming}
                onChangeText={setNewMedTiming}
                placeholder="e.g. After food / At bedtime"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>Special Instructions</Text>
              <TextInput
                style={styles.textInputSingle}
                value={newMedInstructions}
                onChangeText={setNewMedInstructions}
                placeholder="e.g. Drink plenty of water"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity style={styles.confirmAddMedBtn} onPress={handleAddMedication} activeOpacity={0.8}>
              <Text style={styles.confirmAddMedText}>Add to Prescription</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  titleRow: { marginBottom: 16 },
  screenTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  screenSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  infoCard: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#CCFBF1', justifyContent: 'center', alignItems: 'center' },
  infoCardTitle: { fontSize: 15, fontWeight: '700', color: '#0F766E' },
  infoCardText: { fontSize: 13, color: '#115E59', marginTop: 4, lineHeight: 18 },
  secTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  patientSelectWrap: { gap: 10 },
  patientItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#0284C7', fontWeight: '800', fontSize: 16 },
  patientName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  patientMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDFA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  openPillText: { fontSize: 12, fontWeight: '700', color: '#0D9488' },
  patientBanner: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  bannerPatientName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  bannerPatientMeta: { fontSize: 12, color: '#CCFBF1', marginTop: 4 },
  sessionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#059669', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sessionBadgeLocked: { backgroundColor: '#D97706' },
  sessionBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  lockToggleBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockToggleText: { fontSize: 12, fontWeight: '700', color: '#0D9488' },
  changePatientBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  changePatientText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  emrTabsScroll: { marginBottom: 14 },
  emrTabsContainer: { gap: 8 },
  emrTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emrTabChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  emrTabChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  emrTabChipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  tabContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  tabHeading: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  fieldBox: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  textInputSingle: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  textInputArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  twoColRow: { flexDirection: 'row', gap: 10 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  siChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  siChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  siChipDanger: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  siChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  siChipTextActive: { color: '#FFF', fontWeight: '800' },
  mseModuleBox: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  mseHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  mseHeading: { fontSize: 15, fontWeight: '800', color: '#0D9488' },
  mseSub: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  mseCategoryRow: { marginBottom: 10 },
  mseCatLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6, textTransform: 'capitalize' },
  mseChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mseChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  mseChipDanger: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  mseChipText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  mseChipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  diagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
    backgroundColor: '#FAFAFA',
  },
  diagRowActive: { borderColor: '#0D9488', backgroundColor: '#F0FDFA' },
  diagText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  diagTextActive: { color: '#0F766E', fontWeight: '800' },
  sevChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sevChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  sevChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  sevChipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  riskMeterSection: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  riskSectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  riskRow: { marginBottom: 10 },
  riskName: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 },
  riskLevelsRow: { flexDirection: 'row', gap: 6 },
  riskLevelPill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  riskLevelPillActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  riskLevelText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  riskLevelTextActive: { color: '#FFFFFF', fontWeight: '800' },
  medsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addMedBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0D9488', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addMedBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  emptyMeds: { padding: 30, alignItems: 'center', gap: 8 },
  emptyMedsText: { fontSize: 13, color: '#94A3B8' },
  medCard: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  medCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  medDetailsRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  medBadge: { backgroundColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  medBadgeText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  medInstructions: { fontSize: 11, color: '#64748B', marginTop: 6, fontStyle: 'italic' },
  therapyChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  therapyChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  therapyChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  therapyChipTextActive: { color: '#FFF', fontWeight: '800' },
  labChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  labChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  labChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  labChipTextActive: { color: '#FFF', fontWeight: '800' },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vitalCard: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  vitalTitle: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  vitalField: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 4, paddingVertical: 2 },
  bmiDisplayCard: { marginTop: 14, backgroundColor: '#F0FDFA', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bmiLabel: { fontSize: 13, fontWeight: '600', color: '#0F766E' },
  bmiVal: { fontSize: 16, fontWeight: '800', color: '#0D9488' },
  actionsBottomRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  printReportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 14,
  },
  printReportText: { fontSize: 14, fontWeight: '800', color: '#0D9488' },
  saveEmrBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 14,
    elevation: 2,
  },
  saveEmrText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  confirmAddMedBtn: { marginTop: 10, backgroundColor: '#0D9488', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmAddMedText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  diagSysBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  diagSysBtnActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  diagSysText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  diagSysTextActive: { color: '#FFFFFF', fontWeight: '800' },
  diagSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  diagSearchInput: { flex: 1, paddingVertical: 8, fontSize: 13, color: '#0F172A' },
  selectedDiagBadge: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  selectedDiagLabel: { fontSize: 11, fontWeight: '700', color: '#0F766E' },
  selectedDiagVal: { fontSize: 13, fontWeight: '800', color: '#134E4A', marginTop: 2 },
  diagCodeSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
});
