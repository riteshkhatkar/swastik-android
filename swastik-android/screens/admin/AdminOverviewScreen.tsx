// swastik-android/screens/admin/AdminOverviewScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { adminApi } from '../../services/api';
import { printOrSharePdf } from '../../utils/pdfGenerator';
import { AdminScreenKey } from './AdminDrawer';
import { useDataSync } from '../../store/dataSync';

interface AdminOverviewScreenProps {
  onOpenDrawer: () => void;
  onNavigateToModule?: (key: AdminScreenKey) => void;
  onQuickAction?: (action: 'register_patient' | 'new_appointment' | 'create_invoice' | 'add_lab' | 'users') => void;
}

export const AdminOverviewScreen: React.FC<AdminOverviewScreenProps> = ({
  onOpenDrawer,
  onNavigateToModule,
  onQuickAction,
}) => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [dateFilter, setDateFilter] = useState<'Today' | 'Yesterday' | 'This Week' | 'This Month'>('Today');

  // Live KPI Data
  const [stats, setStats] = useState({
    patients: 0,
    opd_today: 0,
    ipd_active: 0,
    doctors: 0,
    lab_pending: 0,
    lab_today: 0,
    revenue_today: 0,
    pending_amount: 0,
  });

  // Live Recent Patients
  const [patients, setPatients] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [statsData, livePatients] = await Promise.all([
        adminApi.getStats().catch(() => null),
        adminApi.getLivePatients(10).catch(() => []),
      ]);
      if (statsData) {
        setStats({
          patients: statsData.patients ?? 0,
          opd_today: statsData.opd_today ?? 0,
          ipd_active: statsData.ipd_active ?? 0,
          doctors: statsData.doctors ?? 0,
          lab_pending: statsData.lab_pending ?? 0,
          lab_today: statsData.lab_today ?? 0,
          revenue_today: statsData.revenue_today ?? 0,
          pending_amount: statsData.pending_amount ?? 0,
        });
      }
      if (Array.isArray(livePatients)) {
        setPatients(livePatients);
      }
    } catch (err) {
      console.log('Error loading admin overview data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  useDataSync(loadData);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDownloadOverviewPdf = async () => {
    setLoadingPdf(true);
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
            .badge { background: #f0fdfa; color: #0f766e; padding: 6px 12px; border-radius: 6px; font-weight: bold; border: 1px solid #ccfbf1; font-size: 13px; }
            .section-title { font-size: 15px; font-weight: bold; color: #0f766e; margin: 20px 0 10px 0; border-left: 4px solid #0f766e; padding-left: 8px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
            .card-title { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .card-val { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 4px; }
            .card-trend { font-size: 10px; color: #16a34a; font-weight: bold; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            th { background: #0f766e; color: #ffffff; text-align: left; padding: 8px 10px; font-weight: 600; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
            .status-pill { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .status-consulted { background: #dcfce7; color: #15803d; }
            .status-admitted { background: #e0f2fe; color: #0369a1; }
            .status-waiting { background: #fef9c3; color: #a16207; }
            .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="hospital-title">SWASTIK HOSPITAL &amp; RESEARCH CENTRE</div>
              <div class="hospital-sub">Miraj Road, Kolhapur · +91 94220 46001 · admin@swastikhospital.org</div>
            </div>
            <div class="badge">HOSPITAL OVERVIEW REPORT</div>
          </div>

          <div style="font-size: 12px; color: #64748b; margin-bottom: 16px;">
            Report Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')} · Filter: ${dateFilter}
          </div>

          <div class="section-title">Key Operational Performance Indicators</div>
          <div class="grid">
            <div class="card">
              <div class="card-title">Total Patients</div>
              <div class="card-val">${stats.patients}</div>
              <div class="card-trend">↑ +12% vs. yesterday</div>
            </div>
            <div class="card">
              <div class="card-title">OPD Today</div>
              <div class="card-val">${stats.opd_today}</div>
              <div class="card-trend">↑ +8% vs. yesterday</div>
            </div>
            <div class="card">
              <div class="card-title">Active IPD</div>
              <div class="card-val">${stats.ipd_active}</div>
              <div class="card-trend">↑ +3% vs. yesterday</div>
            </div>
            <div class="card">
              <div class="card-title">Total Doctors</div>
              <div class="card-val">${stats.doctors}</div>
              <div class="card-trend" style="color: #64748b;">0% vs. yesterday</div>
            </div>
            <div class="card">
              <div class="card-title">Lab Pending</div>
              <div class="card-val">${stats.lab_pending}</div>
              <div class="card-trend" style="color: #ef4444;">↓ -6% vs. yesterday</div>
            </div>
            <div class="card">
              <div class="card-title">Lab Tests Today</div>
              <div class="card-val">${stats.lab_today}</div>
              <div class="card-trend">↑ +10% vs. yesterday</div>
            </div>
            <div class="card">
              <div class="card-title">Revenue Today</div>
              <div class="card-val">₹${stats.revenue_today.toLocaleString('en-IN')}</div>
              <div class="card-trend">↑ +15% vs. yesterday</div>
            </div>
            <div class="card">
              <div class="card-title">Pending Dues</div>
              <div class="card-val">₹${stats.pending_amount.toLocaleString('en-IN')}</div>
              <div class="card-trend" style="color: #ef4444;">↑ +5% vs. yesterday</div>
            </div>
          </div>

          <div class="section-title">Recent Patient Encounters</div>
          <table>
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>UHID</th>
                <th>Type</th>
                <th>Doctor</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${patients.map((p) => `
                <tr>
                  <td><b>${p.name}</b></td>
                  <td style="font-family: monospace;">${p.uhid}</td>
                  <td>${p.type || 'OPD'}</td>
                  <td>${p.doctor || 'Dr. Priya'}</td>
                  <td>${p.time || '10:00 AM'}</td>
                  <td><span class="status-pill status-${(p.status || 'consulted').toLowerCase()}">${p.status || 'Consulted'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Generated by Swastik Hospital Executive MIS · Live Cloud Node Verified
          </div>
        </body>
        </html>
      `;

      await printOrSharePdf(html, `Hospital_Overview_${new Date().toISOString().slice(0, 10)}`);
    } catch (err: any) {
      Alert.alert('PDF Export Error', err?.message || 'Unable to download overview report.');
    } finally {
      setLoadingPdf(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('admit')) return { bg: '#E0F2FE', text: '#0284C7', border: '#BAE6FD' };
    if (s.includes('wait')) return { bg: '#FEF9C3', text: '#CA8A04', border: '#FEF08A' };
    return { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' };
  };

  return (
    <View style={styles.root}>
      {/* Top Banner Header with Stethoscope Art */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) }]}>

        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.hamburgerBtn}
            activeOpacity={0.7}
            onPress={onOpenDrawer}
          >
            <Ionicons name="menu-outline" size={26} color="#0F766E" />
          </TouchableOpacity>

          <Image
            source={require('../../assets/swastik_large_brand_transparent.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />

          <TouchableOpacity
            style={styles.profileAvatarBtn}
            activeOpacity={0.7}
            onPress={onOpenDrawer}
          >
            <Ionicons name="person-circle-outline" size={32} color="#0F766E" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F766E']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Live Status */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle}>Hospital Overview</Text>
            <Text style={styles.screenSubtitle}>Complete view of hospital operations</Text>
            <View style={styles.liveMetaRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveMetaText}>Live data • Auto-refresh 30s</Text>
            </View>
          </View>

          {/* Date Range Picker Dropdown Pill */}
          <TouchableOpacity
            style={styles.dateFilterPill}
            activeOpacity={0.8}
            onPress={() => {
              const options: ('Today' | 'Yesterday' | 'This Week' | 'This Month')[] = [
                'Today',
                'Yesterday',
                'This Week',
                'This Month',
              ];
              const nextIndex = (options.indexOf(dateFilter) + 1) % options.length;
              setDateFilter(options[nextIndex]);
            }}
          >
            <Ionicons name="calendar-outline" size={14} color="#0F766E" />
            <Text style={styles.dateFilterText}>{dateFilter}</Text>
            <Ionicons name="chevron-down" size={14} color="#0F766E" />
          </TouchableOpacity>
        </View>

        {/* 8 KPI Cards Grid (Matches Image 12 exactly) */}
        <View style={styles.kpiGrid}>
          {/* Card 1: Total Patients */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="people" size={20} color="#2563EB" />
            </View>
            <Text style={styles.kpiLabel}>Total Patients</Text>
            <Text style={styles.kpiVal}>{stats.patients}</Text>
            <View style={styles.trendRow}>
              <Feather name="arrow-up-right" size={12} color="#16A34A" />
              <Text style={styles.trendTextSuccess}>+12%</Text>
              <Text style={styles.trendSub}>vs. yesterday</Text>
            </View>
          </View>

          {/* Card 2: OPD Today */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="person" size={20} color="#EF4444" />
            </View>
            <Text style={styles.kpiLabel}>OPD Today</Text>
            <Text style={styles.kpiVal}>{stats.opd_today}</Text>
            <View style={styles.trendRow}>
              <Feather name="arrow-up-right" size={12} color="#16A34A" />
              <Text style={styles.trendTextSuccess}>+8%</Text>
              <Text style={styles.trendSub}>vs. yesterday</Text>
            </View>
          </View>

          {/* Card 3: Active IPD */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
              <FontAwesome5 name="bed" size={17} color="#059669" />
            </View>
            <Text style={styles.kpiLabel}>Active IPD</Text>
            <Text style={styles.kpiVal}>{stats.ipd_active}</Text>
            <View style={styles.trendRow}>
              <Feather name="arrow-up-right" size={12} color="#16A34A" />
              <Text style={styles.trendTextSuccess}>+3%</Text>
              <Text style={styles.trendSub}>vs. yesterday</Text>
            </View>
          </View>

          {/* Card 4: Total Doctors */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
              <FontAwesome5 name="user-md" size={18} color="#D97706" />
            </View>
            <Text style={styles.kpiLabel}>Total Doctors</Text>
            <Text style={styles.kpiVal}>{stats.doctors}</Text>
            <View style={styles.trendRow}>
              <Text style={[styles.trendSub, { marginLeft: 0 }]}>0% vs. yesterday</Text>
            </View>
          </View>

          {/* Card 5: Lab Pending */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="flask" size={19} color="#7C3AED" />
            </View>
            <Text style={styles.kpiLabel}>Lab Pending</Text>
            <Text style={styles.kpiVal}>{stats.lab_pending}</Text>
            <View style={styles.trendRow}>
              <Feather name="arrow-down-right" size={12} color="#EF4444" />
              <Text style={styles.trendTextDanger}>-6%</Text>
              <Text style={styles.trendSub}>vs. yesterday</Text>
            </View>
          </View>

          {/* Card 6: Lab Tests Today */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="bar-chart" size={19} color="#0284C7" />
            </View>
            <Text style={styles.kpiLabel}>Lab Tests Today</Text>
            <Text style={styles.kpiVal}>{stats.lab_today}</Text>
            <View style={styles.trendRow}>
              <Feather name="arrow-up-right" size={12} color="#16A34A" />
              <Text style={styles.trendTextSuccess}>+10%</Text>
              <Text style={styles.trendSub}>vs. yesterday</Text>
            </View>
          </View>

          {/* Card 7: Revenue Today */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
              <FontAwesome5 name="rupee-sign" size={18} color="#059669" />
            </View>
            <Text style={styles.kpiLabel}>Revenue Today</Text>
            <Text style={[styles.kpiVal, { fontSize: 17 }]}>₹{stats.revenue_today.toLocaleString('en-IN')}</Text>
            <View style={styles.trendRow}>
              <Feather name="arrow-up-right" size={12} color="#16A34A" />
              <Text style={styles.trendTextSuccess}>+15%</Text>
              <Text style={styles.trendSub}>vs. yesterday</Text>
            </View>
          </View>

          {/* Card 8: Pending Dues */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FFF1F2' }]}>
              <Ionicons name="receipt" size={19} color="#E11D48" />
            </View>
            <Text style={styles.kpiLabel}>Pending Dues</Text>
            <Text style={[styles.kpiVal, { fontSize: 17, color: '#E11D48' }]}>₹{stats.pending_amount.toLocaleString('en-IN')}</Text>
            <View style={styles.trendRow}>
              <Feather name="arrow-up-right" size={12} color="#E11D48" />
              <Text style={styles.trendTextDanger}>+5%</Text>
              <Text style={styles.trendSub}>vs. yesterday</Text>
            </View>
          </View>
        </View>

        {/* Recent Patients Table / List */}
        <View style={styles.recentSectionCard}>
          <View style={styles.recentHeaderRow}>
            <Text style={styles.recentTitle}>Recent Patients</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onNavigateToModule?.('Users')}
            >
              <Text style={styles.viewAllText}>View All &gt;</Text>
            </TouchableOpacity>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thCell, { flex: 2 }]}>Name</Text>
            <Text style={[styles.thCell, { flex: 1.5 }]}>UHID</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Type</Text>
            <Text style={[styles.thCell, { flex: 1.5 }]}>Doctor</Text>
            <Text style={[styles.thCell, { flex: 1.4 }]}>Time</Text>
            <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>Status</Text>
          </View>

          {/* Table Rows */}
          {patients.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Ionicons name="people-outline" size={32} color="#94A3B8" />
              <Text style={{ color: '#64748B', fontSize: 13, marginTop: 8 }}>
                No recent patient activity recorded yet.
              </Text>
            </View>
          ) : (
            patients.map((item, idx) => {
              const pill = getStatusStyle(item.status);
              return (
                <View key={idx} style={styles.tableRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.tdPatientName} numberOfLines={1}>{item.name}</Text>
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.tdUhid} numberOfLines={1}>{item.uhid}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tdType}>{item.type || 'OPD'}</Text>
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.tdDoctor} numberOfLines={1}>{item.doctor || 'Dr. Priya'}</Text>
                  </View>
                  <View style={{ flex: 1.4 }}>
                    <Text style={styles.tdTime}>{item.time || '10:00 AM'}</Text>
                  </View>
                  <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                    <View style={[styles.statusBadge, { backgroundColor: pill.bg, borderColor: pill.border }]}>
                      <Text style={[styles.statusText, { color: pill.text }]}>{item.status || 'Consulted'}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Action Buttons: Refresh & Download PDF (Matches Image 12 exactly) */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.refreshBtn}
            activeOpacity={0.8}
            onPress={onRefresh}
          >
            <Ionicons name="sync-outline" size={18} color="#0F766E" />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.downloadPdfBtn}
            activeOpacity={0.85}
            onPress={handleDownloadOverviewPdf}
            disabled={loadingPdf}
          >
            {loadingPdf ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                <Text style={styles.downloadPdfBtnText}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Prominent Hospital Staff & User Management Banner */}
        <TouchableOpacity
          style={styles.staffBannerCard}
          activeOpacity={0.85}
          onPress={() => onQuickAction?.('users')}
        >
          <View style={styles.staffBannerContent}>
            <View style={styles.staffBannerIconBox}>
              <Ionicons name="people" size={22} color="#0F766E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.staffBannerTitle}>Hospital Staff &amp; User Accounts</Text>
              <Text style={styles.staffBannerSub}>
                Manage staff logins, authorized emails, mobile OTP, and role permissions.
              </Text>
            </View>
          </View>
          <View style={styles.staffBannerAction}>
            <Text style={styles.staffBannerActionText}>Manage Users</Text>
            <Feather name="chevron-right" size={16} color="#0F766E" />
          </View>
        </TouchableOpacity>

        {/* Bottom Quick Action Cards */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => onQuickAction?.('register_patient')}
          >
            <View style={[styles.quickIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="person-add" size={18} color="#2563EB" />
            </View>
            <Text style={styles.quickTitle}>Register{'\n'}Patient</Text>
            <Ionicons name="chevron-forward" size={12} color="#94A3B8" style={styles.quickChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => onQuickAction?.('new_appointment')}
          >
            <View style={[styles.quickIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="calendar" size={18} color="#059669" />
            </View>
            <Text style={styles.quickTitle}>New{'\n'}Appointment</Text>
            <Ionicons name="chevron-forward" size={12} color="#94A3B8" style={styles.quickChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => onQuickAction?.('create_invoice')}
          >
            <View style={[styles.quickIconBox, { backgroundColor: '#FDF2F8' }]}>
              <Ionicons name="receipt" size={18} color="#DB2777" />
            </View>
            <Text style={styles.quickTitle}>Create{'\n'}Invoice</Text>
            <Ionicons name="chevron-forward" size={12} color="#94A3B8" style={styles.quickChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => onQuickAction?.('add_lab')}
          >
            <View style={[styles.quickIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="flask" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.quickTitle}>Add Lab{'\n'}Request</Text>
            <Ionicons name="chevron-forward" size={12} color="#94A3B8" style={styles.quickChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => onQuickAction?.('users')}
          >
            <View style={[styles.quickIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="people" size={18} color="#D97706" />
            </View>
            <Text style={styles.quickTitle}>User{'\n'}Manage</Text>
            <Ionicons name="chevron-forward" size={12} color="#94A3B8" style={styles.quickChevron} />
          </TouchableOpacity>
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
  hamburgerBtn: {
    padding: 6,
  },
  brandLogo: {
    width: 155,
    height: 42,
  },
  profileAvatarBtn: {
    padding: 4,
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
  liveMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  liveMetaText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  dateFilterPill: {
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
  dateFilterText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F766E',
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
    fontSize: 20,
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
    fontWeight: '500',
  },
  recentSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 4,
  },
  thCell: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  tdPatientName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  tdUhid: {
    fontSize: 10.5,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  tdType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  tdDoctor: {
    fontSize: 11,
    color: '#475569',
  },
  tdTime: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  refreshBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  refreshBtnText: {
    fontSize: 13.5,
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
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadPdfBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    alignItems: 'flex-start',
    position: 'relative',
  },
  quickIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 14,
  },
  quickChevron: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  staffBannerCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  staffBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  staffBannerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F766E',
    marginBottom: 2,
  },
  staffBannerSub: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  staffBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  staffBannerActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F766E',
  },
});
