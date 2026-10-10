// swastik-android/screens/DoctorWorkstationScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { MetricCard } from '../components/MetricCard';
import { EmptyState } from '../components/EmptyState';
import { DoctorScreenKey } from '../components/NavigationDrawer';
import {
  appointmentApi,
  patientApi,
  tokenService,
  clinicalService,
  emrService,
  admissionApi,
  roomApi,
  getApiErrorMessage,
} from '../services/api';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

interface DoctorWorkstationScreenProps {
  onOpenDrawer: () => void;
  onNavigate: (screen: DoctorScreenKey, patientData?: any) => void;
}

export const DoctorWorkstationScreen: React.FC<DoctorWorkstationScreenProps> = ({
  onOpenDrawer,
  onNavigate,
}) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'opd' | 'ipd'>('opd');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [inpatients, setInpatients] = useState<any[]>([]);
  const [roomStats, setRoomStats] = useState({ totalBeds: 0, occupiedBeds: 0, availableBeds: 0 });
  const [stats, setStats] = useState({
    todayAppointments: 0,
    highRiskPatients: 0,
    pendingFollowUps: 0,
  });

  const doctorId = user?.id || 'dr_chougule';
  const doctorName = user?.full_name || 'Dr. P. M. Chougule';

  useEffect(() => {
    loadWorkstationData();
  }, [activeTab]);

  const loadWorkstationData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'opd') {
        const [apts, todayTokens, sessions] = await Promise.all([
          appointmentApi.getAppointments().catch(() => []),
          tokenService.getTokensToday().catch(() => []),
          clinicalService.getActiveSessions().catch(() => []),
        ]);

        if (Array.isArray(apts)) {
          setAppointments(apts);
          setStats({
            todayAppointments: apts.length,
            highRiskPatients: apts.filter(
              (a) => (a.priority || '').toLowerCase() === 'urgent' || (a.priority || '').toLowerCase() === 'high' || (a.notes || '').toLowerCase().includes('high risk')
            ).length,
            pendingFollowUps: apts.filter(
              (a) => (a.type || '').toLowerCase() === 'follow-up' || a.status === 'scheduled'
            ).length,
          });
        }
        if (Array.isArray(todayTokens)) {
          setTokens(todayTokens.sort((a, b) => (a.token_number || 0) - (b.token_number || 0)));
        }
        if (Array.isArray(sessions)) {
          setActiveSessions(sessions);
        }
      } else {
        const [admissions, rooms] = await Promise.all([
          admissionApi.getAdmissions().catch(() => []),
          roomApi.getRooms().catch(() => []),
        ]);

        const activeAdmissions = Array.isArray(admissions)
          ? admissions.filter((a) => a.status !== 'discharged')
          : [];
        setInpatients(activeAdmissions);

        const total = Array.isArray(rooms)
          ? rooms.reduce((acc, r) => acc + (r.bed_count || 1), 0)
          : 0;
        const occupied = activeAdmissions.length;
        setRoomStats({
          totalBeds: total || Math.max(occupied + 5, 20),
          occupiedBeds: occupied,
          availableBeds: Math.max((total || Math.max(occupied + 5, 20)) - occupied, 0),
        });
      }
    } catch (err) {
      console.log('Error fetching live workstation data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkstationData();
  };

  const handleUpdateTokenStatus = async (tokenId: string, status: string) => {
    try {
      await tokenService.updateTokenStatus(tokenId, status);
      loadWorkstationData();
    } catch (err: any) {
      Alert.alert('Status Update Failed', getApiErrorMessage(err));
    }
  };

  const openPatientEmr = async (patient: any) => {
    const uhid = patient.uhid || patient.patient_id || patient.id;
    if (!uhid) {
      Alert.alert('Missing Context', 'Patient UHID is required to open EMR.');
      return;
    }

    // Check active session lock
    const activeLock = activeSessions.find(
      (s) => s.patient_id === uhid || s.uhid === uhid
    );
    if (activeLock && String(activeLock.doctor_id) !== String(doctorId)) {
      Alert.alert(
        'Patient Record Locked',
        `Access restricted: This patient is currently being consulted by ${activeLock.doctor_name || 'another doctor'}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Override & Open',
            onPress: () => proceedOpenEmr(patient, uhid),
          },
        ]
      );
      return;
    }

    await proceedOpenEmr(patient, uhid);
  };

  const proceedOpenEmr = async (patient: any, uhid: string) => {
    try {
      // 1. Start active session locking
      clinicalService.startSession(uhid).catch(() => null);

      // 2. Resolve active admission context (EMR requirement)
      const pName = patient.name || patient.patient_name || patient.patientName || 'Patient';
      let admissionId = patient.admission_id || patient.admissionId;
      if (!admissionId) {
        admissionId = await emrService.resolveActiveAdmission(uhid, pName, doctorName);
      }

      // 3. Navigate to NewConsultation with guaranteed context
      onNavigate('NewConsultation', {
        name: pName,
        uhid: uhid,
        age: patient.age || 30,
        gender: patient.gender || 'General',
        admission_id: admissionId,
        admissionId: admissionId,
        token_number: patient.token_number,
      });
    } catch (err: any) {
      Alert.alert('EMR Access Error', getApiErrorMessage(err));
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Header with Hamburger and Swastik Logo */}
      <AppHeader onOpenDrawer={onOpenDrawer} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        {/* Title and OPD/IPD toggle row */}
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.screenTitle}>Doctor Workstation</Text>
            <Text style={styles.screenSub}>
              {activeTab === 'opd'
                ? 'Outpatient queue, appointments & psychiatric EMR'
                : 'Inpatient ward rounds & active admissions'}
            </Text>
          </View>

          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'opd' && styles.toggleBtnActive]}
              activeOpacity={0.7}
              onPress={() => setActiveTab('opd')}
            >
              <Text
                style={[
                  styles.toggleText,
                  activeTab === 'opd' && styles.toggleTextActive,
                ]}
              >
                OPD Clinic
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'ipd' && styles.toggleBtnActive]}
              activeOpacity={0.7}
              onPress={() => setActiveTab('ipd')}
            >
              <Text
                style={[
                  styles.toggleText,
                  activeTab === 'ipd' && styles.toggleTextActive,
                ]}
              >
                Ward Rounds (IPD)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'opd' ? (
          <>
            {/* 3 Metric Cards Row */}
            <View style={styles.metricsRow}>
              <MetricCard
                label="Today's Appts"
                value={stats.todayAppointments}
                iconName="calendar"
              />
              <MetricCard
                label="High Risk Patients"
                value={stats.highRiskPatients}
                iconName="alert-triangle"
              />
              <MetricCard
                label="Pending Follow-ups"
                value={stats.pendingFollowUps}
                iconName="clock"
              />
            </View>

            {/* Today's Queue Tokens Section */}
            <View style={styles.scheduleCard}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 }}>
                  <MaterialCommunityIcons name="ticket-confirmation" size={18} color="#0D9488" />
                  <Text style={styles.cardHeaderTitle} numberOfLines={1}>Live Queue Tokens Today</Text>
                </View>
                <View style={styles.tokenCountBadge}>
                  <Text style={styles.tokenCountText}>{tokens.length} In Queue</Text>
                </View>
              </View>

              {tokens.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Feather name="user-check" size={28} color="#94A3B8" />
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
                    No queue tokens active right now.
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {tokens.map((tok) => {
                      const isWaiting = tok.status === 'WAITING' || tok.status === 'waiting';
                      const inConsult = tok.status === 'IN_CONSULTATION' || tok.status === 'in_consultation';
                      const isDone = tok.status === 'COMPLETED' || tok.status === 'completed';

                      return (
                        <View key={tok._id || tok.id || tok.token_number} style={styles.tokenCard}>
                          <View style={styles.tokenTopRow}>
                            <View style={styles.tokenNumberCircle}>
                              <Text style={styles.tokenNumberText}>#{tok.token_number}</Text>
                            </View>
                            <View
                              style={[
                                styles.tokenStatusBadge,
                                inConsult && styles.tokenStatusInConsult,
                                isDone && styles.tokenStatusDone,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.tokenStatusText,
                                  inConsult && { color: '#0284C7' },
                                  isDone && { color: '#059669' },
                                ]}
                              >
                                {tok.status || 'WAITING'}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.tokenPatientName} numberOfLines={1}>
                            {tok.patient_name || 'Patient'}
                          </Text>
                          <Text style={styles.tokenPatientUhid}>UHID: {tok.patient_id || '—'}</Text>

                          <View style={styles.tokenActionRow}>
                            {isWaiting && (
                              <TouchableOpacity
                                style={styles.callInBtn}
                                onPress={() => handleUpdateTokenStatus(tok._id || tok.id, 'IN_CONSULTATION')}
                              >
                                <Feather name="volume-2" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                                <Text style={styles.callInBtnText}>Call In</Text>
                              </TouchableOpacity>
                            )}
                            {inConsult && (
                              <TouchableOpacity
                                style={styles.completeTokenBtn}
                                onPress={() => handleUpdateTokenStatus(tok._id || tok.id, 'COMPLETED')}
                              >
                                <Feather name="check" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                                <Text style={styles.completeTokenBtnText}>Complete</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={styles.openEmrMiniBtn}
                              onPress={() =>
                                openPatientEmr({
                                  name: tok.patient_name,
                                  uhid: tok.patient_id,
                                  token_number: tok.token_number,
                                })
                              }
                            >
                              <Text style={styles.openEmrMiniText}>Open EMR</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Today's Appointment Schedule Card */}
            <View style={[styles.scheduleCard, { marginTop: 16 }]}>
              <Text style={styles.cardHeaderTitle}>Today's Appointment Schedule</Text>

              {/* Table Container */}
              <View style={styles.tableWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.tableInner}>
                    {/* Table Header Row */}
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.thText, { width: 85 }]}>TIME</Text>
                      <Text style={[styles.thText, { width: 150 }]}>PATIENT</Text>
                      <Text style={[styles.thText, { width: 130 }]}>UHID</Text>
                      <Text style={[styles.thText, { width: 110 }]}>TYPE</Text>
                      <Text style={[styles.thText, { width: 100 }]}>RISK / SESSION</Text>
                      <Text style={[styles.thText, { width: 100 }]}>ACTION</Text>
                    </View>

                    {/* Table Body or Empty State */}
                    {loading && !refreshing ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#1A7B76" />
                      </View>
                    ) : appointments.length === 0 ? (
                      <View style={{ width: Math.max(width - 48, 675) }}>
                        <EmptyState
                          iconType="calendar"
                          message="No appointments scheduled for today."
                        />
                      </View>
                    ) : (
                      appointments.map((apt, index) => {
                        const uhid = apt.uhid || apt.patient_id || '—';
                        const isLocked = activeSessions.some(
                          (s) => s.patient_id === uhid || s.uhid === uhid
                        );

                        return (
                          <View key={apt._id || apt.id || index} style={styles.tableRow}>
                            <Text style={[styles.tdText, { width: 85, fontWeight: '600' }]}>
                              {apt.appointment_time || apt.time || '09:30 AM'}
                            </Text>
                            <Text style={[styles.tdBold, { width: 150 }]} numberOfLines={1}>
                              {apt.patient_name || apt.patientName || 'Patient'}
                            </Text>
                            <Text style={[styles.tdText, { width: 130 }]} numberOfLines={1}>
                              {uhid}
                            </Text>
                            <Text style={[styles.tdText, { width: 110 }]} numberOfLines={1}>
                              {apt.type || 'Consultation'}
                            </Text>
                            <View style={{ width: 100 }}>
                              {isLocked ? (
                                <View style={styles.sessionLockedBadge}>
                                  <Feather name="lock" size={10} color="#B45309" style={{ marginRight: 3 }} />
                                  <Text style={styles.sessionLockedText}>In Session</Text>
                                </View>
                              ) : (
                                <View style={styles.normalRiskBadge}>
                                  <Text style={styles.normalRiskText}>Normal</Text>
                                </View>
                              )}
                            </View>
                            <View style={{ width: 100 }}>
                              <TouchableOpacity
                                style={styles.openBtn}
                                activeOpacity={0.8}
                                onPress={() =>
                                  openPatientEmr({
                                    name: apt.patient_name || apt.patientName,
                                    uhid: apt.uhid || apt.patient_id,
                                    age: apt.age || 30,
                                    gender: apt.gender || 'General',
                                  })
                                }
                              >
                                <Text style={styles.openBtnText}>Open EMR</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </ScrollView>
              </View>
            </View>
          </>
        ) : (
          /* IPD Ward Rounds View */
          <>
            <View style={styles.occupancyRow}>
              <View style={styles.occupancyCard}>
                <Text style={styles.occupancyLabel}>TOTAL BEDS</Text>
                <Text style={styles.occupancyVal}>{roomStats.totalBeds}</Text>
              </View>
              <View style={styles.occupancyCard}>
                <Text style={styles.occupancyLabel}>OCCUPIED</Text>
                <Text style={[styles.occupancyVal, { color: '#0D9488' }]}>{roomStats.occupiedBeds}</Text>
              </View>
              <View style={styles.occupancyCard}>
                <Text style={styles.occupancyLabel}>AVAILABLE</Text>
                <Text style={[styles.occupancyVal, { color: '#059669' }]}>{roomStats.availableBeds}</Text>
              </View>
            </View>

            <View style={styles.scheduleCard}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="bed" size={20} color="#0D9488" />
                  <Text style={styles.cardHeaderTitle}>Inpatient Ward Census</Text>
                </View>
                <TouchableOpacity
                  style={styles.wardFullBtn}
                  onPress={() => onNavigate('WardRounds')}
                >
                  <Text style={styles.wardFullBtnText}>Ward Rounds Screen</Text>
                  <Feather name="arrow-right" size={14} color="#0D9488" />
                </TouchableOpacity>
              </View>

              {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#1A7B76" />
                </View>
              ) : inpatients.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <MaterialCommunityIcons name="bed-empty" size={36} color="#94A3B8" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginTop: 8 }}>
                    No Inpatients Admitted
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                    Admitted patients under your care will appear here.
                  </Text>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 10 }}>
                  {inpatients.map((adm, idx) => {
                    const uhid = adm.uhid || adm.patient_uhid;
                    const pName = adm.patient_name || adm.name || 'Admitted Patient';
                    const roomNumber = adm.room_number ? `Room ${adm.room_number}` : adm.bed ? `Bed ${adm.bed}` : 'Inpatient Ward';
                    const diagnosis = adm.diagnosis || adm.provisional_diagnosis || 'Clinical Observation';

                    return (
                      <View key={adm.admission_id || adm._id || idx} style={styles.inpatientItem}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={styles.inpatientRoomBadge}>
                              <Text style={styles.inpatientRoomText}>{roomNumber}</Text>
                            </View>
                            <Text style={styles.inpatientName}>{pName}</Text>
                          </View>
                          <Text style={styles.inpatientMeta}>
                            UHID: {uhid} | Adm ID: {adm.admission_id || 'ADM'}
                          </Text>
                          <Text style={styles.inpatientDiagnosis}>
                            Dx: <Text style={{ color: '#1E293B', fontWeight: '600' }}>{diagnosis}</Text>
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.openInpatientEmrBtn}
                          onPress={() =>
                            openPatientEmr({
                              name: pName,
                              uhid: uhid,
                              admission_id: adm.admission_id,
                            })
                          }
                        >
                          <Feather name="file-text" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.openInpatientEmrText}>Inpatient EMR</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F1E36',
  },
  screenSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1A7B76',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#1A7B76',
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    paddingTop: 14,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1E36',
  },
  tokenCountBadge: {
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexShrink: 0,
  },
  tokenCountText: {
    fontSize: 11,
    color: '#0D9488',
    fontWeight: '700',
  },
  tokenCard: {
    width: 175,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  tokenTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tokenNumberCircle: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tokenNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  tokenStatusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tokenStatusInConsult: {
    backgroundColor: '#E0F2FE',
  },
  tokenStatusDone: {
    backgroundColor: '#D1FAE5',
  },
  tokenStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
    textTransform: 'uppercase',
  },
  tokenPatientName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  tokenPatientUhid: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  tokenActionRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  callInBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0D9488',
    borderRadius: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callInBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  completeTokenBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeTokenBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  openEmrMiniBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0D9488',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openEmrMiniText: {
    color: '#0D9488',
    fontSize: 10,
    fontWeight: '700',
  },
  tableWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tableInner: {
    minWidth: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  tdText: {
    fontSize: 12,
    color: '#475569',
  },
  tdBold: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  normalRiskBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  normalRiskText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
  },
  sessionLockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sessionLockedText: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '700',
  },
  openBtn: {
    backgroundColor: '#1A7B76',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
  },
  openBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  occupancyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  occupancyCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  wardFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wardFullBtnText: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: '600',
  },
  inpatientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inpatientRoomBadge: {
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inpatientRoomText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D9488',
  },
  inpatientName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  inpatientMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  inpatientDiagnosis: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  openInpatientEmrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  openInpatientEmrText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
