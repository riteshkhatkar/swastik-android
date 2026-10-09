// swastik-android/screens/billing/PatientsBillingScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { RazorpayModal } from '../../components/RazorpayModal';
import { billingApi, getApiErrorMessage } from '../../services/api';

interface PatientsBillingScreenProps {
  onOpenDrawer: () => void;
  onNavigateToInvoices: (patientUhid?: string) => void;
}

interface PatientBillingItem {
  id: string;
  billId: string;
  name: string;
  uhid: string;
  billed: number;
  paid: number;
  outstanding: number;
}

export const PatientsBillingScreen: React.FC<PatientsBillingScreenProps> = ({
  onOpenDrawer,
  onNavigateToInvoices,
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'outstanding' | 'cleared'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patientsData, setPatientsData] = useState<PatientBillingItem[]>([]);
  const [selectedCollectPatient, setSelectedCollectPatient] = useState<any>(null);

  const fetchPatientBilling = useCallback(async () => {
    try {
      const bills = await billingApi.getBills(0, 100);
      const map: { [uhid: string]: PatientBillingItem } = {};

      (bills || []).forEach((bill: any, idx: number) => {
        const uhid = bill.uhid || (bill.patient_info?.uhid) || `SWH-PAT-${idx + 1}`;
        const name = bill.patient_name || bill.patientName || bill.patient_info?.name || 'Patient';
        const total = Number(bill.total || bill.amount || 0);

        let paid = 0;
        if (Array.isArray(bill.payments) && bill.payments.length > 0) {
          paid = bill.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        } else if (String(bill.status).toUpperCase() === 'PAID') {
          paid = total;
        }

        const due = bill.due_amount !== undefined ? Number(bill.due_amount) : Math.max(0, total - paid);
        const billDbId = String(bill.id || bill._id || '');

        if (!map[uhid]) {
          map[uhid] = {
            id: uhid,
            billId: billDbId,
            name,
            uhid,
            billed: total,
            paid,
            outstanding: due,
          };
        } else {
          map[uhid].billed += total;
          map[uhid].paid += paid;
          map[uhid].outstanding += due;
          // Keep the unpaid billId if this current one has due amount
          if (due > 0 && billDbId) {
            map[uhid].billId = billDbId;
          }
        }
      });

      setPatientsData(Object.values(map));
    } catch (err) {
      console.error('Failed to load patient billing records:', err);
      Alert.alert('Billing Records Error', getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPatientBilling();
  }, [fetchPatientBilling]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPatientBilling();
  };

  const filteredPatients = patientsData.filter((p) => {
    if (activeTab === 'outstanding' && p.outstanding <= 0) return false;
    if (activeTab === 'cleared' && p.outstanding > 0) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.uhid.toLowerCase().includes(q);
  });

  const countOutstanding = patientsData.filter((p) => p.outstanding > 0).length;
  const countCleared = patientsData.filter((p) => p.outstanding === 0).length;

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F766E']} />}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Patients</Text>
          <Text style={styles.subTitle}>Live patient billing ledgers and payment collections.</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient name or UHID..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={16} color="#0F766E" />
            <Text style={styles.filterBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs Row */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'all' && styles.tabBtnTextActive]}>
              All ({patientsData.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'outstanding' && styles.tabBtnActive]}
            onPress={() => setActiveTab('outstanding')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'outstanding' && styles.tabBtnTextActive]}>
              Outstanding ({countOutstanding})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'cleared' && styles.tabBtnActive]}
            onPress={() => setActiveTab('cleared')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'cleared' && styles.tabBtnTextActive]}>
              Cleared ({countCleared})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Patients Table Card */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Loading billing records...</Text>
          </View>
        ) : filteredPatients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Patient Accounts Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'No accounts match the current filter.' : 'Generate a new invoice to record patient billing history.'}
            </Text>
            <TouchableOpacity style={styles.emptyRefreshBtn} onPress={onRefresh}>
              <Text style={styles.emptyRefreshBtnText}>Reload Accounts</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { flex: 1.8 }]}>PATIENT</Text>
              <Text style={[styles.thText, { flex: 1.1 }]}>TOTAL BILLED</Text>
              <Text style={[styles.thText, { flex: 1.1 }]}>TOTAL PAID</Text>
              <Text style={[styles.thText, { flex: 1.2 }]}>OUTSTANDING</Text>
              <Text style={[styles.thText, { flex: 1.4, textAlign: 'center' }]}>ACTIONS</Text>
            </View>

            {filteredPatients.map((p, idx) => (
              <View
                key={p.id}
                style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
              >
                <View style={[styles.patientCell, { flex: 1.8 }]}>
                  <View style={styles.patientAvatar}>
                    <Ionicons name="person" size={14} color="#0F766E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientNameText} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.uhidText}>{p.uhid}</Text>
                  </View>
                </View>

                <View style={{ flex: 1.1 }}>
                  <Text style={styles.valText}>₹{p.billed.toFixed(2)}</Text>
                  <Text style={styles.subStatus}>Billed</Text>
                </View>

                <View style={{ flex: 1.1 }}>
                  <Text style={styles.valText}>₹{p.paid.toFixed(2)}</Text>
                  <Text style={styles.subStatus}>Paid</Text>
                </View>

                <View style={{ flex: 1.2 }}>
                  <View
                    style={[
                      styles.outBadge,
                      p.outstanding > 0 ? styles.outBadgePending : styles.outBadgeCleared,
                    ]}
                  >
                    <Text
                      style={[
                        styles.outBadgeText,
                        p.outstanding > 0 ? styles.outTextPending : styles.outTextCleared,
                      ]}
                    >
                      ₹{p.outstanding.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.subStatus}>
                    {p.outstanding > 0 ? 'Outstanding' : 'Cleared'}
                  </Text>
                </View>

                <View style={[styles.actionsCol, { flex: 1.4 }]}>
                  <TouchableOpacity
                    style={styles.invoicesSmallBtn}
                    onPress={() => onNavigateToInvoices(p.uhid)}
                  >
                    <Ionicons name="document-text-outline" size={12} color="#0F766E" />
                    <Text style={styles.invoicesSmallText}>Invoices</Text>
                  </TouchableOpacity>

                  {p.outstanding > 0 && (
                    <TouchableOpacity
                      style={styles.collectSmallBtn}
                      onPress={() =>
                        setSelectedCollectPatient({
                          billId: p.billId,
                          patientName: p.name,
                          uhid: p.uhid,
                          amount: p.outstanding,
                        })
                      }
                    >
                      <Text style={styles.collectSmallText}>₹ Collect</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Razorpay Collect Modal */}
      {selectedCollectPatient && (
        <RazorpayModal
          visible={!!selectedCollectPatient}
          billData={selectedCollectPatient}
          onClose={() => setSelectedCollectPatient(null)}
          onSuccess={() => {
            fetchPatientBilling();
          }}
        />
      )}
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
    overflow: 'hidden',
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
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#1E293B',
    padding: 0,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 4,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  tabBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowAlt: {
    backgroundColor: '#FBFDFD',
  },
  patientCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientNameText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  uhidText: {
    fontSize: 9,
    color: '#64748B',
  },
  valText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  subStatus: {
    fontSize: 9,
    color: '#94A3B8',
  },
  outBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  outBadgePending: {
    backgroundColor: '#FEE2E2',
  },
  outBadgeCleared: {
    backgroundColor: '#DCFCE7',
  },
  outBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  outTextPending: {
    color: '#DC2626',
  },
  outTextCleared: {
    color: '#16A34A',
  },
  actionsCol: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  invoicesSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0F766E',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    gap: 2,
  },
  invoicesSmallText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  collectSmallBtn: {
    backgroundColor: '#0F766E',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  collectSmallText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyRefreshBtn: {
    backgroundColor: '#F0FDFA',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  emptyRefreshBtnText: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '700',
  },
});
