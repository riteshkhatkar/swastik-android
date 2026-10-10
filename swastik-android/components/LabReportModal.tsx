// swastik-android/components/LabReportModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { printOrSharePdf } from '../utils/pdfGenerator';
import { Colors } from '../constants/theme';
import { labService } from '../services/api';

const { width } = Dimensions.get('window');

interface LabReportModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  patientName: string;
  uhid?: string;
  tests: string;
  dateStr?: string;
}

export const LabReportModal: React.FC<LabReportModalProps> = ({
  visible,
  onClose,
  orderId,
  patientName,
  uhid = 'UHID-2026-0842',
  tests,
  dateStr = 'September 30, 2026',
}) => {
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible && orderId) {
      loadReportData();
    }
  }, [visible, orderId]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await labService.getLabReportData(orderId);
      setReportData(res);
    } catch (err: any) {
      console.log('Error fetching lab report:', err);
      setErrorMsg(err?.response?.data?.detail || err?.message || 'Unable to retrieve lab report details.');
    } finally {
      setLoading(false);
    }
  };

  const rawResults: any[] = Array.isArray(reportData?.results) ? reportData.results : [];
  const testResults = rawResults.map((r: any) => ({
    name: r.test_catalog_id || r.test_name || 'Diagnostic Parameter',
    result: r.value !== null && r.value !== undefined ? String(r.value) : (r.value_text || 'Evaluated'),
    unit: r.unit || '',
    normal: r.reference_range || 'Normal Reference',
    status: r.is_critical ? 'Critical' : r.is_abnormal ? 'Abnormal' : 'Normal',
  }));

  const handlePrintOrShare = async () => {
    try {
      setDownloading(true);
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
            .header { border-bottom: 3px solid #1a7b76; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
            .hospital-title { color: #1a7b76; font-size: 24px; font-weight: bold; margin: 0; }
            .hospital-sub { font-size: 13px; color: #64748b; margin: 4px 0 0 0; }
            .report-title { background: #e8f5f4; color: #1a7b76; padding: 8px 12px; font-weight: bold; border-radius: 6px; text-align: center; margin-bottom: 16px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; margin-bottom: 16px; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
            th { background-color: #f1f5f9; color: #475569; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; }
            td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; }
            .normal-pill { color: #065f46; background: #d1fae5; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .crit-pill { color: #991b1b; background: #fee2e2; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .abn-pill { color: #9a3412; background: #ffedd5; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            .sign { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="hospital-title">SWASTIK HOSPITAL</h1>
              <p class="hospital-sub">NABH Accredited | Advanced Pathology & Diagnostic Lab</p>
              <p class="hospital-sub">Station Road, Kolhapur, Maharashtra | Phone: +91 98765 43210</p>
            </div>
          </div>
          <div class="report-title">DEPARTMENT OF CLINICAL PATHOLOGY — OFFICIAL REPORT</div>
          <div class="info-grid">
            <div><strong>Patient Name:</strong> ${patientName}</div>
            <div><strong>Order ID:</strong> ${orderId}</div>
            <div><strong>UHID:</strong> ${uhid}</div>
            <div><strong>Date & Time:</strong> ${dateStr}</div>
            <div><strong>Ref Doctor:</strong> Dr. P. M. Chougule (MD Psychiatry)</div>
            <div><strong>Test(s):</strong> ${tests}</div>
          </div>
          ${
            testResults.length > 0
              ? `<table>
            <thead>
              <tr>
                <th>Test Parameter</th>
                <th>Observed Value</th>
                <th>Biological Reference Interval</th>
                <th>Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${testResults
                .map(
                  (t) => `
                <tr>
                  <td><strong>${t.name}</strong></td>
                  <td><strong>${t.result}</strong></td>
                  <td>${t.normal}</td>
                  <td>${t.unit}</td>
                  <td><span class="${t.status === 'Critical' ? 'crit-pill' : t.status === 'Abnormal' ? 'abn-pill' : 'normal-pill'}">${t.status}</span></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>`
              : `<div style="padding: 24px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 6px; margin-top: 16px;">
                  <p style="font-weight: 600; margin: 0;">Test results are currently being processed or awaiting verification.</p>
                  <p style="font-size: 12px; margin-top: 4px;">Status: ${reportData?.request?.status || 'In Progress'}</p>
                 </div>`
          }
          <div class="footer">
            <div>Verified by: Senior Biochemist & Pathologist</div>
            <div class="sign">
              <strong>Dr. P. M. Chougule</strong><br/>
              Consultant in Charge
            </div>
          </div>
        </body>
        </html>
      `;

      await printOrSharePdf(htmlContent, `Lab_Report_${uhid || 'Report'}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate PDF report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.brandRow}>
              <Image
                source={require('../assets/swastik_brand_header_transparent.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Title Banner */}
            <View style={styles.reportBanner}>
              <Text style={styles.reportBannerText}>CLINICAL PATHOLOGY LABORATORY REPORT</Text>
            </View>

            {/* Patient & Order Details Card */}
            <View style={styles.patientInfoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Patient Name:</Text>
                <Text style={styles.infoValue}>{patientName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Order ID:</Text>
                <Text style={styles.infoValue}>{orderId}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>UHID:</Text>
                <Text style={styles.infoValue}>{uhid}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ordered Tests:</Text>
                <Text style={styles.infoValueTeal}>{tests}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date & Time:</Text>
                <Text style={styles.infoValue}>{dateStr}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ref. Consultant:</Text>
                <Text style={styles.infoValue}>Dr. P. M. Chougule</Text>
              </View>
            </View>

            {/* Test Results Table */}
            <Text style={styles.sectionTitle}>Test Parameter Findings</Text>
            <View style={styles.tableCard}>
              <View style={styles.tableHead}>
                <Text style={[styles.thText, { flex: 2 }]}>Test</Text>
                <Text style={[styles.thText, { flex: 1.2 }]}>Result</Text>
                <Text style={[styles.thText, { flex: 1.4 }]}>Reference</Text>
                <Text style={[styles.thText, { flex: 1 }]}>Status</Text>
              </View>
              {loading ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#1A7B76" />
                  <Text style={{ marginTop: 8, fontSize: 13, color: '#64748B' }}>Loading laboratory findings...</Text>
                </View>
              ) : errorMsg ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#EF4444', fontSize: 13, textAlign: 'center' }}>{errorMsg}</Text>
                </View>
              ) : testResults.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
                    Laboratory test results have not been finalized or entered yet.
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>
                    Current Order Status: {reportData?.request?.status || 'Processing'}
                  </Text>
                </View>
              ) : (
                testResults.map((item, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tdBold, { flex: 2 }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={[styles.tdValue, { flex: 1.2 }]}>
                      {item.result} <Text style={styles.unitText}>{item.unit}</Text>
                    </Text>
                    <Text style={[styles.tdText, { flex: 1.4 }]}>{item.normal}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          flex: 1,
                          backgroundColor:
                            item.status === 'Critical' ? '#FEE2E2' : item.status === 'Abnormal' ? '#FFEDD5' : '#D1FAE5',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color:
                              item.status === 'Critical' ? '#991B1B' : item.status === 'Abnormal' ? '#9A3412' : '#065F46',
                          },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Doctor Verification */}
            <View style={styles.signCard}>
              <View>
                <Text style={styles.signTitle}>Swastik Diagnostic Core Lab</Text>
                <Text style={styles.signSubtitle}>ISO 15189 Certified</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.signName}>Dr. P. M. Chougule</Text>
                <Text style={styles.signRole}>MD (Psychiatry)</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.downloadButton}
              activeOpacity={0.8}
              onPress={handlePrintOrShare}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="download" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.downloadBtnText}>Download / Share PDF Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 36,
  },
  closeBtn: {
    padding: 6,
  },
  modalBody: {
    padding: 16,
  },
  reportBanner: {
    backgroundColor: '#E8F5F4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  reportBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A7B76',
    letterSpacing: 0.5,
  },
  patientInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  infoValueTeal: {
    fontSize: 12,
    color: '#1A7B76',
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  tableCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  tdBold: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  tdValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A7B76',
  },
  unitText: {
    fontSize: 9,
    fontWeight: '400',
    color: '#64748B',
  },
  tdText: {
    fontSize: 10,
    color: '#64748B',
  },
  statusPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  signCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginBottom: 12,
  },
  signTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  signSubtitle: {
    fontSize: 10,
    color: '#64748B',
  },
  signName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A7B76',
  },
  signRole: {
    fontSize: 10,
    color: '#64748B',
  },
  modalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  downloadButton: {
    backgroundColor: '#1A7B76',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
