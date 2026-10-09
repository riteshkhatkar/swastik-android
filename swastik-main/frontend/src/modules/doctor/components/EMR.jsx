import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../../api/service";
import DiagnosisSelector from "./DiagnosisSelector";
import RiskMeter from "./RiskMeter";
import MedicationTable from "./MedicationTable";
import SOAPNotes from "./SOAPNotes";
import Vitals from "./Vitals";
import PatientHistory from "./PatientHistory";
import LabMonitoring from "./LabMonitoring";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { FiSave, FiPrinter, FiClock, FiActivity, FiClipboard, FiFileText, FiDatabase, FiThermometer, FiFilePlus, FiPlusCircle, FiEdit3, FiLayers } from "react-icons/fi";
import swastikLogo from "../../../assets/swastiklogo.png";

import { generateComprehensiveReport } from "../../../utils/reportGenerator";

const TABS = [
  { id: "symptoms", label: "Symptoms & MSE", icon: <FiFileText /> },
  { id: "medication", label: "Medication", icon: <FiPlusCircle /> },
  { id: "treatment", label: "Treatment Plan", icon: <FiClipboard /> },
  { id: "session", label: "Session Notes", icon: <FiEdit3 /> },
  { id: "vitals", label: "Vitals", icon: <FiActivity /> },
  { id: "lab", label: "Lab & Monitoring", icon: <FiLayers /> },
  { id: "history", label: "Patient History", icon: <FiClock /> },
];

const SI_OPTIONS = ["None", "Passive", "Active", "Intent", "Plan"];
const MSE_OPTIONS = {
  appearance: ["Well Groomed", "Disheveled", "Guarded", "Agitated", "Unkempt"],
  psychomotor: ["Normal", "Retarded", "Agitated", "Restless", "Catatonic"],
  speech: ["Normal", "Pressured", "Slow", "Slurred", "Muted"],
  mood: ["Euthymic", "Depressed", "Anxious", "Irritable", "Elevated", "Dysphoric"],
  affect: ["Congruent", "Flat", "Labile", "Restricted", "Blunted"],
  thoughtProcess: ["Logical", "Circumstantial", "Tangential", "Flight of Ideas", "Disorganized", "Perseveration"],
  thoughtContent: ["No SI/HI", "Suicidal ideation", "Homicidal ideation", "Paranoid", "Grandiose", "Obsessions"],
  perception: ["None", "Auditory hallucinations", "Visual hallucinations", "Command AH", "Delusions"],
  cognition: ["Oriented", "Impaired attention", "Memory impaired", "Executive dysfunction"],
  insight: ["Good", "Partial", "Poor", "None"],
  judgment: ["Intact", "Impaired"],
  attention: ["Normal", "Distractible", "Poor concentration", "Span reduced"],
};
const MSE_DANGEROUS = ["Suicidal ideation", "Homicidal ideation", "Command AH"];

const THERAPY_MODALITIES = ["CBT", "DBT", "IPT", "Family Therapy", "Group Therapy"];

const defaultMse = () =>
  Object.keys(MSE_OPTIONS).reduce((acc, key) => ({ ...acc, [key]: [] }), {});

function buildHpiSummary(data) {
  const parts = [];
  if (data.chief_complaint) parts.push(`CC: ${data.chief_complaint}`);
  if (data.onset) parts.push(`Onset: ${data.onset}`);
  if (data.duration) parts.push(`Duration: ${data.duration}`);
  if (data.precipitating_factors) parts.push(`Precipitating: ${data.precipitating_factors}`);
  if (data.perpetuating_factors) parts.push(`Perpetuating: ${data.perpetuating_factors}`);
  if (data.suicidal_ideation && data.suicidal_ideation !== "None") parts.push(`SI: ${data.suicidal_ideation}`);
  if (data.self_harm_history) parts.push(`Self-harm h/o: ${data.self_harm_history}`);
  if (data.harm_to_others_risk) parts.push(`Harm to others: ${data.harm_to_others_risk}`);
  if (data.hpi) parts.push(data.hpi);
  return parts.join(". ") || null;
}

function SymptomsMseTab({ data, onChange, onSave, admissionId, saving, canEdit }) {
  const handleChip = (category, value) => {
    const current = data.mse?.[category] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...data, mse: { ...(data.mse || defaultMse()), [category]: next } });
  };

  const summary = buildHpiSummary(data);
  if (summary && summary !== data.summary) onChange({ ...data, summary });

  return (
    <div className="doctor-emr-section">
      <div className="doctor-form-grid">
        <div className="doctor-form-group doctor-form-group--full">
          <label>Chief Complaint</label>
          <textarea
            value={data.chief_complaint ?? data.chiefComplaint ?? ""}
            onChange={(e) => onChange({ ...data, chief_complaint: e.target.value })}
            rows={2}
            placeholder="Chief complaint in patient's words"
            disabled={!canEdit}
          />
        </div>
        <div className="doctor-form-group">
          <label>Onset</label>
          <input type="text" value={data.onset ?? ""} onChange={(e) => onChange({ ...data, onset: e.target.value })} placeholder="e.g. 2 weeks ago" disabled={!canEdit} />
        </div>
        <div className="doctor-form-group">
          <label>Duration</label>
          <input type="text" value={data.duration ?? ""} onChange={(e) => onChange({ ...data, duration: e.target.value })} placeholder="e.g. 2 weeks" disabled={!canEdit} />
        </div>
        <div className="doctor-form-group doctor-form-group--full">
          <label>Precipitating factors</label>
          <input type="text" value={data.precipitating_factors ?? ""} onChange={(e) => onChange({ ...data, precipitating_factors: e.target.value })} placeholder="Life events, stressors" disabled={!canEdit} />
        </div>
        <div className="doctor-form-group doctor-form-group--full">
          <label>Perpetuating factors</label>
          <input type="text" value={data.perpetuating_factors ?? ""} onChange={(e) => onChange({ ...data, perpetuating_factors: e.target.value })} placeholder="Ongoing stressors" disabled={!canEdit} />
        </div>
        <div className="doctor-form-group doctor-form-group--full">
          <label>HPI (History of present illness)</label>
          <textarea
            value={data.hpi ?? ""}
            onChange={(e) => onChange({ ...data, hpi: e.target.value })}
            rows={3}
            placeholder="History of present illness"
            disabled={!canEdit}
          />
        </div>
        <div className="doctor-form-group">
          <label>Suicidal ideation</label>
          <select value={data.suicidal_ideation ?? ""} onChange={(e) => onChange({ ...data, suicidal_ideation: e.target.value })} disabled={!canEdit}>
            <option value="">Select</option>
            {SI_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="doctor-form-group">
          <label>Self-harm history</label>
          <input type="text" value={data.self_harm_history ?? ""} onChange={(e) => onChange({ ...data, self_harm_history: e.target.value })} placeholder="Past attempts, NSSI" disabled={!canEdit} />
        </div>
        <div className="doctor-form-group">
          <label>Harm to others risk</label>
          <input type="text" value={data.harm_to_others_risk ?? ""} onChange={(e) => onChange({ ...data, harm_to_others_risk: e.target.value })} placeholder="Risk assessment" disabled={!canEdit} />
        </div>
        {summary && (
          <div className="doctor-form-group doctor-form-group--full">
            <label>Auto-generated summary</label>
            <p className="doctor-summary-text">{summary}</p>
          </div>
        )}
      </div>
      <div className="doctor-mse-module">
        <div className="doctor-mse-module__header">
          <h4 className="doctor-mse-module__title">
            <span className="doctor-mse-module__icon" aria-hidden>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /><path d="M12 14c-3 0-6 1-6 3v2h12v-2c0-2-3-3-6-3Z" /></svg>
            </span>
            Mental Status Examination (MSE)
          </h4>
          <span className="doctor-mse-module__hint">Click to select observed findings</span>
        </div>
        <div className="doctor-mse-grid">
          {Object.entries(MSE_OPTIONS).map(([key, options]) => (
            <div key={key} className="doctor-mse-group">
              <label className="doctor-mse-label">{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}</label>
              <div className="doctor-mse-chips">
                {options.map((opt) => {
                  const isDangerous = MSE_DANGEROUS.some((d) => opt.includes(d) || d.includes(opt));
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`doctor-chip ${(data.mse?.[key] || []).includes(opt) ? "doctor-chip--active" : ""} ${isDangerous ? "doctor-chip--dangerous" : ""}`}
                      onClick={() => canEdit && handleChip(key, opt)}
                      disabled={!canEdit}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <DiagnosisSelector value={data.diagnosis} onChange={(diagnosis) => onChange({ ...data, diagnosis })} disabled={!canEdit} />
      <RiskMeter value={data.risk} onChange={(risk) => onChange({ ...data, risk })} disabled={!canEdit} />
      {admissionId && onSave && (
        <div className="doctor-emr-actions">
          <button type="button" className="doctor-btn doctor-btn--primary" disabled={saving || !canEdit} onClick={() => onSave("symptoms")}>
            {saving ? "Saving…" : "Save Symptoms & MSE"}
          </button>
        </div>
      )}
    </div>
  );
}

const OBSERVATION_LEVELS = ["Routine", "Q15", "Q30", "1:1", "Special"];

function TreatmentPlanTab({ data, onChange, onSave, admissionId, saving, canEdit }) {
  const toggleModality = (m) => {
    const list = data.therapyModalities || data.therapy_modalities || [];
    const next = list.includes(m) ? list.filter((x) => x !== m) : [...list, m];
    onChange({ ...data, therapyModalities: next, therapy_modalities: next });
  };

  const modalities = data.therapyModalities ?? data.therapy_modalities ?? [];
  const emergencyContacts = data.emergency_contacts ?? [];

  return (
    <div className="doctor-emr-section">
      <div className="doctor-form-grid">
        <div className="doctor-form-group doctor-form-group--full">
          <label>Short-Term Goals</label>
          <textarea
            value={data.shortTermGoals ?? (Array.isArray(data.short_term_goals) ? data.short_term_goals.join("\n") : "") ?? ""}
            onChange={(e) => onChange({ ...data, shortTermGoals: e.target.value, short_term_goals: e.target.value.split("\n").filter(Boolean) })}
            rows={3}
            disabled={!canEdit}
          />
        </div>
        <div className="doctor-form-group doctor-form-group--full">
          <label>Long-Term Goals</label>
          <textarea
            value={data.longTermGoals ?? (Array.isArray(data.long_term_goals) ? data.long_term_goals.join("\n") : "") ?? ""}
            onChange={(e) => onChange({ ...data, longTermGoals: e.target.value, long_term_goals: e.target.value.split("\n").filter(Boolean) })}
            rows={3}
            disabled={!canEdit}
          />
        </div>
        <div className="doctor-form-group doctor-form-group--full">
          <label>Therapy Modalities</label>
          <div className="doctor-checkbox-group">
            {THERAPY_MODALITIES.map((m) => (
              <label key={m} className="doctor-checkbox" style={{ opacity: canEdit ? 1 : 0.6 }}>
                <input type="checkbox" checked={modalities.includes(m)} onChange={() => canEdit && toggleModality(m)} disabled={!canEdit} />
                {m}
              </label>
            ))}
          </div>
        </div>
        <div className="doctor-form-group">
          <label>Observation level</label>
          <select value={data.observation_level ?? ""} onChange={(e) => onChange({ ...data, observation_level: e.target.value })} disabled={!canEdit}>
            <option value="">Select</option>
            {OBSERVATION_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="doctor-form-group">
          <label>Session frequency</label>
          <input type="text" value={data.session_frequency ?? ""} onChange={(e) => onChange({ ...data, session_frequency: e.target.value })} placeholder="e.g. Weekly" disabled={!canEdit} />
        </div>
        <div className="doctor-form-group">
          <label>Assigned therapist</label>
          <input type="text" value={data.assigned_therapist_name ?? ""} onChange={(e) => onChange({ ...data, assigned_therapist_name: e.target.value })} placeholder="Name" disabled={!canEdit} />
        </div>
        <div className="doctor-form-group doctor-form-group--full">
          <label>Allied referrals</label>
          <input type="text" value={typeof data.allied_referrals === "string" ? data.allied_referrals : (data.alliedReferrals ?? "")} onChange={(e) => onChange({ ...data, alliedReferrals: e.target.value, allied_referrals: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="e.g. Psychologist, OT" disabled={!canEdit} />
        </div>
        <div className="doctor-form-group doctor-form-group--full">
          <label>Discharge criteria (one per line)</label>
          <textarea value={Array.isArray(data.discharge_criteria) ? data.discharge_criteria.join("\n") : (data.dischargeCriteria ?? "")} onChange={(e) => onChange({ ...data, dischargeCriteria: e.target.value, discharge_criteria: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} rows={2} disabled={!canEdit} />
        </div>
        <div className="doctor-form-group doctor-form-group--full">
          <label>Discharge planning</label>
          <textarea value={data.discharge_planning ?? ""} onChange={(e) => onChange({ ...data, discharge_planning: e.target.value })} rows={2} disabled={!canEdit} />
        </div>
        <div className="doctor-form-group doctor-form-group--full">
          <label>Safety plan</label>
          <textarea value={data.safetyPlan ?? data.safety_plan ?? ""} onChange={(e) => onChange({ ...data, safetyPlan: e.target.value, safety_plan: e.target.value })} rows={4} placeholder="Crisis contacts, coping strategies, warning signs" disabled={!canEdit} />
        </div>
        <div className="doctor-form-group doctor-form-group--full">
          <label>Emergency contacts (name, relation, phone)</label>
          <textarea value={emergencyContacts.map((c) => [c.name, c.relation, c.phone].filter(Boolean).join(", ")).join("\n")} onChange={(e) => onChange({ ...data, emergency_contacts: e.target.value.split("\n").map((line) => { const [name, relation, phone] = line.split(",").map((s) => s.trim()); return { name, relation, phone }; }).filter((c) => c.name || c.phone) })} rows={3} placeholder="Name, Relation, Phone per line" disabled={!canEdit} />
        </div>
      </div>
      {admissionId && onSave && (
        <div className="doctor-emr-actions">
          <button type="button" className="doctor-btn doctor-btn--primary" disabled={saving || !canEdit} onClick={() => onSave("treatment")}>
            {saving ? "Saving…" : "Save Treatment Plan"}
          </button>
        </div>
      )}
    </div>
  );
}

function EMR({
  patientId,
  patientName,
  admissionId: propAdmissionId,
  admission,
  onContextRefresh,
  onAutoSaveStatus,
  patientLabRequests = [],
  loadPatientLabRequests,
  onSendToLab,
  referringRequestId,
  canEdit = false,
}) {
  const [activeTab, setActiveTab] = useState("symptoms");
  const [admissionId, setAdmissionId] = useState(propAdmissionId);
  const [emrData, setEmrData] = useState({
    mse: defaultMse(),
    diagnosis: {},
    risk: {},
    medications: [],
    soap: {},
    vitals: {},
  });
  const [labList, setLabList] = useState([]);
  const [vitalsList, setVitalsList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [doctorName, setDoctorName] = useState("");

  const currentAdmissionId = admissionId || propAdmissionId;

  useEffect(() => {
    const userStr = localStorage.getItem("swastik_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setDoctorName(user.name || "Consultant Psychiatrist");
    }
  }, []);

  const ensureAdmission = useCallback(async () => {
    if (currentAdmissionId) return currentAdmissionId;
    if (!patientId) return null;
    try {
      const created = await api.createAdmission(patientId, { clinical_status: "Under Observation" });
      const id = created?.admission_id ?? created?.id;
      if (id) {
        setAdmissionId(id);
        onContextRefresh?.();
        return id;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }, [patientId, currentAdmissionId, onContextRefresh]);

  const loadAll = useCallback(async () => {
    if (!patientId || !currentAdmissionId) return;
    try {
      const [symptoms, mse, diagnosis, risk, meds, treatment, notes, vitals, lab] = await Promise.all([
        api.getSymptomsHpi(patientId, currentAdmissionId).catch(() => null),
        api.getMse(patientId, currentAdmissionId).catch(() => null),
        api.getDiagnosis(patientId, currentAdmissionId).catch(() => null),
        api.getRisk(patientId, currentAdmissionId).catch(() => null),
        api.listMedications(patientId, currentAdmissionId).catch(() => []),
        api.getTreatmentPlan(patientId, currentAdmissionId).catch(() => null),
        api.listSessionNotes(patientId, currentAdmissionId).catch(() => []),
        api.listVitals(patientId, currentAdmissionId).catch(() => []),
        api.listLabMonitoring(patientId, currentAdmissionId).catch(() => []),
      ]);
      if (symptoms) {
        setEmrData((d) => ({
          ...d,
          chief_complaint: symptoms.chief_complaint,
          onset: symptoms.onset,
          duration: symptoms.duration,
          precipitating_factors: symptoms.precipitating_factors,
          perpetuating_factors: symptoms.perpetuating_factors,
          hpi: symptoms.hpi,
          suicidal_ideation: symptoms.suicidal_ideation,
          self_harm_history: symptoms.self_harm_history,
          harm_to_others_risk: symptoms.harm_to_others_risk,
          summary: symptoms.summary,
        }));
      }
      if (mse && mse.appearance) {
        setEmrData((d) => ({
          ...d,
          mse: {
            appearance: mse.appearance || [],
            psychomotor: mse.psychomotor || [],
            speech: mse.speech || [],
            mood: mse.mood || [],
            affect: mse.affect || [],
            thoughtProcess: mse.thought_process || [],
            thought_content: mse.thought_content || [],
            perception: mse.perception || [],
            cognition: mse.cognition || [],
            insight: mse.insight || [],
            judgment: mse.judgment || [],
            attention: mse.attention || [],
          },
        }));
      }
      if (diagnosis && diagnosis.primary_diagnosis) {
        setEmrData((d) => ({
          ...d,
          diagnosis: {
            primary: diagnosis.primary_diagnosis,
            secondary: diagnosis.differential || [],
            severity: diagnosis.severity,
            specifier: diagnosis.specifier,
            system: diagnosis.system_used || diagnosis.system,
            formulation_bio_psycho_social: diagnosis.formulation_bio_psycho_social,
          },
        }));
      }
      if (risk) {
        setEmrData((d) => ({
          ...d,
          risk: {
            risk_to_self: risk.suicide_risk ?? 0,
            risk_to_others: risk.violence_risk ?? 0,
            risk_to_vulnerability: risk.elopement_risk ?? 0,
          },
        }));
      }
      if (Array.isArray(meds) && meds.length) setEmrData((d) => ({ ...d, medications: meds.map((m) => ({ id: m.id, drug: m.drug_name, dose: m.dose, frequency: m.frequency, route: m.route, duration: m.duration, startDate: m.start_date, endDate: m.end_date, prescriber: m.prescribing_doctor_name, status: m.status, prn: m.prn, allergy_flag: m.allergy_flag, eps_warning: m.eps_warning })) }));
      if (treatment) {
        setEmrData((d) => ({
          ...d,
          short_term_goals: treatment.short_term_goals,
          long_term_goals: treatment.long_term_goals,
          therapy_modalities: treatment.therapy_modalities,
          session_frequency: treatment.session_frequency,
          assigned_therapist_name: treatment.assigned_therapist_name,
          observation_level: treatment.observation_level,
          discharge_criteria: treatment.discharge_criteria,
          discharge_planning: treatment.discharge_planning,
          safety_plan: treatment.safety_plan,
          emergency_contacts: treatment.emergency_contacts,
        }));
      }

      const vitalsArray = Array.isArray(vitals) ? vitals : [];
      if (vitalsArray.length > 0) {
        setEmrData((d) => ({
          ...d,
          latestVitals: vitalsArray[0]
        }));
      }

      setLabList(Array.isArray(lab) ? lab : []);
      setVitalsList(vitalsArray);
    } catch (e) {
      console.error(e);
    }
  }, [patientId, currentAdmissionId]);

  useEffect(() => {
    setAdmissionId(propAdmissionId);
  }, [propAdmissionId]);

  useEffect(() => {
    if (patientId && currentAdmissionId) loadAll();
  }, [patientId, currentAdmissionId, loadAll]);

  const coreSave = async (module, aid) => {
    if (module === "symptoms") {
      const d = emrData;
      const dangerous = [];
      Object.values(d.mse || {}).flat().forEach((v) => { if (MSE_DANGEROUS.some((x) => v.includes(x))) dangerous.push(v); });
      await api.saveSymptomsHpi(patientId, { admission_id: aid, chief_complaint: d.chief_complaint, onset: d.onset, duration: d.duration, precipitating_factors: d.precipitating_factors, perpetuating_factors: d.perpetuating_factors, hpi: d.hpi, suicidal_ideation: d.suicidal_ideation, self_harm_history: d.self_harm_history, harm_to_others_risk: d.harm_to_others_risk, summary: buildHpiSummary(d) });
      await api.saveMse(patientId, {
        admission_id: aid,
        appearance: d.mse?.appearance,
        psychomotor: d.mse?.psychomotor,
        speech: d.mse?.speech,
        mood: d.mse?.mood,
        affect: d.mse?.affect,
        thought_process: d.mse?.thoughtProcess,
        thought_content: d.mse?.thought_content,
        perception: d.mse?.perception,
        cognition: d.mse?.cognition,
        insight: d.mse?.insight,
        judgment: d.mse?.judgment,
        attention: d.mse?.attention,
        dangerous_flags: dangerous,
      });
      if (d.diagnosis && (d.diagnosis.primary || d.diagnosis.formulation_bio_psycho_social)) {
        await api.saveDiagnosis(patientId, {
          admission_id: aid,
          primary_diagnosis: d.diagnosis.primary,
          differential: d.diagnosis.secondary,
          severity: d.diagnosis.severity,
          specifier: d.diagnosis.specifier,
          system: d.diagnosis.system,
          formulation_bio_psycho_social: d.diagnosis.formulation_bio_psycho_social,
        });
      }
      if (d.risk) {
        const level = (v) => (v >= 75 ? "Very High" : v >= 50 ? "High" : v >= 25 ? "Moderate" : "Low");
        await api.saveRisk(patientId, {
          admission_id: aid,
          risk_to_self: level(d.risk.risk_to_self ?? 0),
          risk_to_others: level(d.risk.risk_to_others ?? 0),
          risk_to_vulnerability: level(d.risk.risk_to_vulnerability ?? 0),
          // Metadata for sliders
          suicide_risk: d.risk.risk_to_self,
          violence_risk: d.risk.risk_to_others,
          elopement_risk: d.risk.risk_to_vulnerability
        });
      }
    } else if (module === "medication") {
      const d = emrData;
      if (Array.isArray(d.medications) && d.medications.length > 0) {
        const userStr = localStorage.getItem("swastik_user");
        const user = userStr ? JSON.parse(userStr) : {};
        const prescriptionData = {
          uhid: patientId,
          patient_name: patientName,
          admission_id: aid,
          medications: d.medications.map(m => ({
            drug_name: m.drug,
            dose: m.dose,
            frequency: m.frequency,
            route: m.route || "PO",
            duration: m.duration || "N/A"
          })),
          doctor_id: user._id || user.id,
          doctor_name: user.name || "Consultant Psychiatrist",
          notes: "Saved via EMR"
        };
        await api.savePrescription(patientId, prescriptionData);
      }
    } else if (module === "treatment") {
      const d = emrData;
      await api.saveTreatmentPlan(patientId, {
        admission_id: aid,
        short_term_goals: d.short_term_goals ?? d.shortTermGoals?.split("\n").filter(Boolean),
        long_term_goals: d.long_term_goals ?? d.longTermGoals?.split("\n").filter(Boolean),
        therapy_modalities: d.therapy_modalities ?? d.therapyModalities,
        allied_referrals: d.allied_referrals ?? (d.alliedReferrals ? [d.alliedReferrals] : []),
        session_frequency: d.session_frequency,
        assigned_therapist_name: d.assigned_therapist_name,
        observation_level: d.observation_level,
        discharge_criteria: d.discharge_criteria ?? (d.dischargeCriteria ? d.dischargeCriteria.split("\n").filter(Boolean) : []),
        discharge_planning: d.discharge_planning,
        safety_plan: d.safety_plan ?? d.safetyPlan,
        emergency_contacts: d.emergency_contacts,
      });
    } else if (module === "vitals") {
      const d = emrData;
      if (d.vitals && (d.vitals.bp || d.vitals.hr || d.vitals.temp || d.vitals.spo2 || d.vitals.weight || d.vitals.sleep || d.vitals.appetite || d.vitals.agitation)) {
        const bpMatch = String(d.vitals.bp || "").match(/^\s*(\d+)\s*\/\s*(\d+)/);
        await api.addVitals(patientId, {
          admission_id: aid,
          bp_systolic: bpMatch ? parseInt(bpMatch[1], 10) : null,
          bp_diastolic: bpMatch ? parseInt(bpMatch[2], 10) : null,
          hr: d.vitals.hr ? parseInt(d.vitals.hr, 10) : null,
          temp: d.vitals.temp ? parseFloat(d.vitals.temp) : null,
          spo2: d.vitals.spo2 ? parseInt(d.vitals.spo2, 10) : null,
          weight: d.vitals.weight ? parseFloat(d.vitals.weight) : null,
          sleep_hours: d.vitals.sleep ? parseFloat(d.vitals.sleep) : null,
          appetite: d.vitals.appetite || null,
          agitation_score: d.vitals.agitation !== "" ? parseInt(d.vitals.agitation, 10) : null,
          recorded_at: d.vitals.recordedAt ? new Date(d.vitals.recordedAt).toISOString() : undefined
        });

        // Clear unsaved vitals form after successful parent flush save
        setEmrData((curr) => ({ ...curr, vitals: {} }));
      }
    }
  };

  const handleSave = async (module) => {
    const aid = currentAdmissionId || (await ensureAdmission());
    if (!aid || !patientId) return;
    onAutoSaveStatus?.(false);
    setSaving(true);
    try {
      if (module === "all") {
        await coreSave("symptoms", aid);
        await coreSave("medication", aid);
        await coreSave("treatment", aid);
        await coreSave("vitals", aid);
      } else {
        await coreSave(module, aid);
      }
      onContextRefresh?.();
      if (!currentAdmissionId) setAdmissionId(aid);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
      onAutoSaveStatus?.(true);
    }
  };

  const handlePrintReport = async () => {
    try {
      setSaving(true);
      const histItems = await api.listHistoryEvents(patientId).catch(() => []);

      const reportData = {
        patient: { uhid: patientId, name: patientName, age: admission?.age, gender: admission?.gender },
        admission: admission,
        emrData: {
          ...emrData,
          labResults: labList,
          vitals: vitalsList
        },
        labOrders: patientLabRequests,
        histories: histItems,
        doctorName: doctorName
      };

      generateComprehensiveReport(reportData);
    } catch (err) {
      console.error("Failed to generate report:", err);
      alert("Error generating report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="doctor-emr">
      <div className="doctor-emr-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 className="doctor-page-title" style={{ marginBottom: '4px' }}>
            {patientName || "Patient"} <span style={{ fontSize: '0.9rem', color: 'var(--doc-text-muted)', fontWeight: 'normal' }}>| UHID: {patientId}</span>
          </h2>
        </div>
        <div className="doctor-header-actions" style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="doctor-btn doctor-btn--secondary"
            onClick={handlePrintReport}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FiPrinter /> Print Report
          </button>
          <button
            type="button"
            className="doctor-btn doctor-btn--primary"
            disabled={saving || !canEdit}
            onClick={() => handleSave("all")}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: !canEdit ? '#cbd5e1' : 'var(--doc-primary)', color: 'white', cursor: !canEdit ? 'not-allowed' : 'pointer' }}
          >
            <FiSave /> {saving ? "Saving..." : "Save Draft"}
          </button>
        </div>
      </div>
      <div className="doctor-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`doctor-tab ${activeTab === tab.id ? "doctor-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="doctor-tab-panel">
        {activeTab === "symptoms" && (
          <SymptomsMseTab
            data={emrData}
            onChange={setEmrData}
            onSave={handleSave}
            admissionId={currentAdmissionId}
            saving={saving}
            canEdit={canEdit}
          />
        )}
        {activeTab === "medication" && (
          <MedicationTable
            value={emrData.medications}
            onChange={(medications) => setEmrData((d) => ({ ...d, medications }))}
            canEdit={canEdit}
          />
        )}
        {activeTab === "treatment" && (
          <TreatmentPlanTab
            data={emrData}
            onChange={setEmrData}
            onSave={handleSave}
            admissionId={currentAdmissionId}
            saving={saving}
            canEdit={canEdit}
          />
        )}
        {activeTab === "session" && (
          <SOAPNotes
            uhid={patientId}
            admissionId={currentAdmissionId}
            value={emrData.soap}
            onChange={async (soap) => {
              if (soap.daily_routine_triggered) {
                try {
                  const dataToShare = { daily_routine: soap.p };
                  await api.saveDailyRoutine(patientId, dataToShare);
                  alert("Daily Routine shared with Patient Portal successfully!");
                } catch (e) {
                  console.error("Failed to share routine:", e);
                  alert("Error sharing routine. Please try again.");
                } finally {
                  // Clear the trigger
                  const { daily_routine_triggered, ...cleanSoap } = soap;
                  setEmrData((d) => ({ ...d, soap: cleanSoap }));
                }
              } else {
                setEmrData((d) => ({ ...d, soap }));
              }
            }}
            canEdit={canEdit}
          />
        )}
        {activeTab === "vitals" && (
          <Vitals
            value={emrData.vitals}
            onChange={(vitals) => setEmrData((d) => ({ ...d, vitals }))}
            list={vitalsList}
            uhid={patientId}
            admissionId={currentAdmissionId}
            onRefresh={loadAll}
            canEdit={canEdit}
          />
        )}
        {activeTab === "lab" && (
          <LabMonitoring
            uhid={patientId}
            admissionId={currentAdmissionId}
            list={labList}
            onRefresh={loadAll}
            labOrders={patientLabRequests}
            onRefreshLabOrders={loadPatientLabRequests}
            onSendToLab={onSendToLab}
            referringRequestId={referringRequestId}
            canEdit={canEdit}
          />
        )}
        {activeTab === "history" && <PatientHistory patientId={patientId} />}
      </div>
    </div>
  );
}

export default EMR;
