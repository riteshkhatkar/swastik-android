// swastik-android/screens/BillingDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { billingApi, patientApi } from '../services/api';
import { BillingScreenKey } from '../components/BillingDrawer';
import { RazorpayModal } from '../components/RazorpayModal';
import { RefreshControl } from 'react-native';

interface BillingDashboardProps {
  onOpenDrawer?: () => void;
  onNavigate?: (screenKey: BillingScreenKey) => void;
}

export const BillingDashboard: React.FC<BillingDashboardProps> = ({
  onOpenDrawer,
  onNavigate,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    patientsToday: 0,
    opdVisits: 0,
    scheduledToday: 0,
    ipdPatients: 0,
    revenueToday: 0,
    billsGenerated: 0,
    collectedToday: 0,
    outstanding: 0,
    collectionRate: 0,
  });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedPayBill, setSelectedPayBill] = useState<any>(null);

  const loadData = async () => {
    try {
      const [statsData, billsData, patientStats] = await Promise.all([
        billingApi.getStats().catch(() => null),
        billingApi.getBills(0, 10).catch(() => []),
        patientApi.getDashboardStats().catch(() => null),
      ]);

      if (statsData) {
        const rawRate = statsData.collection_rate;
        const numRate = typeof rawRate === 'string' ? parseFloat(rawRate) || 0 : Number(rawRate || 0);
        setStats({
          patientsToday: patientStats?.today_registrations ?? statsData.total_invoices ?? 0,
          opdVisits: patientStats?.opd_count ?? statsData.total_invoices ?? 0,
          scheduledToday: patientStats?.appointments_today ?? statsData.pending_count ?? 0,
          ipdPatients: patientStats?.ipd_count ?? 0,
          revenueToday: statsData.revenue_today ?? 0,
          billsGenerated: statsData.total_invoices ?? (billsData?.length || 0),
          collectedToday: statsData.total_paid ?? statsData.revenue_today ?? 0,
          outstanding: statsData.outstanding ?? 0,
          collectionRate: Math.round(numRate),
        });
      }

      if (Array.isArray(billsData)) {
        const mapped = billsData.map((d: any) => {
          const rawStatus = String(d.status || 'PENDING').toUpperCase();
          return {
            id: String(d.id || d._id || ''),
            invoiceNumber: d.invoice_number || (d.id ? `INV-${d.id.slice(-6)}` : 'INV-001'),
            patientName: d.patient_name || d.patientName || d.patient_info?.name || 'Patient',
            uhid: d.uhid || (d.patient_info?.uhid) || 'SWH-2026-0001',
            date: d.created_at
              ? new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
              : 'Recent',
            amount: Number(d.total || d.amount || 0),
            status: rawStatus === 'PAID' ? 'PAID' : 'PENDING',
            department: d.department || 'OPD',
          };
        });
        setInvoices(mapped);
      }
    } catch (err) {
      console.log('Error loading billing dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
            source={require('../assets/swastik_large_brand_transparent.png')}
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
        {/* Title & Subtitle */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Billing Dashboard</Text>
          <Text style={styles.subTitle}>Manage invoices, payments and patient billing.</Text>
        </View>

        {/* 9 KPI Stat Cards in 3x3 Grid (Matching Image 1) */}
        <View style={styles.kpiGrid}>
          {/* 1. Patients Today */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="person-outline" size={18} color="#0284C7" />
            </View>
            <Text style={styles.kpiLabel}>Patients Today</Text>
            <Text style={styles.kpiValue}>{stats.patientsToday}</Text>
          </View>

          {/* 2. OPD Visits */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E0F2FE' }]}>
              <FontAwesome5 name="stethoscope" size={16} color="#0284C7" />
            </View>
            <Text style={styles.kpiLabel}>OPD Visits</Text>
            <Text style={styles.kpiValue}>{stats.opdVisits}</Text>
          </View>

          {/* 3. Scheduled Today */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="calendar-outline" size={18} color="#0284C7" />
            </View>
            <Text style={styles.kpiLabel}>Scheduled Today</Text>
            <Text style={styles.kpiValue}>{stats.scheduledToday}</Text>
          </View>

          {/* 4. IPD Patients */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="bed-outline" size={18} color="#0284C7" />
            </View>
            <Text style={styles.kpiLabel}>IPD Patients</Text>
            <Text style={styles.kpiValue}>{stats.ipdPatients}</Text>
          </View>

          {/* 5. Revenue Today */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E6FFFA' }]}>
              <Ionicons name="cash-outline" size={18} color="#0D9488" />
            </View>
            <Text style={styles.kpiLabel}>Revenue Today</Text>
            <Text style={styles.kpiValue}>₹{stats.revenueToday.toLocaleString('en-IN')}</Text>
          </View>

          {/* 6. Bills Generated */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="document-text-outline" size={18} color="#0284C7" />
            </View>
            <Text style={styles.kpiLabel}>Bills Generated</Text>
            <Text style={styles.kpiValue}>{stats.billsGenerated}</Text>
          </View>

          {/* 7. Collected Today */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E6FFFA' }]}>
              <Text style={{ fontWeight: '800', color: '#0D9488', fontSize: 16 }}>₹</Text>
            </View>
            <Text style={styles.kpiLabel}>Collected Today</Text>
            <Text style={styles.kpiValue}>₹{stats.collectedToday.toLocaleString('en-IN')}</Text>
          </View>

          {/* 8. Outstanding */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time-outline" size={18} color="#D97706" />
            </View>
            <Text style={styles.kpiLabel}>Outstanding</Text>
            <Text style={styles.kpiValue}>₹{stats.outstanding.toLocaleString('en-IN')}</Text>
          </View>

          {/* 9. Collection Rate */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="bar-chart-outline" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.kpiLabel}>Collection Rate</Text>
            <Text style={styles.kpiValue}>{stats.collectionRate}%</Text>
          </View>
        </View>

        {/* Section: Recent Invoices */}
        <View style={styles.sectionHeaderBetween}>
          <Text style={styles.sectionTitle}>Recent Invoices</Text>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => onNavigate && onNavigate('Invoices')}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Feather name="chevron-right" size={16} color="#0F766E" />
          </TouchableOpacity>
        </View>

        {/* Recent Invoices Table / Card */}
        {loading ? (
          <ActivityIndicator color="#0F766E" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.invoicesCard}>
            {/* Table Header */}
            <View style={styles.invoicesTableHeader}>
              <Text style={[styles.thText, { flex: 1.5 }]}>Bill No.</Text>
              <Text style={[styles.thText, { flex: 1.6 }]}>Patient Name</Text>
              <Text style={[styles.thText, { flex: 1.3 }]}>Date</Text>
              <Text style={[styles.thText, { flex: 1 }]}>Dept</Text>
              <Text style={[styles.thText, { flex: 1.2, textAlign: 'right' }]}>Amount</Text>
              <Text style={[styles.thText, { flex: 1.1, textAlign: 'center' }]}>Status</Text>
            </View>

            {/* Rows */}
            {invoices.map((inv, idx) => (
              <TouchableOpacity
                key={inv.id}
                style={[styles.invoiceRow, idx % 2 === 1 && styles.invoiceRowAlt]}
                activeOpacity={0.7}
                onPress={() => {
                  if (inv.status === 'PENDING') {
                    setSelectedPayBill({
                      billId: inv.id,
                      patientName: inv.patientName,
                      uhid: inv.uhid || 'SWH-2026-0001',
                      amount: inv.amount,
                    });
                  } else {
                    onNavigate && onNavigate('Invoices');
                  }
                }}
              >
                <Text style={[styles.tdBillNo, { flex: 1.5 }]} numberOfLines={1}>
                  {inv.invoiceNumber || inv.id}
                </Text>
                <Text style={[styles.tdPatient, { flex: 1.6 }]} numberOfLines={1}>
                  {inv.patientName}
                </Text>
                <Text style={[styles.tdDate, { flex: 1.3 }]} numberOfLines={1}>
                  {inv.date}
                </Text>
                <Text style={[styles.tdDept, { flex: 1 }]} numberOfLines={1}>
                  {inv.department || 'OPD'}
                </Text>
                <Text style={[styles.tdAmount, { flex: 1.2, textAlign: 'right' }]}>
                  ₹{inv.amount.toLocaleString('en-IN')}
                </Text>
                <View style={[{ flex: 1.1, alignItems: 'center' }]}>
                  <View
                    style={[
                      styles.statusPill,
                      inv.status === 'PAID' ? styles.statusPaid : styles.statusPending,
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
                <Feather name="chevron-right" size={14} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Section: Quick Actions */}
        <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 12 }]}>
          Quick Actions
        </Text>
        <View style={styles.quickGrid}>
          {/* Row 1: Create Invoice & Record Payment */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickCard}
              activeOpacity={0.8}
              onPress={() => onNavigate && onNavigate('CreateInvoice')}
            >
              <View style={styles.quickIconCircle}>
                <Ionicons name="document-attach-outline" size={20} color="#0F766E" />
              </View>
              <Text style={styles.quickCardTitle}>Create Invoice</Text>
              <Text style={styles.quickCardSub}>Generate new patient bill</Text>
              <Feather name="chevron-right" size={16} color="#94A3B8" style={styles.quickChevron} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              activeOpacity={0.8}
              onPress={() => onNavigate && onNavigate('Payments')}
            >
              <View style={styles.quickIconCircle}>
                <Ionicons name="card-outline" size={20} color="#0F766E" />
              </View>
              <Text style={styles.quickCardTitle}>Record Payment</Text>
              <Text style={styles.quickCardSub}>Update payment details</Text>
              <Feather name="chevron-right" size={16} color="#94A3B8" style={styles.quickChevron} />
            </TouchableOpacity>
          </View>

          {/* Row 2: Patient Billing & Reports */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickCard}
              activeOpacity={0.8}
              onPress={() => onNavigate && onNavigate('Patients')}
            >
              <View style={styles.quickIconCircle}>
                <Ionicons name="person-outline" size={20} color="#0F766E" />
              </View>
              <Text style={styles.quickCardTitle}>Patient Billing</Text>
              <Text style={styles.quickCardSub}>View &amp; manage patient bills</Text>
              <Feather name="chevron-right" size={16} color="#94A3B8" style={styles.quickChevron} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              activeOpacity={0.8}
              onPress={() => onNavigate && onNavigate('Reports')}
            >
              <View style={styles.quickIconCircle}>
                <Ionicons name="bar-chart-outline" size={20} color="#0F766E" />
              </View>
              <Text style={styles.quickCardTitle}>Reports</Text>
              <Text style={styles.quickCardSub}>View collection &amp; revenue reports</Text>
              <Feather name="chevron-right" size={16} color="#94A3B8" style={styles.quickChevron} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Razorpay Modal for quick payments */}
      {selectedPayBill && (
        <RazorpayModal
          visible={!!selectedPayBill}
          billData={selectedPayBill}
          onClose={() => setSelectedPayBill(null)}
          onSuccess={() => {
            loadData();
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  kpiCard: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  invoicesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  invoicesTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  invoiceRowAlt: {
    backgroundColor: '#FBFDFD',
  },
  tdBillNo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  tdPatient: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  tdDate: {
    fontSize: 10.5,
    color: '#64748B',
  },
  tdDept: {
    fontSize: 10.5,
    color: '#64748B',
  },
  tdAmount: {
    fontSize: 12,
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
  statusPaid: {
    backgroundColor: '#DCFCE7',
  },
  statusPaidText: {
    color: '#15803D',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPendingText: {
    color: '#D97706',
  },
  quickGrid: {
    gap: 12,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  quickIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  quickCardSub: {
    fontSize: 10.5,
    color: '#64748B',
  },
  quickChevron: {
    position: 'absolute',
    top: 14,
    right: 12,
  },
});
