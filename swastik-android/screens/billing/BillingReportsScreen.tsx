// swastik-android/screens/billing/BillingReportsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';

interface BillingReportsScreenProps {
  onOpenDrawer: () => void;
}

export const BillingReportsScreen: React.FC<BillingReportsScreenProps> = ({ onOpenDrawer }) => {
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [chartRange, setChartRange] = useState('Last 6 Months');
  const [showChartRangeModal, setShowChartRangeModal] = useState(false);

  const trendPoints = [
    { month: 'Jan', val: 8.4 },
    { month: 'Feb', val: 11.2 },
    { month: 'Mar', val: 14.6 },
    { month: 'Apr', val: 16.8 },
    { month: 'May', val: 19.1 },
    { month: 'Jun', val: 22.4 },
  ];

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
          <Text style={styles.mainTitle}>Billing Reports</Text>
          <Text style={styles.subTitle}>Track revenue, collections and billing performance.</Text>
        </View>

        {/* Date Filter Dropdown */}
        <View style={styles.filterDropdownRow}>
          <TouchableOpacity
            style={styles.filterDropdown}
            activeOpacity={0.7}
            onPress={() => setShowPeriodModal(true)}
          >
            <Ionicons name="calendar-outline" size={14} color="#0F766E" />
            <Text style={styles.filterDropdownText}>{selectedPeriod}</Text>
            <Feather name="chevron-down" size={14} color="#0F766E" />
          </TouchableOpacity>
        </View>

        {/* 5 Metric Cards (Matching Image 7) */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Revenue Today */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#E6FFFA' }]}>
              <Ionicons name="cash-outline" size={18} color="#0D9488" />
            </View>
            <Text style={styles.metricLabel}>Revenue Today</Text>
            <Text style={styles.metricValue}>₹25,450</Text>
            <Text style={styles.metricTrendGreen}>↗ +12% vs. yesterday</Text>
          </View>

          {/* Card 2: Revenue MTD */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="bar-chart-outline" size={18} color="#0284C7" />
            </View>
            <Text style={styles.metricLabel}>Revenue MTD</Text>
            <Text style={styles.metricValue}>₹18,42,300</Text>
            <Text style={styles.metricTrendGreen}>↗ +8% vs. last month</Text>
          </View>

          {/* Card 3: Total Collected */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#E6FFFA' }]}>
              <Ionicons name="wallet-outline" size={18} color="#0D9488" />
            </View>
            <Text style={styles.metricLabel}>Total Collected</Text>
            <Text style={styles.metricValue}>₹16,25,600</Text>
            <Text style={styles.metricTrendGreen}>↗ +10% vs. last month</Text>
          </View>

          {/* Card 4: Outstanding */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="document-text-outline" size={18} color="#0284C7" />
            </View>
            <Text style={styles.metricLabel}>Outstanding</Text>
            <Text style={styles.metricValue}>₹2,16,700</Text>
            <Text style={styles.metricTrendAmber}>↗ +5% vs. last month</Text>
          </View>

          {/* Card 5: Collection Rate */}
          <View style={[styles.metricCard, { width: '100%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.metricIconCircle, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={{ fontWeight: '800', color: '#7C3AED', fontSize: 16 }}>%</Text>
                </View>
                <View>
                  <Text style={styles.metricLabel}>Collection Rate</Text>
                  <Text style={styles.metricValue}>88.2%</Text>
                </View>
              </View>
              <Text style={styles.metricTrendGreen}>↗ +2.4% vs. last month</Text>
            </View>
          </View>
        </View>

        {/* Revenue Trend Chart Card (Matching Image 7) */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartTitle}>Revenue Trend (₹ Lakhs)</Text>
            <TouchableOpacity
              style={styles.chartFilterPill}
              activeOpacity={0.7}
              onPress={() => setShowChartRangeModal(true)}
            >
              <Text style={styles.chartFilterText}>{chartRange}</Text>
              <Feather name="chevron-down" size={13} color="#0F766E" />
            </TouchableOpacity>
          </View>

          {/* Visual SVG-style line trend simulation */}
          <View style={styles.chartCanvas}>
            <View style={styles.trendBarsRow}>
              {trendPoints.map((pt, idx) => (
                <View key={pt.month} style={styles.trendBarCol}>
                  <Text style={styles.trendValueText}>{pt.val}</Text>
                  <View style={[styles.trendBarFill, { height: pt.val * 5.5 }]} />
                  <Text style={styles.trendMonthText}>{pt.month}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Bottom Split Cards (Matching Image 7) */}
        <View style={styles.splitCardsRow}>
          {/* Invoice Status Card */}
          <View style={styles.splitCard}>
            <View style={styles.splitHeaderRow}>
              <Text style={styles.splitTitle}>Invoice Status</Text>
              <Feather name="chevron-right" size={16} color="#94A3B8" />
            </View>
            <View style={styles.statusList}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.statusLabel}>Paid</Text>
                <Text style={styles.statusCount}>146</Text>
                <View style={[styles.pctBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.pctText, { color: '#16A34A' }]}>60%</Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.statusLabel}>Pending</Text>
                <Text style={styles.statusCount}>72</Text>
                <View style={[styles.pctBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.pctText, { color: '#D97706' }]}>30%</Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.statusLabel}>Overdue</Text>
                <Text style={styles.statusCount}>18</Text>
                <View style={[styles.pctBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.pctText, { color: '#DC2626' }]}>7%</Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: '#94A3B8' }]} />
                <Text style={styles.statusLabel}>Cancelled</Text>
                <Text style={styles.statusCount}>6</Text>
                <View style={[styles.pctBadge, { backgroundColor: '#F1F5F9' }]}>
                  <Text style={[styles.pctText, { color: '#64748B' }]}>3%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Payment Method Breakdown Card */}
          <View style={styles.splitCard}>
            <View style={styles.splitHeaderRow}>
              <Text style={styles.splitTitle}>Payment Methods</Text>
              <Feather name="chevron-right" size={16} color="#94A3B8" />
            </View>
            <View style={styles.donutContainer}>
              <View style={styles.donutCenter}>
                <Text style={styles.donutTotal}>₹18.4L</Text>
                <Text style={styles.donutSub}>Total</Text>
              </View>
            </View>
            <View style={styles.legendGrid}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#0F766E' }]} />
                <Text style={styles.legendText}>Cash 42%</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#14B8A6' }]} />
                <Text style={styles.legendText}>Card 28%</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#38BDF8' }]} />
                <Text style={styles.legendText}>UPI 22%</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#A78BFA' }]} />
                <Text style={styles.legendText}>Ins. 8%</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Period Selection Modal */}
      <Modal
        visible={showPeriodModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPeriodModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Reporting Period</Text>
              <TouchableOpacity onPress={() => setShowPeriodModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {['Today', 'This Week', 'This Month', 'This Quarter', 'This Year', 'All Time'].map((period) => {
              const isSelected = selectedPeriod === period;
              return (
                <TouchableOpacity
                  key={period}
                  style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                  onPress={() => {
                    setSelectedPeriod(period);
                    setShowPeriodModal(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextActive]}>
                    {period}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color="#0F766E" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Chart Range Selection Modal */}
      <Modal
        visible={showChartRangeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChartRangeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowChartRangeModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Trend Range</Text>
              <TouchableOpacity onPress={() => setShowChartRangeModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {['Last 30 Days', 'Last 3 Months', 'Last 6 Months', 'This Year'].map((range) => {
              const isSelected = chartRange === range;
              return (
                <TouchableOpacity
                  key={range}
                  style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                  onPress={() => {
                    setChartRange(range);
                    setShowChartRangeModal(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextActive]}>
                    {range}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color="#0F766E" />}
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
    marginBottom: 12,
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
  filterDropdownRow: {
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  filterDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  metricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricTrendGreen: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '700',
    marginTop: 4,
  },
  metricTrendAmber: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '700',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  chartFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  chartFilterText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  chartCanvas: {
    height: 150,
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  trendBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  trendBarCol: {
    alignItems: 'center',
    gap: 4,
  },
  trendValueText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  trendBarFill: {
    width: 22,
    backgroundColor: '#0F766E',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  trendMonthText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  splitCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  splitCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  splitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  splitTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  statusList: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 11,
    color: '#334155',
    flex: 1,
  },
  statusCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  pctBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pctText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  donutContainer: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTotal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F766E',
  },
  donutSub: {
    fontSize: 9,
    color: '#64748B',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '46%',
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 10,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalOptionActive: {
    backgroundColor: '#F0FDFA',
  },
  modalOptionText: {
    fontSize: 14,
    color: '#334155',
  },
  modalOptionTextActive: {
    fontWeight: '700',
    color: '#0F766E',
  },
});
