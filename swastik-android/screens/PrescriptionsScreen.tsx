import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { printOrSharePdf } from '../utils/pdfGenerator';
import { Colors } from '../constants/theme';
import { AppHeader } from '../components/AppHeader';
import { clinicalApi, getApiErrorMessage } from '../services/api';

const { width } = Dimensions.get('window');

interface PrescriptionsScreenProps {
  onOpenDrawer: () => void;
}

export const PrescriptionsScreen: React.FC<PrescriptionsScreenProps> = ({ onOpenDrawer }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [livePrescriptions, setLivePrescriptions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async (search?: string) => {
    try {
      setLoading(true);
      setError(null);
      const term = search !== undefined ? search : searchQuery;
      const res = await clinicalApi.getPrescriptions(term.trim() ? { search: term.trim() } : undefined);
      if (res && Array.isArray(res)) {
        setLivePrescriptions(res);
      } else {
        setLivePrescriptions([]);
      }
    } catch (err: any) {
      console.log('Error loading prescriptions:', err);
      setError(getApiErrorMessage(err, 'Could not retrieve prescriptions from clinical database.'));
      setLivePrescriptions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = () => {
    loadPrescriptions(searchQuery);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPrescriptions(searchQuery);
  };

  const extractMeds = (rx: any) => {
    const list = rx.medications || rx.medicines || rx.data?.medications || [];
    if (!Array.isArray(list)) return [];
    return list.map((m: any) => ({
      name: m.name || m.drug_name || 'Medication',
      dose: m.dose || m.dosage || m.frequency || '1-0-1',
      timing: m.timing || m.instructions || 'After food',
      duration: m.duration || '30 days',
    }));
  };

  const handlePrintRx = async (rx: any) => {
    try {
      const meds = extractMeds(rx);
      const dateFormatted = rx.created_at
        ? new Date(rx.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : (rx.date || 'Today');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; padding: 24px; color: #1e293b; }
            .header { border-bottom: 2px solid #1a7b76; padding-bottom: 12px; margin-bottom: 16px; }
            h1 { color: #1a7b76; margin: 0; font-size: 22px; }
            .rx-title { font-size: 28px; color: #1a7b76; font-weight: bold; margin-bottom: 12px; }
            .info { margin-bottom: 16px; font-size: 13px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; text-align: left; padding: 8px; border-bottom: 2px solid #cbd5e1; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            .sign { margin-top: 40px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SWASTIK HOSPITAL — PRESCRIPTION</h1>
            <p>Station Road, Kolhapur | Dr. P. M. Chougule (MD Psychiatry)</p>
          </div>
          <div class="info">
            <p><strong>Rx ID:</strong> ${rx.id || rx._id || 'RX-2026-901'} | <strong>Date:</strong> ${dateFormatted}</p>
            <p><strong>Patient Name:</strong> ${rx.patientName || rx.patient_name || 'Patient'} | <strong>UHID:</strong> ${rx.uhid}</p>
            ${rx.admission_id ? `<p><strong>Admission Context:</strong> ${rx.admission_id}</p>` : ''}
          </div>
          <div class="rx-title">&#8478;</div>
          <table>
            <thead>
              <tr>
                <th>Medicine / Formulation</th>
                <th>Dosage</th>
                <th>Instructions</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              ${meds
                .map(
                  (m: any) => `
                <tr>
                  <td><strong>${m.name}</strong></td>
                  <td>${m.dose}</td>
                  <td>${m.timing}</td>
                  <td>${m.duration}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <div class="sign">
            <p><strong>Dr. P. M. Chougule</strong><br/>Consultant Psychiatrist<br/>Reg No: MMC-2012-78923</p>
          </div>
        </body>
        </html>
      `;
      await printOrSharePdf(htmlContent, 'Prescription_' + (rx.uhid || rx.id || 'Rx'));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not print Rx');
    }
  };

  return (
    <View style={styles.root}>
      {/* Header with Hamburger & Swastik Logo (NO back button) */}
      <AppHeader onOpenDrawer={onOpenDrawer} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        {/* Screen Title */}
        <Text style={styles.screenTitle}>Prescriptions</Text>
        <Text style={styles.screenSubtitle}>
          Review issued Rx medications, dosages, and export clinical scripts.
        </Text>

        {/* Patient / UHID / Drug Search Input */}
        <View style={styles.searchBarContainer}>
          <Feather name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by UHID, patient name, or medication..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={(txt) => {
              setSearchQuery(txt);
              if (txt === '') loadPrescriptions('');
            }}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                loadPrescriptions('');
              }}
              style={{ padding: 4 }}
            >
              <Feather name="x" size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#1A7B76" />
          </View>
        ) : error ? (
          <View style={{ padding: 24, alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1, borderColor: '#FEE2E2' }}>
            <Feather name="alert-circle" size={32} color="#EF4444" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#991B1B', textAlign: 'center' }}>{error}</Text>
            <TouchableOpacity
              onPress={() => loadPrescriptions(searchQuery)}
              style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#1A7B76', borderRadius: 6 }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : livePrescriptions.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12 }}>
            <MaterialCommunityIcons name="pill-off" size={44} color="#94A3B8" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 10 }}>No Prescriptions Found</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center' }}>
              {searchQuery ? `No records found matching "${searchQuery}".` : 'Prescriptions created during patient consultations will appear here.'}
            </Text>
          </View>
        ) : (
          /* List of Prescriptions */
          <View style={styles.listContainer}>
            {livePrescriptions.map((rx, index) => (
              <View key={rx.id || rx._id || index} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.rxIconCircle}>
                    <MaterialCommunityIcons name="pill" size={20} color="#1A7B76" />
                  </View>
                  <View style={styles.headText}>
                    <Text style={styles.patientName}>{rx.patientName || rx.patient_name}</Text>
                    <Text style={styles.subText}>
                      {rx.uhid} • Rx No: {rx.id || rx._id || 'RX-2026'} • {rx.date || '30 Sep 2026'}
                    </Text>
                  </View>
                </View>

                {/* Medicines Table/List */}
                <View style={styles.medsBox}>
                  {extractMeds(rx).map((m: any, idx: number) => (
                    <View key={idx} style={styles.medRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.medName}>{m.name}</Text>
                        <Text style={styles.medTiming}>
                          {m.timing || 'After food'} • {m.duration || '30 days'}
                        </Text>
                      </View>
                      <View style={styles.doseBadge}>
                        <Text style={styles.doseText}>{m.dose || '1-0-1'}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Print Rx Button */}
                <View style={styles.footerRow}>
                  <TouchableOpacity
                    style={styles.printBtn}
                    activeOpacity={0.8}
                    onPress={() => handlePrintRx(rx)}
                  >
                    <Feather name="printer" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.printBtnText}>Print Official Rx Script</Text>
                  </TouchableOpacity>
                </View>
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
  screenSubtitle: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '500',
    marginBottom: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F1E36',
    padding: 0,
  },
  listContainer: {
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rxIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headText: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  subText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  medsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  medTiming: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  doseBadge: {
    backgroundColor: '#E8F5F4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  doseText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A7B76',
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  printBtn: {
    backgroundColor: '#1A7B76',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  printBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
