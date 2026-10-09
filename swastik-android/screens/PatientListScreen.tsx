// swastik-android/screens/PatientListScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { patientService } from '../services/api';

const { width } = Dimensions.get('window');

interface PatientListScreenProps {
  onOpenDrawer: () => void;
  onOpenConsultation: (patient: any) => void;
}

export const PatientListScreen: React.FC<PatientListScreenProps> = ({
  onOpenDrawer,
  onOpenConsultation,
}) => {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const res = await patientService.getPatients();
      if (res && Array.isArray(res)) {
        setPatients(res);
      }
    } catch (err) {
      console.log('Error loading live patients:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPatients();
  };

  const filteredPatients = patients.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.uhid || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || '').includes(search)
  );

  return (
    <View style={styles.root}>
      {/* Header with Hamburger & Swastik Logo (NO back button) */}
      <AppHeader onOpenDrawer={onOpenDrawer} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        {/* Screen Title */}
        <Text style={styles.screenTitle}>Patient List</Text>
        <Text style={styles.screenSubtitle}>
          Complete directory of registered hospital patients.
        </Text>

        {/* Search bar */}
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by UHID, Name, or Mobile..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#1A7B76" />
          </View>
        ) : filteredPatients.length === 0 ? (
          <EmptyState
            iconType="search"
            message={search ? 'No patients found matching your search.' : 'No patients registered in directory.'}
          />
        ) : (
          /* Patient Cards */
          <View style={styles.cardsList}>
            {filteredPatients.map((patient) => (
              <View key={patient._id || patient.id || patient.uhid} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={20} color="#1A7B76" />
                  </View>
                  <View style={styles.headInfo}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <Text style={styles.uhidText}>
                      {patient.uhid} • {patient.age || 30} yrs • {patient.gender || 'General'}
                    </Text>
                  </View>
                  <View style={styles.bgBadge}>
                    <Text style={styles.bgText}>{patient.blood_group || patient.bloodGroup || 'A+'}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.metaRow}>
                    <Feather name="phone" size={12} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>{patient.phone || 'N/A'}</Text>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.metaText}>
                      Reg: {patient.created_at ? new Date(patient.created_at).toLocaleDateString() : 'Active'}
                    </Text>
                  </View>
                </View>

                {/* Action Button */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.openEmrBtn}
                    activeOpacity={0.8}
                    onPress={() => onOpenConsultation(patient)}
                  >
                    <Feather name="folder" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.openEmrText}>Open EMR Consultation</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F1E36',
    marginTop: 6,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '500',
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    height: '100%',
  },
  cardsList: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E8F5F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  uhidText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  bgBadge: {
    backgroundColor: '#E8F5F4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bgText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A7B76',
  },
  cardBody: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  bullet: {
    marginHorizontal: 6,
    color: '#94A3B8',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  openEmrBtn: {
    backgroundColor: '#1A7B76',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  openEmrText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
