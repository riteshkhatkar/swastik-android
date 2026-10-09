// swastik-android/screens/lab/LabDashboardScreen.tsx
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
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { labApi, getApiErrorMessage } from '../../services/api';

interface LabDashboardScreenProps {
  onOpenDrawer: () => void;
  onNavigateToReport: (requestId: string, patientData?: any) => void;
  onNavigateToSamples: () => void;
}

export const LabDashboardScreen: React.FC<LabDashboardScreenProps> = ({
  onOpenDrawer,
  onNavigateToReport,
  onNavigateToSamples,
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    requestsToday: 0,
    pendingCollection: 0,
    inProcess: 0,
    reportsReady: 0,
    criticalAlerts: 0,
    avgWaitTime: 15,
  });
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, queueData] = await Promise.all([
        labApi.getLabStats(false).catch(() => null),
        labApi.getTestRequests(statusFilter === 'All Status' ? undefined : statusFilter).catch(() => []),
      ]);
      if (statsData) {
        setStats({
          requestsToday: statsData.total_today ?? statsData.requestsToday ?? (Array.isArray(queueData) ? queueData.length : 0),
          pendingCollection: statsData.pending ?? statsData.pendingCollection ?? 0,
          inProcess: statsData.in_process ?? statsData.inProcess ?? 0,
          reportsReady: statsData.reports_ready ?? statsData.reportsReady ?? 0,
          criticalAlerts: statsData.critical_alerts ?? statsData.criticalAlerts ?? 0,
          avgWaitTime: statsData.avgWaitTime ?? 15,
        });
      }
      if (queueData && Array.isArray(queueData)) {
        setQueue(queueData);
      }
    } catch (err) {
      console.log('Error loading lab data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAction = async (item: any) => {
    try {
      if (item.status === 'REQUESTED') {
        await labApi.acknowledgeRequest(item.id);
        Alert.alert('Acknowledged', `Request ${item.id} has been acknowledged.`);
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'ACKNOWLEDGED' } : q))
        );
      } else if (item.status === 'ACKNOWLEDGED') {
        await labApi.startSampleCollection(item.id);
        Alert.alert('Sample Collection', `Sample collection started for ${item.patientName}.`);
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'SAMPLE COLLECTED' } : q))
        );
      } else if (item.status === 'SAMPLE COLLECTED') {
        await labApi.markTestInProcess(item.id);
        Alert.alert('Processing', `Test marked in-process for ${item.patientName}.`);
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'IN PROCESS' } : q))
        );
      } else if (item.status === 'IN PROCESS') {
        Alert.alert('Results Entry', `Enter laboratory findings for ${item.patientName}.`);
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'RESULTS ENTERED' } : q))
        );
      } else {
        // RESULTS ENTERED or REPORT READY
        onNavigateToReport(item.id, item);
      }
    } catch (err) {
      Alert.alert('Action Error', 'Could not update request status.');
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.patientName && item.patientName.toLowerCase().includes(q)) ||
      (item.id && item.id.toLowerCase().includes(q)) ||
      (item.tests && item.tests.toLowerCase().includes(q))
    );
  });

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return { bg: '#E0F2FE', text: '#0284C7' };
      case 'ACKNOWLEDGED':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'SAMPLE COLLECTED':
        return { bg: '#DCFCE7', text: '#15803D' };
      case 'IN PROCESS':
        return { bg: '#FEF9C3', text: '#CA8A04' };
      case 'RESULTS ENTERED':
        return { bg: '#EDE9FE', text: '#7C3AED' };
      case 'REPORT READY':
        return { bg: '#D1FAE5', text: '#059669' };
      default:
        return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const renderActionButton = (item: any) => {
    switch (item.status) {
      case 'REQUESTED':
        return (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnTealFilled]}
            onPress={() => handleAction(item)}
          >
            <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
            <Text style={styles.actionBtnFilledText}>Acknowledge</Text>
          </TouchableOpacity>
        );
      case 'ACKNOWLEDGED':
        return (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => handleAction(item)}
          >
            <MaterialCommunityIcons name="test-tube" size={15} color="#0F766E" />
            <Text style={styles.actionBtnOutlineText}>Collect</Text>
          </TouchableOpacity>
        );
      case 'SAMPLE COLLECTED':
        return (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => handleAction(item)}
          >
            <Ionicons name="settings-outline" size={15} color="#0F766E" />
            <Text style={styles.actionBtnOutlineText}>Process</Text>
          </TouchableOpacity>
        );
      case 'IN PROCESS':
        return (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => handleAction(item)}
          >
            <Ionicons name="document-text-outline" size={15} color="#0F766E" />
            <Text style={styles.actionBtnOutlineText}>Results</Text>
          </TouchableOpacity>
        );
      case 'RESULTS ENTERED':
        return (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => handleAction(item)}
          >
            <Ionicons name="document-text-outline" size={15} color="#0F766E" />
            <Text style={styles.actionBtnOutlineText}>Report</Text>
          </TouchableOpacity>
        );
      case 'REPORT READY':
      default:
        return (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => handleAction(item)}
          >
            <Ionicons name="eye-outline" size={15} color="#0F766E" />
            <Text style={styles.actionBtnOutlineText}>View</Text>
          </TouchableOpacity>
        );
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        {/* Title & Subtitle */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Laboratory Workspace</Text>
          <Text style={styles.subTitle}>
            Monitor requests, collect samples, and publish test results.
          </Text>
        </View>

        {/* 6 KPI Metric Cards Grid */}
        <View style={styles.kpiGrid}>
          {/* 1. Requests Today */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E6FFFA' }]}>
              <Ionicons name="calendar-outline" size={18} color="#0D9488" />
            </View>
            <Text style={styles.kpiLabel}>Requests Today</Text>
            <Text style={styles.kpiValue}>{stats.requestsToday}</Text>
          </View>

          {/* 2. Pending Collection */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E0F2FE' }]}>
              <MaterialCommunityIcons name="flask-outline" size={18} color="#0284C7" />
            </View>
            <Text style={styles.kpiLabel}>Pending Collection</Text>
            <Text style={styles.kpiValue}>{stats.pendingCollection}</Text>
          </View>

          {/* 3. Tests in Process */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="settings-outline" size={18} color="#0284C7" />
            </View>
            <Text style={styles.kpiLabel}>Tests in Process</Text>
            <Text style={styles.kpiValue}>{stats.inProcess}</Text>
          </View>

          {/* 4. Reports Ready */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E6FFFA' }]}>
              <Ionicons name="document-text-outline" size={18} color="#0D9488" />
            </View>
            <Text style={styles.kpiLabel}>Reports Ready</Text>
            <Text style={styles.kpiValue}>{stats.reportsReady}</Text>
          </View>

          {/* 5. Critical Alerts */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="warning-outline" size={18} color="#EF4444" />
            </View>
            <Text style={styles.kpiLabel}>Critical Alerts</Text>
            <Text style={[styles.kpiValue, { color: '#EF4444' }]}>{stats.criticalAlerts}</Text>
          </View>

          {/* 6. Avg Wait Time */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="time-outline" size={18} color="#0284C7" />
            </View>
            <Text style={styles.kpiLabel}>Avg Wait Time</Text>
            <Text style={styles.kpiValue}>{stats.avgWaitTime} min</Text>
          </View>
        </View>

        {/* Today's Test Queue Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.accentBar} />
          <Text style={styles.sectionTitle}>Today's Test Queue</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patient name or request ID..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Dropdown */}
        <TouchableOpacity
          style={styles.dropdownToggle}
          activeOpacity={0.8}
          onPress={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
        >
          <Text style={styles.dropdownToggleText}>{statusFilter}</Text>
          <Feather
            name={isFilterDropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#64748B"
          />
        </TouchableOpacity>

        {isFilterDropdownOpen && (
          <View style={styles.dropdownMenu}>
            {[
              'All Status',
              'REQUESTED',
              'ACKNOWLEDGED',
              'SAMPLE COLLECTED',
              'IN PROCESS',
              'RESULTS ENTERED',
              'REPORT READY',
            ].map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.dropdownItem, statusFilter === st && styles.dropdownItemActive]}
                onPress={() => {
                  setStatusFilter(st);
                  setIsFilterDropdownOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    statusFilter === st && styles.dropdownItemTextActive,
                  ]}
                >
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Test Queue List */}
        {loading ? (
          <ActivityIndicator color="#0F766E" style={{ marginVertical: 32 }} />
        ) : (
          <View style={styles.queueList}>
            {filteredQueue.map((item) => {
              const badge = getStatusBadgeStyle(item.status);
              return (
                <View key={item.id} style={styles.queueCard}>
                  <View style={styles.queueTopRow}>
                    <View style={styles.patientInfoCol}>
                      <Text style={styles.patientName}>{item.patientName}</Text>
                      <Text style={styles.testsText}>{item.tests}</Text>
                    </View>

                    <View style={styles.doctorDateCol}>
                      <Text style={styles.doctorName}>{item.doctorName}</Text>
                      <Text style={styles.dateTimeText}>{item.date}</Text>
                    </View>

                    <View style={styles.statusCol}>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actionCol}>{renderActionButton(item)}</View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Lab Test History Banner */}
        <TouchableOpacity
          style={styles.historyCard}
          activeOpacity={0.85}
          onPress={onNavigateToSamples}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Lab Test History</Text>
          </View>
          <Text style={styles.historySub}>View completed tests and reports.</Text>
        </TouchableOpacity>
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    width: '31%',
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
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  accentBar: {
    width: 4,
    height: 18,
    backgroundColor: '#0F766E',
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    padding: 0,
  },
  dropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  dropdownToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownItemActive: {
    backgroundColor: '#F0FDFA',
  },
  dropdownItemText: {
    fontSize: 12.5,
    color: '#475569',
  },
  dropdownItemTextActive: {
    color: '#0F766E',
    fontWeight: '700',
  },
  queueList: {
    gap: 10,
  },
  queueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  queueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  patientInfoCol: {
    minWidth: 120,
    flex: 1,
  },
  patientName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  testsText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  doctorDateCol: {
    minWidth: 80,
  },
  doctorName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  dateTimeText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusCol: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionCol: {
    alignItems: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnTealFilled: {
    backgroundColor: '#0F766E',
  },
  actionBtnFilledText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: '#0F766E',
    backgroundColor: '#FFFFFF',
  },
  actionBtnOutlineText: {
    color: '#0F766E',
    fontWeight: '700',
    fontSize: 11,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 18,
  },
  historySub: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 12,
  },
});
