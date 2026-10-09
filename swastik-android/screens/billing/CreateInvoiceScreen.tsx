// swastik-android/screens/billing/CreateInvoiceScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { billingApi, patientApi, getApiErrorMessage } from '../../services/api';
import { printOrSharePdf, generateInvoiceHtml } from '../../utils/pdfGenerator';
import { RazorpayModal } from '../../components/RazorpayModal';

interface CreateInvoiceScreenProps {
  onOpenDrawer: () => void;
  onInvoiceCreated?: () => void;
}

export const CreateInvoiceScreen: React.FC<CreateInvoiceScreenProps> = ({
  onOpenDrawer,
  onInvoiceCreated,
}) => {
  const insets = useSafeAreaInsets();
  const [patientSearch, setPatientSearch] = useState('');
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);

  const [patient, setPatient] = useState({
    name: 'Select or Search Patient',
    uhid: 'SWH-NEW',
    phone: '',
    visitType: 'OPD',
    issueDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    dueDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  });

  const [items, setItems] = useState([
    { id: '1', name: 'Consultation Fee', category: 'OPD', qty: 1, unitPrice: 500, taxPercent: 5, discount: 0 },
    { id: '2', name: 'CBC (Complete Blood Count)', category: 'Lab', qty: 1, unitPrice: 1000, taxPercent: 5, discount: 50 },
    { id: '3', name: 'Paracetamol 500mg', category: 'Pharmacy', qty: 10, unitPrice: 15, taxPercent: 12, discount: 0 },
  ]);

  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [activeCreatedBill, setActiveCreatedBill] = useState<any>(null);
  const [isFinalized, setIsFinalized] = useState(false);

  // Load first available patient on initial mount
  useEffect(() => {
    (async () => {
      try {
        const patients = await patientApi.getPatients(0, 1);
        if (patients && patients.length > 0) {
          applyPatient(patients[0]);
        }
      } catch (err) {
        console.log('Initial patient load skipped:', err);
      }
    })();
  }, []);

  const applyPatient = async (p: any) => {
    const uhid = p.uhid || p.id || 'SWH-2026-0001';
    const name = p.name || p.full_name || 'Patient';
    setPatient({
      name,
      uhid,
      phone: p.phone || '',
      visitType: p.visit_type || 'OPD',
      issueDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      dueDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    });

    try {
      const patientBills = await billingApi.getBillsByPatient(uhid);
      const pendingBills = (patientBills || []).filter(
        (b: any) => String(b.status).toUpperCase() !== 'PAID' && Number(b.due_amount || b.total || 0) > 0
      );
      setPendingCount(pendingBills.length);
      const sumDue = pendingBills.reduce((acc: number, b: any) => acc + Number(b.due_amount || b.total || 0), 0);
      setPendingAmount(sumDue);
    } catch {
      setPendingCount(0);
      setPendingAmount(0);
    }
  };

  const handleSearchPatient = async () => {
    if (!patientSearch.trim()) {
      Alert.alert('Search Required', 'Please enter a patient name, phone number, or UHID.');
      return;
    }
    setSearchingPatient(true);
    try {
      const results = await patientApi.getPatients(0, 5, patientSearch.trim());
      if (results && results.length > 0) {
        await applyPatient(results[0]);
        Alert.alert('Patient Loaded', `Selected ${results[0].name || 'Patient'} (${results[0].uhid || 'No UHID'})`);
      } else {
        Alert.alert('Patient Not Found', `No patient records found matching "${patientSearch}".`);
      }
    } catch (err) {
      Alert.alert('Patient Lookup Error', getApiErrorMessage(err));
    } finally {
      setSearchingPatient(false);
    }
  };

  // Dynamic calculations
  const calculateItemTotal = (item: typeof items[0]) => {
    const base = item.qty * item.unitPrice;
    const tax = (base * item.taxPercent) / 100;
    const discounted = base - item.discount;
    return discounted + tax;
  };

  const subtotal = items.reduce((acc, it) => acc + it.qty * it.unitPrice, 0);
  const totalTax = items.reduce(
    (acc, it) => acc + ((it.qty * it.unitPrice) * it.taxPercent) / 100,
    0
  );
  const totalDiscount = items.reduce((acc, it) => acc + it.discount, 0);
  const rawGrandTotal = subtotal + totalTax - totalDiscount;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = (grandTotal - rawGrandTotal).toFixed(2);

  const [paidAmount, setPaidAmount] = useState(grandTotal.toString());
  const amountDue = Math.max(0, grandTotal - (parseFloat(paidAmount) || 0));

  const handleAddItem = () => {
    const newItem = {
      id: Date.now().toString(),
      name: 'Nursing & Clinical Care',
      category: 'OPD',
      qty: 1,
      unitPrice: 350,
      taxPercent: 5,
      discount: 0,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      Alert.alert('Cannot Remove', 'Invoice must contain at least one item.');
      return;
    }
    setItems(items.filter((it) => it.id !== id));
  };

  const handlePrint = async () => {
    const billHtml = generateInvoiceHtml({
      billNo: activeCreatedBill ? (activeCreatedBill.invoice_number || activeCreatedBill.id) : ('INV-' + Date.now().toString().slice(-6)),
      patientName: patient.name,
      uhid: patient.uhid,
      phone: patient.phone,
      date: patient.issueDate,
      dueDate: patient.dueDate,
      visitType: patient.visitType,
      items: items.map((it) => ({
        ...it,
        total: calculateItemTotal(it),
      })),
      subtotal,
      totalTax,
      totalDiscount,
      grandTotal,
      amountPaid: isFinalized ? grandTotal : parseFloat(paidAmount) || 0,
      amountDue: isFinalized ? 0 : amountDue,
      paymentMethod,
    });
    await printOrSharePdf(billHtml, `Invoice-${patient.uhid}`);
  };

  const handleFinalize = async () => {
    setSubmitting(true);
    try {
      const billPayload = {
        patient_id: patient.uhid,
        patient_name: patient.name,
        uhid: patient.uhid,
        subtotal,
        tax: totalTax,
        discount: totalDiscount,
        total: grandTotal,
        status: paymentMethod === 'Cash' ? 'PAID' : 'Pending',
        due_amount: paymentMethod === 'Cash' ? 0 : grandTotal,
        items: items.map((it) => ({
          item_name: it.name,
          category: it.category,
          quantity: it.qty,
          price: it.unitPrice,
          tax: it.taxPercent,
          discount: it.discount,
          total: calculateItemTotal(it),
        })),
      };

      const createdBill = await billingApi.createBill(billPayload);
      const billDbId = createdBill.id || createdBill._id;

      if (paymentMethod === 'Cash') {
        if (billDbId) {
          try {
            await billingApi.addBillPayment(billDbId, {
              amount: grandTotal,
              method: 'Cash',
              transaction_reference: paymentRef || ('CASH-' + Date.now().toString().slice(-6)),
            });
          } catch (pmtErr) {
            console.log('Payment record note:', pmtErr);
          }
        }
        setIsFinalized(true);
        Alert.alert('Invoice Finalized ✅', `Bill #${createdBill.invoice_number || billDbId} marked as PAID via Cash.`);
        if (onInvoiceCreated) onInvoiceCreated();
      } else {
        // Online / Card / UPI / Razorpay flow with real MongoDB bill ID
        setActiveCreatedBill(createdBill);
        setShowRazorpay(true);
      }
    } catch (err) {
      Alert.alert('Invoice Finalization Error', getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
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
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Create Invoice</Text>
          <Text style={styles.subTitle}>Generate detailed bills for patient services.</Text>
        </View>

        {/* Patient Search Input */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient name or UHID..."
              placeholderTextColor="#94A3B8"
              value={patientSearch}
              onChangeText={setPatientSearch}
            />
          </View>
          <TouchableOpacity style={styles.searchActionBtn} onPress={handleSearchPatient}>
            {searchingPatient ? (
              <ActivityIndicator size="small" color="#0F766E" />
            ) : (
              <>
                <Ionicons name="search" size={16} color="#0F766E" />
                <Text style={styles.searchActionText}>Search</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Pending Payments Alert Card */}
        {pendingCount > 0 && (
          <View style={styles.pendingAlertCard}>
            <View style={styles.pendingAlertLeft}>
              <Ionicons name="document-text-outline" size={20} color="#0F766E" />
              <View>
                <Text style={styles.pendingAlertTitle}>Pending Payments</Text>
                <Text style={styles.pendingAlertSub}>
                  This patient has {pendingCount} pending {pendingCount === 1 ? 'invoice' : 'invoices'}
                </Text>
              </View>
            </View>
            <View style={styles.pendingAlertRight}>
              <Text style={styles.pendingAlertAmount}>₹{pendingAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}

        {/* Patient Profile Details Card */}
        <View style={styles.patientCard}>
          <View style={styles.patientAvatar}>
            <Ionicons name="person" size={22} color="#0F766E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{patient.name}</Text>
            <Text style={styles.patientMeta}>UHID: {patient.uhid}</Text>
            <Text style={styles.patientMeta}>Phone: {patient.phone}</Text>
          </View>
          <View style={styles.patientMetaColRight}>
            <View style={styles.visitPill}>
              <Text style={styles.visitPillText}>OPD</Text>
            </View>
            <Text style={styles.metaDate}>Issue: {patient.issueDate}</Text>
            <Text style={styles.metaDate}>Due: {patient.dueDate}</Text>
          </View>
        </View>

        {/* Invoice Items Section */}
        <View style={styles.itemsHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="document-text-outline" size={18} color="#0F766E" />
            <Text style={styles.sectionHeaderTitle}>Invoice Items</Text>
          </View>
          <TouchableOpacity style={styles.addItemBtn} onPress={handleAddItem}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Items Table */}
        <View style={styles.itemsCard}>
          {items.map((it) => {
            const itemTot = calculateItemTotal(it);
            return (
              <View key={it.id} style={styles.itemRow}>
                <View style={styles.itemMainCol}>
                  <Text style={styles.itemName}>{it.name}</Text>
                  <View style={styles.itemCategoryPill}>
                    <Text style={styles.itemCategoryText}>{it.category}</Text>
                  </View>
                </View>

                <View style={styles.itemMathCol}>
                  <Text style={styles.itemMathText}>
                    {it.qty} × ₹{it.unitPrice} (+{it.taxPercent}% Tax)
                  </Text>
                  {it.discount > 0 && (
                    <Text style={styles.itemDiscText}>Disc: -₹{it.discount}</Text>
                  )}
                  <Text style={styles.itemTotalAmount}>₹{itemTot.toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                  style={styles.trashBtn}
                  onPress={() => handleRemoveItem(it.id)}
                >
                  <Feather name="trash-2" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Bill Summary Section (Matching Image 4) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({items.length} items)</Text>
              <Text style={styles.summaryVal}>₹{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Tax</Text>
              <Text style={styles.summaryVal}>₹{totalTax.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Discount</Text>
              <Text style={[styles.summaryVal, { color: '#EF4444' }]}>
                -₹{totalDiscount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Round Off</Text>
              <Text style={styles.summaryVal}>₹{roundOff}</Text>
            </View>
            <View style={[styles.summaryRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalVal}>₹{grandTotal.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.summaryRight}>
            <View style={styles.paidBox}>
              <Text style={styles.paidBoxLabel}>Total Paid</Text>
              <Text style={styles.paidBoxVal}>
                ₹{isFinalized ? grandTotal.toFixed(2) : (parseFloat(paidAmount) || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.dueBox}>
              <Text style={styles.dueBoxLabel}>Amount Due</Text>
              <Text style={styles.dueBoxVal}>
                ₹{isFinalized ? '0.00' : amountDue.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Information Section */}
        <View style={styles.cardSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Ionicons name="card-outline" size={18} color="#0F766E" />
            <Text style={styles.sectionHeaderTitle}>Payment Information</Text>
          </View>

          <View style={styles.paymentMethodsRow}>
            {['Cash', 'UPI', 'Razorpay', 'Card', 'Net Banking'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.payMethodPill,
                  paymentMethod === m && styles.payMethodPillActive,
                ]}
                onPress={() => setPaymentMethod(m)}
              >
                <Text
                  style={[
                    styles.payMethodText,
                    paymentMethod === m && styles.payMethodTextActive,
                  ]}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.fieldInput}
                keyboardType="numeric"
                value={paidAmount}
                onChangeText={setPaidAmount}
              />
            </View>
            <View style={{ flex: 1.5 }}>
              <Text style={styles.fieldLabel}>Reference / Notes (Optional)</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Transaction ID, Remarks"
                placeholderTextColor="#94A3B8"
                value={paymentRef}
                onChangeText={setPaymentRef}
              />
            </View>
          </View>
        </View>

        {/* Action Buttons Row (Matching Image 4) */}
        <View style={styles.bottomButtonsGrid}>
          <View style={styles.actionRowTop}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => Alert.alert('Saved', 'Invoice draft saved.')}
            >
              <Feather name="save" size={15} color="#0F766E" />
              <Text style={styles.secondaryBtnText}>Save Draft</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrint}>
              <Ionicons name="eye-outline" size={15} color="#0F766E" />
              <Text style={styles.secondaryBtnText}>Preview</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrint}>
              <Ionicons name="print-outline" size={15} color="#0F766E" />
              <Text style={styles.secondaryBtnText}>Print</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.finalizeBtn}
            activeOpacity={0.85}
            onPress={handleFinalize}
          >
            <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
            <Text style={styles.finalizeBtnText}>
              {isFinalized ? 'Invoice Settled ✓' : 'Finalize & Mark Paid'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Native Razorpay Modal */}
      {showRazorpay && activeCreatedBill && (
        <RazorpayModal
          visible={showRazorpay}
          billData={{
            billId: activeCreatedBill.id || activeCreatedBill._id,
            patientName: patient.name,
            uhid: patient.uhid,
            amount: grandTotal,
            items,
          }}
          onClose={() => setShowRazorpay(false)}
          onSuccess={() => {
            setIsFinalized(true);
            setPaidAmount(grandTotal.toString());
            setShowRazorpay(false);
            Alert.alert('Payment Completed ✅', 'Invoice payment processed and confirmed.');
            if (onInvoiceCreated) onInvoiceCreated();
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
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
    fontSize: 13,
    color: '#1E293B',
    padding: 0,
  },
  searchActionBtn: {
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
  searchActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  pendingAlertCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 14,
  },
  pendingAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pendingAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  pendingAlertSub: {
    fontSize: 11,
    color: '#64748B',
  },
  pendingAlertRight: {
    alignItems: 'flex-end',
  },
  pendingAlertAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F766E',
  },
  viewDetailsBtn: {
    marginTop: 2,
  },
  viewDetailsText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#D97706',
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 12,
  },
  patientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  patientMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  patientMetaColRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  visitPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  visitPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  metaDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addItemText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 10,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemMainCol: {
    flex: 1.5,
  },
  itemName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemCategoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  itemCategoryText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
  },
  itemMathCol: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  itemMathText: {
    fontSize: 10.5,
    color: '#64748B',
  },
  itemDiscText: {
    fontSize: 10,
    color: '#EF4444',
  },
  itemTotalAmount: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  trashBtn: {
    padding: 8,
    marginLeft: 6,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 12,
  },
  summaryLeft: {
    flex: 1.4,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    paddingRight: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
  },
  grandTotalVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F766E',
  },
  summaryRight: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  paidBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  paidBoxLabel: {
    fontSize: 10,
    color: '#15803D',
    fontWeight: '600',
  },
  paidBoxVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  dueBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  dueBoxLabel: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '600',
  },
  dueBoxVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  payMethodPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  payMethodPillActive: {
    backgroundColor: '#0F766E',
  },
  payMethodText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  payMethodTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '600',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12.5,
    color: '#1E293B',
  },
  bottomButtonsGrid: {
    gap: 10,
  },
  actionRowTop: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0F766E',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  finalizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  finalizeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
