// swastik-android/screens/admin/AdminFinancialScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { adminApi, billingApi } from '../../services/api';
import { printOrSharePdf } from '../../utils/pdfGenerator';
import { RefreshControl } from 'react-native';

interface AdminFinancialScreenProps {
  onOpenDrawer: () => void;
}

export const AdminFinancialScreen: React.FC<AdminFinancialScreenProps> = ({
  onOpenDrawer,
}) => {
  const insets = useSafeAreaInsets();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState('Current Cycle');
  const [selectedCycleSub, setSelectedCycleSub] = useState('Live Settlement Ledgers');
  const [liveBills, setLiveBills] = useState<any[]>([]);

  const [stats, setStats] = useState({
    revenue_mtd: 0,
    outstanding: 0,
    collection_rate: 0,
    total_invoices: 0,
  });

  const [paymentBreakdown, setPaymentBreakdown] = useState<any[]>([
    { method: 'UPI', amount: '₹0.00', pct: '0%', color: '#10B981' },
    { method: 'Card', amount: '₹0.00', pct: '0%', color: '#3B82F6' },
    { method: 'Cash', amount: '₹0.00', pct: '0%', color: '#F59E0B' },
  ]);

  const loadData = async () => {
    try {
      const [billingStats, liveBilling] = await Promise.all([
        billingApi.getStats().catch(() => null),
        adminApi.getLiveBilling(20).catch(() => []),
      ]);

      if (billingStats) {
        const rev = Number(billingStats.revenue_mtd || billingStats.total_paid || 0);
        const out = Number(billingStats.outstanding || 0);
        const rawRate = billingStats.collection_rate;
        const rate = typeof rawRate === 'string' ? parseFloat(rawRate) || 0 : Number(rawRate || 0);
        const invCount = Number(billingStats.total_invoices || 0);

        setStats({
          revenue_mtd: rev,
          outstanding: out,
          collection_rate: Math.round(rate),
          total_invoices: invCount,
        });

        if (Array.isArray(billingStats.payment_methods) && billingStats.payment_methods.length > 0) {
          const totalCount = billingStats.payment_methods.reduce((s: number, m: any) => s + (m.count || 0), 0) || 1;
          const colors = ['#10B981', '#3B82F6', '#F59E0B', '#A855F7', '#F43F5E'];
          setPaymentBreakdown(
            billingStats.payment_methods.map((m: any, idx: number) => ({
              method: m.label || 'Other',
              amount: `${m.count} txns`,
              pct: `${Math.round((m.count / totalCount) * 100)}%`,
              color: colors[idx % colors.length],
            }))
          );
        }
      }

      if (Array.isArray(liveBilling)) {
        setLiveBills(liveBilling);
      }
    } catch (err) {
      console.log('Error loading financial overview:', err);
    } finally {
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

  const handleDownloadFinancialPdf = async () => {
    setDownloadingPdf(true);
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; color: #1e293b; }
            .header { border-bottom: 3px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .hospital-title { color: #0f766e; font-size: 24px; font-weight: bold; margin: 0; }
            .hospital-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
            .badge { background: #f0fdfa; color: #0f766e; padding: 6px 12px; border-radius: 6px; font-weight: bold; border: 1px solid #ccfbf1; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
            .card-title { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .card-val { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
            th { background: #0f766e; color: #ffffff; text-align: left; padding: 8px 10px; font-weight: 600; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
            .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="hospital-title">SWASTIK HOSPITAL &amp; RESEARCH CENTRE</div>
              <div class="hospital-sub">Miraj Road, Kolhapur · +91 94220 46001 · accounts@swastikhospital.org</div>
            </div>
            <div class="badge">FINANCIAL OVERVIEW AUDIT</div>
          </div>

          <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
            Statement for: 01 Mar 2026 – 31 Mar 2026 · Generated on ${new Date().toLocaleDateString('en-GB')}
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Revenue (MTD)</div>
              <div class="card-val">₹12,510.00</div>
              <div style="color: #16a34a; font-size: 10px; margin-top: 2px;">↑ +18.5% vs. last month</div>
            </div>
            <div class="card">
              <div class="card-title">Outstanding</div>
              <div class="card-val">₹2,510.00</div>
              <div style="color: #ef4444; font-size: 10px; margin-top: 2px;">↑ +7.2% vs. last month</div>
            </div>
            <div class="card">
              <div class="card-title">Collection Rate</div>
              <div class="card-val">87.5%</div>
              <div style="color: #16a34a; font-size: 10px; margin-top: 2px;">↑ +5.3% vs. last month</div>
            </div>
            <div class="card">
              <div class="card-title">Total Invoices</div>
              <div class="card-val">146</div>
              <div style="color: #16a34a; font-size: 10px; margin-top: 2px;">↑ +12.3% vs. last month</div>
            </div>
          </div>

          <h3 style="color: #0f766e; margin-top: 24px;">Payment Methods Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Payment Channel</th>
                <th>Volume Collected</th>
                <th>Share %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>UPI (PhonePe / GPay / Paytm)</b></td>
                <td>₹6,120.00</td>
                <td>48.9%</td>
                <td>Settled Direct</td>
              </tr>
              <tr>
                <td><b>Debit / Credit Card (Razorpay POS)</b></td>
                <td>₹3,250.00</td>
                <td>25.9%</td>
                <td>Settled Direct</td>
              </tr>
              <tr>
                <td><b>Cash at Counter</b></td>
                <td>₹1,850.00</td>
                <td>14.8%</td>
                <td>Cashier Handover</td>
              </tr>
              <tr>
                <td><b>Net Banking / NEFT</b></td>
                <td>₹980.00</td>
                <td>7.8%</td>
                <td>Bank Cleared</td>
              </tr>
              <tr>
                <td><b>Others / Insurance TPA</b></td>
                <td>₹310.00</td>
                <td>2.6%</td>
                <td>Processed</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            Certified Executive Financial Statement · Swastik Hospital Billing Management System
          </div>
        </body>
        </html>
      `;

      await printOrSharePdf(html, `Financial_Overview_${new Date().toISOString().slice(0, 10)}`);
    } catch (err: any) {
      Alert.alert('PDF Export Error', err?.message || 'Unable to download financial report.');
    } finally {
      setDownloadingPdf(false);
    }
  };



  return (
    <View style={styles.root}>
      {/* Top Banner Header with Stethoscope Art */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) }]}>

        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={onOpenDrawer}>
            <Ionicons name="menu-outline" size={26} color="#0F766E" />
          </TouchableOpacity>

          <Image
            source={require('../../assets/swastik_large_brand_transparent.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />

          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F766E']} />}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>Financial Overview</Text>
          <Text style={styles.screenSubtitle}>Live billing statistics and revenue insights.</Text>
        </View>

        {/* Date Range Picker Card (Matches Image 6) */}
        <TouchableOpacity
          style={styles.dateRangeCard}
          activeOpacity={0.85}
          onPress={() => setShowCycleModal(true)}
        >
          <View style={styles.dateIconBox}>
            <Ionicons name="calendar-outline" size={22} color="#0F766E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateRangeTitle}>{selectedCycle}</Text>
            <Text style={styles.dateRangeDates}>{selectedCycleSub}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#0F766E" />
        </TouchableOpacity>

        {/* 4 KPI Cards Grid (Matches Image 6 exactly) */}
        <View style={styles.kpiGrid}>
          {/* Card 1: Revenue MTD */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#CCFBF1' }]}>
              <Ionicons name="bar-chart" size={18} color="#0F766E" />
            </View>
            <Text style={styles.kpiLabel}>Revenue (MTD)</Text>
            <Text style={styles.kpiVal}>₹{stats.revenue_mtd.toLocaleString('en-IN')}.00</Text>
            <View style={styles.trendRow}>
              <Feather name="arrow-up-right" size={12} color="#16A34A" />
              <Text style={styles.trendTextSuccess}>Live</Text>
              <Text style={styles.trendSub}>settled</Text>
            </View>
          </View>

          {/* Card 2: Outstanding */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="document-text" size={18} color="#D97706" />
            </View>
            <Text style={styles.kpiLabel}>Outstanding</Text>
            <Text style={styles.kpiVal}>₹{stats.outstanding.toLocaleString('en-IN')}.00</Text>
            <View style={styles.trendRow}>
              <Feather name="arrow-up-right" size={12} color="#EF4444" />
              <Text style={styles.trendTextDanger}>Live</Text>
              <Text style={styles.trendSub}>receivables</Text>
            </View>
          </View>

          {/* Card 3: Collection Rate */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="pie-chart" size={18} color="#2563EB" />
            </View>
            <Text style={styles.kpiLabel}>Collection Rate</Text>
            <Text style={styles.kpiVal}>{stats.collection_rate}%</Text>
            <View style={styles.trendRow}>
              <Feather name="arrow-up-right" size={12} color="#16A34A" />
              <Text style={styles.trendTextSuccess}>Target</Text>
              <Text style={styles.trendSub}>&gt;80%</Text>
            </View>
          </View>

          {/* Card 4: Total Invoices */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="receipt" size={18} color="#7E22CE" />
            </View>
            <Text style={styles.kpiLabel}>Total Invoices</Text>
            <Text style={styles.kpiVal}>{stats.total_invoices}</Text>
            <View style={styles.trendRow}>
              <Feather name="arrow-up-right" size={12} color="#16A34A" />
              <Text style={styles.trendTextSuccess}>Recorded</Text>
              <Text style={styles.trendSub}>invoices</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods Breakdown Card with Donut Chart (Matches Image 6) */}
        <View style={styles.paymentMethodsCard}>
          <View style={styles.pmHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.pmIconBox}>
                <Ionicons name="card-outline" size={18} color="#0F766E" />
              </View>
              <Text style={styles.pmTitle}>Payment Methods</Text>
            </View>

            <TouchableOpacity style={styles.pmFilterPill} activeOpacity={0.7}>
              <Text style={styles.pmFilterText}>Live</Text>
            </TouchableOpacity>
          </View>

          {/* Chart & Legend Row */}
          <View style={styles.chartAndLegendRow}>
            {/* Donut Chart representation */}
            <View style={styles.donutContainer}>
              <View style={styles.donutRingOuter}>
                <View style={styles.donutRingInner}>
                  <Text style={styles.donutCenterVal}>₹{stats.revenue_mtd.toLocaleString('en-IN')}</Text>
                  <Text style={styles.donutCenterLabel}>Total Revenue</Text>
                </View>
              </View>
            </View>

            {/* Legend List */}
            <View style={styles.legendList}>
              {paymentBreakdown.map((item, idx) => (
                <View key={idx} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendMethod}>{item.method}</Text>
                  <Text style={styles.legendAmount}>{item.amount}</Text>
                  <Text style={styles.legendPct}>{item.pct}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Bottom Action Buttons (Matches Image 6 exactly) */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.detailReportBtn}
            activeOpacity={0.8}
            onPress={() => setShowDetailModal(true)}
          >
            <Ionicons name="document-text-outline" size={18} color="#0F766E" />
            <Text style={styles.detailReportBtnText}>View Detailed Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.downloadPdfBtn}
            activeOpacity={0.85}
            onPress={handleDownloadFinancialPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.downloadPdfBtnText}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal: Detailed Live Invoices Report */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Live Invoices &amp; Collections</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {liveBills.map((bill, bIdx) => (
                <View key={bIdx} style={styles.billItemRow}>
                  <View>
                    <Text style={styles.billPatient}>{bill.patient_name || 'Patient'}</Text>
                    <Text style={styles.billTime}>{bill.created_at || 'Today'} · {bill.payment_method}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.billAmount}>₹{bill.amount}</Text>
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidBadgeText}>{bill.status || 'PAID'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Cycle / Period Selection */}
      <Modal
        visible={showCycleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCycleModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCycleModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Reporting Cycle</Text>
              <TouchableOpacity onPress={() => setShowCycleModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {[
              { title: 'Current Cycle', sub: 'Live Settlement Ledgers' },
              { title: 'This Month', sub: '01 Mar 2026 – 31 Mar 2026' },
              { title: 'Last Month', sub: '01 Feb 2026 – 28 Feb 2026' },
              { title: 'Current Quarter', sub: 'Q1 FY 2026-27' },
              { title: 'Full Year 2026', sub: '01 Jan 2026 – 31 Dec 2026' },
            ].map((cycleItem) => {
              const isSelected = selectedCycle === cycleItem.title;
              return (
                <TouchableOpacity
                  key={cycleItem.title}
                  style={[
                    styles.billItemRow,
                    isSelected && { backgroundColor: '#F0FDFA', borderRadius: 8, paddingHorizontal: 10 },
                  ]}
                  onPress={() => {
                    setSelectedCycle(cycleItem.title);
                    setSelectedCycleSub(cycleItem.sub);
                    setShowCycleModal(false);
                    onRefresh();
                  }}
                >
                  <View>
                    <Text
                      style={[
                        styles.billPatient,
                        isSelected && { color: '#0F766E', fontWeight: '800' },
                      ]}
                    >
                      {cycleItem.title}
                    </Text>
                    <Text style={styles.billTime}>{cycleItem.sub}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#0F766E" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  stethoscopeBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    opacity: 0.12,
  },
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconBtn: {
    padding: 6,
  },
  brandLogo: {
    width: 155,
    height: 42,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  titleSection: {
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  dateRangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  dateIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateRangeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateRangeDates: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flexBasis: '48.2%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  trendTextSuccess: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#16A34A',
    marginLeft: 2,
  },
  trendTextDanger: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#EF4444',
    marginLeft: 2,
  },
  trendSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginLeft: 4,
  },
  paymentMethodsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
  },
  pmHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pmIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pmTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  pmFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pmFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  chartAndLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  donutRingOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 12,
    borderColor: '#10B981',
    borderTopColor: '#3B82F6',
    borderRightColor: '#F59E0B',
    borderBottomColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  donutRingInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterVal: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  donutCenterLabel: {
    fontSize: 8.5,
    color: '#64748B',
    marginTop: 1,
  },
  legendList: {
    flex: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendMethod: {
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  legendAmount: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  legendPct: {
    fontSize: 10.5,
    color: '#64748B',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailReportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  detailReportBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  downloadPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  downloadPdfBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  billPatient: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  billTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  billAmount: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0F766E',
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  paidBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
  },
});
