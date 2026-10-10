// swastik-android/screens/receptionist/RoomManagementScreen.tsx
// Real-time Bed & Room Occupancy Management for Swastik Hospital
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { AppHeader } from '../../components/AppHeader';
import { receptionistApi, roomApi, getApiErrorMessage } from '../../services/api';

interface RoomManagementScreenProps {
  onOpenDrawer: () => void;
}

export const RoomManagementScreen: React.FC<RoomManagementScreenProps> = ({ onOpenDrawer }) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'General' | 'Private' | 'ICU'>('All');
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('Available');

  // Add Room Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [roomTypeInput, setRoomTypeInput] = useState<'General' | 'Private' | 'ICU'>('General');
  const [priceInput, setPriceInput] = useState('1500');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await roomApi.getRooms();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Error fetching rooms:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  const filteredRooms =
    filter === 'All' ? rooms : rooms.filter((r) => (r.room_type || r.ward_type) === filter);

  const availableCount = rooms.filter((r) => r.status === 'Available').length;
  const occupiedCount = rooms.filter((r) => r.status === 'Occupied').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'Maintenance').length;

  const handleUpdateStatus = (room: any) => {
    setSelectedRoom(room);
    setNewStatus(room.status);
    setShowStatusModal(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedRoom) return;
    const targetRoomId = selectedRoom._id || selectedRoom.id || selectedRoom.room_id;
    try {
      if (targetRoomId) {
        await roomApi.updateRoomStatus(targetRoomId, newStatus);
      }
      setRooms((prev) =>
        prev.map((r) =>
          ((r._id && r._id === targetRoomId) || (r.id && r.id === targetRoomId) || r.room_number === selectedRoom.room_number)
            ? { ...r, status: newStatus }
            : r
        )
      );
      setShowStatusModal(false);
      Alert.alert('Room Updated', `Room ${selectedRoom.room_number} status updated to ${newStatus}.`);
    } catch (err: any) {
      Alert.alert('Update Failed', getApiErrorMessage(err));
    }
  };

  const handleCreateRoom = async () => {
    if (!roomNumberInput.trim()) {
      Alert.alert('Validation Error', 'Please enter a room number.');
      return;
    }
    try {
      setLoading(true);
      await roomApi.createRoom({
        room_number: roomNumberInput.trim(),
        room_type: roomTypeInput,
        bed_count: roomTypeInput === 'General' ? 5 : 1,
        status: 'Available',
        price_per_day: parseFloat(priceInput) || (roomTypeInput === 'ICU' ? 8500 : roomTypeInput === 'Private' ? 4500 : 1500),
      });
      setShowAddModal(false);
      setRoomNumberInput('');
      Alert.alert('Success', `Room ${roomNumberInput.trim()} created successfully.`);
      fetchRooms();
    } catch (err: any) {
      Alert.alert('Error Creating Room', getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader onOpenDrawer={onOpenDrawer} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Live Status */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Live Room Management</Text>
            <Text style={styles.subtitle}>Real-time bed occupancy across Swastik Hospital</Text>
          </View>
          <TouchableOpacity
            style={styles.addRoomBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.addRoomBtnText}>Add Room</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row matching web */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: '#10B981', borderLeftWidth: 4 }]}>
            <Text style={styles.statLabel}>AVAILABLE</Text>
            <Text style={[styles.statValue, { color: '#059669' }]}>{availableCount}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#EF4444', borderLeftWidth: 4 }]}>
            <Text style={styles.statLabel}>OCCUPIED</Text>
            <Text style={[styles.statValue, { color: '#DC2626' }]}>{occupiedCount}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#F59E0B', borderLeftWidth: 4 }]}>
            <Text style={styles.statLabel}>MAINTENANCE</Text>
            <Text style={[styles.statValue, { color: '#D97706' }]}>{maintenanceCount}</Text>
          </View>
        </View>

        {/* Ward Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
          {(['All', 'General', 'Private', 'ICU'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, filter === tab && styles.filterChipActive]}
              onPress={() => setFilter(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filter === tab && styles.filterChipTextActive]}>
                {tab === 'All' ? 'All Wards' : `${tab} Ward`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Room Grid / Cards */}
        {loading && !refreshing ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#0D9488" />
            <Text style={styles.loaderText}>Polling Bed Status...</Text>
          </View>
        ) : filteredRooms.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="bed-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Rooms Found</Text>
            <Text style={styles.emptySub}>No beds registered under this ward category.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredRooms.map((room) => {
              const isAvailable = room.status === 'Available';
              const isOccupied = room.status === 'Occupied';
              const isMaint = room.status === 'Maintenance';

              return (
                <View
                  key={room._id || room.room_number}
                  style={[
                    styles.roomCard,
                    isAvailable && styles.roomCardAvailable,
                    isOccupied && styles.roomCardOccupied,
                    isMaint && styles.roomCardMaint,
                  ]}
                >
                  <View style={styles.roomCardHeader}>
                    <View>
                      <Text style={styles.roomNumber}>Room {room.room_number}</Text>
                      <Text style={styles.roomType}>{(room.room_type || 'General').toUpperCase()} WARD</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        isAvailable && styles.statusPillAvail,
                        isOccupied && styles.statusPillOcc,
                        isMaint && styles.statusPillMaint,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isAvailable && styles.statusPillTextAvail,
                          isOccupied && styles.statusPillTextOcc,
                          isMaint && styles.statusPillTextMaint,
                        ]}
                      >
                        {room.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.roomDetails}>
                    <View style={styles.detailRow}>
                      <Feather name="layers" size={14} color="#64748B" />
                      <Text style={styles.detailText}>Floor: {room.floor || '1st Floor'}</Text>
                    </View>
                    {isOccupied && (
                      <View style={styles.detailRow}>
                        <Feather name="user" size={14} color="#DC2626" />
                        <Text style={[styles.detailText, { color: '#DC2626', fontWeight: '700' }]}>
                          {room.patient_name || 'Admitted Patient'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() => handleUpdateStatus(room)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cardActionText}>Change Status</Text>
                    <Feather name="chevron-right" size={14} color="#0D9488" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Status Update Modal */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Room {selectedRoom?.room_number}</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>Select occupancy status for this bed:</Text>

            {(['Available', 'Occupied', 'Maintenance'] as const).map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.statusOpt, newStatus === st && styles.statusOptActive]}
                onPress={() => setNewStatus(st)}
                activeOpacity={0.7}
              >
                <View style={styles.statusOptRow}>
                  <View
                    style={[
                      styles.statusDot,
                      st === 'Available' && { backgroundColor: '#10B981' },
                      st === 'Occupied' && { backgroundColor: '#EF4444' },
                      st === 'Maintenance' && { backgroundColor: '#F59E0B' },
                    ]}
                  />
                  <Text style={[styles.statusOptLabel, newStatus === st && styles.statusOptLabelActive]}>
                    {st}
                  </Text>
                </View>
                {newStatus === st && <Feather name="check" size={18} color="#0D9488" />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveStatus} activeOpacity={0.8}>
              <Text style={styles.modalSaveText}>Update Room Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Room Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Bed / Room</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Room / Bed Number *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. G-109, P-241, ICU-341"
                placeholderTextColor="#94A3B8"
                value={roomNumberInput}
                onChangeText={setRoomNumberInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ward Category</Text>
              <View style={styles.typeTabs}>
                {(['General', 'Private', 'ICU'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeTab, roomTypeInput === t && styles.typeTabActive]}
                    onPress={() => {
                      setRoomTypeInput(t);
                      if (t === 'General') setPriceInput('1500');
                      if (t === 'Private') setPriceInput('4500');
                      if (t === 'ICU') setPriceInput('8500');
                    }}
                  >
                    <Text style={[styles.typeTabText, roomTypeInput === t && styles.typeTabTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Daily Rate (₹)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="1500"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={priceInput}
                onChangeText={setPriceInput}
              />
            </View>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleCreateRoom} activeOpacity={0.8}>
              <Text style={styles.modalSaveText}>Save Room to System</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  addRoomBtn: {
    backgroundColor: '#0D9488',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addRoomBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  inputGroup: { marginTop: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  inputField: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  typeTabs: { flexDirection: 'row', gap: 8 },
  typeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  typeTabActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  typeTabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  typeTabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  filterScroll: { marginBottom: 16 },
  filterContainer: { gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  loaderWrap: { padding: 40, alignItems: 'center' },
  loaderText: { marginTop: 10, fontSize: 13, color: '#64748B' },
  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 8 },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' },
  grid: { gap: 12 },
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roomCardAvailable: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  roomCardOccupied: { backgroundColor: '#FFFFFF', borderColor: '#FECACA' },
  roomCardMaint: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  roomCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  roomNumber: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  roomType: { fontSize: 11, fontWeight: '700', color: '#0D9488', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusPillAvail: { backgroundColor: '#DCFCE7' },
  statusPillOcc: { backgroundColor: '#FEE2E2' },
  statusPillMaint: { backgroundColor: '#FEF3C7' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  statusPillTextAvail: { color: '#15803D' },
  statusPillTextOcc: { color: '#B91C1C' },
  statusPillTextMaint: { color: '#B45309' },
  roomDetails: { marginTop: 10, gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: '#475569' },
  cardActionBtn: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActionText: { fontSize: 12, fontWeight: '700', color: '#0D9488' },
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 13, color: '#64748B', marginVertical: 12 },
  statusOpt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  statusOptActive: { borderColor: '#0D9488', backgroundColor: '#F0FDFA' },
  statusOptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptLabel: { fontSize: 14, fontWeight: '600', color: '#334155' },
  statusOptLabelActive: { color: '#0F766E', fontWeight: '800' },
  modalSaveBtn: { marginTop: 12, backgroundColor: '#0D9488', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalSaveText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});
