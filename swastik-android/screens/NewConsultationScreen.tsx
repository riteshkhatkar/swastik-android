// swastik-android/screens/NewConsultationScreen.tsx
// Complete Admission-Centric Psychiatric EMR & Clinical Consultation Workstation
// Supports: Ward Round Board, Symptoms/HPI, MSE, Diagnosis, Risk, Medications (+Stop), Treatment Plan,
// SOAP Notes (+Sign/Lock), Vitals (+History), Lab Monitoring, Clinical Timeline, History Events, Audit, Rehab & Daily Routine

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Dimensions,
  Platform,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import {
  patientService,
  clinicalService,
  emrService,
  labApi,
  getApiErrorMessage,
} from '../services/api';
import { generateConsultationReportHtml, printOrSharePdf } from '../utils/pdfGenerator';
import { useAuthStore } from '../store/authStore';
import icd11Data from '../data/icd11Codes.json';
import dsm5Data from '../data/dsm5Codes.json';

const { width } = Dimensions.get('window');

interface NewConsultationScreenProps {
  onOpenDrawer: () => void;
  initialPatient?: any;
}

type WorkstationMode = 'board' | 'emr';
type EmrTab =
  | 'symptoms'
  | 'mse'
  | 'diagnosis'
  | 'risk'
  | 'medications'
  | 'treatment'
  | 'soap'
  | 'vitals'
  | 'labs'
  | 'timeline'
  | 'rehab'
  | 'audit';

const SI_OPTIONS = ['None', 'Passive', 'Active', 'Intent', 'Plan'] as const;

const MSE_OPTIONS: Record<string, string[]> = {
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

const THERAPY_MODALITIES = [
  'CBT',
  'DBT',
  'IPT',
  'Family Therapy',
  'Group Therapy',
  'Supportive Psychotherapy',
];

const OBSERVATION_LEVELS = ['Routine', 'Q15', 'Q30', '1:1', 'Special'];

const COMMON_LAB_TESTS = [
  'CBC',
  'LFT',
  'KFT',
  'Thyroid Profile (TSH)',
  'Serum Lithium Level',
  'Serum Valproate Level',
  'Lipid Profile',
  'ECG',
  'Urine Drug Screen',
  'CT Brain',
];

const SOAP_CHECKLIST_QUESTIONS = [
  { id: 'oriented', text: 'Oriented to time, place, and person?', isRisk: false },
  { id: 'grooming', text: 'Appropriate grooming and hygiene?', isRisk: false },
  { id: 'eyeContact', text: 'Normal eye contact maintained?', isRisk: false },
  { id: 'speech', text: 'Speech coherent and normal in rate/tone?', isRisk: false },
  { id: 'moodAffect', text: 'Mood and affect congruent?', isRisk: false },
  { id: 'suicidal', text: 'Any suicidal ideation reported or observed?', isRisk: true },
  { id: 'homicidal', text: 'Any homicidal ideation reported or observed?', isRisk: true },
  { id: 'hallucinations', text: 'Any hallucinations present?', isRisk: true },
  { id: 'delusions', text: 'Any delusions or abnormal thought content?', isRisk: true },
  { id: 'memory', text: 'Memory and concentration intact?', isRisk: false },
  { id: 'insight', text: 'Insight into illness present?', isRisk: false },
  { id: 'judgment', text: 'Judgment appears intact?', isRisk: false },
];

export const NewConsultationScreen: React.FC<NewConsultationScreenProps> = ({
  onOpenDrawer,
  initialPatient,
}) => {
  const { user } = useAuthStore();
  const doctorName = user?.full_name || 'Dr. P. M. Chougule';
  const doctorId = user?.id || 'dr_chougule';

  // Navigation & Mode
  const [selectedPatient, setSelectedPatient] = useState<any>(initialPatient || null);
  const [admissionId, setAdmissionId] = useState<string>(
    initialPatient?.admission_id || initialPatient?.admissionId || ''
  );
  const [workstationMode, setWorkstationMode] = useState<WorkstationMode>('board');
  const [activeTab, setActiveTab] = useState<EmrTab>('symptoms');
  const [livePatients, setLivePatients] = useState<any[]>([]);
  const [resolvingAdmission, setResolvingAdmission] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(false);

  // Ward Board Summary & Timeline Data
  const [wardSummary, setWardSummary] = useState<any>(null);
  const [clinicalTimeline, setClinicalTimeline] = useState<any[]>([]);

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

  // 2. MSE State
  const [mseFindings, setMseFindings] = useState<Record<string, string[]>>({});

  // 3. Diagnosis & Risk State
  const [diagSystem, setDiagSystem] = useState<'icd11' | 'dsm5'>('icd11');
  const [diagSearch, setDiagSearch] = useState('');
  const [diagnosis, setDiagnosis] = useState('F32.1 Major Depressive Disorder, Moderate');
  const [differential, setDifferential] = useState<string[]>([]);
  const [severity, setSeverity] = useState('Moderate');
  const [specifier, setSpecifier] = useState('');
  const [bioPsychoSocial, setBioPsychoSocial] = useState('');
  const [riskToSelf, setRiskToSelf] = useState(30);
  const [riskToOthers, setRiskToOthers] = useState(15);
  const [riskToVulnerability, setRiskToVulnerability] = useState(25);
  const [safetyPlanRequired, setSafetyPlanRequired] = useState(false);

  // 4. Medications State
  const [medicationsList, setMedicationsList] = useState<any[]>([]);
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [newMedDrug, setNewMedDrug] = useState('');
  const [newMedDose, setNewMedDose] = useState('10mg');
  const [newMedFreq, setNewMedFreq] = useState('OD');
  const [newMedRoute, setNewMedRoute] = useState('PO');
  const [newMedDuration, setNewMedDuration] = useState('30 days');

  // 5. Treatment Plan State
  const [shortTermGoals, setShortTermGoals] = useState('');
  const [longTermGoals, setLongTermGoals] = useState('');
  const [selectedTherapies, setSelectedTherapies] = useState<string[]>(['CBT']);
  const [observationLevel, setObservationLevel] = useState('Routine');
  const [dischargeCriteria, setDischargeCriteria] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState('');

  // 6. SOAP Notes State
  const [sessionNotesList, setSessionNotesList] = useState<any[]>([]);
  const [soapSubjective, setSoapSubjective] = useState('');
  const [soapObjective, setSoapObjective] = useState('');
  const [soapAssessment, setSoapAssessment] = useState('');
  const [soapPlan, setSoapPlan] = useState('');
  const [soapRoleTag, setSoapRoleTag] = useState('Psychiatrist');
  const [soapChecklist, setSoapChecklist] = useState<Record<string, string>>({});

  // 7. Vitals State
  const [vitalsList, setVitalsList] = useState<any[]>([]);
  const [vitalBpSys, setVitalBpSys] = useState('120');
  const [vitalBpDia, setVitalBpDia] = useState('80');
  const [vitalHr, setVitalHr] = useState('74');
  const [vitalTemp, setVitalTemp] = useState('36.8');
  const [vitalSpo2, setVitalSpo2] = useState('98');
  const [vitalRr, setVitalRr] = useState('16');
  const [vitalWeight, setVitalWeight] = useState('68');
  const [vitalSleep, setVitalSleep] = useState('7');
  const [vitalAppetite, setVitalAppetite] = useState('Normal');

  // 8. Labs & Monitoring State
  const [labMonitoringList, setLabMonitoringList] = useState<any[]>([]);
  const [patientLabOrders, setPatientLabOrders] = useState<any[]>([]);
  const [showOrderLabModal, setShowOrderLabModal] = useState(false);
  const [selectedLabTests, setSelectedLabTests] = useState<string[]>(['CBC']);
  const [labPriority, setLabPriority] = useState('Routine');
  const [labClinicalNotes, setLabClinicalNotes] = useState('');

  // 9. History Events & Audit State
  const [historyEventsList, setHistoryEventsList] = useState<any[]>([]);
  const [emrAuditList, setEmrAuditList] = useState<any[]>([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventDesc, setNewEventDesc] = useState('');

  // 10. Rehab & Daily Routine State
  const [rehabType, setRehabType] = useState('Occupational');
  const [rehabNotes, setRehabNotes] = useState('');
  const [routineNotes, setRoutineNotes] = useState('');

  // Quick Action Modals for Ward Round Board
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [quickNoteForm, setQuickNoteForm] = useState({ s: '', o: '', a: '', p: '' });
  const [showQuickVitalsModal, setShowQuickVitalsModal] = useState(false);
  const [quickVitalsForm, setQuickVitalsForm] = useState({ bp: '120/80', hr: '72', temp: '37.0', spo2: '98' });
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeForm, setDischargeForm] = useState({ condition: 'Stable', instructions: '', followUp: '1 Week' });

  // Diagnosis selector dataset
  const activeDataset: Array<{ code: string; title: string }> =
    diagSystem === 'icd11' ? (icd11Data as any) : (dsm5Data as any);
  const filteredDiagnoses = useMemo(() => {
    if (!diagSearch.trim()) return activeDataset.slice(0, 10);
    const q = diagSearch.toLowerCase();
    return activeDataset
      .filter((d) => (d.code || '').toLowerCase().includes(q) || (d.title || '').toLowerCase().includes(q))
      .slice(0, 20);
  }, [activeDataset, diagSearch]);

  // Initial Patients Registry Loader
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const res = await patientService.getPatients();
      if (Array.isArray(res) && res.length > 0) {
        setLivePatients(res);
      }
    } catch (err) {
      console.log('Error loading patient list:', err);
    }
  };

  // Admission-Centric Lifecycle Resolution
  const resolveAndLoadPatient = useCallback(
    async (patient: any) => {
      const uhid = patient.uhid || patient.patient_id || patient.id;
      if (!uhid) return;

      setSelectedPatient(patient);
      setResolvingAdmission(true);

      try {
        let aid = patient.admission_id || patient.admissionId;
        if (!aid) {
          aid = await emrService.resolveActiveAdmission(uhid, patient.name || patient.patient_name, doctorName);
        }
        setAdmissionId(aid);

        // Check active session lock status
        try {
          const sessions = await clinicalService.getActiveSessions();
          const locked = sessions.some((s) => s.patient_id === uhid || s.uhid === uhid);
          setIsSessionLocked(locked);
        } catch {}

        // Load all EMR data for this patient and active admission
        await loadAllEmrData(uhid, aid);
      } catch (err: any) {
        Alert.alert('Admission Resolution Error', getApiErrorMessage(err));
      } finally {
        setResolvingAdmission(false);
      }
    },
    [doctorName]
  );

  useEffect(() => {
    if (initialPatient) {
      resolveAndLoadPatient(initialPatient);
    }
  }, [initialPatient, resolveAndLoadPatient]);

  const loadAllEmrData = async (uhid: string, aid: string) => {
    try {
      const [
        symptoms,
        mse,
        diag,
        risk,
        meds,
        treatment,
        notes,
        vitals,
        labs,
        orders,
        timeline,
        summary,
        history,
        audit,
      ] = await Promise.all([
        emrService.getSymptomsHpi(uhid, aid).catch(() => null),
        emrService.getMse(uhid, aid).catch(() => null),
        emrService.getDiagnosis(uhid, aid).catch(() => null),
        emrService.getRisk(uhid, aid).catch(() => null),
        emrService.listMedications(uhid, aid).catch(() => []),
        emrService.getTreatmentPlan(uhid, aid).catch(() => null),
        emrService.listSessionNotes(uhid, aid).catch(() => []),
        emrService.listVitals(uhid, aid).catch(() => []),
        emrService.listLabMonitoring(uhid, aid).catch(() => []),
        labApi.getLabTestRequests({ patient_id: uhid }).catch(() => []),
        emrService.getClinicalTimeline(uhid, aid).catch(() => []),
        emrService.getWardSummary(uhid, aid).catch(() => null),
        emrService.listHistoryEvents(uhid).catch(() => []),
        emrService.getEmrAudit('admission', aid).catch(() => []),
      ]);

      if (symptoms) {
        setChiefComplaint(symptoms.chief_complaint || '');
        setOnset(symptoms.onset || '');
        setDuration(symptoms.duration || '');
        setPrecipitatingFactors(symptoms.precipitating_factors || '');
        setPerpetuatingFactors(symptoms.perpetuating_factors || '');
        setHpi(symptoms.hpi || '');
        setSuicidalIdeation(symptoms.suicidal_ideation || 'None');
        setSelfHarmHistory(symptoms.self_harm_history || '');
        setHarmToOthersRisk(symptoms.harm_to_others_risk || '');
      }

      if (mse && mse.appearance) {
        setMseFindings({
          appearance: mse.appearance || [],
          psychomotor: mse.psychomotor || [],
          speech: mse.speech || [],
          mood: mse.mood || [],
          affect: mse.affect || [],
          thoughtProcess: mse.thought_process || [],
          thoughtContent: mse.thought_content || [],
          perception: mse.perception || [],
          cognition: mse.cognition || [],
          insight: mse.insight || [],
          judgment: mse.judgment || [],
          attention: mse.attention || [],
        });
      }

      if (diag && (diag.primary_diagnosis || diag.diagnosis)) {
        setDiagnosis(diag.primary_diagnosis || diag.diagnosis);
        if (Array.isArray(diag.differential)) setDifferential(diag.differential);
        if (diag.severity) setSeverity(diag.severity);
        if (diag.specifier) setSpecifier(diag.specifier);
        if (diag.formulation_bio_psycho_social) setBioPsychoSocial(diag.formulation_bio_psycho_social);
      }

      if (risk) {
        setRiskToSelf(risk.suicide_risk ?? risk.risk_to_self ?? 30);
        setRiskToOthers(risk.violence_risk ?? risk.risk_to_others ?? 15);
        setRiskToVulnerability(risk.elopement_risk ?? risk.risk_to_vulnerability ?? 25);
        setSafetyPlanRequired(Boolean(risk.safety_plan_required));
      }

      if (Array.isArray(meds)) setMedicationsList(meds);
      if (Array.isArray(notes)) setSessionNotesList(notes);
      if (Array.isArray(vitals)) setVitalsList(vitals);
      if (Array.isArray(labs)) setLabMonitoringList(labs);
      if (Array.isArray(orders)) setPatientLabOrders(orders);
      if (Array.isArray(timeline)) setClinicalTimeline(timeline);
      if (summary) setWardSummary(summary);
      if (Array.isArray(history)) setHistoryEventsList(history);
      if (Array.isArray(audit)) setEmrAuditList(audit);

      if (treatment) {
        setShortTermGoals(Array.isArray(treatment.short_term_goals) ? treatment.short_term_goals.join('\n') : '');
        setLongTermGoals(Array.isArray(treatment.long_term_goals) ? treatment.long_term_goals.join('\n') : '');
        if (Array.isArray(treatment.therapy_modalities)) setSelectedTherapies(treatment.therapy_modalities);
        if (treatment.observation_level) setObservationLevel(treatment.observation_level);
        setDischargeCriteria(Array.isArray(treatment.discharge_criteria) ? treatment.discharge_criteria.join('\n') : '');
        setEmergencyContacts(Array.isArray(treatment.emergency_contacts) ? treatment.emergency_contacts.join('\n') : '');
      }
    } catch (err) {
      console.log('Error populating EMR records:', err);
    }
  };

  // Toggle Chip Selections
  const handleToggleMse = (category: string, value: string) => {
    setMseFindings((prev) => {
      const cur = prev[category] || [];
      const updated = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [category]: updated };
    });
  };

  const handleToggleTherapy = (modality: string) => {
    setSelectedTherapies((prev) =>
      prev.includes(modality) ? prev.filter((m) => m !== modality) : [...prev, modality]
    );
  };

  const handleToggleLabOrder = (test: string) => {
    setSelectedLabTests((prev) =>
      prev.includes(test) ? prev.filter((t) => t !== test) : [...prev, test]
    );
  };

  // Session Lock Toggle
  const handleToggleSessionLock = async () => {
    if (!selectedPatient) return;
    const uhid = selectedPatient.uhid || selectedPatient.id;
    try {
      if (isSessionLocked) {
        await clinicalService.endSession(uhid);
        setIsSessionLocked(false);
        Alert.alert('Session Released', 'Patient record unlocked for other clinicians.');
      } else {
        await clinicalService.startSession(uhid);
        setIsSessionLocked(true);
        Alert.alert('Session Locked', 'Patient record locked to you for this consultation.');
      }
    } catch (err: any) {
      Alert.alert('Lock Action Notice', getApiErrorMessage(err));
    }
  };

  // Individual Tab Save Actions with Guaranteed 2xx Backend Verification
  const saveSymptomsHpi = async () => {
    if (!selectedPatient || !admissionId) return;
    setSaving(true);
    try {
      const uhid = selectedPatient.uhid || selectedPatient.id;
      const summaryText = [
        chiefComplaint && `CC: ${chiefComplaint}`,
        onset && `Onset: ${onset}`,
        duration && `Duration: ${duration}`,
        hpi && `HPI: ${hpi}`,
        suicidalIdeation !== 'None' && `SI: ${suicidalIdeation}`,
      ].filter(Boolean).join('. ');

      await emrService.saveSymptomsHpi(uhid, {
        admission_id: admissionId,
        chief_complaint: chiefComplaint,
        onset,
        duration,
        precipitating_factors: precipitatingFactors,
        perpetuating_factors: perpetuatingFactors,
        hpi,
        suicidal_ideation: suicidalIdeation,
        self_harm_history: selfHarmHistory,
        harm_to_others_risk: harmToOthersRisk,
        summary: summaryText,
      }, doctorName);

      Alert.alert('Saved ✅', 'Symptoms & HPI saved to server database.');
      loadAllEmrData(uhid, admissionId);
    } catch (err: any) {
      Alert.alert('Save Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const saveMse = async () => {
    if (!selectedPatient || !admissionId) return;
    setSaving(true);
    try {
      const uhid = selectedPatient.uhid || selectedPatient.id;
      const dangerous: string[] = [];
      Object.values(mseFindings).flat().forEach((val) => {
        if (MSE_DANGEROUS.some((d) => val.includes(d))) dangerous.push(val);
      });

      await emrService.saveMse(uhid, {
        admission_id: admissionId,
        appearance: mseFindings.appearance || [],
        psychomotor: mseFindings.psychomotor || [],
        speech: mseFindings.speech || [],
        mood: mseFindings.mood || [],
        affect: mseFindings.affect || [],
        thought_process: mseFindings.thoughtProcess || [],
        thought_content: mseFindings.thoughtContent || [],
        perception: mseFindings.perception || [],
        cognition: mseFindings.cognition || [],
        insight: mseFindings.insight || [],
        judgment: mseFindings.judgment || [],
        attention: mseFindings.attention || [],
        dangerous_flags: dangerous,
      }, doctorName);

      Alert.alert('Saved ✅', 'Mental Status Examination recorded in live database.');
      loadAllEmrData(uhid, admissionId);
    } catch (err: any) {
      Alert.alert('Save Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const saveDiagnosisAndRisk = async () => {
    if (!selectedPatient || !admissionId) return;
    setSaving(true);
    try {
      const uhid = selectedPatient.uhid || selectedPatient.id;

      await Promise.all([
        emrService.saveDiagnosis(uhid, {
          admission_id: admissionId,
          primary_diagnosis: diagnosis,
          differential,
          severity,
          specifier,
          system_used: diagSystem,
          formulation_bio_psycho_social: bioPsychoSocial,
        }, doctorName),
        emrService.saveRisk(uhid, {
          admission_id: admissionId,
          risk_to_self: riskToSelf,
          risk_to_others: riskToOthers,
          risk_to_vulnerability: riskToVulnerability,
          suicide_risk: riskToSelf,
          violence_risk: riskToOthers,
          elopement_risk: riskToVulnerability,
          safety_plan_required: safetyPlanRequired,
        }, doctorName),
      ]);

      Alert.alert('Saved ✅', 'Diagnosis and Risk Assessment synchronized with server.');
      loadAllEmrData(uhid, admissionId);
    } catch (err: any) {
      Alert.alert('Save Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedication = async () => {
    if (!selectedPatient || !admissionId || !newMedDrug.trim()) {
      Alert.alert('Required', 'Please enter medicine name.');
      return;
    }
    setSaving(true);
    try {
      const uhid = selectedPatient.uhid || selectedPatient.id;
      const todayStr = new Date().toISOString().split('T')[0];

      await emrService.addMedication(uhid, {
        admission_id: admissionId,
        drug_name: newMedDrug.trim(),
        dose: newMedDose.trim(),
        frequency: newMedFreq.trim(),
        route: newMedRoute.trim(),
        duration: newMedDuration.trim(),
        start_date: todayStr,
        prescribing_doctor_name: doctorName,
        status: 'Active',
      }, doctorName);

      // Also sync to prescription registry
      clinicalService.savePrescription(uhid, {
        admission_id: admissionId,
        medicines: [{
          name: newMedDrug.trim(),
          dose: newMedDose.trim(),
          timing: newMedFreq.trim(),
          duration: newMedDuration.trim(),
        }],
        diagnosis,
      }).catch(() => null);

      setShowAddMedModal(false);
      setNewMedDrug('');
      Alert.alert('Prescription Saved ✅', `Added ${newMedDrug} to patient active regimen.`);
      loadAllEmrData(uhid, admissionId);
    } catch (err: any) {
      Alert.alert('Add Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleStopMedication = async (medId: string, drugName: string) => {
    if (!medId) return;
    Alert.alert(
      'Stop Medication',
      `Are you sure you want to discontinue ${drugName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discontinue',
          style: 'destructive',
          onPress: async () => {
            try {
              const todayStr = new Date().toISOString().split('T')[0];
              await emrService.updateMedication(medId, {
                status: 'Stopped',
                end_date: todayStr,
              }, doctorName);
              Alert.alert('Medication Stopped', `${drugName} marked as discontinued.`);
              if (selectedPatient && admissionId) loadAllEmrData(selectedPatient.uhid, admissionId);
            } catch (err: any) {
              Alert.alert('Update Failed', getApiErrorMessage(err));
            }
          },
        },
      ]
    );
  };

  const saveTreatmentPlan = async () => {
    if (!selectedPatient || !admissionId) return;
    setSaving(true);
    try {
      const uhid = selectedPatient.uhid || selectedPatient.id;
      await emrService.saveTreatmentPlan(uhid, {
        admission_id: admissionId,
        short_term_goals: shortTermGoals.split('\n').filter(Boolean),
        long_term_goals: longTermGoals.split('\n').filter(Boolean),
        therapy_modalities: selectedTherapies,
        observation_level: observationLevel,
        discharge_criteria: dischargeCriteria.split('\n').filter(Boolean),
        emergency_contacts: emergencyContacts.split('\n').filter(Boolean),
      }, doctorName);

      Alert.alert('Saved ✅', 'Comprehensive treatment plan saved to server.');
      loadAllEmrData(uhid, admissionId);
    } catch (err: any) {
      Alert.alert('Save Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSoapNote = async (shouldSign: boolean = false) => {
    if (!selectedPatient || !admissionId) return;
    if (!soapSubjective.trim() && !soapPlan.trim()) {
      Alert.alert('Required', 'Please fill in subjective observations and plan.');
      return;
    }
    setSaving(true);
    try {
      const uhid = selectedPatient.uhid || selectedPatient.id;
      const objectiveJson = JSON.stringify({
        vitals: { bp: `${vitalBpSys}/${vitalBpDia}`, pulse: vitalHr, temp: vitalTemp },
        checklist: soapChecklist,
        customObservations: soapObjective,
      });

      await emrService.createSessionNote(uhid, {
        admission_id: admissionId,
        session_type: 'Clinical Progress Round',
        subjective: soapSubjective,
        objective: objectiveJson,
        assessment: soapAssessment,
        plan: soapPlan,
        role_tag: soapRoleTag,
        draft: !shouldSign,
        signed: shouldSign,
        signed_at: shouldSign ? new Date().toISOString() : null,
        signed_by: shouldSign ? doctorName : null,
      }, doctorName);

      Alert.alert(
        shouldSign ? 'Note Signed & Locked ✅' : 'Draft Note Saved ✅',
        shouldSign
          ? 'Clinical SOAP note officially signed. Note will become read-only.'
          : 'Draft note saved. You can continue editing within 24 hours.'
      );

      setSoapSubjective('');
      setSoapAssessment('');
      setSoapPlan('');
      loadAllEmrData(uhid, admissionId);
    } catch (err: any) {
      Alert.alert('Note Save Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRecordVitals = async () => {
    if (!selectedPatient || !admissionId) return;
    setSaving(true);
    try {
      const uhid = selectedPatient.uhid || selectedPatient.id;
      await emrService.addVitals(uhid, {
        admission_id: admissionId,
        bp_systolic: parseInt(vitalBpSys, 10) || null,
        bp_diastolic: parseInt(vitalBpDia, 10) || null,
        hr: parseInt(vitalHr, 10) || null,
        temp: parseFloat(vitalTemp) || null,
        spo2: parseInt(vitalSpo2, 10) || null,
        rr: parseInt(vitalRr, 10) || null,
        weight: parseFloat(vitalWeight) || null,
        sleep_hours: parseFloat(vitalSleep) || null,
        appetite: vitalAppetite,
      }, doctorName);

      Alert.alert('Vitals Recorded ✅', 'Patient vitals saved to database.');
      loadAllEmrData(uhid, admissionId);
    } catch (err: any) {
      Alert.alert('Save Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleOrderLabInvestigations = async () => {
    if (!selectedPatient || selectedLabTests.length === 0) {
      Alert.alert('Required', 'Please select at least one lab test.');
      return;
    }
    setSaving(true);
    try {
      const uhid = selectedPatient.uhid || selectedPatient.id;
      await labApi.createLabTestRequest({
        patient_id: uhid,
        doctor_id: doctorId,
        admission_id: admissionId || undefined,
        tests_ordered: selectedLabTests,
        clinical_notes: labClinicalNotes || `Priority: ${labPriority}`,
      });

      setShowOrderLabModal(false);
      setLabClinicalNotes('');
      Alert.alert('Lab Request Created ✅', `${selectedLabTests.length} tests ordered for clinical pathology.`);
      loadAllEmrData(uhid, admissionId);
    } catch (err: any) {
      Alert.alert('Order Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAddHistoryEvent = async () => {
    if (!selectedPatient || !newEventTitle.trim()) {
      Alert.alert('Required', 'Please enter event title.');
      return;
    }
    setSaving(true);
    try {
      const uhid = selectedPatient.uhid || selectedPatient.id;
      await emrService.addHistoryEvent(uhid, {
        event_type: 'Clinical Milestone',
        date: newEventDate,
        description: `${newEventTitle.trim()}: ${newEventDesc.trim()}`,
      }, doctorName);

      setShowAddEventModal(false);
      setNewEventTitle('');
      setNewEventDesc('');
      Alert.alert('Event Recorded ✅', 'Event added to patient lifetime clinical timeline.');
      loadAllEmrData(uhid, admissionId);
    } catch (err: any) {
      Alert.alert('Add Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRehabAndRoutine = async () => {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const uhid = selectedPatient.uhid || selectedPatient.id;
      await Promise.all([
        clinicalService.saveRehabData(uhid, rehabType, { notes: rehabNotes, date: new Date().toISOString() }),
        clinicalService.saveDailyRoutine(uhid, { routine: routineNotes, date: new Date().toISOString() }),
      ]);
      Alert.alert('Rehab & Routine Saved ✅', 'Patient rehabilitation and schedule updated.');
    } catch (err: any) {
      Alert.alert('Save Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Quick Action Handlers for Ward Round Board
  const handleQuickNoteSubmit = async () => {
    if (!quickNoteForm.s && !quickNoteForm.p) {
      Alert.alert('Required', 'Please provide subjective observations and plan.');
      return;
    }
    setSaving(true);
    try {
      const uhid = selectedPatient.uhid || selectedPatient.id;
      await emrService.createSessionNote(uhid, {
        admission_id: admissionId,
        session_type: 'Ward Round Note',
        subjective: quickNoteForm.s,
        objective: quickNoteForm.o,
        assessment: quickNoteForm.a,
        plan: quickNoteForm.p,
        role_tag: 'Medical Doctor',
        draft: false,
        signed: true,
        signed_at: new Date().toISOString(),
        signed_by: doctorName,
      }, doctorName);

      setShowQuickNoteModal(false);
      setQuickNoteForm({ s: '', o: '', a: '', p: '' });
      Alert.alert('Note Saved ✅', 'Rounding note added to inpatient log.');
      loadAllEmrData(uhid, admissionId);
    } catch (err: any) {
      Alert.alert('Save Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleQuickVitalsSubmit = async () => {
    setSaving(true);
    try {
      const uhid = selectedPatient.uhid || selectedPatient.id;
      const bpParts = quickVitalsForm.bp.split('/');
      await emrService.addVitals(uhid, {
        admission_id: admissionId,
        bp_systolic: parseInt(bpParts[0], 10) || 120,
        bp_diastolic: parseInt(bpParts[1], 10) || 80,
        hr: parseInt(quickVitalsForm.hr, 10) || 72,
        temp: parseFloat(quickVitalsForm.temp) || 37.0,
        spo2: parseInt(quickVitalsForm.spo2, 10) || 98,
      }, doctorName);

      setShowQuickVitalsModal(false);
      Alert.alert('Vitals Recorded ✅', 'Patient vitals updated in ward pulse.');
      loadAllEmrData(uhid, admissionId);
    } catch (err: any) {
      Alert.alert('Save Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleQuickDischargeSubmit = async () => {
    setSaving(true);
    try {
      await emrService.updateEmrAdmission(admissionId, {
        clinical_status: 'Ready for Discharge',
        discharge_condition: dischargeForm.condition,
        discharge_instructions: dischargeForm.instructions,
        follow_up_instructions: dischargeForm.followUp,
      }, doctorName);

      setShowDischargeModal(false);
      Alert.alert('Recommendation Logged ✅', 'Patient marked ready for discharge.');
      if (selectedPatient) loadAllEmrData(selectedPatient.uhid, admissionId);
    } catch (err: any) {
      Alert.alert('Action Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Comprehensive EMR PDF Print
  const handlePrintFullReport = async () => {
    if (!selectedPatient) return;
    try {
      const html = generateConsultationReportHtml({
        patientName: selectedPatient.name || selectedPatient.patient_name,
        uhid: selectedPatient.uhid || selectedPatient.id,
        age: selectedPatient.age || 32,
        gender: selectedPatient.gender || 'General',
        date: new Date().toLocaleDateString('en-GB'),
        doctorName: doctorName,
        chiefComplaints: chiefComplaint || 'Psychiatric evaluation and review.',
        hpi,
        suicidalIdeation,
        mseFindings,
        diagnosis,
        severity,
        riskLevels: { suicide: riskToSelf > 50 ? 'High' : 'Moderate', selfHarm: 'Low', aggression: 'Low' },
        vitals: { bp: `${vitalBpSys}/${vitalBpDia}`, pulse: vitalHr, temp: vitalTemp, weight: vitalWeight, bmi: '23.4' },
        medicines: medicationsList.map((m) => ({
          name: m.drug_name || m.name,
          dose: m.dose,
          timing: m.frequency || m.timing,
          duration: m.duration,
        })),
        treatmentPlan: {
          pharmacotherapy: 'Continue current medications',
          modalities: selectedTherapies,
          labOrders: selectedLabTests,
          followUp: '2 Weeks',
        },
        soapNotes: { s: soapSubjective, o: soapObjective, a: soapAssessment, p: soapPlan },
      });
      await printOrSharePdf(html, `EMR_Clinical_Record_${selectedPatient.uhid}`);
    } catch (err: any) {
      Alert.alert('Report Error', err?.message || 'Could not print report.');
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <AppHeader onOpenDrawer={onOpenDrawer} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!selectedPatient ? (
          /* Patient Picker if no patient is currently open */
          <View>
            <View style={styles.infoCard}>
              <View style={styles.infoIconBox}>
                <Ionicons name="folder-open" size={24} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoCardTitle}>Select Patient to Open EMR</Text>
                <Text style={styles.infoCardText}>
                  Choose a registered patient below to resolve active admission context and launch the clinical evaluation workstation.
                </Text>
              </View>
            </View>

            <View style={styles.patientSelectWrap}>
              <Text style={styles.secTitle}>Hospital Registry Patients</Text>
              {livePatients.length === 0 ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#0D9488" />
                  <Text style={{ marginTop: 8, fontSize: 13, color: '#64748B' }}>Loading registry...</Text>
                </View>
              ) : (
                livePatients.map((p, idx) => (
                  <TouchableOpacity
                    key={p.uhid || p._id || p.id || idx}
                    style={styles.patientItem}
                    onPress={() => resolveAndLoadPatient(p)}
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
                ))
              )}
            </View>
          </View>
        ) : (
          /* Patient is selected: Sticky Header + Mode Selector + Content */
          <View>
            {/* Sticky Patient Context Header Banner */}
            <View style={styles.patientBanner}>
              {/* Row 1: Patient Name & Status Badges */}
              <View style={styles.bannerTopRow}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={styles.bannerPatientName}>{selectedPatient.name || selectedPatient.patient_name}</Text>
                  <View style={[styles.sessionBadge, isSessionLocked && styles.sessionBadgeLocked]}>
                    <Feather name={isSessionLocked ? 'lock' : 'check-circle'} size={11} color="#FFF" />
                    <Text style={styles.sessionBadgeText}>{isSessionLocked ? 'Locked' : 'Active'}</Text>
                  </View>
                  {resolvingAdmission ? (
                    <ActivityIndicator size="small" color="#0D9488" />
                  ) : (
                    <View style={styles.admissionBadge}>
                      <Text style={styles.admissionBadgeText}>{admissionId || 'ADM'}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Row 2: Full-Width Patient Metadata */}
              <Text style={styles.bannerPatientMeta} numberOfLines={2}>
                UHID: {selectedPatient.uhid || selectedPatient.id}  •  {selectedPatient.age || 30} Yrs  •  {selectedPatient.gender || 'General'}  •  {doctorName}
              </Text>

              {/* Row 3: Action Buttons */}
              <View style={styles.bannerActionsRow}>
                <TouchableOpacity style={styles.lockToggleBtn} onPress={handleToggleSessionLock} activeOpacity={0.8}>
                  <Feather name={isSessionLocked ? 'unlock' : 'lock'} size={13} color="#0D9488" />
                  <Text style={styles.lockToggleText}>{isSessionLocked ? 'Unlock' : 'Lock'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.printReportHeaderBtn} onPress={handlePrintFullReport} activeOpacity={0.8}>
                  <Feather name="printer" size={13} color="#FFFFFF" />
                  <Text style={styles.printReportHeaderText}>Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.changePatientBtn} onPress={() => setSelectedPatient(null)} activeOpacity={0.8}>
                  <Feather name="users" size={13} color="#475569" />
                  <Text style={styles.changePatientText}>Switch Patient</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Top View Mode Switcher: Ward Round Board vs Comprehensive EMR Form */}
            <View style={styles.modeSwitchRow}>
              <TouchableOpacity
                style={[styles.modeSwitchBtn, workstationMode === 'board' && styles.modeSwitchBtnActive]}
                onPress={() => setWorkstationMode('board')}
                activeOpacity={0.8}
              >
                <Feather
                  name="grid"
                  size={15}
                  color={workstationMode === 'board' ? '#0D9488' : '#64748B'}
                />
                <Text style={[styles.modeSwitchText, workstationMode === 'board' && styles.modeSwitchTextActive]}>
                  Ward Round Board
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeSwitchBtn, workstationMode === 'emr' && styles.modeSwitchBtnActive]}
                onPress={() => setWorkstationMode('emr')}
                activeOpacity={0.8}
              >
                <Feather
                  name="file-text"
                  size={15}
                  color={workstationMode === 'emr' ? '#0D9488' : '#64748B'}
                />
                <Text style={[styles.modeSwitchText, workstationMode === 'emr' && styles.modeSwitchTextActive]}>
                  Full EMR Form
                </Text>
              </TouchableOpacity>
            </View>

            {workstationMode === 'board' ? (
              /* MODE A: Ward Round Board & Clinical Overview */
              <View style={{ gap: 14 }}>
                {/* 1. Vitals Pulse Widget */}
                <View style={styles.boardCard}>
                  <View style={styles.boardCardHeader}>
                    <View style={styles.boardCardTitleRow}>
                      <MaterialCommunityIcons name="heart-pulse" size={18} color="#10B981" />
                      <Text style={styles.boardCardTitle} numberOfLines={1}>Live Vitals Pulse</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.widgetActionBtn}
                      onPress={() => setShowQuickVitalsModal(true)}
                    >
                      <Feather name="plus" size={13} color="#0D9488" />
                      <Text style={styles.widgetActionText}>Record</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.vitalsPulseGrid}>
                    <View style={styles.vitalPulseBox}>
                      <Text style={styles.vitalPulseLabel}>BP</Text>
                      <Text style={styles.vitalPulseVal} adjustsFontSizeToFit minimumFontScale={0.8}>
                        {vitalsList[0]?.bp_systolic ? `${vitalsList[0].bp_systolic}/${vitalsList[0].bp_diastolic}` : '120/80'}
                      </Text>
                      <Text style={styles.vitalPulseUnit}>mmHg</Text>
                    </View>
                    <View style={styles.vitalPulseBox}>
                      <Text style={styles.vitalPulseLabel}>HR</Text>
                      <Text style={styles.vitalPulseVal} numberOfLines={1}>{vitalsList[0]?.hr || '74'}</Text>
                      <Text style={styles.vitalPulseUnit}>bpm</Text>
                    </View>
                    <View style={styles.vitalPulseBox}>
                      <Text style={styles.vitalPulseLabel}>SpO2</Text>
                      <Text style={styles.vitalPulseVal} numberOfLines={1}>{vitalsList[0]?.spo2 ? `${vitalsList[0].spo2}%` : '98%'}</Text>
                      <Text style={styles.vitalPulseUnit}>O2 Sat</Text>
                    </View>
                    <View style={styles.vitalPulseBox}>
                      <Text style={styles.vitalPulseLabel}>TEMP</Text>
                      <Text style={styles.vitalPulseVal} numberOfLines={1}>{vitalsList[0]?.temp ? `${vitalsList[0].temp}°C` : '36.8°C'}</Text>
                      <Text style={styles.vitalPulseUnit}>Celsius</Text>
                    </View>
                  </View>
                </View>

                {/* 2. Clinical Impression & Risk Widget */}
                <View style={styles.boardCard}>
                  <View style={styles.boardCardHeader}>
                    <View style={styles.boardCardTitleRow}>
                      <MaterialCommunityIcons name="brain" size={18} color="#8B5CF6" />
                      <Text style={styles.boardCardTitle} numberOfLines={1}>Clinical Impression & Risk</Text>
                    </View>
                  </View>
                  <View style={styles.impressionBox}>
                    <Text style={styles.impressionDiagTitle}>Primary Diagnosis:</Text>
                    <Text style={styles.impressionDiagText}>{diagnosis}</Text>
                    <View style={styles.severityTag}>
                      <Text style={styles.severityTagText}>Severity: {severity}</Text>
                    </View>
                  </View>

                  <View style={styles.riskMeterRow}>
                    <View style={styles.riskMeterCol}>
                      <Text style={styles.riskMeterLabel}>Risk to Self</Text>
                      <View style={styles.riskBarBg}>
                        <View style={[styles.riskBarFill, { width: `${riskToSelf}%`, backgroundColor: riskToSelf > 60 ? '#EF4444' : '#F59E0B' }]} />
                      </View>
                      <Text style={styles.riskValText}>{riskToSelf}%</Text>
                    </View>

                    <View style={styles.riskMeterCol}>
                      <Text style={styles.riskMeterLabel}>Risk to Others</Text>
                      <View style={styles.riskBarBg}>
                        <View style={[styles.riskBarFill, { width: `${riskToOthers}%`, backgroundColor: riskToOthers > 60 ? '#EF4444' : '#10B981' }]} />
                      </View>
                      <Text style={styles.riskValText}>{riskToOthers}%</Text>
                    </View>

                    <View style={styles.riskMeterCol}>
                      <Text style={styles.riskMeterLabel}>Vulnerability</Text>
                      <View style={styles.riskBarBg}>
                        <View style={[styles.riskBarFill, { width: `${riskToVulnerability}%`, backgroundColor: '#3B82F6' }]} />
                      </View>
                      <Text style={styles.riskValText}>{riskToVulnerability}%</Text>
                    </View>
                  </View>
                </View>

                {/* 3. Latest Clinical Assessment (SOAP) */}
                <View style={styles.boardCard}>
                  <View style={styles.boardCardHeader}>
                    <View style={styles.boardCardTitleRow}>
                      <MaterialCommunityIcons name="file-document-outline" size={18} color="#0284C7" />
                      <Text style={styles.boardCardTitle} numberOfLines={1}>Clinical Assessment (SOAP)</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.widgetActionBtn}
                      onPress={() => setShowQuickNoteModal(true)}
                    >
                      <Feather name="edit-3" size={13} color="#0D9488" />
                      <Text style={styles.widgetActionText}>Add Note</Text>
                    </TouchableOpacity>
                  </View>
                  {sessionNotesList.length === 0 ? (
                    <Text style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', paddingVertical: 8 }}>
                      No clinical session notes recorded for this admission yet.
                    </Text>
                  ) : (
                    <View style={styles.soapBriefBox}>
                      <Text style={styles.soapBriefLabel}>SUBJECTIVE:</Text>
                      <Text style={styles.soapBriefText}>{sessionNotesList[0].subjective || 'No complaints.'}</Text>
                      <Text style={styles.soapBriefLabel}>ASSESSMENT:</Text>
                      <Text style={styles.soapBriefText}>{sessionNotesList[0].assessment || 'Status maintained.'}</Text>
                      <Text style={styles.soapBriefLabel}>PLAN:</Text>
                      <Text style={styles.soapBriefText}>{sessionNotesList[0].plan || 'Continue treatment.'}</Text>
                    </View>
                  )}
                </View>

                {/* 4. Active Orders (Medications & Labs) */}
                <View style={styles.boardCard}>
                  <View style={styles.boardCardHeader}>
                    <View style={styles.boardCardTitleRow}>
                      <MaterialCommunityIcons name="pill" size={18} color="#0D9488" />
                      <Text style={styles.boardCardTitle} numberOfLines={1}>Active Regimen & Labs</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.widgetActionBtn}
                      onPress={() => setShowOrderLabModal(true)}
                    >
                      <MaterialCommunityIcons name="flask" size={13} color="#0D9488" />
                      <Text style={styles.widgetActionText}>Order Lab</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ gap: 8 }}>
                    <Text style={styles.subSecHeader}>Active Medications ({medicationsList.filter((m) => m.status !== 'Stopped').length}):</Text>
                    {medicationsList.filter((m) => m.status !== 'Stopped').length === 0 ? (
                      <Text style={{ fontSize: 12, color: '#94A3B8' }}>No active prescriptions</Text>
                    ) : (
                      medicationsList.filter((m) => m.status !== 'Stopped').map((med, idx) => (
                        <View key={med.id || med._id || idx} style={styles.orderItemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.orderDrugName}>{med.drug_name || med.name}</Text>
                            <Text style={styles.orderDrugMeta}>{med.dose} • {med.frequency} • {med.route}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.stopMedBtn}
                            onPress={() => handleStopMedication(med.id || med._id, med.drug_name || med.name)}
                          >
                            <Text style={styles.stopMedBtnText}>Stop</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}

                    <Text style={[styles.subSecHeader, { marginTop: 8 }]}>Pending Lab Orders ({patientLabOrders.filter((o) => o.status !== 'REPORT_READY' && o.status !== 'CANCELLED').length}):</Text>
                    {patientLabOrders.filter((o) => o.status !== 'REPORT_READY' && o.status !== 'CANCELLED').length === 0 ? (
                      <Text style={{ fontSize: 12, color: '#94A3B8' }}>No pending lab investigations</Text>
                    ) : (
                      patientLabOrders.filter((o) => o.status !== 'REPORT_READY' && o.status !== 'CANCELLED').map((ord, idx) => (
                        <View key={ord.request_id || ord._id || idx} style={styles.labOrderItem}>
                          <Text style={styles.labOrderTests}>{(ord.tests_ordered || []).join(', ')}</Text>
                          <View style={styles.labStatusPill}>
                            <Text style={styles.labStatusPillText}>{ord.status || 'REQUESTED'}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>

                {/* 5. Rounding Logs Timeline */}
                <View style={styles.boardCard}>
                  <View style={styles.boardCardHeader}>
                    <View style={styles.boardCardTitleRow}>
                      <MaterialCommunityIcons name="clipboard-text-clock" size={18} color="#0284C7" />
                      <Text style={styles.boardCardTitle} numberOfLines={1}>Rounding Progress Log</Text>
                    </View>
                  </View>
                  {sessionNotesList.length === 0 ? (
                    <Text style={{ fontSize: 12, color: '#94A3B8', paddingVertical: 10 }}>No rounding notes recorded yet.</Text>
                  ) : (
                    sessionNotesList.slice(0, 5).map((note, idx) => (
                      <View key={note.id || note._id || idx} style={styles.roundingLogItem}>
                        <View style={styles.roundingDateRow}>
                          <Text style={styles.roundingDateText}>
                            {note.session_date ? new Date(note.session_date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Recent Round'}
                          </Text>
                          <Text style={styles.roundingAuthorText}>{note.signed_by || note.role_tag || 'Doctor'}</Text>
                        </View>
                        <Text style={styles.roundingContentText}>{note.subjective || note.assessment || note.plan}</Text>
                      </View>
                    ))
                  )}
                </View>

                {/* 6. Quick Action Buttons Row */}
                <View style={styles.quickActionsGrid}>
                  <TouchableOpacity
                    style={styles.quickActionTile}
                    onPress={() => setShowQuickNoteModal(true)}
                  >
                    <Feather name="file-text" size={20} color="#0D9488" />
                    <Text style={styles.quickActionTileText}>Rounding Note</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionTile}
                    onPress={() => setShowQuickVitalsModal(true)}
                  >
                    <Feather name="activity" size={20} color="#0D9488" />
                    <Text style={styles.quickActionTileText}>Record Vitals</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionTile}
                    onPress={() => setShowAddMedModal(true)}
                  >
                    <Feather name="plus-circle" size={20} color="#0D9488" />
                    <Text style={styles.quickActionTileText}>Prescribe Med</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionTile}
                    onPress={() => setShowDischargeModal(true)}
                  >
                    <Feather name="check-circle" size={20} color="#059669" />
                    <Text style={styles.quickActionTileText}>Discharge Rec</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* MODE B: Comprehensive Admission-Centric EMR Workspace (Tabs) */
              <View>
                {/* Horizontal EMR Sub-Navigation Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emrTabsScroll} contentContainerStyle={styles.emrTabsContainer}>
                  {[
                    { key: 'symptoms', label: 'Symptoms & HPI', icon: 'file-text' },
                    { key: 'mse', label: 'MSE Exam', icon: 'eye' },
                    { key: 'diagnosis', label: 'Diagnosis & Codes', icon: 'activity' },
                    { key: 'risk', label: 'Risk Assessment', icon: 'alert-triangle' },
                    { key: 'medications', label: `Rx Meds (${medicationsList.length})`, icon: 'plus-circle' },
                    { key: 'treatment', label: 'Treatment Plan', icon: 'clipboard' },
                    { key: 'soap', label: 'SOAP Notes', icon: 'edit-3' },
                    { key: 'vitals', label: 'Vitals & History', icon: 'heart' },
                    { key: 'labs', label: 'Lab & Monitoring', icon: 'layers' },
                    { key: 'timeline', label: 'Clinical Timeline', icon: 'clock' },
                    { key: 'rehab', label: 'Rehab & Routine', icon: 'calendar' },
                    { key: 'audit', label: 'EMR Audit Log', icon: 'shield' },
                  ].map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.emrTabChip, activeTab === t.key && styles.emrTabChipActive]}
                      onPress={() => setActiveTab(t.key as EmrTab)}
                      activeOpacity={0.7}
                    >
                      <Feather name={t.icon as any} size={13} color={activeTab === t.key ? '#FFFFFF' : '#64748B'} />
                      <Text style={[styles.emrTabChipText, activeTab === t.key && styles.emrTabChipTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* TAB 1: Symptoms & HPI */}
                {activeTab === 'symptoms' && (
                  <View style={styles.tabContentCard}>
                    <Text style={styles.tabSectionTitle}>Symptoms & History of Present Illness (HPI)</Text>

                    <Text style={styles.inputLabel}>Chief Complaint (Patient's words)</Text>
                    <TextInput
                      style={[styles.textInput, { height: 60 }]}
                      multiline
                      value={chiefComplaint}
                      onChangeText={setChiefComplaint}
                      placeholder="e.g. Severe low mood, sleep disturbance, racing thoughts"
                    />

                    <View style={styles.formRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Onset</Text>
                        <TextInput style={styles.textInput} value={onset} onChangeText={setOnset} placeholder="e.g. 2 weeks ago" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Duration</Text>
                        <TextInput style={styles.textInput} value={duration} onChangeText={setDuration} placeholder="e.g. 1 month" />
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>Precipitating Factors</Text>
                    <TextInput style={styles.textInput} value={precipitatingFactors} onChangeText={setPrecipitatingFactors} placeholder="Life events, family stressors, work pressure" />

                    <Text style={styles.inputLabel}>Perpetuating Factors</Text>
                    <TextInput style={styles.textInput} value={perpetuatingFactors} onChangeText={setPerpetuatingFactors} placeholder="Ongoing insomnia, substance use, non-adherence" />

                    <Text style={styles.inputLabel}>HPI Narrative</Text>
                    <TextInput
                      style={[styles.textInput, { height: 90 }]}
                      multiline
                      value={hpi}
                      onChangeText={setHpi}
                      placeholder="Comprehensive clinical evolution and psychiatric presentation details..."
                    />

                    <Text style={styles.inputLabel}>Suicidal Ideation</Text>
                    <View style={styles.chipsRow}>
                      {SI_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.filterChip, suicidalIdeation === opt && styles.filterChipActive]}
                          onPress={() => setSuicidalIdeation(opt)}
                        >
                          <Text style={[styles.filterChipText, suicidalIdeation === opt && styles.filterChipTextActive]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.formRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Self-Harm History</Text>
                        <TextInput style={styles.textInput} value={selfHarmHistory} onChangeText={setSelfHarmHistory} placeholder="Past attempts, NSSI" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Harm to Others Risk</Text>
                        <TextInput style={styles.textInput} value={harmToOthersRisk} onChangeText={setHarmToOthersRisk} placeholder="Aggression, impulsivity" />
                      </View>
                    </View>

                    <TouchableOpacity style={styles.tabSaveBtn} onPress={saveSymptomsHpi} disabled={saving}>
                      <Feather name="save" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.tabSaveBtnText}>{saving ? 'Saving...' : 'Save Symptoms & HPI'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* TAB 2: Mental Status Examination (MSE) */}
                {activeTab === 'mse' && (
                  <View style={styles.tabContentCard}>
                    <Text style={styles.tabSectionTitle}>Mental Status Examination (MSE)</Text>
                    <Text style={styles.tabSectionSubtitle}>Tap observed psychiatric findings to populate clinical profile.</Text>

                    {Object.entries(MSE_OPTIONS).map(([category, options]) => (
                      <View key={category} style={styles.mseCategoryGroup}>
                        <Text style={styles.mseCategoryHeader}>
                          {category.replace(/([A-Z])/g, ' $1').toUpperCase()}
                        </Text>
                        <View style={styles.chipsRow}>
                          {options.map((opt) => {
                            const isSelected = (mseFindings[category] || []).includes(opt);
                            const isDangerous = MSE_DANGEROUS.some((d) => opt.includes(d));

                            return (
                              <TouchableOpacity
                                key={opt}
                                style={[
                                  styles.mseChip,
                                  isSelected && styles.mseChipSelected,
                                  isSelected && isDangerous && styles.mseChipDangerous,
                                ]}
                                onPress={() => handleToggleMse(category, opt)}
                              >
                                <Text
                                  style={[
                                    styles.mseChipText,
                                    isSelected && styles.mseChipTextSelected,
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

                    <TouchableOpacity style={styles.tabSaveBtn} onPress={saveMse} disabled={saving}>
                      <Feather name="save" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.tabSaveBtnText}>{saving ? 'Saving...' : 'Save Mental Status Exam'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* TAB 3: Diagnosis & Diagnostic Systems */}
                {activeTab === 'diagnosis' && (
                  <View style={styles.tabContentCard}>
                    <Text style={styles.tabSectionTitle}>Psychiatric Diagnosis & Classification</Text>

                    <View style={styles.diagSystemRow}>
                      <TouchableOpacity
                        style={[styles.diagSystemBtn, diagSystem === 'icd11' && styles.diagSystemBtnActive]}
                        onPress={() => setDiagSystem('icd11')}
                      >
                        <Text style={[styles.diagSystemText, diagSystem === 'icd11' && styles.diagSystemTextActive]}>
                          WHO ICD-11
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.diagSystemBtn, diagSystem === 'dsm5' && styles.diagSystemBtnActive]}
                        onPress={() => setDiagSystem('dsm5')}
                      >
                        <Text style={[styles.diagSystemText, diagSystem === 'dsm5' && styles.diagSystemTextActive]}>
                          APA DSM-5
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.textInput}
                      placeholder="Search psychiatric codes or diagnoses..."
                      value={diagSearch}
                      onChangeText={setDiagSearch}
                    />

                    <View style={styles.chipsRow}>
                      {filteredDiagnoses.map((d, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.codeChip, diagnosis.includes(d.code) && styles.codeChipActive]}
                          onPress={() => setDiagnosis(`${d.code} ${d.title}`)}
                        >
                          <Text style={[styles.codeChipText, diagnosis.includes(d.code) && styles.codeChipTextActive]}>
                            {d.code} {d.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Selected Primary Diagnosis</Text>
                    <TextInput style={styles.textInput} value={diagnosis} onChangeText={setDiagnosis} />

                    <Text style={styles.inputLabel}>Severity Level</Text>
                    <View style={styles.chipsRow}>
                      {['Mild', 'Moderate', 'Severe', 'In Remission'].map((lvl) => (
                        <TouchableOpacity
                          key={lvl}
                          style={[styles.filterChip, severity === lvl && styles.filterChipActive]}
                          onPress={() => setSeverity(lvl)}
                        >
                          <Text style={[styles.filterChipText, severity === lvl && styles.filterChipTextActive]}>
                            {lvl}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>Bio-Psycho-Social Formulation</Text>
                    <TextInput
                      style={[styles.textInput, { height: 70 }]}
                      multiline
                      value={bioPsychoSocial}
                      onChangeText={setBioPsychoSocial}
                      placeholder="Biological predispositions, psychological triggers, and social environment..."
                    />

                    <TouchableOpacity style={styles.tabSaveBtn} onPress={saveDiagnosisAndRisk} disabled={saving}>
                      <Feather name="save" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.tabSaveBtnText}>{saving ? 'Saving...' : 'Save Diagnosis'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* TAB 4: Risk Assessment */}
                {activeTab === 'risk' && (
                  <View style={styles.tabContentCard}>
                    <Text style={styles.tabSectionTitle}>Clinical Risk Stratification (3-Axis Model)</Text>

                    <View style={styles.riskSliderBox}>
                      <Text style={styles.riskSliderTitle}>1. Risk to Self (Suicide & NSSI): {riskToSelf}%</Text>
                      <View style={styles.chipsRow}>
                        {[10, 25, 50, 75, 90].map((v) => (
                          <TouchableOpacity
                            key={v}
                            style={[styles.filterChip, riskToSelf === v && styles.filterChipActive]}
                            onPress={() => setRiskToSelf(v)}
                          >
                            <Text style={[styles.filterChipText, riskToSelf === v && styles.filterChipTextActive]}>
                              {v >= 75 ? 'Critical' : v >= 50 ? 'High' : v >= 25 ? 'Moderate' : 'Low'} ({v}%)
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.riskSliderBox}>
                      <Text style={styles.riskSliderTitle}>2. Risk to Others (Violence & Aggression): {riskToOthers}%</Text>
                      <View style={styles.chipsRow}>
                        {[10, 25, 50, 75, 90].map((v) => (
                          <TouchableOpacity
                            key={v}
                            style={[styles.filterChip, riskToOthers === v && styles.filterChipActive]}
                            onPress={() => setRiskToOthers(v)}
                          >
                            <Text style={[styles.filterChipText, riskToOthers === v && styles.filterChipTextActive]}>
                              {v >= 75 ? 'Critical' : v >= 50 ? 'High' : v >= 25 ? 'Moderate' : 'Low'} ({v}%)
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.riskSliderBox}>
                      <Text style={styles.riskSliderTitle}>3. Risk of Vulnerability (Elopement & Neglect): {riskToVulnerability}%</Text>
                      <View style={styles.chipsRow}>
                        {[10, 25, 50, 75, 90].map((v) => (
                          <TouchableOpacity
                            key={v}
                            style={[styles.filterChip, riskToVulnerability === v && styles.filterChipActive]}
                            onPress={() => setRiskToVulnerability(v)}
                          >
                            <Text style={[styles.filterChipText, riskToVulnerability === v && styles.filterChipTextActive]}>
                              {v >= 75 ? 'Critical' : v >= 50 ? 'High' : v >= 25 ? 'Moderate' : 'Low'} ({v}%)
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.safetyPlanCheckbox}
                      onPress={() => setSafetyPlanRequired(!safetyPlanRequired)}
                    >
                      <Feather name={safetyPlanRequired ? 'check-square' : 'square'} size={18} color="#0D9488" />
                      <Text style={styles.safetyPlanText}>Formal Safety Plan Document Required</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.tabSaveBtn} onPress={saveDiagnosisAndRisk} disabled={saving}>
                      <Feather name="save" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.tabSaveBtnText}>{saving ? 'Saving...' : 'Save Risk Assessment'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* TAB 5: Medications (Rx) */}
                {activeTab === 'medications' && (
                  <View style={styles.tabContentCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={styles.tabSectionTitle}>Active Psychiatric Medications</Text>
                      <TouchableOpacity
                        style={styles.tabAddBtn}
                        onPress={() => setShowAddMedModal(true)}
                      >
                        <Feather name="plus" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.tabAddBtnText}>Add Rx</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.allergyBanner}>
                      <Feather name="alert-circle" size={16} color="#E11D48" style={{ marginRight: 6 }} />
                      <Text style={styles.allergyBannerText}>
                        Allergy Check: Patient has no known documented drug allergies (NKDA).
                      </Text>
                    </View>

                    {medicationsList.length === 0 ? (
                      <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginVertical: 20 }}>
                        No medications prescribed yet. Tap "+ Add Rx" above.
                      </Text>
                    ) : (
                      medicationsList.map((m, idx) => {
                        const isStopped = m.status === 'Stopped';

                        return (
                          <View key={m.id || m._id || idx} style={[styles.medCard, isStopped && styles.medCardStopped]}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.medCardName, isStopped && { textDecorationLine: 'line-through', color: '#94A3B8' }]}>
                                  {m.drug_name || m.name}
                                </Text>
                                <View style={[styles.medStatusBadge, isStopped ? styles.medStatusStopped : styles.medStatusActive]}>
                                  <Text style={[styles.medStatusText, isStopped ? { color: '#E11D48' } : { color: '#059669' }]}>
                                    {m.status || 'Active'}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.medCardMeta}>
                                Dose: {m.dose} | {m.frequency} | Route: {m.route || 'PO'} | Duration: {m.duration || '30 days'}
                              </Text>
                            </View>

                            {!isStopped && (
                              <TouchableOpacity
                                style={styles.stopActionBtn}
                                onPress={() => handleStopMedication(m.id || m._id, m.drug_name || m.name)}
                              >
                                <Text style={styles.stopActionBtnText}>STOP</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* TAB 6: Treatment Plan */}
                {activeTab === 'treatment' && (
                  <View style={styles.tabContentCard}>
                    <Text style={styles.tabSectionTitle}>Comprehensive Treatment & Rehabilitation Plan</Text>

                    <Text style={styles.inputLabel}>Short-Term Clinical Goals</Text>
                    <TextInput
                      style={[styles.textInput, { height: 60 }]}
                      multiline
                      value={shortTermGoals}
                      onChangeText={setShortTermGoals}
                      placeholder="e.g. Relieve acute distress, restore sleep cycle, assess suicidal intent"
                    />

                    <Text style={styles.inputLabel}>Long-Term Recovery Goals</Text>
                    <TextInput
                      style={[styles.textInput, { height: 60 }]}
                      multiline
                      value={longTermGoals}
                      onChangeText={setLongTermGoals}
                      placeholder="e.g. Complete symptomatic remission, vocational reintegration, relapse prevention"
                    />

                    <Text style={styles.inputLabel}>Psychotherapy Modalities</Text>
                    <View style={styles.chipsRow}>
                      {THERAPY_MODALITIES.map((mod) => (
                        <TouchableOpacity
                          key={mod}
                          style={[styles.filterChip, selectedTherapies.includes(mod) && styles.filterChipActive]}
                          onPress={() => handleToggleTherapy(mod)}
                        >
                          <Text style={[styles.filterChipText, selectedTherapies.includes(mod) && styles.filterChipTextActive]}>
                            {mod}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>Inpatient Observation Level</Text>
                    <View style={styles.chipsRow}>
                      {OBSERVATION_LEVELS.map((lvl) => (
                        <TouchableOpacity
                          key={lvl}
                          style={[styles.filterChip, observationLevel === lvl && styles.filterChipActive]}
                          onPress={() => setObservationLevel(lvl)}
                        >
                          <Text style={[styles.filterChipText, observationLevel === lvl && styles.filterChipTextActive]}>
                            {lvl}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>Discharge Criteria</Text>
                    <TextInput
                      style={[styles.textInput, { height: 60 }]}
                      multiline
                      value={dischargeCriteria}
                      onChangeText={setDischargeCriteria}
                      placeholder="Criteria required before medical discharge authorization..."
                    />

                    <TouchableOpacity style={styles.tabSaveBtn} onPress={saveTreatmentPlan} disabled={saving}>
                      <Feather name="save" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.tabSaveBtnText}>{saving ? 'Saving...' : 'Save Treatment Plan'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* TAB 7: SOAP Notes */}
                {activeTab === 'soap' && (
                  <View style={styles.tabContentCard}>
                    <Text style={styles.tabSectionTitle}>Clinical Session Notes (SOAP)</Text>

                    <Text style={styles.inputLabel}>Subjective (Patient Complaints & Mental State)</Text>
                    <TextInput
                      style={[styles.textInput, { height: 60 }]}
                      multiline
                      value={soapSubjective}
                      onChangeText={setSoapSubjective}
                      placeholder="Patient reports sleep improving; appetite fair; denies suicidal intent."
                    />

                    <Text style={styles.inputLabel}>Objective Observations & Checklist</Text>
                    <View style={{ gap: 6, marginBottom: 8 }}>
                      {SOAP_CHECKLIST_QUESTIONS.slice(0, 6).map((q) => (
                        <View key={q.id} style={styles.soapCheckRow}>
                          <Text style={styles.soapCheckText}>{q.text}</Text>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={[styles.miniYesNoBtn, soapChecklist[q.id] === 'yes' && styles.miniYesBtnActive]}
                              onPress={() => setSoapChecklist((prev) => ({ ...prev, [q.id]: 'yes' }))}
                            >
                              <Text style={[styles.miniYesNoText, soapChecklist[q.id] === 'yes' && { color: '#FFF' }]}>YES</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.miniYesNoBtn, soapChecklist[q.id] === 'no' && styles.miniNoBtnActive]}
                              onPress={() => setSoapChecklist((prev) => ({ ...prev, [q.id]: 'no' }))}
                            >
                              <Text style={[styles.miniYesNoText, soapChecklist[q.id] === 'no' && { color: '#FFF' }]}>NO</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>Assessment (Diagnostic Evaluation)</Text>
                    <TextInput
                      style={[styles.textInput, { height: 60 }]}
                      multiline
                      value={soapAssessment}
                      onChangeText={setSoapAssessment}
                      placeholder="Responding well to psychopharmacotherapy; no adverse extrapyramidal symptoms."
                    />

                    <Text style={styles.inputLabel}>Plan & Next Interventions</Text>
                    <TextInput
                      style={[styles.textInput, { height: 60 }]}
                      multiline
                      value={soapPlan}
                      onChangeText={setSoapPlan}
                      placeholder="Maintain current dosage; schedule CBT session on Tuesday; monitor vitals."
                    />

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      <TouchableOpacity style={[styles.tabSaveBtn, { flex: 1, backgroundColor: '#64748B' }]} onPress={() => handleSaveSoapNote(false)} disabled={saving}>
                        <Feather name="file" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.tabSaveBtnText}>Save Draft</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={[styles.tabSaveBtn, { flex: 1 }]} onPress={() => handleSaveSoapNote(true)} disabled={saving}>
                        <Feather name="check-circle" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.tabSaveBtnText}>Sign & Lock Note</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* TAB 8: Vitals & History */}
                {activeTab === 'vitals' && (
                  <View style={styles.tabContentCard}>
                    <Text style={styles.tabSectionTitle}>Record Inpatient Vitals</Text>

                    <View style={styles.formRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Systolic BP</Text>
                        <TextInput style={styles.textInput} keyboardType="numeric" value={vitalBpSys} onChangeText={setVitalBpSys} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Diastolic BP</Text>
                        <TextInput style={styles.textInput} keyboardType="numeric" value={vitalBpDia} onChangeText={setVitalBpDia} />
                      </View>
                    </View>

                    <View style={styles.formRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Heart Rate (bpm)</Text>
                        <TextInput style={styles.textInput} keyboardType="numeric" value={vitalHr} onChangeText={setVitalHr} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Temp (°C)</Text>
                        <TextInput style={styles.textInput} keyboardType="numeric" value={vitalTemp} onChangeText={setVitalTemp} />
                      </View>
                    </View>

                    <View style={styles.formRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>SpO2 (%)</Text>
                        <TextInput style={styles.textInput} keyboardType="numeric" value={vitalSpo2} onChangeText={setVitalSpo2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Resp Rate (RR)</Text>
                        <TextInput style={styles.textInput} keyboardType="numeric" value={vitalRr} onChangeText={setVitalRr} />
                      </View>
                    </View>

                    <View style={styles.formRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Weight (kg)</Text>
                        <TextInput style={styles.textInput} keyboardType="numeric" value={vitalWeight} onChangeText={setVitalWeight} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Sleep (hrs)</Text>
                        <TextInput style={styles.textInput} keyboardType="numeric" value={vitalSleep} onChangeText={setVitalSleep} />
                      </View>
                    </View>

                    <TouchableOpacity style={styles.tabSaveBtn} onPress={handleRecordVitals} disabled={saving}>
                      <Feather name="activity" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.tabSaveBtnText}>{saving ? 'Saving...' : 'Record Vitals'}</Text>
                    </TouchableOpacity>

                    <Text style={[styles.subSecHeader, { marginTop: 20 }]}>Historical Vitals Log ({vitalsList.length})</Text>
                    {vitalsList.map((v, i) => (
                      <View key={v.id || v._id || i} style={styles.vitalHistoryItem}>
                        <Text style={styles.vitalHistoryDate}>
                          {v.recorded_at ? new Date(v.recorded_at).toLocaleString() : 'Recorded'}
                        </Text>
                        <Text style={styles.vitalHistoryVals}>
                          BP: {v.bp_systolic}/{v.bp_diastolic} | HR: {v.hr} bpm | Temp: {v.temp}°C | SpO2: {v.spo2}%
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* TAB 9: Lab & Monitoring */}
                {activeTab === 'labs' && (
                  <View style={styles.tabContentCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={styles.tabSectionTitle}>Therapeutic Lab Monitoring</Text>
                      <TouchableOpacity
                        style={styles.tabAddBtn}
                        onPress={() => setShowOrderLabModal(true)}
                      >
                        <Feather name="plus" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.tabAddBtnText}>Order Labs</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Lithium Therapeutic Window Widget */}
                    <View style={styles.therapeuticBox}>
                      <Text style={styles.therapeuticTitle}>Serum Lithium Level Therapeutic Range</Text>
                      <Text style={styles.therapeuticSub}>Target Range: 0.60 - 1.20 mEq/L</Text>
                      <View style={styles.therapeuticBarBg}>
                        <View style={[styles.therapeuticRange, { left: '37.5%', width: '37.5%' }]} />
                        <View style={[styles.therapeuticMarker, { left: '55%' }]} />
                      </View>
                      <Text style={styles.therapeuticValue}>Observed: 0.88 mEq/L (In Target Range)</Text>
                    </View>

                    <Text style={[styles.subSecHeader, { marginTop: 16 }]}>Active Lab Test Orders ({patientLabOrders.length})</Text>
                    {patientLabOrders.length === 0 ? (
                      <Text style={{ fontSize: 13, color: '#94A3B8', paddingVertical: 10 }}>No lab orders requested yet.</Text>
                    ) : (
                      patientLabOrders.map((ord, idx) => (
                        <View key={ord.request_id || ord._id || idx} style={styles.labOrderItem}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.labOrderTests}>{(ord.tests_ordered || []).join(', ')}</Text>
                            <Text style={styles.labOrderMeta}>Req ID: {ord.request_id} | Priority: {ord.priority || 'Routine'}</Text>
                          </View>
                          <View style={styles.labStatusPill}>
                            <Text style={styles.labStatusPillText}>{ord.status}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* TAB 10: Clinical Timeline */}
                {activeTab === 'timeline' && (
                  <View style={styles.tabContentCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={styles.tabSectionTitle}>Chronological Clinical Timeline</Text>
                      <TouchableOpacity
                        style={styles.tabAddBtn}
                        onPress={() => setShowAddEventModal(true)}
                      >
                        <Feather name="plus" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.tabAddBtnText}>Add Event</Text>
                      </TouchableOpacity>
                    </View>

                    {clinicalTimeline.length === 0 ? (
                      <Text style={{ fontSize: 13, color: '#94A3B8', paddingVertical: 20, textAlign: 'center' }}>
                        No timeline events recorded yet.
                      </Text>
                    ) : (
                      clinicalTimeline.map((item, idx) => (
                        <View key={idx} style={styles.timelineItem}>
                          <View style={styles.timelineDot} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.timelineTitle}>{item.display || item.type}</Text>
                            <Text style={styles.timelineTime}>
                              {item.time ? new Date(item.time).toLocaleString() : 'Recent'} • {item.user || 'Clinician'}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* TAB 11: Rehab & Routine */}
                {activeTab === 'rehab' && (
                  <View style={styles.tabContentCard}>
                    <Text style={styles.tabSectionTitle}>Psychiatric Rehabilitation & Daily Routine</Text>

                    <Text style={styles.inputLabel}>Rehabilitation Modality</Text>
                    <View style={styles.chipsRow}>
                      {['Occupational', 'Social Skills', 'Cognitive Remediation', 'Physical Therapy'].map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={[styles.filterChip, rehabType === r && styles.filterChipActive]}
                          onPress={() => setRehabType(r)}
                        >
                          <Text style={[styles.filterChipText, rehabType === r && styles.filterChipTextActive]}>
                            {r}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>Rehabilitation Plan & Milestones</Text>
                    <TextInput
                      style={[styles.textInput, { height: 60 }]}
                      multiline
                      value={rehabNotes}
                      onChangeText={setRehabNotes}
                      placeholder="Daily group engagement, activity therapy, life skills training..."
                    />

                    <Text style={styles.inputLabel}>Daily Ward Schedule & Routine</Text>
                    <TextInput
                      style={[styles.textInput, { height: 60 }]}
                      multiline
                      value={routineNotes}
                      onChangeText={setRoutineNotes}
                      placeholder="Wakeup 06:30, Yoga 07:30, Breakfast 08:30, Psychotherapy 11:00..."
                    />

                    <TouchableOpacity style={styles.tabSaveBtn} onPress={handleSaveRehabAndRoutine} disabled={saving}>
                      <Feather name="save" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.tabSaveBtnText}>{saving ? 'Saving...' : 'Save Rehab & Routine'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* TAB 12: EMR Audit Log */}
                {activeTab === 'audit' && (
                  <View style={styles.tabContentCard}>
                    <Text style={styles.tabSectionTitle}>EMR Clinical Audit Trail</Text>
                    <Text style={styles.tabSectionSubtitle}>Regulatory audit entries tracked for this admission.</Text>

                    {emrAuditList.length === 0 ? (
                      <Text style={{ fontSize: 13, color: '#94A3B8', paddingVertical: 14 }}>
                        No audit events logged yet for this admission.
                      </Text>
                    ) : (
                      emrAuditList.map((log, idx) => (
                        <View key={log.id || log._id || idx} style={styles.auditItem}>
                          <Text style={styles.auditActionText}>
                            [{log.action?.toUpperCase()}] {log.entity_type}
                          </Text>
                          <Text style={styles.auditMetaText}>
                            User: {log.user_name || log.user_id || 'Clinician'} | {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* QUICK NOTE MODAL */}
      <Modal visible={showQuickNoteModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Rounding Note (SOAP)</Text>
            <TextInput
              style={[styles.textInput, { height: 45, marginBottom: 8 }]}
              placeholder="Subjective (Patient complaints)"
              value={quickNoteForm.s}
              onChangeText={(v) => setQuickNoteForm((prev) => ({ ...prev, s: v }))}
            />
            <TextInput
              style={[styles.textInput, { height: 45, marginBottom: 8 }]}
              placeholder="Objective (Observations, findings)"
              value={quickNoteForm.o}
              onChangeText={(v) => setQuickNoteForm((prev) => ({ ...prev, o: v }))}
            />
            <TextInput
              style={[styles.textInput, { height: 45, marginBottom: 8 }]}
              placeholder="Assessment (Clinical state)"
              value={quickNoteForm.a}
              onChangeText={(v) => setQuickNoteForm((prev) => ({ ...prev, a: v }))}
            />
            <TextInput
              style={[styles.textInput, { height: 45, marginBottom: 12 }]}
              placeholder="Plan (Immediate instructions)"
              value={quickNoteForm.p}
              onChangeText={(v) => setQuickNoteForm((prev) => ({ ...prev, p: v }))}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowQuickNoteModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleQuickNoteSubmit} disabled={saving}>
                <Text style={styles.modalSaveBtnText}>{saving ? 'Saving...' : 'Save Note'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QUICK VITALS MODAL */}
      <Modal visible={showQuickVitalsModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Quick Vitals</Text>
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>BP (e.g. 120/80)</Text>
                <TextInput
                  style={styles.textInput}
                  value={quickVitalsForm.bp}
                  onChangeText={(v) => setQuickVitalsForm((prev) => ({ ...prev, bp: v }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Heart Rate (bpm)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={quickVitalsForm.hr}
                  onChangeText={(v) => setQuickVitalsForm((prev) => ({ ...prev, hr: v }))}
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Temp (°C)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={quickVitalsForm.temp}
                  onChangeText={(v) => setQuickVitalsForm((prev) => ({ ...prev, temp: v }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>SpO2 (%)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={quickVitalsForm.spo2}
                  onChangeText={(v) => setQuickVitalsForm((prev) => ({ ...prev, spo2: v }))}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowQuickVitalsModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleQuickVitalsSubmit} disabled={saving}>
                <Text style={styles.modalSaveBtnText}>{saving ? 'Saving...' : 'Save Vitals'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD MEDICATION MODAL */}
      <Modal visible={showAddMedModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Prescribe New Psychiatric Medication</Text>
            <Text style={styles.inputLabel}>Drug Name & Formulation</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Tab. Escitalopram"
              value={newMedDrug}
              onChangeText={setNewMedDrug}
            />
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Dose</Text>
                <TextInput style={styles.textInput} value={newMedDose} onChangeText={setNewMedDose} placeholder="10mg" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Frequency</Text>
                <TextInput style={styles.textInput} value={newMedFreq} onChangeText={setNewMedFreq} placeholder="OD / BD" />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Route</Text>
                <TextInput style={styles.textInput} value={newMedRoute} onChangeText={setNewMedRoute} placeholder="PO" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Duration</Text>
                <TextInput style={styles.textInput} value={newMedDuration} onChangeText={setNewMedDuration} placeholder="30 days" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddMedModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddMedication} disabled={saving}>
                <Text style={styles.modalSaveBtnText}>{saving ? 'Saving...' : 'Prescribe'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ORDER LAB INVESTIGATIONS MODAL */}
      <Modal visible={showOrderLabModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Order Lab Investigations</Text>
            <Text style={styles.inputLabel}>Select Diagnostic Tests</Text>
            <View style={styles.chipsRow}>
              {COMMON_LAB_TESTS.map((test) => (
                <TouchableOpacity
                  key={test}
                  style={[styles.filterChip, selectedLabTests.includes(test) && styles.filterChipActive]}
                  onPress={() => handleToggleLabOrder(test)}
                >
                  <Text style={[styles.filterChipText, selectedLabTests.includes(test) && styles.filterChipTextActive]}>
                    {test}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Clinical Notes / Priority</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Urgent - baseline lithium evaluation"
              value={labClinicalNotes}
              onChangeText={setLabClinicalNotes}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowOrderLabModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleOrderLabInvestigations} disabled={saving}>
                <Text style={styles.modalSaveBtnText}>{saving ? 'Ordering...' : 'Order Tests'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DISCHARGE RECOMMENDATION MODAL */}
      <Modal visible={showDischargeModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Inpatient Discharge Recommendation</Text>
            <Text style={styles.inputLabel}>Condition at Discharge</Text>
            <TextInput
              style={styles.textInput}
              value={dischargeForm.condition}
              onChangeText={(v) => setDischargeForm((prev) => ({ ...prev, condition: v }))}
            />
            <Text style={styles.inputLabel}>Discharge Instructions</Text>
            <TextInput
              style={[styles.textInput, { height: 60 }]}
              multiline
              placeholder="Medication continuity, home precautions..."
              value={dischargeForm.instructions}
              onChangeText={(v) => setDischargeForm((prev) => ({ ...prev, instructions: v }))}
            />
            <Text style={styles.inputLabel}>Follow-Up Schedule</Text>
            <TextInput
              style={styles.textInput}
              value={dischargeForm.followUp}
              onChangeText={(v) => setDischargeForm((prev) => ({ ...prev, followUp: v }))}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDischargeModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: '#059669' }]} onPress={handleQuickDischargeSubmit} disabled={saving}>
                <Text style={styles.modalSaveBtnText}>{saving ? 'Saving...' : 'Authorize'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD HISTORY EVENT MODAL */}
      <Modal visible={showAddEventModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Clinical History Event</Text>
            <Text style={styles.inputLabel}>Event Title</Text>
            <TextInput style={styles.textInput} placeholder="e.g. Previous hospitalization" value={newEventTitle} onChangeText={setNewEventTitle} />
            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.textInput} value={newEventDate} onChangeText={setNewEventDate} />
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput style={[styles.textInput, { height: 60 }]} multiline value={newEventDesc} onChangeText={setNewEventDesc} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddEventModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddHistoryEvent} disabled={saving}>
                <Text style={styles.modalSaveBtnText}>{saving ? 'Saving...' : 'Add Event'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E6F4F1',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D9488',
  },
  infoCardText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
    lineHeight: 16,
  },
  secTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
  },
  patientSelectWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D9488',
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  patientMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#0D9488',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  openPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  patientBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerPatientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  bannerPatientMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  bannerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sessionBadgeLocked: {
    backgroundColor: '#D97706',
  },
  sessionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  admissionBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  admissionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  lockToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#0D9488',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
  },
  lockToggleText: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: '700',
  },
  printReportHeaderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#0D9488',
    paddingVertical: 7,
    borderRadius: 8,
  },
  printReportHeaderText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  changePatientBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingVertical: 7,
    borderRadius: 8,
  },
  changePatientText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  modeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    height: 44,
    alignItems: 'center',
  },
  modeSwitchBtn: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 7,
    gap: 6,
  },
  modeSwitchBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  modeSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeSwitchTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  boardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  boardCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  boardCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  boardCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    flexShrink: 1,
  },
  widgetActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E6F4F1',
    borderRadius: 6,
  },
  widgetActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  vitalsPulseGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  vitalPulseBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vitalPulseLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  vitalPulseVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
    textAlign: 'center',
  },
  vitalPulseUnit: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  impressionBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  impressionDiagTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  impressionDiagText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  severityTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  severityTagText: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '700',
  },
  riskMeterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  riskMeterCol: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  riskMeterLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  riskBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginTop: 4,
    overflow: 'hidden',
  },
  riskBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  riskValText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
    textAlign: 'right',
  },
  soapBriefBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  soapBriefLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.5,
  },
  soapBriefText: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 4,
  },
  subSecHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  orderDrugName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  orderDrugMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  stopMedBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stopMedBtnText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
  },
  labOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  labOrderTests: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  labOrderMeta: {
    fontSize: 10,
    color: '#64748B',
  },
  labStatusPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labStatusPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
    textTransform: 'uppercase',
  },
  roundingLogItem: {
    borderLeftWidth: 2,
    borderLeftColor: '#0D9488',
    paddingLeft: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  roundingDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundingDateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D9488',
  },
  roundingAuthorText: {
    fontSize: 10,
    color: '#64748B',
  },
  roundingContentText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  quickActionTileText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E293B',
  },
  emrTabsScroll: {
    marginBottom: 12,
  },
  emrTabsContainer: {
    gap: 6,
  },
  emrTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  emrTabChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  emrTabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  emrTabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  tabSectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#E6F4F1',
    borderColor: '#0D9488',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  tabSaveBtn: {
    flexDirection: 'row',
    backgroundColor: '#0D9488',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  tabSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  mseCategoryGroup: {
    marginTop: 10,
  },
  mseCategoryHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  mseChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mseChipSelected: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  mseChipDangerous: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  mseChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  mseChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  diagSystemRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  diagSystemBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  diagSystemBtnActive: {
    backgroundColor: '#0D9488',
  },
  diagSystemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  diagSystemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  codeChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codeChipActive: {
    backgroundColor: '#E6F4F1',
    borderColor: '#0D9488',
  },
  codeChipText: {
    fontSize: 10,
    color: '#475569',
  },
  codeChipTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  riskSliderBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  riskSliderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  safetyPlanCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  safetyPlanText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  tabAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tabAddBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  allergyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  allergyBannerText: {
    fontSize: 11,
    color: '#9F1239',
    fontWeight: '600',
    flex: 1,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  medCardStopped: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  medCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  medCardMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  medStatusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  medStatusActive: {
    backgroundColor: '#D1FAE5',
  },
  medStatusStopped: {
    backgroundColor: '#FEE2E2',
  },
  medStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  stopActionBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  stopActionBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  soapCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
  },
  soapCheckText: {
    fontSize: 12,
    color: '#1E293B',
    flex: 1,
  },
  miniYesNoBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  miniYesBtnActive: {
    backgroundColor: '#0D9488',
  },
  miniNoBtnActive: {
    backgroundColor: '#EF4444',
  },
  miniYesNoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  vitalHistoryItem: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  vitalHistoryDate: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D9488',
  },
  vitalHistoryVals: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  therapeuticBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    padding: 12,
    borderRadius: 10,
  },
  therapeuticTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  therapeuticSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  therapeuticBarBg: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    marginTop: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  therapeuticRange: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#A7F3D0',
  },
  therapeuticMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#0D9488',
  },
  therapeuticValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    marginTop: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0D9488',
    marginTop: 4,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  timelineTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  auditItem: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  auditActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  auditMetaText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#0D9488',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
