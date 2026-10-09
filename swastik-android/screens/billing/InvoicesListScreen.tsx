// swastik-android/screens/billing/InvoicesListScreen.tsx
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { billingApi } from '../../services/api';
import { printOrSharePdf, generateInvoiceHtml } from '../../utils/pdfGenerator';
import { RazorpayModal } from '../../components/RazorpayModal';

interface InvoicesListScreenProps {
  onOpenDrawer: () => void;
  onNavigateToCreate: () => void;
}

export const InvoicesListScreen: React.FC<InvoicesListScreenProps> = ({
  onOpenDrawer,
  onNavigateToCreate,
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'pending'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedPayBill, setSelectedPayBill] = useState<any>(null);

  const loadInvoices = async () => {
    try {
      const data = await billingApi.getBills(0, 100);
      if (Array.isArray(data)) {
        const mapped = data.map((d: any) => {
          const rawStatus = String(d.status || 'PENDING').toUpperCase();
          const isPaid = rawStatus === 'PAID';
          return {
            id: String(d.id || d._id || ''),
            invoiceNumber: d.invoice_number || (d.id ? `INV-${d.id.slice(-6)}` : 'INV-001'),
            patientName: d.patient_name || d.patientName || d.patient_info?.name || 'Patient',
            uhid: d.uhid || (d.patient_info?.uhid) || 'SWH-2026-0001',
            date: d.created_at
              ? new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Recent',
            amount: Number(d.total || d.amount || 0),
            status: isPaid ? 'PAID' : 'PENDING',
            department: d.department || 'General OPD',
            raw: d,
          };
        });
        setInvoices(mapped);
      }
    } catch (err) {
      console.log('Error loading bills:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadInvoices();
  };

  const filteredInvoices = invoices.filter((item) => {
    if (activeTab === 'paid' && item.status !== 'PAID') return false;
    if (activeTab === 'pending' && item.status !== 'PENDING') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.patientName && item.patientName.toLowerCase().includes(q)) ||
      (item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(q)) ||
      (item.id && item.id.toLowerCase().includes(q)) ||
      (item.uhid && item.uhid.toLowerCase().includes(q))
    );
  });

  const countPaid = invoices.filter((i) => i.status === 'PAID').length;
  const countPending = invoices.filter((i) => i.status === 'PENDING').length;

  const handleViewInvoice = async (inv: any) => {
    const rawItems = Array.isArray(inv.raw?.items) && inv.raw.items.length > 0
      ? inv.raw.items.map((it: any) => ({
          name: it.item_name || it.name || 'Medical Services',
          category: it.category || 'Clinical',
          qty: Number(it.quantity || it.qty || 1),
          unitPrice: Number(it.price || it.unitPrice || inv.amount),
          taxPercent: Number(it.tax || it.taxPercent || 0),
          discount: Number(it.discount || 0),
          total: Number(it.total || inv.amount),
        }))
      : [
          {
            name: `${inv.department || 'Hospital'} Consultation & Clinical Services`,
            category: inv.department || 'Medical',
            qty: 1,
            unitPrice: inv.amount,
            taxPercent: 5,
            discount: 0,
            total: inv.amount,
          },
        ];

    const html = generateInvoiceHtml({
      billNo: inv.invoiceNumber || inv.id,
      patientName: inv.patientName,
      uhid: inv.uhid || 'SWH-2026-0001',
      date: inv.date || '14 Mar 2026',
      visitType: inv.department || 'OPD',
      items: rawItems,
      subtotal: inv.raw?.subtotal ?? (inv.amount * 0.95),
      totalTax: inv.raw?.tax ?? (inv.amount * 0.05),
      totalDiscount: inv.raw?.discount ?? 0,
      grandTotal: inv.amount,
      amountPaid: inv.status === 'PAID' ? inv.amount : (inv.raw?.amount_paid || 0),
      amountDue: inv.status === 'PAID' ? 0 : inv.amount,
      paymentMethod: inv.status === 'PAID' ? (inv.raw?.payment_method || 'Settled (Online/Cash)') : 'Pending',
    });
    await printOrSharePdf(html, `Invoice-${inv.invoiceNumber || inv.id}`);
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
          <Text style={styles.mainTitle}>Hospital Billing Center</Text>
          <Text style={styles.subTitle}>Create, track and manage patient invoices.</Text>
        </View>

        {/* Search & Filter Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient name, UHID or invoice no."
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

        {/* Status Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'all' && styles.tabBtnTextActive]}>
              All ({invoices.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'paid' && styles.tabBtnActive]}
            onPress={() => setActiveTab('paid')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'paid' && styles.tabBtnTextActive]}>
              Paid ({countPaid})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'pending' && styles.tabBtnTextActive]}>
              Pending ({countPending})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Invoices List / Table */}
        {loading ? (
          <ActivityIndicator color="#0F766E" style={{ marginVertical: 30 }} />
        ) : filteredInvoices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Invoices Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'No invoices match your search query.' : 'Tap "Create New Invoice" below to generate a new hospital invoice.'}
            </Text>
            <TouchableOpacity style={styles.emptyRefreshBtn} onPress={onRefresh}>
              <Text style={styles.emptyRefreshBtnText}>Refresh List</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tableCard}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { flex: 1.5 }]}>Invoice No.</Text>
              <Text style={[styles.thText, { flex: 1.7 }]}>Patient Details</Text>
              <Text style={[styles.thText, { flex: 1.2 }]}>Date</Text>
              <Text style={[styles.thText, { flex: 1.2, textAlign: 'right' }]}>Amount</Text>
              <Text style={[styles.thText, { flex: 1.1, textAlign: 'center' }]}>Status</Text>
              <Text style={[styles.thText, { flex: 1.2, textAlign: 'center' }]}>Action</Text>
            </View>

            {/* Invoices rows */}
            {filteredInvoices.map((inv, idx) => (
              <View
                key={inv.id}
                style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
              >
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.invNoText}>{inv.invoiceNumber || inv.id}</Text>
                </View>

                <View style={{ flex: 1.7 }}>
                  <Text style={styles.patientNameText} numberOfLines={1}>
                    {inv.patientName}
                  </Text>
                  <Text style={styles.uhidText} numberOfLines={1}>
                    {inv.uhid || 'SWH-2026-0001'}
                  </Text>
                </View>

                <View style={{ flex: 1.2 }}>
                  <Text style={styles.dateText}>{inv.date}</Text>
                </View>

                <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                  <Text style={styles.amountText}>₹{inv.amount.toLocaleString('en-IN')}</Text>
                </View>

                <View style={{ flex: 1.1, alignItems: 'center' }}>
                  <View
                    style={[
                      styles.statusPill,
                      inv.status === 'PAID' ? styles.statusPaidPill : styles.statusPendingPill,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        inv.status === 'PAID' ? styles.statusPaidText : styles.statusPendingText,
                      ]}
                    >
                      {inv.status}
                    </Text>
                  </View>
                </View>

                <View style={{ flex: 1.2, alignItems: 'center' }}>
                  {inv.status === 'PAID' ? (
                    <TouchableOpacity
                      style={styles.actionBtnOutline}
                      onPress={() => handleViewInvoice(inv)}
                    >
                      <Ionicons name="eye-outline" size={13} color="#0F766E" />
                      <Text style={styles.actionBtnOutlineText}>View</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.actionBtnCollect}
                      onPress={() =>
                        setSelectedPayBill({
                          billId: inv.id,
                          patientName: inv.patientName,
                          uhid: inv.uhid || 'SWH-2026-0001',
                          amount: inv.amount,
                        })
                      }
                    >
                      <Ionicons name="card-outline" size={13} color="#0F766E" />
                      <Text style={styles.actionBtnCollectText}>Collect</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom CTA: Create New Invoice (Matching Image 3) */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.createInvoiceBtn}
          activeOpacity={0.85}
          onPress={onNavigateToCreate}
        >
          <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
          <Text style={styles.createInvoiceText}>Create New Invoice</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Razorpay Collect Payment Modal */}
      {selectedPayBill && (
        <RazorpayModal
          visible={!!selectedPayBill}
          billData={selectedPayBill}
          onClose={() => setSelectedPayBill(null)}
          onSuccess={() => {
            loadInvoices();
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
    paddingBottom: 90,
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
    alignItems: 'center',
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
    paddingHorizontal: 12,
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
    fontSize: 12,
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
    paddingHorizontal: 10,
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
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowAlt: {
    backgroundColor: '#FBFDFD',
  },
  invNoText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  patientNameText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  uhidText: {
    fontSize: 9.5,
    color: '#64748B',
  },
  dateText: {
    fontSize: 10,
    color: '#64748B',
  },
  amountText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusPaidPill: {
    backgroundColor: '#DCFCE7',
  },
  statusPaidText: {
    color: '#15803D',
  },
  statusPendingPill: {
    backgroundColor: '#FEF3C7',
  },
  statusPendingText: {
    color: '#D97706',
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0F766E',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    gap: 3,
  },
  actionBtnOutlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },
  actionBtnCollect: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0F766E',
    backgroundColor: '#F0FDFA',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    gap: 3,
  },
  actionBtnCollectText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  createInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  createInvoiceText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
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
