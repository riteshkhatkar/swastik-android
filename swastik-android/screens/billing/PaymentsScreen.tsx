// swastik-android/screens/billing/PaymentsScreen.tsx
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
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { billingApi, getApiErrorMessage } from '../../services/api';

interface PaymentsScreenProps {
  onOpenDrawer: () => void;
}

interface PaymentRecord {
  id: string;
  date: string;
  receiptNo: string;
  invoiceNo: string;
  patient: string;
  method: string;
  amount: number;
  status: string;
}

export const PaymentsScreen: React.FC<PaymentsScreenProps> = ({ onOpenDrawer }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<'All' | 'UPI' | 'Card' | 'Cash' | 'Net Banking'>('All');

  const fetchPayments = useCallback(async () => {
    try {
      const bills = await billingApi.getBills(0, 100);
      const records: PaymentRecord[] = [];

      (bills || []).forEach((bill: any, bIdx: number) => {
        const patientName = bill.patient_name || bill.patientName || bill.patient_info?.name || 'Patient';
        const invoiceNo = bill.invoice_number || bill.invoiceNo || (bill.id ? `INV-${bill.id.slice(-6)}` : `INV-${bIdx + 1}`);

        if (Array.isArray(bill.payments) && bill.payments.length > 0) {
          bill.payments.forEach((pmt: any, pIdx: number) => {
            const rawDate = pmt.payment_date || bill.created_at || new Date().toISOString();
            const dateObj = new Date(rawDate);
            const dateFormatted = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
                '\n' +
                dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
              : 'Recent';

            records.push({
              id: `${bill.id || bIdx}-${pIdx}`,
              date: dateFormatted,
              receiptNo: pmt.receipt_number || `RCP-${invoiceNo.replace('INV-', '')}-${pIdx + 1}`,
              invoiceNo,
              patient: patientName,
              method: pmt.method || 'Cash',
              amount: Number(pmt.amount || 0),
              status: 'Completed',
            });
          });
        } else if (
          String(bill.status).toUpperCase() === 'PAID' ||
          (bill.amount_paid && Number(bill.amount_paid) > 0)
        ) {
          const rawDate = bill.created_at || new Date().toISOString();
          const dateObj = new Date(rawDate);
          const dateFormatted = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
              '\n' +
              dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
            : 'Recent';

          records.push({
            id: String(bill.id || bIdx),
            date: dateFormatted,
            receiptNo: bill.receipt_number || `RCP-${invoiceNo.replace('INV-', '')}`,
            invoiceNo,
            patient: patientName,
            method: bill.payment_method || 'Cash',
            amount: Number(bill.total || bill.amount || 0),
            status: 'Completed',
          });
        }
      });

      setPayments(records);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      Alert.alert('Payment Records Error', getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const filteredPayments = payments.filter((p) => {
    if (selectedMethodFilter !== 'All') {
      if (p.method.toLowerCase() !== selectedMethodFilter.toLowerCase()) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.patient.toLowerCase().includes(q) ||
      p.invoiceNo.toLowerCase().includes(q) ||
      p.receiptNo.toLowerCase().includes(q)
    );
  });

  const totalCollected = filteredPayments.reduce((acc, p) => acc + p.amount, 0);

  const getMethodIcon = (method: string) => {
    switch (method.toUpperCase()) {
      case 'UPI':
        return <Ionicons name="flash-outline" size={13} color="#0D9488" />;
      case 'CARD':
        return <Ionicons name="card-outline" size={13} color="#2563EB" />;
      case 'CASH':
        return <Ionicons name="cash-outline" size={13} color="#059669" />;
      case 'NET BANKING':
      default:
        return <MaterialCommunityIcons name="bank-outline" size={13} color="#4F46E5" />;
    }
  };

  const cycleMethodFilter = () => {
    const methods: ('All' | 'UPI' | 'Card' | 'Cash' | 'Net Banking')[] = ['All', 'UPI', 'Card', 'Cash', 'Net Banking'];
    const curIdx = methods.indexOf(selectedMethodFilter);
    const nextIdx = (curIdx + 1) % methods.length;
    setSelectedMethodFilter(methods[nextIdx]);
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F766E']} />}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Payments</Text>
          <Text style={styles.subTitle}>Live verified transaction history and payment receipts.</Text>
        </View>

        {/* Search & Actions Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient, invoice or receipt..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={cycleMethodFilter}>
            <Ionicons name="filter-outline" size={16} color="#0F766E" />
            <Text style={styles.iconBtnText}>{selectedMethodFilter}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={16} color="#0F766E" />
            <Text style={styles.iconBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills Row */}
        <View style={styles.filterTabsRow}>
          <TouchableOpacity style={styles.filterPill} onPress={cycleMethodFilter}>
            <Text style={styles.filterPillText}>Method: {selectedMethodFilter}</Text>
            <Feather name="chevron-down" size={14} color="#64748B" />
          </TouchableOpacity>
          <View style={styles.filterPill}>
            <Text style={styles.filterPillText}>Status: Completed</Text>
          </View>
          <View style={styles.filterPill}>
            <Text style={styles.filterPillText}>Live Records</Text>
          </View>
        </View>

        {/* Payments Table / Loading / Empty */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Loading payment records...</Text>
          </View>
        ) : filteredPayments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Payment Records Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'No transactions match your search filter.' : 'Completed payments and receipts will appear here.'}
            </Text>
            <TouchableOpacity style={styles.emptyRefreshBtn} onPress={onRefresh}>
              <Text style={styles.emptyRefreshBtnText}>Reload Payments</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { flex: 1.2 }]}>Date</Text>
              <Text style={[styles.thText, { flex: 1.4 }]}>Receipt No.</Text>
              <Text style={[styles.thText, { flex: 1.4 }]}>Invoice No.</Text>
              <Text style={[styles.thText, { flex: 1.5 }]}>Patient</Text>
              <Text style={[styles.thText, { flex: 1.3 }]}>Method</Text>
              <Text style={[styles.thText, { flex: 1.1, textAlign: 'right' }]}>Amount</Text>
              <Text style={[styles.thText, { flex: 1.1, textAlign: 'center' }]}>Status</Text>
            </View>

            {filteredPayments.map((p, idx) => (
              <View
                key={p.id}
                style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
              >
                <Text style={[styles.tdDate, { flex: 1.2 }]}>{p.date}</Text>
                <Text style={[styles.tdReceipt, { flex: 1.4 }]}>{p.receiptNo}</Text>
                <Text style={[styles.tdInv, { flex: 1.4 }]}>{p.invoiceNo}</Text>
                <Text style={[styles.tdPatient, { flex: 1.5 }]} numberOfLines={1}>
                  {p.patient}
                </Text>
                <View style={[styles.methodCol, { flex: 1.3 }]}>
                  {getMethodIcon(p.method)}
                  <Text style={styles.methodText}>{p.method}</Text>
                </View>
                <Text style={[styles.tdAmount, { flex: 1.1, textAlign: 'right' }]}>
                  ₹{p.amount.toLocaleString('en-IN')}
                </Text>
                <View style={[{ flex: 1.1, alignItems: 'center' }]}>
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>Completed</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Bottom Summary Cards */}
        <View style={styles.summaryCardsRow}>
          <View style={styles.summaryMetricCard}>
            <View style={[styles.summaryIconCircle, { backgroundColor: '#CCFBF1' }]}>
              <Ionicons name="bar-chart-outline" size={20} color="#0F766E" />
            </View>
            <View>
              <Text style={styles.summaryMetricLabel}>Total Payments</Text>
              <Text style={styles.summaryMetricValue}>
                {filteredPayments.length} payments
              </Text>
            </View>
          </View>

          <View style={styles.summaryMetricCard}>
            <View style={[styles.summaryIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="wallet-outline" size={20} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.summaryMetricLabel}>Total Collected</Text>
              <Text style={styles.summaryMetricValue}>
                ₹{totalCollected.toLocaleString('en-IN')}.00
              </Text>
            </View>
          </View>
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
  iconBtn: {
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
  iconBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 20,
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
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowAlt: {
    backgroundColor: '#FBFDFD',
  },
  tdDate: {
    fontSize: 9.5,
    color: '#64748B',
    lineHeight: 13,
  },
  tdReceipt: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  tdInv: {
    fontSize: 10,
    color: '#0F766E',
    fontWeight: '600',
  },
  tdPatient: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  methodCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  methodText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  tdAmount: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  completedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  summaryCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryMetricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  summaryIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryMetricLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryMetricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 260,
  },
  emptyRefreshBtn: {
    marginTop: 16,
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyRefreshBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
