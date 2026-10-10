// swastik-android/screens/WardRoundsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { AppHeader } from '../components/AppHeader';
import { roomApi, admissionApi, clinicalApi, getApiErrorMessage } from '../services/api';

const { width } = Dimensions.get('window');

interface WardRoundsScreenProps {
  onOpenDrawer: () => void;
  onOpenEMR?: (patient: any) => void;
}

export const WardRoundsScreen: React.FC<WardRoundsScreenProps> = ({
  onOpenDrawer,
  onOpenEMR,
}) => {
  const [selectedBed, setSelectedBed] = useState<string | null>(null);
  const [roundNotes, setRoundNotes] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomsData, admData] = await Promise.all([
        roomApi.getRooms().catch(() => []),
        admissionApi.getAdmissions().catch(() => []),
      ]);
      if (Array.isArray(roomsData)) setRooms(roomsData);
      if (Array.isArray(admData)) {
        setAdmissions(admData.filter((a) => a.status !== 'discharged'));
      }
    } catch (err) {
      console.log('Error loading ward data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const totalBeds = rooms.reduce((acc, r) => acc + (r.bed_count || 1), 0) || (rooms.length > 0 ? rooms.length : 88);
  const occupiedBeds = admissions.length > 0 ? admissions.length : rooms.filter((r) => r.status === 'Occupied').length;
  const availableBeds = Math.max(totalBeds - occupiedBeds, 0);

  const handleSaveNotes = async (patient: any) => {
    if (!roundNotes.trim()) {
      Alert.alert('Empty Notes', 'Please enter your clinical round observations.');
      return;
    }
    const uhid = patient.uhid || patient.patient_uhid;
    if (!uhid) {
      Alert.alert('Error', 'Patient UHID missing.');
      return;
    }
    try {
      setSaving(true);
      await clinicalApi.saveIPDProgressNote(uhid, {
        note: roundNotes.trim(),
        date: new Date().toISOString(),
        room: patient.room_number || patient.bed_number || 'Ward',
      });
      Alert.alert('Rounds Saved', `Clinical round note recorded in live database for ${patient.patient_name || patient.name}.`);
      setSelectedBed(null);
      setRoundNotes('');
    } catch (err: any) {
      Alert.alert('Save Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
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
        {/* Screen Title & Subtitle */}
        <Text style={styles.screenTitle}>Ward Rounds (IPD)</Text>
        <Text style={styles.screenSubtitle}>
          Inpatient ward monitoring, live room occupancy, and daily round records.
        </Text>

        {/* Occupancy Summary Row */}
        <View style={styles.occupancyRow}>
          <View style={styles.occupancyCard}>
            <Text style={styles.occupancyLabel}>TOTAL BEDS</Text>
            <Text style={styles.occupancyVal}>{totalBeds}</Text>
          </View>
          <View style={styles.occupancyCard}>
            <Text style={styles.occupancyLabel}>OCCUPIED</Text>
            <Text style={[styles.occupancyVal, { color: '#0D9488' }]}>{occupiedBeds}</Text>
          </View>
          <View style={styles.occupancyCard}>
            <Text style={styles.occupancyLabel}>AVAILABLE</Text>
            <Text style={[styles.occupancyVal, { color: '#065F46' }]}>{availableBeds}</Text>
          </View>
        </View>

        {/* Admitted Inpatients List */}
        <Text style={styles.sectionHeader}>Admitted Inpatients</Text>
        <View style={styles.listContainer}>
          {loading && !refreshing ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#0D9488" />
              <Text style={{ marginTop: 10, fontSize: 13, color: '#64748B' }}>Loading admitted patients...</Text>
            </View>
          ) : admissions.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12 }}>
              <MaterialCommunityIcons name="bed-empty" size={44} color="#94A3B8" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 10 }}>No Inpatients Admitted</Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>All inpatient beds are currently available.</Text>
            </View>
          ) : (
            admissions.map((patient: any, idx: number) => {
              const bedId = patient._id || patient.uhid || String(idx);
              const isEditing = selectedBed === bedId;
              const pName = patient.patient_name || patient.name || 'Admitted Patient';
              const pUhid = patient.uhid || patient.patient_uhid || '—';
              const pRoom = patient.room_number ? `Room ${patient.room_number}` : patient.bed_number ? `Bed ${patient.bed_number}` : 'Inpatient Ward';
              const pStatus = patient.status ? (patient.status.charAt(0).toUpperCase() + patient.status.slice(1)) : 'Admitted';
              const pDiag = patient.provisional_diagnosis || patient.diagnosis || 'Clinical Monitoring';

              return (
                <View key={bedId} style={styles.patientCard}>
                  {/* Bed and Status Row */}
                  <View style={styles.cardTop}>
                    <View style={styles.bedBadge}>
                      <MaterialCommunityIcons name="bed" size={15} color="#1A7B76" style={{ marginRight: 4 }} />
                      <Text style={styles.bedText}>{pRoom}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{pStatus}</Text>
                    </View>
                  </View>

                  {/* Patient Details */}
                  <Text style={styles.patientName}>{pName}</Text>
                  <Text style={styles.patientUhid}>
                    {pUhid} • {patient.gender || 'Patient'}
                  </Text>
                  <Text style={styles.diagnosisText}>
                    Diagnosis: <Text style={{ color: '#1E293B', fontWeight: '600' }}>{pDiag}</Text>
                  </Text>

                  {/* Round Note Input if selected */}
                  {isEditing ? (
                    <View style={styles.noteSection}>
                      <TextInput
                        style={styles.noteInput}
                        placeholder="Enter daily round observations, medications, plan..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        value={roundNotes}
                        onChangeText={setRoundNotes}
                      />
                      <View style={styles.noteActions}>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => setSelectedBed(null)}
                        >
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.saveNoteBtn}
                          onPress={() => handleSaveNotes(patient)}
                          disabled={saving}
                        >
                          <Text style={styles.saveNoteBtnText}>{saving ? 'Saving...' : 'Save Notes'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      <TouchableOpacity
                        style={styles.roundBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedBed(bedId);
                          setRoundNotes('');
                        }}
                      >
                        <Feather name="edit-3" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.roundBtnText}>Add Round Note</Text>
                      </TouchableOpacity>
                      {onOpenEMR && (
                        <TouchableOpacity
                          style={[styles.roundBtn, { backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#0D9488' }]}
                          activeOpacity={0.8}
                          onPress={() =>
                            onOpenEMR({
                              name: pName,
                              uhid: pUhid,
                              age: patient.age || 30,
                              gender: patient.gender || 'General',
                              admission_id: patient.admission_id || patient.id || patient._id,
                            })
                          }
                        >
                          <Feather name="folder" size={14} color="#0D9488" style={{ marginRight: 6 }} />
                          <Text style={[styles.roundBtnText, { color: '#0D9488' }]}>Open EMR</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
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
  occupancyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  occupancyCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  occupancyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  occupancyVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  listContainer: {
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
    shadowRadius: 5,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A7B76',
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  patientUhid: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  diagnosisText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  vitalsBox: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  vitalsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  roundBtn: {
    backgroundColor: '#1A7B76',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  roundBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  noteSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    fontSize: 12,
    color: '#1E293B',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  saveNoteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1A7B76',
  },
  saveNoteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
