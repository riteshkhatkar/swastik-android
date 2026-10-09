// swastik-android/screens/receptionist/SearchUHIDScreen.tsx
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
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { receptionistApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { printOrSharePdf } from '../../utils/pdfGenerator';

interface SearchUHIDScreenProps {
  onOpenDrawer: () => void;
}

export const SearchUHIDScreen: React.FC<SearchUHIDScreenProps> = ({ onOpenDrawer }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const receptionistName = user?.full_name || 'Priya Sharma';

  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    receptionistApi
      .getPatients()
      .then((data) => {
        if (Array.isArray(data)) {
          setPatients(data);
        }
      })
      .catch((e) => {
        console.warn('Error fetching patients in SearchUHID:', e);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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
      >
        {/* Title Section with Centered Icon Box matching Image 11 */}
        <View style={styles.headerInfoSection}>
          <View style={styles.portalIconBox}>
            <Feather name="search" size={28} color="#0D9488" />
          </View>
          <Text style={styles.mainTitle}>Patient Portal Search</Text>
          <Text style={styles.subTitle}>
            Find patients and open their portal access records.
          </Text>
        </View>

        {/* Search Bar + Filter Button matching Image 11 */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by UHID, Name or Mobile Number"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
            <Feather name="filter" size={18} color="#0D9488" />
          </TouchableOpacity>
        </View>

        {/* Patient Cards List matching Image 11 */}
        <View style={styles.cardsList}>
          {filteredPatients.map((item) => {
            const isActive = item.portalStatus === 'Active';
            const isPending = item.portalStatus === 'Pending Access';

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.patientPortalCard}
                onPress={() => setSelectedPatient(item)}
                activeOpacity={0.75}
              >
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={20} color="#0D9488" />
                </View>

                <View style={styles.infoCol}>
                  <Text style={styles.patientName}>{item.name}</Text>
                  <Text style={styles.uhidText}>UHID: {item.uhid}</Text>
                  <Text style={styles.phoneText}>{item.phone}</Text>
                </View>

                {/* Status Pill Badge */}
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <View
                    style={[
                      styles.statusBadge,
                      isActive && styles.statusBadgeActive,
                      isPending && styles.statusBadgePending,
                      !isActive && !isPending && styles.statusBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isActive && styles.statusBadgeTextActive,
                        isPending && styles.statusBadgeTextPending,
                        !isActive && !isPending && styles.statusBadgeTextInactive,
                      ]}
                    >
                      {item.portalStatus}
                    </Text>
                  </View>

                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Portal Record Modal */}
      <Modal
        visible={!!selectedPatient}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPatient(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Portal Credentials</Text>
              <TouchableOpacity onPress={() => setSelectedPatient(null)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedPatient && (
              <View style={styles.modalBody}>
                <View style={styles.credentialsBox}>
                  <Text style={styles.credLabel}>Patient Name</Text>
                  <Text style={styles.credValue}>{selectedPatient.name}</Text>

                  <Text style={[styles.credLabel, { marginTop: 10 }]}>UHID Portal Login</Text>
                  <Text style={styles.credCode}>{selectedPatient.uhid}</Text>

                  <Text style={[styles.credLabel, { marginTop: 10 }]}>Portal Access Status</Text>
                  <Text style={styles.credValue}>{selectedPatient.portalStatus}</Text>
                </View>

                <TouchableOpacity
                  style={styles.generateCardBtn}
                  onPress={async () => {
                    try {
                      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Digital UHID Card - ${selectedPatient.uhid}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 30px; display: flex; justify-content: center; }
    .card { width: 380px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 2px solid #0D9488; background: #FFF; }
    .card-header { background: #0D9488; color: #FFF; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
    .card-header h2 { margin: 0; font-size: 18px; font-weight: 800; }
    .card-header p { margin: 2px 0 0 0; font-size: 10px; color: #CCFBF1; }
    .badge { background: #0F766E; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
    .card-body { padding: 18px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .lbl { color: #64748B; font-weight: 600; }
    .val { color: #0F172A; font-weight: 800; }
    .uhid-box { background: #F0FDFA; border: 1px dashed #0D9488; border-radius: 8px; padding: 10px; text-align: center; margin: 12px 0; }
    .uhid-num { font-size: 16px; font-weight: 900; color: #0F766E; letter-spacing: 1px; }
    .card-footer { background: #F8FAFC; padding: 10px 16px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-header">
      <div>
        <h2>SWASTIK HOSPITAL</h2>
        <p>Digital Patient Identity Card</p>
      </div>
      <div class="badge">ACTIVE</div>
    </div>
    <div class="card-body">
      <div class="uhid-box">
        <div style="font-size: 10px; color: #64748B;">UNIQUE HEALTH IDENTIFIER</div>
        <div class="uhid-num">${selectedPatient.uhid}</div>
      </div>
      <div class="info-row">
        <span class="lbl">Patient Name:</span>
        <span class="val">${selectedPatient.name}</span>
      </div>
      <div class="info-row">
        <span class="lbl">Age / Gender:</span>
        <span class="val">${selectedPatient.age || 30} Yrs / ${selectedPatient.gender || 'General'}</span>
      </div>
      <div class="info-row">
        <span class="lbl">Emergency Contact:</span>
        <span class="val">${selectedPatient.phone || '+91 98765 43210'}</span>
      </div>
      <div class="info-row">
        <span class="lbl">Portal Access Status:</span>
        <span class="val" style="color: #059669;">Verified Active</span>
      </div>
    </div>
    <div class="card-footer">
      Please present this digital card at the hospital counter or scan at the kiosk.<br/>
      24/7 Helpline: +91 73856 60739 · Kolhapur, Maharashtra
    </div>
  </div>
</body>
</html>
                      `;
                      await printOrSharePdf(html, `UHID_Card_${selectedPatient.uhid}`);
                      setSelectedPatient(null);
                    } catch (err: any) {
                      Alert.alert('Card Error', err?.message || 'Could not generate UHID card.');
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Feather name="download" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.generateCardBtnText}>Generate Digital UHID Card (PDF)</Text>
                </TouchableOpacity>
              </View>
            )}
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
  headerInfoSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  portalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
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
    textAlign: 'center',
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
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7EBE6',
  },
  cardsList: {
    gap: 10,
  },
  patientPortalCard: {
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
  infoCol: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  uhidText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  phoneText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  statusBadgeActive: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeTextActive: {
    color: '#059669',
  },
  statusBadgeTextPending: {
    color: '#D97706',
  },
  statusBadgeTextInactive: {
    color: '#DC2626',
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
    gap: 14,
  },
  credentialsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
  },
  credLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  credValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  credCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D9488',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  generateCardBtn: {
    backgroundColor: '#0D9488',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateCardBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
