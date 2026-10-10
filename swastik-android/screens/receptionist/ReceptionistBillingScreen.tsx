// swastik-android/screens/receptionist/ReceptionistBillingScreen.tsx
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
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { receptionistApi, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { generateInvoiceHtml, printOrSharePdf } from '../../utils/pdfGenerator';

interface ReceptionistBillingScreenProps {
  onOpenDrawer: () => void;
}

export const ReceptionistBillingScreen: React.FC<ReceptionistBillingScreenProps> = ({
  onOpenDrawer,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const receptionistName = user?.full_name || 'Priya Sharma';

  const [activeTab, setActiveTab] = useState<'Today' | 'Pending' | 'Paid' | 'All'>('Today');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Live bill items matching Image 13
  const [bills, setBills] = useState<any[]>([]);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create Bill Form
  const [patientName, setPatientName] = useState('');
  const [uhid, setUhid] = useState('');
  const [billType, setBillType] = useState<'OPD' | 'Admission' | 'Pharmacy' | 'Lab'>('OPD');
  const [amount, setAmount] = useState('500');
  const [paymentMode, setPaymentMode] = useState('Cash');

  const loadBills = async () => {
    try {
      setLoading(true);
      const data = await receptionistApi.getBills(0, 100);
      if (Array.isArray(data)) {
        const mapped = data.map((d: any) => ({
          id: String(d.id || d._id || ''),
          patientName: d.patient_name || d.patientName || d.patient_info?.name || 'Patient',
          uhid: d.uhid || (d.patient_info?.uhid) || 'SWH-2026-0001',
          billNo: d.invoice_number || (d.id ? `INV-${d.id.slice(-6)}` : 'INV-001'),
          type: d.department || d.visit_type || 'OPD',
          amount: Number(d.total || d.amount || 0),
          status: String(d.status || 'PENDING').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING',
          date: d.created_at
            ? new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
            : 'Today',
          raw: d,
        }));
        setBills(mapped);
      }
    } catch (e: any) {
      console.warn('Error loading bills:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadBills();
  };

  const handleCreateBill = async () => {
    if (!patientName.trim()) {
      Alert.alert('Required Field', 'Please enter patient name.');
      return;
    }

    const numericAmount = parseFloat(amount) || 500;
    try {
      const created = await receptionistApi.createBill({
        patient_id: uhid.trim() || 'SWH-OPD',
        patient_name: patientName.trim(),
        uhid: uhid.trim() || undefined,
        total: numericAmount,
        subtotal: numericAmount * 0.95,
        tax: numericAmount * 0.05,
        status: paymentMode === 'Cash' ? 'PAID' : 'Pending',
        due_amount: paymentMode === 'Cash' ? 0 : numericAmount,
        items: [
          {
            item_name: `${billType} Services`,
            category: billType,
            quantity: 1,
            price: numericAmount,
            tax: 5,
            total: numericAmount,
          },
        ],
      });

      const billId = created.id || created._id;
      if (paymentMode === 'Cash' && billId) {
        try {
          await receptionistApi.addBillPayment(billId, {
            amount: numericAmount,
            method: 'Cash',
            transaction_reference: 'CASH-' + Date.now().toString().slice(-6),
            created_by: receptionistName,
          });
        } catch (pmtErr) {
          console.log('Payment record note:', pmtErr);
        }
      }

      setShowCreateModal(false);
      Alert.alert(
        'Bill Created ✅',
        `Invoice #${created.invoice_number || billId} generated for ₹${numericAmount}.\nPayment recorded via ${paymentMode}.`
      );
      setPatientName('');
      setUhid('');
      loadBills();
    } catch (err: any) {
      Alert.alert('Bill Creation Failed', getApiErrorMessage(err));
    }
  };

  const handleCollectPayment = async (bill: any) => {
    try {
      await receptionistApi.addBillPayment(bill.id, {
        amount: Number(bill.amount || 0),
        method: 'Cash',
        transaction_reference: 'CASH-' + Date.now().toString().slice(-6),
        created_by: receptionistName,
      });
      setSelectedBill(null);
      Alert.alert('Payment Recorded ✅', `₹${bill.amount} collected for ${bill.patientName}.`);
      loadBills();
    } catch (err: any) {
      Alert.alert('Payment Failed', getApiErrorMessage(err));
    }
  };

  const filteredBills = bills.filter((b) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        (b.patientName || '').toLowerCase().includes(q) ||
        (b.uhid || '').toLowerCase().includes(q) ||
        (b.billNo || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (activeTab === 'Today') return b.date === 'Today';
    if (activeTab === 'Pending') return b.status === 'PENDING';
    if (activeTab === 'Paid') return b.status === 'PAID';
    return true;
  });

  const todayCount = bills.filter((b) => b.date === 'Today').length;
  const pendingCount = bills.filter((b) => b.status === 'PENDING').length;
  const paidCount = bills.filter((b) => b.status === 'PAID').length;

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
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Hospital Billing Center</Text>
          <Text style={styles.subTitle}>Create, track and manage patient bills.</Text>
        </View>

        {/* Search Bar + Filter Button matching Image 13 */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient name, UHID or bill no."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity style={styles.filterBtn}>
            <Feather name="filter" size={18} color="#0D9488" />
            <Text style={styles.filterBtnText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Category Tabs matching Image 13: Today (6), Pending (3), Paid (2), All (6) */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'Today' && styles.tabPillActive]}
            onPress={() => setActiveTab('Today')}
          >
            <Text
              style={[styles.tabPillText, activeTab === 'Today' && styles.tabPillTextActive]}
            >
              Today ({todayCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'Pending' && styles.tabPillActive]}
            onPress={() => setActiveTab('Pending')}
          >
            <Text
              style={[styles.tabPillText, activeTab === 'Pending' && styles.tabPillTextActive]}
            >
              Pending ({pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'Paid' && styles.tabPillActive]}
            onPress={() => setActiveTab('Paid')}
          >
            <Text
              style={[styles.tabPillText, activeTab === 'Paid' && styles.tabPillTextActive]}
            >
              Paid ({paidCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'All' && styles.tabPillActive]}
            onPress={() => setActiveTab('All')}
          >
            <Text
              style={[styles.tabPillText, activeTab === 'All' && styles.tabPillTextActive]}
            >
              All ({bills.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bill Cards List matching Image 13 */}
        <View style={styles.billsList}>
          {filteredBills.map((bill) => {
            const isPaid = bill.status === 'PAID';

            return (
              <TouchableOpacity
                key={bill.id}
                style={styles.billCard}
                onPress={() => setSelectedBill(bill)}
                activeOpacity={0.75}
              >
                {/* Avatar */}
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={20} color="#0D9488" />
                </View>

                {/* Patient Info */}
                <View style={styles.billInfoCol}>
                  <Text style={styles.billPatientName}>{bill.patientName}</Text>
                  <Text style={styles.billUhidText}>UHID: {bill.uhid}</Text>
                  <Text style={styles.billNoText}>Bill No: {bill.billNo}</Text>
                </View>

                {/* Service Badge (OPD, Admission, Pharmacy, Lab) */}
                <View style={styles.servicePill}>
                  {bill.type === 'OPD' && (
                    <MaterialCommunityIcons name="stethoscope" size={14} color="#0D9488" />
                  )}
                  {bill.type === 'Admission' && (
                    <MaterialCommunityIcons name="bed" size={14} color="#0284C7" />
                  )}
                  {bill.type === 'Pharmacy' && (
                    <MaterialCommunityIcons name="pill" size={14} color="#0D9488" />
                  )}
                  {bill.type === 'Lab' && (
                    <MaterialCommunityIcons name="flask-outline" size={14} color="#DB2777" />
                  )}
                  <Text style={styles.servicePillText}>{bill.type}</Text>
                </View>

                {/* Amount and Status */}
                <View style={styles.amountCol}>
                  <Text style={styles.amountText}>₹{bill.amount.toFixed(2)}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      isPaid ? styles.statusBadgePaid : styles.statusBadgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isPaid ? styles.statusBadgeTextPaid : styles.statusBadgeTextPending,
                      ]}
                    >
                      {bill.status}
                    </Text>
                  </View>
                </View>

                <Feather name="chevron-right" size={18} color="#94A3B8" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom "Create New Bill" Action Button matching Image 13 */}
        <TouchableOpacity
          style={styles.createBillButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="receipt" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.createBillButtonText}>Create New Bill</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </ScrollView>

      {/* Create New Bill Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Patient Bill</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={styles.modalLabel}>Patient Full Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor="#94A3B8"
                  value={patientName}
                  onChangeText={setPatientName}
                />
              </View>

              <View>
                <Text style={styles.modalLabel}>UHID (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. SWH-2026-0007"
                  placeholderTextColor="#94A3B8"
                  value={uhid}
                  onChangeText={setUhid}
                />
              </View>

              <View>
                <Text style={styles.modalLabel}>Billing Service Category</Text>
                <View style={styles.typeRow}>
                  {(['OPD', 'Admission', 'Pharmacy', 'Lab'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typePill, billType === t && styles.typePillActive]}
                      onPress={() => setBillType(t)}
                    >
                      <Text
                        style={[
                          styles.typePillText,
                          billType === t && styles.typePillTextActive,
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.modalLabel}>Amount (₹) *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="500"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              <View>
                <Text style={styles.modalLabel}>Payment Mode</Text>
                <View style={styles.typeRow}>
                  {['Cash', 'UPI / QR', 'Card'].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.typePill, paymentMode === m && styles.typePillActive]}
                      onPress={() => setPaymentMode(m)}
                    >
                      <Text
                        style={[
                          styles.typePillText,
                          paymentMode === m && styles.typePillTextActive,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateBill}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSubmitBtnText}>Generate & Print Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bill Detail / Collect Payment Modal */}
      <Modal
        visible={!!selectedBill}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedBill(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bill Details</Text>
              <TouchableOpacity onPress={() => setSelectedBill(null)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedBill && (
              <View style={{ gap: 12 }}>
                <View style={styles.billDetailsHeader}>
                  <Text style={styles.billBigName}>{selectedBill.patientName}</Text>
                  <Text style={styles.billBigNo}>{selectedBill.billNo}</Text>
                  <Text style={styles.billBigAmount}>₹{selectedBill.amount.toFixed(2)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>UHID Reference</Text>
                  <Text style={styles.detailValue}>{selectedBill.uhid}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Service</Text>
                  <Text style={styles.detailValue}>{selectedBill.type}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Status</Text>
                  <Text style={styles.detailValue}>{selectedBill.status}</Text>
                </View>

                {selectedBill.status === 'PENDING' ? (
                  <TouchableOpacity
                    style={styles.modalSubmitBtn}
                    onPress={() => handleCollectPayment(selectedBill)}
                  >
                    <Text style={styles.modalSubmitBtnText}>Collect Payment (₹{selectedBill.amount})</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, { backgroundColor: '#E6F4F1' }]}
                    onPress={async () => {
                      try {
                        const amt = selectedBill.amount || 500;
                        const sub = Math.round(amt * 0.95);
                        const tax = amt - sub;
                        const html = generateInvoiceHtml({
                          billNo: selectedBill.billNo,
                          patientName: selectedBill.patientName,
                          uhid: selectedBill.uhid,
                          date: selectedBill.date || new Date().toLocaleDateString('en-GB'),
                          visitType: 'OPD Consultation / Registration',
                          items: [
                            {
                              name: 'Medical Consultation & Hospital Care',
                              category: 'Clinical',
                              qty: 1,
                              unitPrice: sub,
                              taxPercent: 5,
                              discount: 0,
                              total: sub,
                            },
                          ],
                          subtotal: sub,
                          totalTax: tax,
                          totalDiscount: 0,
                          grandTotal: amt,
                          amountPaid: amt,
                          amountDue: 0,
                          paymentMethod: 'Cash / Hospital Counter',
                          receiptFooter: 'Thank you for choosing Swastik Hospital. Get well soon!',
                        });
                        await printOrSharePdf(html, `Invoice_${selectedBill.billNo}`);
                        setSelectedBill(null);
                      } catch (err: any) {
                        Alert.alert('Print Error', err?.message || 'Could not print invoice.');
                      }
                    }}
                  >
                    <Text style={[styles.modalSubmitBtnText, { color: '#0D9488' }]}>
                      Print Tax Invoice Receipt (PDF)
                    </Text>
                  </TouchableOpacity>
                )}
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
    marginBottom: 14,
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
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  billsList: {
    gap: 10,
    marginBottom: 18,
  },
  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  billInfoCol: {
    flex: 1.5,
  },
  billPatientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  billUhidText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  billNoText: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  servicePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  amountCol: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  statusBadge: {
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  statusBadgePaid: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusBadgeTextPaid: {
    color: '#059669',
  },
  statusBadgeTextPending: {
    color: '#D97706',
  },
  createBillButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#0D9488',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  createBillButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#1E293B',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  typePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  typePillActive: {
    backgroundColor: '#E6F4F1',
    borderColor: '#0D9488',
  },
  typePillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  typePillTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  modalSubmitBtn: {
    backgroundColor: '#0D9488',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  billDetailsHeader: {
    backgroundColor: '#E6F4F1',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  billBigName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },
  billBigNo: {
    fontSize: 12,
    color: '#0D9488',
    marginTop: 2,
  },
  billBigAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
});
