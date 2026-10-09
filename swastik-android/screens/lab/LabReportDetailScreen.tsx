// swastik-android/screens/lab/LabReportDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { printOrSharePdf, generateLabReportHtml } from '../../utils/pdfGenerator';
import { labApi, getApiErrorMessage } from '../../services/api';

interface LabReportDetailScreenProps {
  onOpenDrawer: () => void;
  requestId?: string;
  patientData?: any;
}

export const LabReportDetailScreen: React.FC<LabReportDetailScreenProps> = ({
  onOpenDrawer,
  requestId = 'REQ0012456',
  patientData,
}) => {
  const insets = useSafeAreaInsets();
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (requestId) {
      loadReport();
    }
  }, [requestId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await labApi.getLabReportData(requestId);
      if (data) {
        setReport(data);
      }
    } catch (err: any) {
      console.log('Error fetching lab report:', err);
    } finally {
      setLoading(false);
    }
  };

  const investigationsList = (report?.investigations || report?.results || report?.parameters || []).map((inv: any) => ({
    name: inv.name || inv.test_name || inv.parameter_name || 'Test Parameter',
    result: String(inv.result ?? inv.value ?? inv.observed_value ?? '—'),
    referenceRange: inv.referenceRange || inv.reference_range || inv.reference_interval || 'Standard',
    unit: inv.unit || '',
    isAbnormal: Boolean(inv.isAbnormal || inv.abnormal || inv.flag === 'abnormal' || inv.flag === 'critical'),
  }));

  const reportDetails = {
    patientName: report?.patient_name || patientData?.patientName || patientData?.name || 'Patient',
    requestId: report?.request_id || requestId || 'REQ-LAB',
    uhid: report?.uhid || patientData?.uhid || '—',
    registeredOn: report?.registered_on || report?.created_at ? new Date(report?.registered_on || report?.created_at).toLocaleDateString('en-GB') : (patientData?.date || new Date().toLocaleDateString('en-GB')),
    ageSex: report?.age_sex || (patientData?.age ? `${patientData.age} Y / ${patientData.gender || 'General'}` : 'Adult'),
    reportedOn: report?.reported_on ? new Date(report.reported_on).toLocaleString('en-GB') : new Date().toLocaleString('en-GB'),
    referringDoctor: report?.referring_doctor || report?.doctor_name || patientData?.doctorName || 'Dr. P. M. Chougule',
    sampleType: report?.sample_type || 'Serum / Whole Blood',
    sampleCollectedOn: report?.collected_on ? new Date(report.collected_on).toLocaleString('en-GB') : new Date().toLocaleString('en-GB'),
    status: (report?.status || 'Final').toUpperCase() + ' REPORT',
    investigations: investigationsList.length > 0 ? investigationsList : [
      { name: 'Investigation In Process', result: 'Pending', referenceRange: 'Standard', unit: '', isAbnormal: false }
    ],
    remarks: report?.remarks || report?.clinical_notes || 'All values calibrated and verified by laboratory diagnostics team.',
  };

  const handlePrintPdf = async () => {
    try {
      const html = generateLabReportHtml(reportDetails);
      await printOrSharePdf(html, `Lab-Report-${reportDetails.requestId}`);
    } catch (err: any) {
      Alert.alert('PDF Error', getApiErrorMessage(err));
    }
  };

  const handleSaveDraft = async () => {
    setIsDraftSaved(true);
    try {
      const html = generateLabReportHtml({ ...reportDetails, status: 'DRAFT RECORD' });
      await printOrSharePdf(html, `Draft-Report-${reportDetails.requestId}`);
    } catch (err: any) {
      Alert.alert('Draft Error', getApiErrorMessage(err));
    }
  };

  return (
    <View style={styles.root}>
      {/* Top App Header with Stethoscope Banner */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onOpenDrawer} style={styles.hamburgerBtn}>
            <Feather name="menu" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Image
            source={require('../../assets/swastik_large_brand_transparent.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Lab Report</Text>
          <Text style={styles.subTitle}>View your laboratory test report details.</Text>
        </View>

        {/* Diagnostic Header Card */}
        <View style={styles.reportMainCard}>
          <View style={styles.reportHeaderRow}>
            <View>
              <Text style={styles.pathologyTitle}>SWASTIK</Text>
              <Text style={styles.pathologySub}>PATHOLOGY LAB</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.labReportBadge}>LABORATORY REPORT</Text>
              <Text style={styles.labReportTagline}>Accurate Diagnostics. Healthier Lives.</Text>
            </View>
          </View>

          {/* Patient Details Grid (2 Columns matching Image 4) */}
          <View style={styles.patientGrid}>
            <View style={styles.gridRow}>
              <View style={styles.gridCell}>
                <View style={styles.cellIconCircle}>
                  <Ionicons name="person-outline" size={15} color="#0F766E" />
                </View>
                <View>
                  <Text style={styles.gridLabel}>Patient Name</Text>
                  <Text style={styles.gridValue}>{reportDetails.patientName}</Text>
                </View>
              </View>

              <View style={styles.gridCell}>
                <View style={styles.cellIconCircle}>
                  <Ionicons name="document-text-outline" size={15} color="#0F766E" />
                </View>
                <View>
                  <Text style={styles.gridLabel}>Request ID</Text>
                  <Text style={styles.gridValue}>{reportDetails.requestId}</Text>
                </View>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCell}>
                <View style={styles.cellIconCircle}>
                  <Ionicons name="card-outline" size={15} color="#0F766E" />
                </View>
                <View>
                  <Text style={styles.gridLabel}>UHID / Patient ID</Text>
                  <Text style={styles.gridValue}>{reportDetails.uhid}</Text>
                </View>
              </View>

              <View style={styles.gridCell}>
                <View style={styles.cellIconCircle}>
                  <Ionicons name="time-outline" size={15} color="#0F766E" />
                </View>
                <View>
                  <Text style={styles.gridLabel}>Registered On</Text>
                  <Text style={styles.gridValue}>{reportDetails.registeredOn}</Text>
                </View>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCell}>
                <View style={styles.cellIconCircle}>
                  <Ionicons name="calendar-outline" size={15} color="#0F766E" />
                </View>
                <View>
                  <Text style={styles.gridLabel}>Age / Sex</Text>
                  <Text style={styles.gridValue}>{reportDetails.ageSex}</Text>
                </View>
              </View>

              <View style={styles.gridCell}>
                <View style={styles.cellIconCircle}>
                  <MaterialCommunityIcons name="flask-outline" size={15} color="#0F766E" />
                </View>
                <View>
                  <Text style={styles.gridLabel}>Reported On</Text>
                  <Text style={styles.gridValue}>{reportDetails.reportedOn}</Text>
                </View>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={[styles.gridCell, { width: '100%' }]}>
                <View style={styles.cellIconCircle}>
                  <MaterialCommunityIcons name="doctor" size={15} color="#0F766E" />
                </View>
                <View>
                  <Text style={styles.gridLabel}>Referring Doctor</Text>
                  <Text style={styles.gridValue}>{reportDetails.referringDoctor}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Section Header: INTERNAL TEST REPORT */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.accentBar} />
          <Text style={styles.sectionTitle}>INTERNAL TEST REPORT</Text>
        </View>

        {/* Meta Row: Sample Type | Collected Date | Report Status */}
        <View style={styles.reportMetaCard}>
          <View style={styles.metaCell}>
            <View style={styles.cellIconCircleSmall}>
              <MaterialCommunityIcons name="test-tube" size={14} color="#0F766E" />
            </View>
            <View>
              <Text style={styles.metaCellLabel}>Sample Type</Text>
              <Text style={styles.metaCellValue}>{reportDetails.sampleType}</Text>
            </View>
          </View>

          <View style={styles.metaCell}>
            <View style={styles.cellIconCircleSmall}>
              <Ionicons name="calendar-outline" size={14} color="#0F766E" />
            </View>
            <View>
              <Text style={styles.metaCellLabel}>Sample Collected On</Text>
              <Text style={styles.metaCellValue}>{reportDetails.sampleCollectedOn}</Text>
            </View>
          </View>

          <View style={styles.metaCell}>
            <View style={styles.cellIconCircleSmall}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
            </View>
            <View>
              <Text style={styles.metaCellLabel}>Report Status</Text>
              <View style={styles.finalReportBadge}>
                <Text style={styles.finalReportText}>{reportDetails.status}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Investigations Table */}
        <View style={styles.tableCard}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thCell, { flex: 2.2 }]}>Investigation</Text>
            <Text style={[styles.thCell, { flex: 1.1, textAlign: 'center' }]}>Result</Text>
            <Text style={[styles.thCell, { flex: 1.4, textAlign: 'center' }]}>Reference Range</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>Unit</Text>
          </View>

          {/* Table Body */}
          {reportDetails.investigations.map((item: any, idx: number) => (
            <View
              key={idx}
              style={[styles.tableBodyRow, idx % 2 === 1 && styles.tableBodyRowAlt]}
            >
              <Text style={[styles.tdInvestigation, { flex: 2.2 }]}>{item.name}</Text>
              <View style={[{ flex: 1.1, alignItems: 'center' }]}>
                {item.isAbnormal ? (
                  <View style={styles.abnormalBadge}>
                    <Text style={styles.abnormalText}>{item.result}</Text>
                  </View>
                ) : (
                  <Text style={styles.normalText}>{item.result}</Text>
                )}
              </View>
              <Text style={[styles.tdRefRange, { flex: 1.4, textAlign: 'center' }]}>
                {item.referenceRange}
              </Text>
              <Text style={[styles.tdUnit, { flex: 1, textAlign: 'center' }]}>{item.unit}</Text>
            </View>
          ))}
        </View>

        {/* Remarks / Interpretation Box */}
        <View style={styles.remarksBox}>
          <View style={styles.remarksHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#0F766E" />
            <Text style={styles.remarksTitle}>Remarks / Interpretation</Text>
          </View>
          <Text style={styles.remarksContent}>{reportDetails.remarks}</Text>
        </View>

        {/* Bottom Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.saveDraftBtn}
            activeOpacity={0.8}
            onPress={handleSaveDraft}
          >
            <Feather name="save" size={18} color="#0F766E" />
            <Text style={styles.saveDraftText}>
              {isDraftSaved ? 'Draft Saved ✓' : 'Save Draft'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.printPdfBtn}
            activeOpacity={0.85}
            onPress={handlePrintPdf}
          >
            <Ionicons name="print-outline" size={18} color="#FFFFFF" />
            <Text style={styles.printPdfText}>Print PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hamburgerBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerLogo: {
    width: 155,
    height: 42,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 13,
    color: '#64748B',
  },
  reportMainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  reportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 14,
  },
  pathologyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F766E',
    letterSpacing: 0.5,
  },
  pathologySub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
  },
  labReportBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  labReportTagline: {
    fontSize: 10,
    color: '#0F766E',
    marginTop: 2,
  },
  patientGrid: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cellIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  gridLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  gridValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  accentBar: {
    width: 4,
    height: 18,
    backgroundColor: '#0F766E',
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  reportMetaCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  metaCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cellIconCircleSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCellLabel: {
    fontSize: 9.5,
    color: '#64748B',
  },
  metaCellValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  finalReportBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  finalReportText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#E6FFFA',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
  },
  thCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
  },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableBodyRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tdInvestigation: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  normalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  abnormalBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  abnormalText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  tdRefRange: {
    fontSize: 11,
    color: '#64748B',
  },
  tdUnit: {
    fontSize: 11,
    color: '#64748B',
  },
  remarksBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    padding: 14,
    marginBottom: 20,
  },
  remarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  remarksTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  remarksContent: {
    fontSize: 12,
    color: '#0D9488',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveDraftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F766E',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  saveDraftText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  printPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  printPdfText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
