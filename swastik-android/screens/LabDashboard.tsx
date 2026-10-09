// mobile/screens/LabDashboard.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

import { generateLabReportHtml, printOrSharePdf } from '../utils/pdfGenerator';

export const LabDashboard: React.FC = () => {
  const [orders, setOrders] = useState([
    { id: '1', uhid: 'SW-2026-081', patient: 'Rajesh Verma', test: 'Serum Lithium & Electrolytes', priority: 'STAT', status: 'pending' },
    { id: '2', uhid: 'SW-2026-102', patient: 'Amit Kulkarni', test: 'Complete Blood Count (CBC)', priority: 'Urgent', status: 'pending' },
    { id: '3', uhid: 'SW-2026-094', patient: 'Priya Sharma', test: 'Thyroid Panel (TSH, Free T4)', priority: 'Routine', status: 'completed' },
  ]);

  const handleEnterResults = (order: typeof orders[0]) => {
    Alert.alert(
      'Enter Laboratory Results',
      `Test: ${order.test}\nPatient: ${order.patient} (${order.uhid})\n\nNormal Range: 0.6 - 1.2 mEq/L\nEntered Value: 0.95 mEq/L (NORMAL)`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Verify & Sign PDF', 
          onPress: async () => {
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'completed' } : o));
            try {
              const html = generateLabReportHtml({
                patientName: order.patient,
                uhid: order.uhid,
                requestId: 'LAB-' + order.id,
                registeredOn: new Date().toLocaleDateString('en-GB') + ' 09:30 AM',
                reportedOn: new Date().toLocaleDateString('en-GB') + ' 11:45 AM',
                ageSex: '35 Y / Male',
                referringDoctor: 'Dr. P. M. Chougule',
                sampleType: 'Serum / Venous Blood',
                sampleCollectedOn: new Date().toLocaleDateString('en-GB') + ' 10:00 AM',
                status: 'Verified & Approved',
                investigations: [
                  { name: order.test, result: '0.95', referenceRange: '0.6 - 1.2', unit: 'mEq/L', isAbnormal: false },
                ],
                remarks: 'Values within optimal therapeutic range. Approved by Pathologist.',
              });
              await printOrSharePdf(html, `Lab_Report_${order.uhid}`);
            } catch (err: any) {
              Alert.alert('Report Error', err?.message || 'Could not generate lab report PDF.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.sectionHeader}>
        <Ionicons name="flask" size={20} color={Colors.purple} />
        <Text style={styles.sectionTitle}>Pathology & Diagnostic Laboratory</Text>
      </View>

      {/* Lab Counters */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: Colors.purple }]}>8</Text>
          <Text style={styles.statLabel}>Pending Tests</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: Colors.red }]}>2</Text>
          <Text style={styles.statLabel}>STAT Urgent</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: Colors.green }]}>24</Text>
          <Text style={styles.statLabel}>Verified Today</Text>
        </View>
      </View>

      <Text style={styles.subHeading}>Incoming Diagnostic Orders</Text>

      {orders.map((o) => {
        const isStat = o.priority === 'STAT';
        const isDone = o.status === 'completed';

        return (
          <View key={o.id} style={styles.orderCard}>
            <View style={styles.orderTop}>
              <View>
                <Text style={styles.patientName}>{o.patient}</Text>
                <Text style={styles.uhidText}>UHID: {o.uhid}</Text>
              </View>
              <View style={[styles.priorityTag, isStat ? styles.priorityStat : styles.priorityRoutine]}>
                <Text style={[styles.priorityText, isStat ? { color: Colors.red } : { color: Colors.slate }]}>
                  {o.priority}
                </Text>
              </View>
            </View>

            <View style={styles.testRow}>
              <Ionicons name="git-network-outline" size={14} color={Colors.purple} />
              <Text style={styles.testName}>{o.test}</Text>
            </View>

            <View style={styles.cardActions}>
              {!isDone ? (
                <TouchableOpacity 
                  style={styles.resultBtn} 
                  onPress={() => handleEnterResults(o)}
                >
                  <Ionicons name="create-outline" size={15} color="#ffffff" />
                  <Text style={styles.resultBtnText}>Log Results &amp; Generate PDF</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.verifiedBox}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                  <Text style={styles.verifiedText}>Report Verified &amp; Signed</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.navy },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 10.5, color: Colors.muted, marginTop: 2, fontWeight: '600' },
  subHeading: { fontSize: 13, fontWeight: '800', color: Colors.navy, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  orderCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: 14, fontWeight: '800', color: Colors.navy },
  uhidText: { fontSize: 11, color: Colors.muted, marginTop: 1, fontFamily: 'monospace' },
  priorityTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  priorityStat: { backgroundColor: Colors.redLight, borderColor: '#fca5a5' },
  priorityRoutine: { backgroundColor: '#f1f5f9', borderColor: Colors.border },
  priorityText: { fontSize: 9.5, fontWeight: '800' },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 8 },
  testName: { fontSize: 12.5, fontWeight: '700', color: Colors.navy },
  cardActions: { marginTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  resultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.purple,
    borderRadius: 8,
    paddingVertical: 9,
  },
  resultBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  verifiedBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  verifiedText: { fontSize: 12, fontWeight: '700', color: Colors.green },
});
