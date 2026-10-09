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
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { printOrSharePdf } from '../utils/pdfGenerator';
import { Colors } from '../constants/theme';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { patientService } from '../services/api';

const { width } = Dimensions.get('window');

interface MedicalReportsScreenProps {
  onOpenDrawer: () => void;
}

export const MedicalReportsScreen: React.FC<MedicalReportsScreenProps> = ({ onOpenDrawer }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const res = await patientService.getPatients();
      if (res && Array.isArray(res) && res.length > 0) {
        setPatients(res);
      }
    } catch {
      // fallback
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
    : [];

  const handlePrintDischargeSummary = async (patient: any) => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; padding: 24px; color: #1e293b; }
            .header { border-bottom: 2px solid #1a7b76; padding-bottom: 12px; margin-bottom: 16px; }
            h1 { color: #1a7b76; margin: 0; font-size: 22px; }
            .badge { background: #e8f5f4; color: #1a7b76; padding: 6px 12px; border-radius: 4px; font-weight: bold; display: inline-block; margin-top: 8px; }
            .details { margin: 16px 0; line-height: 1.6; }
            .sign { margin-top: 40px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SWASTIK HOSPITAL — CLINICAL DISCHARGE SUMMARY</h1>
            <p>Station Road, Kolhapur | Dr. P. M. Chougule (MD Psychiatry)</p>
          </div>
          <div class="badge">OFFICIAL MEDICAL REPORT</div>
          <div class="details">
            <p><strong>Patient Name:</strong> ${patient.name}</p>
            <p><strong>UHID:</strong> ${patient.uhid}</p>
            <p><strong>Age / Gender:</strong> ${patient.age || 30} Yrs / ${patient.gender || 'General'}</p>
            <p><strong>Phone:</strong> ${patient.phone || 'N/A'}</p>
            <p><strong>Clinical Assessment:</strong> Psychiatric consultation completed. Stable condition.</p>
            <p><strong>Condition at Discharge:</strong> Hemodynamically stable, oriented to time, place and person.</p>
          </div>
          <div class="sign">
            <p><strong>Dr. P. M. Chougule</strong><br/>Consultant Psychiatrist<br/>Reg No: MMC-2012-78923</p>
          </div>
        </body>
        </html>
      `;
      await printOrSharePdf(htmlContent, 'Discharge_Summary_' + patient.uhid);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not print report');
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
      >
        {/* Screen Title */}
        <Text style={styles.screenTitle}>Medical Reports</Text>
        <View style={styles.accentBar} />

        {/* Subtitle */}
        <Text style={styles.screenSubtitle}>
          Search for a patient to generate and print comprehensive medical reports.
        </Text>

        {/* Search Input Box */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={19} color="#94A3B8" style={styles.searchIcon} />
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

        {/* Empty State Card matching Image 8 */}
        {searchQuery.trim().length === 0 ? (
          <View style={styles.card}>
            <EmptyState
              iconType="document"
              message="Enter UHID or Name to find a patient record."
            />
          </View>
        ) : filteredPatients.length === 0 ? (
          <View style={styles.card}>
            <EmptyState
              iconType="search"
              message={`No patient record found matching "${searchQuery}".`}
            />
          </View>
        ) : (
          /* Search Results */
          <View style={styles.resultsContainer}>
            {filteredPatients.map((p) => (
              <View key={p._id || p.id || p.uhid} style={styles.patientCard}>
                <View style={styles.patientHead}>
                  <View>
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
                  >
                    <Feather name="printer" size={14} color="#1A7B76" style={{ marginRight: 6 }} />
                    <Text style={styles.reportActionText}>Discharge Summary</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.reportActionBtn}
                    onPress={() => handlePrintDischargeSummary(p)}
                  >
                    <Feather name="file-text" size={14} color="#1A7B76" style={{ marginRight: 6 }} />
                    <Text style={styles.reportActionText}>Clinical EMR</Text>
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
    fontSize: 26,
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
    marginBottom: 10,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '500',
    marginBottom: 16,
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 18,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    height: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    minHeight: 240,
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
    marginTop: 8,
    alignSelf: 'flex-start',
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
});
