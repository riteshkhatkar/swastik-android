// swastik-android/screens/admin/AdminAuditSecurityScreen.tsx
import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/api';

interface AdminAuditSecurityScreenProps {
  onOpenDrawer: () => void;
}

export const AdminAuditSecurityScreen: React.FC<AdminAuditSecurityScreenProps> = ({
  onOpenDrawer,
}) => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedModule, setSelectedModule] = useState('All Modules');
  const [selectedDateRange, setSelectedDateRange] = useState('01 Mar - 12 Mar');
  const [selectedUserFilter, setSelectedUserFilter] = useState('All Users');
  const [logs, setLogs] = useState<any[]>([]);

  const loadLogs = async () => {
    try {
      const data = await adminApi.getLogs();
      if (Array.isArray(data)) setLogs(data);
    } catch {
      // keep fallback
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const filteredLogs = logs.filter((log) => {
    if (selectedModule !== 'All Modules' && log.module?.toUpperCase() !== selectedModule.toUpperCase()) {
      return false;
    }
    if (selectedUserFilter !== 'All Users' && !log.user?.toLowerCase().includes(selectedUserFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getModuleBadgeStyle = (mod: string) => {
    switch (mod?.toUpperCase()) {
      case 'AUTH':
        return { bg: '#DCFCE7', text: '#15803D' };
      case 'PATIENT':
        return { bg: '#FEE2E2', text: '#DC2626' };
      case 'USER':
        return { bg: '#F3E8FF', text: '#7E22CE' };
      case 'LAB':
        return { bg: '#FCE7F3', text: '#BE185D' };
      case 'BILLING':
        return { bg: '#CCFBF1', text: '#0F766E' };
      case 'SYSTEM':
        return { bg: '#FEF3C7', text: '#B45309' };
      case 'APPOINTMENT':
        return { bg: '#E0F2FE', text: '#0284C7' };
      default:
        return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'LOGIN':
        return { bg: '#EFF6FF', text: '#2563EB' };
      case 'CREATE':
        return { bg: '#ECFDF5', text: '#059669' };
      case 'UPDATE':
        return { bg: '#F0FDFA', text: '#0F766E' };
      case 'VIEW':
        return { bg: '#F8FAFC', text: '#475569' };
      case 'DELETE':
        return { bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { bg: '#F1F5F9', text: '#64748B' };
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
          <Text style={styles.screenTitle}>Audit &amp; Security Logs</Text>
          <Text style={styles.screenSubtitle}>
            Track system activities and monitor security events.
          </Text>
        </View>

        {/* 3 Metric Cards (Dynamic) */}
        <View style={styles.metricsRow}>
          {/* Card 1 */}
          <View style={styles.metricCard}>
            <View style={[styles.mIconCircle, { backgroundColor: '#CCFBF1' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#0F766E" />
            </View>
            <View>
              <Text style={styles.mVal}>
                {logs.filter((l) => l.type?.toUpperCase() === 'LOGIN' || l.action?.toLowerCase().includes('login')).length}
              </Text>
              <Text style={styles.mLabel}>Login Events</Text>
            </View>
          </View>

          {/* Card 2 */}
          <View style={styles.metricCard}>
            <View style={[styles.mIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="settings" size={20} color="#D97706" />
            </View>
            <View>
              <Text style={styles.mVal}>
                {logs.filter(
                  (l) =>
                    l.module?.toUpperCase() === 'SYSTEM' ||
                    l.module?.toUpperCase() === 'USER' ||
                    l.module?.toUpperCase() === 'ADMIN' ||
                    l.action?.toLowerCase().includes('admin') ||
                    l.action?.toLowerCase().includes('config')
                ).length}
              </Text>
              <Text style={styles.mLabel}>Admin Actions</Text>
            </View>
          </View>

          {/* Card 3 */}
          <View style={styles.metricCard}>
            <View style={[styles.mIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="server" size={20} color="#7E22CE" />
            </View>
            <View>
              <Text style={styles.mVal}>{logs.length}</Text>
              <Text style={styles.mLabel}>Total Records</Text>
            </View>
          </View>
        </View>

        {/* Filters Card (Matches Image 9) */}
        <View style={styles.filtersCard}>
          <View style={styles.filtersHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="funnel-outline" size={16} color="#0F766E" />
              <Text style={styles.filtersTitle}>Filters</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} activeOpacity={0.7} onPress={onRefresh}>
              <Ionicons name="sync-outline" size={14} color="#0F766E" />
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterInputsRow}>
            {/* Filter 1: Date Range */}
            <View style={{ flex: 1.2 }}>
              <Text style={styles.fLabel}>Date Range</Text>
              <TouchableOpacity
                style={styles.fBox}
                activeOpacity={0.7}
                onPress={() => {
                  const ranges = ['01 Mar - 12 Mar', 'Today', 'Yesterday', 'Last 7 Days', 'All Time'];
                  const next = (ranges.indexOf(selectedDateRange) + 1) % ranges.length;
                  setSelectedDateRange(ranges[next]);
                }}
              >
                <Ionicons name="calendar-outline" size={13} color="#0F766E" />
                <Text style={styles.fText} numberOfLines={1}>{selectedDateRange}</Text>
                <Ionicons name="chevron-down" size={12} color="#0F766E" />
              </TouchableOpacity>
            </View>

            {/* Filter 2: Module */}
            <View style={{ flex: 1 }}>
              <Text style={styles.fLabel}>Module</Text>
              <TouchableOpacity
                style={styles.fBox}
                activeOpacity={0.7}
                onPress={() => {
                  const mods = ['All Modules', 'AUTH', 'PATIENT', 'USER', 'LAB', 'BILLING', 'SYSTEM'];
                  const next = (mods.indexOf(selectedModule) + 1) % mods.length;
                  setSelectedModule(mods[next]);
                }}
              >
                <Ionicons name="grid-outline" size={13} color="#0F766E" />
                <Text style={styles.fText} numberOfLines={1}>{selectedModule}</Text>
                <Ionicons name="chevron-down" size={12} color="#0F766E" />
              </TouchableOpacity>
            </View>

            {/* Filter 3: User */}
            <View style={{ flex: 1 }}>
              <Text style={styles.fLabel}>User</Text>
              <TouchableOpacity
                style={styles.fBox}
                activeOpacity={0.7}
                onPress={() => {
                  const users = ['All Users', 'admin', 'doctor', 'receptionist', 'lab', 'billing'];
                  const next = (users.indexOf(selectedUserFilter) + 1) % users.length;
                  setSelectedUserFilter(users[next]);
                }}
              >
                <Ionicons name="person-outline" size={13} color="#0F766E" />
                <Text style={styles.fText} numberOfLines={1}>{selectedUserFilter}</Text>
                <Ionicons name="chevron-down" size={12} color="#0F766E" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Activity Log List Card (Matches Image 9) */}
        <View style={styles.logsCard}>
          <View style={styles.logsHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="document-text-outline" size={18} color="#0F766E" />
              <Text style={styles.logsTitle}>Activity Log</Text>
            </View>
            <Text style={styles.logsCountText}>Showing {filteredLogs.length} records</Text>
          </View>

          {filteredLogs.length === 0 ? (
            <View style={{ padding: 36, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="document-text-outline" size={38} color="#94A3B8" />
              <Text style={{ marginTop: 10, fontSize: 14, color: '#64748B', fontWeight: '600' }}>
                No activity logs found
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
                Activities will appear here as users interact with the system.
              </Text>
            </View>
          ) : (
            filteredLogs.map((log, idx) => {
              const mBadge = getModuleBadgeStyle(log.module || 'SYSTEM');
              const actionType = log.type || (log.action?.toLowerCase().includes('create') ? 'CREATE' : log.action?.toLowerCase().includes('update') ? 'UPDATE' : log.action?.toLowerCase().includes('delete') ? 'DELETE' : log.action?.toLowerCase().includes('login') ? 'LOGIN' : 'VIEW');
              const tBadge = getTypeBadgeStyle(actionType);
              const isFailed = log.status === 'FAILED';
              const displayStatus = log.status || 'SUCCESS';
              const displayTime = log.timestamp ? (log.timestamp.includes('T') ? log.timestamp.replace('T', ' ').slice(0, 16) : log.timestamp) : 'Recent';

              return (
                <View key={idx} style={styles.logRow}>
                  <View style={styles.logRowTop}>
                    <Text style={styles.logTime}>{displayTime}</Text>
                    <Text style={styles.logUser}>@{log.user || 'system'}</Text>

                    <View style={[styles.moduleBadge, { backgroundColor: mBadge.bg }]}>
                      <Text style={[styles.moduleBadgeText, { color: mBadge.text }]}>
                        {log.module || 'SYSTEM'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.logRowBottom}>
                    <Text style={styles.logAction} numberOfLines={2}>{log.action}</Text>

                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <View style={[styles.typeBadge, { backgroundColor: tBadge.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: tBadge.text }]}>
                          {actionType}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusPill,
                          isFailed ? styles.statusPillFailed : styles.statusPillSuccess,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            isFailed ? { color: '#DC2626' } : { color: '#15803D' },
                          ]}
                        >
                          {displayStatus}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
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
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  mIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  mLabel: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
  },
  filtersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 14,
  },
  filtersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  filtersTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  filterInputsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  fLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 3,
  },
  fBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  fText: {
    flex: 1,
    fontSize: 10.5,
    color: '#0F172A',
    fontWeight: '600',
  },
  logsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  logsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logsTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  logsCountText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  logRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  logRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logTime: {
    fontSize: 10.5,
    color: '#64748B',
  },
  logUser: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  moduleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moduleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  logRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  logAction: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusPillFailed: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
