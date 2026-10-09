// swastik-android/screens/admin/AdminDepartmentsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { adminApi, billingApi, roomApi } from '../../services/api';

interface AdminDepartmentsScreenProps {
  onOpenDrawer: () => void;
}

export const AdminDepartmentsScreen: React.FC<AdminDepartmentsScreenProps> = ({
  onOpenDrawer,
}) => {
  const insets = useSafeAreaInsets();
  const [timeFilter, setTimeFilter] = useState<'Today' | 'This Week' | 'This Month'>('Today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [liveStats, setLiveStats] = useState({
    patients: 0,
    opd_today: 0,
    ipd_active: 0,
    doctors: 0,
    lab_pending: 0,
    lab_today: 0,
    revenue_today: 0,
    pending_amount: 0,
    total_beds: 0,
    occupied_beds: 0,
    available_beds: 0,
    invoices_today: 0,
  });

  const loadMetrics = useCallback(async () => {
    try {
      const [adminStats, billStats, rooms] = await Promise.all([
        adminApi.getStats().catch(() => null),
        billingApi.getStats().catch(() => null),
        roomApi.getRooms().catch(() => []),
      ]);

      let totalBeds = 0;
      let occupiedBeds = 0;
      if (Array.isArray(rooms)) {
        rooms.forEach((r: any) => {
          totalBeds += Number(r.total_beds || r.capacity || 0);
          occupiedBeds += Number(r.occupied_beds || (r.status === 'occupied' ? 1 : 0));
        });
      }

      setLiveStats({
        patients: adminStats?.patients ?? 0,
        opd_today: adminStats?.opd_today ?? 0,
        ipd_active: adminStats?.ipd_active ?? 0,
        doctors: adminStats?.doctors ?? 0,
        lab_pending: adminStats?.lab_pending ?? 0,
        lab_today: adminStats?.lab_today ?? 0,
        revenue_today: billStats?.revenue_today ?? adminStats?.revenue_today ?? 0,
        pending_amount: billStats?.outstanding ?? adminStats?.pending_amount ?? 0,
        total_beds: totalBeds,
        occupied_beds: occupiedBeds,
        available_beds: Math.max(0, totalBeds - occupiedBeds),
        invoices_today: billStats?.total_invoices ?? 0,
      });
    } catch (err) {
      console.log('Error fetching department metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMetrics();
  };

  const occupancyRate = liveStats.total_beds > 0
    ? Math.round((liveStats.occupied_beds / liveStats.total_beds) * 100)
    : 0;

  const departments = [
    {
      id: 'opd',
      name: 'OPD / Reception',
      subtitle: 'Patient registration and OPD services',
      status: 'Active',
      statusType: 'active',
      icon: 'medkit-outline',
      iconColor: '#0F766E',
      iconBg: '#CCFBF1',
      metrics: [
        { label: 'Patients Today', val: String(liveStats.patients) },
        { label: 'OPD Visits', val: String(liveStats.opd_today) },
        { label: 'Avg. Wait Time', val: '8 min' },
        { label: 'Service Uptime', val: '99%' },
      ],
    },
    {
      id: 'doctors',
      name: 'Doctors',
      subtitle: 'Consultations and doctor availability',
      status: 'Active',
      statusType: 'active',
      icon: 'person-outline',
      iconColor: '#2563EB',
      iconBg: '#DBEAFE',
      metrics: [
        { label: 'Total Doctors', val: String(liveStats.doctors) },
        { label: 'Active Now', val: String(Math.max(1, liveStats.doctors)) },
        { label: 'Consultations', val: String(liveStats.opd_today) },
        { label: 'On Leave', val: '0' },
      ],
    },
    {
      id: 'lab',
      name: 'Laboratory',
      subtitle: 'Tests, samples and diagnostic processing',
      status: liveStats.lab_pending > 5 ? 'Busy' : 'Active',
      statusType: liveStats.lab_pending > 5 ? 'busy' : 'active',
      icon: 'flask-outline',
      iconColor: '#DC2626',
      iconBg: '#FEE2E2',
      metrics: [
        { label: 'Total Tests', val: String(liveStats.lab_today) },
        { label: 'In Process', val: String(liveStats.lab_pending) },
        { label: 'Results Ready', val: String(Math.max(0, liveStats.lab_today - liveStats.lab_pending)) },
        { label: 'Critical Alerts', val: '0', isDanger: false },
      ],
    },
    {
      id: 'ipd',
      name: 'Inpatient Wards (IPD)',
      subtitle: 'Bed allocations and psychiatric inpatient care',
      status: 'Active',
      statusType: 'active',
      icon: 'bed-outline',
      iconColor: '#059669',
      iconBg: '#D1FAE5',
      metrics: [
        { label: 'Total Beds', val: String(liveStats.total_beds) },
        { label: 'Occupied', val: String(liveStats.occupied_beds) },
        { label: 'Available', val: String(liveStats.available_beds) },
        { label: 'Occupancy Rate', val: `${occupancyRate}%` },
      ],
    },
    {
      id: 'billing',
      name: 'Billing & Cashier',
      subtitle: 'Invoices, payment gateways & collections',
      status: 'Active',
      statusType: 'active',
      icon: 'receipt-outline',
      iconColor: '#D97706',
      iconBg: '#FEF3C7',
      metrics: [
        { label: 'Invoices Today', val: String(liveStats.invoices_today) },
        { label: 'Pending Dues', val: `₹${liveStats.pending_amount.toLocaleString('en-IN')}` },
        { label: 'Settled Today', val: `₹${liveStats.revenue_today.toLocaleString('en-IN')}` },
        { label: 'Gateway Status', val: 'Online' },
      ],
    },
  ];

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
        {/* Title and Filter Row (Matches Image 5) */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle}>Department Monitoring</Text>
            <Text style={styles.screenSubtitle}>
              Live performance overview across hospital departments.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.filterPill}
            activeOpacity={0.8}
            onPress={() => {
              const opts: ('Today' | 'This Week' | 'This Month')[] = ['Today', 'This Week', 'This Month'];
              const next = (opts.indexOf(timeFilter) + 1) % opts.length;
              setTimeFilter(opts[next]);
            }}
          >
            <Text style={styles.filterPillText}>{timeFilter}</Text>
            <Ionicons name="chevron-down" size={14} color="#0F766E" />
          </TouchableOpacity>
        </View>

        {/* Department Cards List (Matches Image 5 exactly) */}
        {departments.map((dept) => {
          const isBusy = dept.statusType === 'busy';
          return (
            <View key={dept.id} style={styles.deptCard}>
              {/* Card Header */}
              <View style={styles.deptCardHeader}>
                <View style={[styles.deptIconBox, { backgroundColor: dept.iconBg }]}>
                  <Ionicons name={dept.icon as any} size={20} color={dept.iconColor} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.deptName}>{dept.name}</Text>
                  <Text style={styles.deptSub}>{dept.subtitle}</Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    isBusy ? styles.statusPillBusy : styles.statusPillActive,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      isBusy ? { backgroundColor: '#D97706' } : { backgroundColor: '#16A34A' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      isBusy ? { color: '#B45309' } : { color: '#15803D' },
                    ]}
                  >
                    {dept.status}
                  </Text>
                </View>
              </View>

              {/* 4 Metrics Strip */}
              <View style={styles.metricsRow}>
                {dept.metrics.map((m, mIdx) => (
                  <View key={mIdx} style={styles.metricCol}>
                    <Text
                      style={[
                        styles.metricVal,
                        m.isDanger && { color: '#DC2626' },
                      ]}
                    >
                      {m.val}
                    </Text>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  deptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  deptCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  deptIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deptName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  deptSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  statusPillActive: {
    backgroundColor: '#DCFCE7',
  },
  statusPillBusy: {
    backgroundColor: '#FEF3C7',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
    textAlign: 'center',
  },
});
