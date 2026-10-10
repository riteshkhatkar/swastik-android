// swastik-android/screens/receptionist/PatientDirectoryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { receptionistApi, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface PatientDirectoryScreenProps {
  onOpenDrawer: () => void;
  onSelectPatient?: (patient: any) => void;
}

export const PatientDirectoryScreen: React.FC<PatientDirectoryScreenProps> = ({
  onOpenDrawer,
  onSelectPatient,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const receptionistName = user?.full_name || 'Priya Sharma';

  const PAGE_SIZE = 20;
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Bulk CSV Import state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

  const loadPatients = async (targetPage: number = 0) => {
    try {
      setLoading(true);
      const skip = targetPage * PAGE_SIZE;
      const data = await receptionistApi.getPatients(skip, PAGE_SIZE, searchQuery || undefined);
      const list = Array.isArray(data) ? data : [];
      setPatients(list);
      setPage(targetPage);
      setHasMore(list.length === PAGE_SIZE);
    } catch (e: any) {
      console.warn('Error loading patients:', e);
      Alert.alert('Load Error', getApiErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPatients(0);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPatients(0);
  };

  const handleNextPage = () => {
    if (hasMore) {
      loadPatients(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      loadPatients(page - 1);
    }
  };

  const handleBulkImport = async () => {
    if (!csvText.trim()) {
      Alert.alert('Validation Error', 'Please paste or enter CSV data to import.');
      return;
    }

    try {
      setImporting(true);
      // Split into non-empty lines
      const lines = csvText.trim().split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        Alert.alert('Empty CSV', 'No data rows found in CSV text.');
        return;
      }

      // Check if first row is header
      let startIdx = 0;
      if (lines[0].toLowerCase().includes('name') && lines[0].toLowerCase().includes('phone')) {
        startIdx = 1;
      }

      const patientsToImport: any[] = [];
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length < 2) continue;
        const [name, ageStr, gender, phone, address, email] = parts;
        if (!name) continue;

        patientsToImport.push({
          name,
          age: parseInt(ageStr, 10) || undefined,
          gender: gender || 'Other',
          phone: phone || '',
          address: address || undefined,
          email: email || undefined,
        });
      }

      if (patientsToImport.length === 0) {
        Alert.alert('Invalid CSV', 'Could not parse any valid patient rows from CSV.');
        return;
      }

      const res = await receptionistApi.bulkImportPatients(patientsToImport);
      setShowBulkModal(false);
      setCsvText('');
      Alert.alert(
        'Import Successful ✅',
        `Successfully imported ${res?.imported_count || patientsToImport.length} patients into central hospital records.`
      );
      loadPatients(0);
    } catch (err: any) {
      Alert.alert('Bulk Import Failed', getApiErrorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.uhid || '').toLowerCase().includes(q) ||
      (p.phone || '').includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* Global Header */}
      <View
        style={[
          styles.headerContainer,
          { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 20) },
        ]}
      >

        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={onOpenDrawer}
            style={styles.hamburgerButton}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={26} color="#1E293B" />
          </TouchableOpacity>

          <Image
            source={require('../../assets/swastik_brand_header_transparent.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />

          <View style={styles.profilePill}>
            <View style={styles.profileAvatarMini}>
              <Ionicons name="person" size={14} color="#0D9488" />
            </View>
            <View>
              <Text style={styles.profilePillName} numberOfLines={1}>
                {receptionistName}
              </Text>
              <Text style={styles.profilePillRole}>Receptionist</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
        }
      >
        {/* Title & Subtitle with Import CSV action */}
        <View style={styles.titleSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mainTitle}>Patient Directory</Text>
              <Text style={styles.subTitle}>Search and view patient records.</Text>
            </View>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#0D9488',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}
              onPress={() => setShowBulkModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="upload" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>Import CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar & Filter Button matching Image 9 */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, UHID or mobile number"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => loadPatients(0)}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => { setSearchQuery(''); loadPatients(0); }}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => loadPatients(0)}
            activeOpacity={0.8}
          >
            <Feather name="filter" size={18} color="#0D9488" />
            <Text style={styles.filterBtnText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Patient Cards List matching Image 9 */}
        <View style={styles.patientList}>
          {filteredPatients.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, marginHorizontal: 16 }}>
              <Feather name="users" size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 14, color: '#64748B' }}>No patient records found</Text>
            </View>
          ) : (
            filteredPatients.map((patient) => (
              <TouchableOpacity
                key={patient.id || patient.uhid}
                style={styles.patientCard}
                onPress={() => setSelectedPatient(patient)}
                activeOpacity={0.75}
              >
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={20} color="#0D9488" />
                </View>

                <View style={styles.patientInfo}>
                  <Text style={styles.patientName} numberOfLines={1}>
                    {patient.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.uhidText}>UHID: {patient.uhid}</Text>
                    <Text style={styles.dividerDot}>|</Text>
                    <Text style={styles.phoneText}>📞 {patient.phone}</Text>
                  </View>
                </View>

                <Feather name="chevron-right" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Pagination Bar */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: page > 0 ? '#FFFFFF' : '#F1F5F9',
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
            disabled={page === 0}
            onPress={handlePrevPage}
          >
            <Feather name="chevron-left" size={16} color={page > 0 ? '#1E293B' : '#94A3B8'} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: page > 0 ? '#1E293B' : '#94A3B8', marginLeft: 4 }}>
              Previous
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B' }}>
            Page {page + 1}
          </Text>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: hasMore ? '#FFFFFF' : '#F1F5F9',
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
            disabled={!hasMore}
            onPress={handleNextPage}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: hasMore ? '#1E293B' : '#94A3B8', marginRight: 4 }}>
              Next
            </Text>
            <Feather name="chevron-right" size={16} color={hasMore ? '#1E293B' : '#94A3B8'} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Patient Detail Modal */}
      <Modal
        visible={!!selectedPatient}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPatient(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Patient Record</Text>
              <TouchableOpacity onPress={() => setSelectedPatient(null)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedPatient && (
              <View style={styles.modalBody}>
                <View style={styles.patientHeaderCard}>
                  <View style={styles.avatarBig}>
                    <Ionicons name="person" size={28} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientBigName}>{selectedPatient.name}</Text>
                    <Text style={styles.uhidBigText}>UHID: {selectedPatient.uhid}</Text>
                    <Text style={styles.patientMetaText}>
                      {selectedPatient.gender || 'Male'} • {selectedPatient.age || 32} Years
                    </Text>
                  </View>
                </View>

                <View style={styles.detailList}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mobile Number</Text>
                    <Text style={styles.detailValue}>{selectedPatient.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location / City</Text>
                    <Text style={styles.detailValue}>
                      {selectedPatient.city || 'Kolhapur'}, Maharashtra
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Registration Date</Text>
                    <Text style={styles.detailValue}>
                      {selectedPatient.regDate || '15 May 2026'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Clinical Category</Text>
                    <Text style={styles.detailValue}>General / Psychiatry</Text>
                  </View>
                </View>

                {/* Call Button */}
                <TouchableOpacity
                  style={styles.modalCallBtn}
                  onPress={() => {
                    const clean = (selectedPatient.phone || '').replace(/[^0-9+]/g, '');
                    Linking.openURL(`tel:${clean}`);
                  }}
                  activeOpacity={0.85}
                >
                  <Feather name="phone" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.modalCallBtnText}>Call Patient ({selectedPatient.phone})</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Bulk CSV Import Modal */}
      <Modal
        visible={showBulkModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !importing && setShowBulkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Bulk Import Patients</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  CSV Format: Name, Age, Gender, Phone, Address, Email
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => !importing && setShowBulkModal(false)}
                disabled={importing}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                  Paste CSV Text
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setCsvText(
                      'Name, Age, Gender, Phone, Address, Email\n' +
                      'Rohan Patil, 28, Male, 9822011223, Rajarampuri Kolhapur, rohan@example.com\n' +
                      'Sneha Deshmukh, 34, Female, 9890123456, Tarabai Park Kolhapur, sneha@example.com\n' +
                      'Anil Kulkarni, 45, Male, 9422334455, Shahupuri Kolhapur, anil@example.com'
                    );
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0D9488' }}>
                    + Fill Sample CSV
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={{
                  height: 160,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  padding: 12,
                  fontSize: 12,
                  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                  textAlignVertical: 'top',
                }}
                value={csvText}
                onChangeText={setCsvText}
                placeholder="Name, Age, Gender, Phone, Address, Email..."
                placeholderTextColor="#94A3B8"
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.modalCallBtn, importing && { opacity: 0.7 }]}
                onPress={handleBulkImport}
                disabled={importing}
                activeOpacity={0.8}
              >
                {importing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Feather name="upload-cloud" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.modalCallBtnText}>Import Patients</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  stethoscopeBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 250,
    height: 72,
    opacity: 0.95,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    zIndex: 2,
  },
  hamburgerButton: {
    padding: 6,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogo: {
    width: 155,
    height: 42,
  },
  profilePill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileAvatarMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  profilePillName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  profilePillRole: {
    fontSize: 9,
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7EBE6',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
    marginLeft: 4,
  },
  patientList: {
    gap: 10,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  uhidText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  dividerDot: {
    color: '#CBD5E1',
    marginHorizontal: 6,
  },
  phoneText: {
    fontSize: 12,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalBody: {
    gap: 12,
  },
  patientHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    borderRadius: 14,
    padding: 12,
  },
  avatarBig: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientBigName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  uhidBigText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
    marginTop: 1,
  },
  patientMetaText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  detailList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalCallBtn: {
    backgroundColor: '#0D9488',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  modalCallBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
