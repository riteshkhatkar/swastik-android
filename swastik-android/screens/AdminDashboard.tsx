// swastik-android/screens/AdminDashboard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { printOrSharePdf } from '../utils/pdfGenerator';

interface AdminDashboardProps {
  onBack?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [selectedStaffCount] = useState(28);

  const handleFinancialReport = async () => {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
            .header { border-bottom: 3px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
            .hospital-title { color: #0f766e; font-size: 22px; font-weight: bold; margin: 0; }
            .hospital-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
            .report-badge { background: #f0fdfa; color: #0f766e; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; border: 1px solid #ccfbf1; }
            .kpi-row { display: flex; gap: 12px; margin: 20px 0; }
            .kpi-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc; }
            .kpi-num { font-size: 20px; font-weight: bold; color: #0f766e; }
            .kpi-label { font-size: 11px; color: #64748b; margin-top: 4px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th { background: #0f766e; color: #ffffff; text-align: left; padding: 8px 10px; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
            .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="hospital-title">SWASTIK HOSPITAL &amp; RESEARCH CENTRE</div>
              <div class="hospital-sub">Miraj Road, Kolhapur · +91 94220 46001 · admin@swastikhospital.org</div>
            </div>
            <div class="report-badge">FINANCIAL AUDIT REPORT</div>
          </div>

          <div class="kpi-row">
            <div class="kpi-card">
              <div class="kpi-num">₹1,84,500</div>
              <div class="kpi-label">Today's Total Billing</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-num">₹1,56,000</div>
              <div class="kpi-label">Collected (UPI / Razorpay / Cash)</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-num">₹28,500</div>
              <div class="kpi-label">Receivables / Pending</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Department / Head</th>
                <th>Transactions</th>
                <th>Mode</th>
                <th>Net Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>OPD Consultations</td>
                <td>42</td>
                <td>Razorpay / UPI / Cash</td>
                <td>₹25,200</td>
              </tr>
              <tr>
                <td>IPD Admissions &amp; Beds</td>
                <td>8</td>
                <td>Bank Transfer / UPI</td>
                <td>₹96,000</td>
              </tr>
              <tr>
                <td>Psychiatric Pharmacy &amp; Rx</td>
                <td>38</td>
                <td>UPI / Cash</td>
                <td>₹38,500</td>
              </tr>
              <tr>
                <td>Pathology Lab Tests</td>
                <td>24</td>
                <td>Razorpay Gateway</td>
                <td>₹24,800</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            Generated automatically by Swastik HIS Live Executive Accounting System · Confidential Medical Audit
          </div>
        </body>
        </html>
      `;
      await printOrSharePdf(html, 'Financial_Revenue_Audit_Report');
    } catch (err: any) {
      Alert.alert('Report Error', err?.message || 'Could not export financial report.');
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Header with Back Button and Hospital Branding */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#0F766E" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Image
            source={require('../assets/swastik_large_brand_transparent.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={22} color={Colors.blue} />
          <Text style={styles.sectionTitle}>Hospital Administrator Panel</Text>
        </View>

        {/* KPI Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.blue }]}>142</Text>
            <Text style={styles.statLabel}>Total Patients</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.green }]}>{selectedStaffCount}</Text>
            <Text style={styles.statLabel}>Active Staff</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.amber }]}>82%</Text>
            <Text style={styles.statLabel}>Bed Occupancy</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.primary }]}>₹1.84L</Text>
            <Text style={styles.statLabel}>Today's Receipts</Text>
          </View>
        </View>

        {/* Admin Modules */}
        <Text style={styles.subHeading}>Administrative Management</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Alert.alert('User & Role Management', 'Doctors: 12 · Receptionists: 4 · Lab: 5 · Billing: 4 · Admins: 3')}
        >
          <View style={[styles.menuIcon, { backgroundColor: Colors.blueLight }]}>
            <Ionicons name="people-outline" size={20} color={Colors.blue} />
          </View>
          <View style={styles.menuTextGroup}>
            <Text style={styles.menuTitle}>User &amp; Role Management</Text>
            <Text style={styles.menuDesc}>Manage 28 doctors, nurses, receptionists &amp; staff</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Alert.alert('Departments & Wards', 'Psychiatry, Psychology, General Ward, ICU, Deluxe IPD')}
        >
          <View style={[styles.menuIcon, { backgroundColor: Colors.greenLight }]}>
            <Ionicons name="business-outline" size={20} color={Colors.green} />
          </View>
          <View style={styles.menuTextGroup}>
            <Text style={styles.menuTitle}>Departments &amp; Wards</Text>
            <Text style={styles.menuDesc}>Psychiatry, Psychology, General Ward, ICU</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleFinancialReport}
        >
          <View style={[styles.menuIcon, { backgroundColor: Colors.amberLight }]}>
            <Ionicons name="stats-chart-outline" size={20} color={Colors.amber} />
          </View>
          <View style={styles.menuTextGroup}>
            <Text style={styles.menuTitle}>Financial &amp; Revenue Reports</Text>
            <Text style={styles.menuDesc}>Monthly audit logs, GST totals, payment splits</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Alert.alert('System Health', 'FastAPI Server: https://swastik.orelse.ai (Healthy)\nDatabase Latency: 12ms\nSecureStore Encryption: Active')}
        >
          <View style={[styles.menuIcon, { backgroundColor: Colors.redLight }]}>
            <Ionicons name="pulse-outline" size={20} color={Colors.red} />
          </View>
          <View style={styles.menuTextGroup}>
            <Text style={styles.menuTitle}>System Health &amp; Audit Logs</Text>
            <Text style={styles.menuDesc}>FastAPI server live · Database latency: 12ms</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
        </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  headerLogo: {
    width: 155,
    height: 42,
  },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flexBasis: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 11, color: Colors.muted, marginTop: 4, fontWeight: '600' },
  subHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextGroup: { flex: 1 },
  menuTitle: { fontSize: 13, fontWeight: '700', color: Colors.navy },
  menuDesc: { fontSize: 11, color: Colors.muted, marginTop: 2 },
});
