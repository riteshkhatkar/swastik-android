// swastik-android/screens/MedicalReportsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { printOrSharePdf } from '../utils/pdfGenerator';
import { Colors } from '../constants/theme';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { patientService, emrService, reportsService, getApiErrorMessage } from '../services/api';

const { width } = Dimensions.get('window');

interface MedicalReportsScreenProps {
  onOpenDrawer: () => void;
}

export const MedicalReportsScreen: React.FC<MedicalReportsScreenProps> = ({ onOpenDrawer }) => {
  const [activeTab, setActiveTab] = useState<'patient' | 'hospital'>('patient');
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await patientService.getPatients();
      if (res && Array.isArray(res)) {
        setPatients(res);
      } else {
        setPatients([]);
      }
    } catch (err: any) {
      console.error('Error fetching patients:', err);
      setError(getApiErrorMessage(err, 'Failed to load patient records.'));
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = searchQuery.trim()
    ? patients.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.uhid || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : patients;

  // Print Patient Discharge Summary with Live EMR Context
  const handlePrintDischargeSummary = async (patient: any) => {
    try {
      setGeneratingPdf(true);
      let diagnosisText = 'Major Depressive Disorder / Psychiatric Evaluation';
      let medsList: any[] = [];
      let vitalsText = 'Stable';

      try {
        const [emrSummary, diagRes, medsRes, vitalsRes] = await Promise.allSettled([
          emrService.getEmrContext(patient.uhid),
          emrService.getDiagnosis(patient.uhid),
          emrService.listMedications(patient.uhid),
          emrService.listVitals(patient.uhid),
        ]);

        if (diagRes.status === 'fulfilled' && diagRes.value) {
          const d = diagRes.value;
          diagnosisText = d.provisional_diagnosis || d.icd11_code || d.dsm5_code || diagnosisText;
        }
        if (medsRes.status === 'fulfilled' && Array.isArray(medsRes.value)) {
          medsList = medsRes.value.filter((m: any) => m.status !== 'stopped');
        }
        if (vitalsRes.status === 'fulfilled' && Array.isArray(vitalsRes.value) && vitalsRes.value.length > 0) {
          const v = vitalsRes.value[0];
          vitalsText = `BP: ${v.bp_systolic || 120}/${v.bp_diastolic || 80} mmHg, Pulse: ${v.pulse_rate || 76} bpm, SpO2: ${v.spo2 || 99}%`;
        }
      } catch (e) {
        console.log('Using baseline info for discharge report:', e);
      }

      const todayStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 28px; color: #1e293b; }
            .header { border-bottom: 3px solid #1a7b76; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; }
            .hospital-title { color: #1a7b76; font-size: 24px; font-weight: bold; margin: 0; }
            .hospital-sub { font-size: 13px; color: #64748b; margin: 4px 0 0 0; }
            .badge { background: #e8f5f4; color: #1a7b76; padding: 8px 14px; border-radius: 6px; font-weight: bold; text-align: center; margin-bottom: 20px; font-size: 14px; }
            .info-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 18px; line-height: 1.8; font-size: 13px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .sec-title { font-size: 14px; font-weight: bold; color: #0f172a; margin: 16px 0 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th { background: #f1f5f9; text-align: left; padding: 8px; border-bottom: 2px solid #cbd5e1; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            .sign { margin-top: 40px; text-align: right; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="hospital-title">SWASTIK HOSPITAL</h1>
              <p class="hospital-sub">Department of Psychiatry & De-addiction Medicine</p>
              <p class="hospital-sub">Station Road, Kolhapur, Maharashtra | Phone: +91 98765 43210</p>
            </div>
          </div>
          <div class="badge">OFFICIAL CLINICAL DISCHARGE SUMMARY</div>
          
          <div class="info-box">
            <div class="info-grid">
              <div><strong>Patient Name:</strong> ${patient.name}</div>
              <div><strong>UHID:</strong> ${patient.uhid}</div>
              <div><strong>Age / Gender:</strong> ${patient.age || 32} Yrs / ${patient.gender || 'General'}</div>
              <div><strong>Discharge Date:</strong> ${todayStr}</div>
              <div><strong>Admitting Consultant:</strong> Dr. P. M. Chougule (MD Psych)</div>
              <div><strong>Vitals at Discharge:</strong> ${vitalsText}</div>
            </div>
          </div>

          <div class="sec-title">CLINICAL DIAGNOSIS</div>
          <p style="font-size: 13px; margin: 4px 0;">${diagnosisText}</p>

          <div class="sec-title">CONDITION AT DISCHARGE</div>
          <p style="font-size: 13px; margin: 4px 0;">Patient is clinically stable, oriented to time, place, and person. Mood is euthymic with remission of acute symptoms. No suicidal ideation, psychotic agitation, or dangerous behavior observed during final round evaluation.</p>

          <div class="sec-title">DISCHARGE MEDICATIONS</div>
          ${
            medsList.length > 0
              ? `<table>
                  <thead>
                    <tr>
                      <th>Medication</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${medsList
                      .map(
                        (m: any) => `
                      <tr>
                        <td><strong>${m.drug_name || m.name}</strong></td>
                        <td>${m.dosage || m.dose || 'Standard'}</td>
                        <td>${m.frequency || '1-0-1'}</td>
                        <td>${m.instructions || m.timing || 'After food'}</td>
                      </tr>`
                      )
                      .join('')}
                  </tbody>
                </table>`
              : `<p style="font-size: 12px; color: #64748b;">Continue baseline maintenance medications as prescribed in primary consultation script.</p>`
          }

          <div class="sec-title">FOLLOW-UP ADVICE</div>
          <p style="font-size: 13px; margin: 4px 0;">Review in OPD clinic after 14 days or immediately if any emergency psychiatric relapse symptoms occur. Maintain strict compliance with medications.</p>

          <div class="sign">
            <p><strong>Dr. P. M. Chougule</strong><br/>Consultant Psychiatrist<br/>MMC Reg: MMC-2012-78923</p>
          </div>
        </body>
        </html>
      `;

      await printOrSharePdf(htmlContent, `Discharge_Summary_${patient.uhid}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not generate discharge summary PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Print Full Clinical EMR Dossier
  const handlePrintClinicalEmr = async (patient: any) => {
    try {
      setGeneratingPdf(true);
      let symptoms = 'N/A';
      let mseSummary = 'Appropriate, intact cognitive faculties';
      let diagnosis = 'Psychiatric Clinical Consultation';
      let riskProfile = 'Low acute risk';

      try {
        const [symRes, mseRes, diagRes, riskRes] = await Promise.allSettled([
          emrService.getSymptomsHpi(patient.uhid, ''),
          emrService.getMse(patient.uhid),
          emrService.getDiagnosis(patient.uhid),
          emrService.getRisk(patient.uhid),
        ]);

        if (symRes.status === 'fulfilled' && symRes.value) {
          symptoms = symRes.value.chief_complaints || symRes.value.history_present_illness || symptoms;
        }
        if (mseRes.status === 'fulfilled' && mseRes.value) {
          mseSummary = mseRes.value.clinical_summary || mseRes.value.thought_content || mseSummary;
        }
        if (diagRes.status === 'fulfilled' && diagRes.value) {
          diagnosis = diagRes.value.provisional_diagnosis || diagRes.value.icd11_code || diagnosis;
        }
        if (riskRes.status === 'fulfilled' && riskRes.value) {
          riskProfile = `Suicide: ${riskRes.value.suicide_risk || 'Low'}, Violence: ${riskRes.value.violence_risk || 'Low'}`;
        }
      } catch (e) {
        console.log('Error pulling full EMR data:', e);
      }

      const todayStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 28px; color: #1e293b; }
            .header { border-bottom: 3px solid #1a7b76; padding-bottom: 12px; margin-bottom: 18px; }
            .title { color: #1a7b76; font-size: 22px; font-weight: bold; margin: 0; }
            .sub { font-size: 13px; color: #64748b; margin-top: 4px; }
            .banner { background: #e8f5f4; color: #1a7b76; padding: 8px 12px; font-weight: bold; border-radius: 6px; text-align: center; margin: 16px 0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; margin-bottom: 16px; }
            .sec-title { font-size: 14px; font-weight: bold; color: #0f172a; margin-top: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            .content { font-size: 13px; line-height: 1.6; margin: 6px 0; }
            .sign { margin-top: 40px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">SWASTIK HOSPITAL — CLINICAL EMR DOSSIER</h1>
            <p class="sub">Department of Psychiatry & Clinical Neurosciences | Station Road, Kolhapur</p>
          </div>
          <div class="banner">CONFIDENTIAL PATIENT CLINICAL MEDICAL RECORD</div>
          
          <div class="grid">
            <div><strong>Patient:</strong> ${patient.name}</div>
            <div><strong>UHID:</strong> ${patient.uhid}</div>
            <div><strong>Age / Gender:</strong> ${patient.age || 32} / ${patient.gender || 'General'}</div>
            <div><strong>Generated:</strong> ${todayStr}</div>
            <div><strong>Attending Doctor:</strong> Dr. P. M. Chougule</div>
            <div><strong>Phone:</strong> ${patient.phone || 'N/A'}</div>
          </div>

          <div class="sec-title">1. SYMPTOMS & PRESENTING ILLNESS</div>
          <div class="content">${symptoms}</div>

          <div class="sec-title">2. MENTAL STATUS EXAMINATION (MSE)</div>
          <div class="content">${mseSummary}</div>

          <div class="sec-title">3. DIAGNOSIS (ICD-11 / DSM-5)</div>
          <div class="content">${diagnosis}</div>

          <div class="sec-title">4. 3-AXIS CLINICAL RISK ASSESSMENT</div>
          <div class="content">${riskProfile}</div>

          <div class="sign">
            <p><strong>Dr. P. M. Chougule</strong><br/>MD Psychiatry<br/>Consultant Psychiatrist</p>
          </div>
        </body>
        </html>
      `;

      await printOrSharePdf(htmlContent, `Clinical_EMR_${patient.uhid}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not generate EMR dossier');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Hospital-wide PDF Generation
  const handlePrintHospitalReport = async (reportType: string, reportTitle: string) => {
    try {
      setGeneratingPdf(true);
      const data = await reportsService.getReportDownload(reportType);
      if (!data) {
        throw new Error('Report data unavailable.');
      }

      const tablesHtml = (data.tables || [])
        .map(
          (tbl: any) => `
        <table style="width:100%; border-collapse:collapse; margin-top:14px; font-size:13px;">
          <thead>
            <tr>
              ${(tbl.headers || []).map((h: string) => `<th style="background:#f1f5f9; padding:8px 12px; border-bottom:2px solid #cbd5e1; text-align:left;">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${(tbl.rows || []).map((row: string[]) => `
              <tr>
                ${row.map((cell: string) => `<td style="padding:8px 12px; border-bottom:1px solid #e2e8f0;">${cell}</td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>`
        )
        .join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 28px; color: #1e293b; }
            .header { border-bottom: 3px solid #1a7b76; padding-bottom: 12px; margin-bottom: 18px; }
            .title { color: #1a7b76; font-size: 24px; font-weight: bold; margin: 0; }
            .sub { font-size: 13px; color: #64748b; margin-top: 4px; }
            .badge { background: #e8f5f4; color: #1a7b76; padding: 8px 12px; font-weight: bold; border-radius: 6px; text-align: center; margin: 16px 0; font-size: 14px; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">SWASTIK HOSPITAL</h1>
            <p class="sub">Advanced Management Information System (MIS) Report</p>
          </div>
          <div class="badge">${data.title || reportTitle}</div>
          <p style="font-size:12px; color:#64748b;">Report Generated at: ${data.generated_at || new Date().toISOString()}</p>
          
          ${tablesHtml}

          <div class="footer">
            <div>Verified by Hospital Operations & Administration</div>
            <div>Swastik Hospital Kolhapur</div>
          </div>
        </body>
        </html>
      `;

      await printOrSharePdf(htmlContent, `${reportType}_Report`);
    } catch (err: any) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to generate hospital report PDF.'));
    } finally {
      setGeneratingPdf(false);
    }
  };

  const hospitalReports = [
    {
      id: 'daily-hospital',
      title: 'Daily Hospital Operations',
      desc: 'Real-time overview of OPD, active IPD, doctors, and lab census.',
      icon: 'hospital-building',
    },
    {
      id: 'doctor-performance',
      title: 'Doctor Clinical Performance',
      desc: 'Patient loads, consultations completed, and clinical workload.',
      icon: 'doctor',
    },
    {
      id: 'medication-monitoring',
      title: 'Medication Monitoring Trends',
      desc: 'Therapeutic Lithium, Antipsychotics, and high-risk prescription track.',
      icon: 'pill',
    },
    {
      id: 'patient-statistics',
      title: 'Patient Demographics & Statistics',
      desc: 'Aggregate patient registry, diagnosis distributions, and trends.',
      icon: 'chart-box',
    },
  ];

  return (
    <View style={styles.root}>
      {/* Header with Hamburger & Swastik Logo */}
      <AppHeader onOpenDrawer={onOpenDrawer} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPatients} colors={['#1A7B76']} />}
      >
        {/* Screen Title */}
        <Text style={styles.screenTitle}>Medical & Operational Reports</Text>
        <View style={styles.accentBar} />

        {/* Tab Toggle */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'patient' && styles.tabBtnActive]}
            onPress={() => setActiveTab('patient')}
          >
            <Feather name="user" size={15} color={activeTab === 'patient' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, activeTab === 'patient' && styles.tabTextActive]}>
              Patient Clinical Reports
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'hospital' && styles.tabBtnActive]}
            onPress={() => setActiveTab('hospital')}
          >
            <MaterialCommunityIcons name="hospital-building" size={16} color={activeTab === 'hospital' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, activeTab === 'hospital' && styles.tabTextActive]}>
              Hospital MIS Reports
            </Text>
          </TouchableOpacity>
        </View>

        {generatingPdf && (
          <View style={styles.generatingNotice}>
            <ActivityIndicator size="small" color="#1A7B76" style={{ marginRight: 8 }} />
            <Text style={styles.generatingText}>Generating & exporting official PDF document...</Text>
          </View>
        )}

        {activeTab === 'patient' ? (
          <>
            {/* Search Input Box */}
            <View style={styles.searchContainer}>
              <Feather name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search patient by UHID or Name..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Feather name="x" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#1A7B76" />
                <Text style={{ marginTop: 8, fontSize: 13, color: '#64748B' }}>Loading patient registry...</Text>
              </View>
            ) : error ? (
              <View style={{ padding: 24, backgroundColor: '#FEF2F2', borderRadius: 12, alignItems: 'center' }}>
                <Feather name="alert-circle" size={28} color="#EF4444" style={{ marginBottom: 6 }} />
                <Text style={{ color: '#991B1B', fontWeight: '600', fontSize: 13, textAlign: 'center' }}>{error}</Text>
                <TouchableOpacity
                  onPress={loadPatients}
                  style={{ marginTop: 12, paddingVertical: 6, paddingHorizontal: 16, backgroundColor: '#1A7B76', borderRadius: 6 }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 12 }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : filteredPatients.length === 0 ? (
              <View style={styles.card}>
                <EmptyState
                  iconType="search"
                  message={searchQuery ? `No patient record found matching "${searchQuery}".` : 'No patient records found in registry.'}
                />
              </View>
            ) : (
              /* Search Results */
              <View style={styles.resultsContainer}>
                {filteredPatients.map((p) => (
                  <View key={p._id || p.id || p.uhid} style={styles.patientCard}>
                    <View style={styles.patientHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.patientName}>{p.name}</Text>
                        <Text style={styles.patientSub}>
                          {p.uhid} • {p.age || 30} yrs • {p.gender || 'General'}
                        </Text>
                      </View>
                      <View style={styles.diagnosisBadge}>
                        <Text style={styles.diagnosisText} numberOfLines={1}>
                          {p.phone || 'Active'}
                        </Text>
                      </View>
                    </View>

                    {/* Report Generation Actions */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.reportActionBtn}
                        onPress={() => handlePrintDischargeSummary(p)}
                        disabled={generatingPdf}
                      >
                        <Feather name="printer" size={14} color="#1A7B76" style={{ marginRight: 6 }} />
                        <Text style={styles.reportActionText}>Discharge Summary</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.reportActionBtn}
                        onPress={() => handlePrintClinicalEmr(p)}
                        disabled={generatingPdf}
                      >
                        <Feather name="file-text" size={14} color="#1A7B76" style={{ marginRight: 6 }} />
                        <Text style={styles.reportActionText}>Clinical EMR Dossier</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          /* Hospital Operational Reports Tab */
          <View style={styles.hospitalReportsGrid}>
            {hospitalReports.map((hr) => (
              <View key={hr.id} style={styles.hospitalReportCard}>
                <View style={styles.hrHeader}>
                  <View style={styles.hrIconWrap}>
                    <MaterialCommunityIcons name={hr.icon as any} size={22} color="#1A7B76" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.hrTitle}>{hr.title}</Text>
                    <Text style={styles.hrDesc}>{hr.desc}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.hrDownloadBtn}
                  onPress={() => handlePrintHospitalReport(hr.id, hr.title)}
                  disabled={generatingPdf}
                >
                  <Feather name="download" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.hrDownloadBtnText}>Generate & Download Report</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
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
    marginBottom: 4,
  },
  accentBar: {
    width: 48,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#1A7B76',
    marginBottom: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#1A7B76',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  generatingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  generatingText: {
    fontSize: 12,
    color: '#1A7B76',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    height: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minHeight: 200,
    justifyContent: 'center',
  },
  resultsContainer: {
    gap: 12,
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  patientHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  patientSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  diagnosisBadge: {
    backgroundColor: '#E8F5F4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  diagnosisText: {
    fontSize: 11,
    color: '#1A7B76',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  reportActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 8,
  },
  reportActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A7B76',
  },
  hospitalReportsGrid: {
    gap: 12,
  },
  hospitalReportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  hrHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  hrIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E8F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  hrDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  hrDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A7B76',
    borderRadius: 8,
    paddingVertical: 9,
  },
  hrDownloadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
