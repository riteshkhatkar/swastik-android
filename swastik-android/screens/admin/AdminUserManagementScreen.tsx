// swastik-android/screens/admin/AdminUserManagementScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { adminApi, patientService } from '../../services/api';
import { useDataSync } from '../../store/dataSync';

const DEFAULT_STAFF_USERS = [
  { _id: '6ac8aedb1ae15717411d7c77', username: 'ritesh_admin', full_name: 'Ritesh Khatakar (Super Admin)', email: 'riteshkhatakar5@gmail.com', phone: '+91 9876543200', role: 'admin', status: 'active', last_login: 'Today' },
  { _id: 'u1', username: 'admin', full_name: 'Hospital Administrator', email: 'vaishali@ova.ngo', phone: '+91 9876543210', role: 'admin', status: 'active', last_login: 'Today' },
  { _id: 'u2', username: 'dr.priya', full_name: 'Dr. Priya Sharma (Consultant)', email: 'vaishali@ova.ngo', phone: '+91 9876543211', role: 'doctor', status: 'active', last_login: 'Today' },
  { _id: 'u3', username: 'dr.rajesh', full_name: 'Dr. Rajesh Kumar (Surgeon)', email: 'vaishali@ova.ngo', phone: '+91 9876543212', role: 'doctor', status: 'active', last_login: 'Yesterday' },
  { _id: 'u4', username: 'reception1', full_name: 'Vaishali (Reception Desk)', email: 'vaishali@ova.ngo', phone: '+91 9876543213', role: 'receptionist', status: 'active', last_login: 'Today' },
  { _id: 'u5', username: 'billing1', full_name: 'Rekha Deshmukh (Cashier & Billing)', email: 'vaishali@ova.ngo', phone: '+91 9876543214', role: 'billing', status: 'active', last_login: 'Today' },
  { _id: 'u6', username: 'lab1', full_name: 'Suresh Patil (Lab Technician)', email: 'vaishali@ova.ngo', phone: '+91 9876543215', role: 'lab_technician', status: 'active', last_login: 'Today' },
];

interface AdminUserManagementScreenProps {
  onOpenDrawer: () => void;
}

export const AdminUserManagementScreen: React.FC<AdminUserManagementScreenProps> = ({
  onOpenDrawer,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>(DEFAULT_STAFF_USERS);
  const [patients, setPatients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'staff' | 'patients'>('staff');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  // New User Form State (with email, phone, and role)
  const [newUser, setNewUser] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    role: 'receptionist',
    password: '',
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [userData, patientData] = await Promise.all([
        adminApi.getUsers().catch(() => []),
        patientService.getPatients().catch(() => []),
      ]);
      if (Array.isArray(userData) && userData.length > 0) {
        setUsers(userData);
      } else {
        setUsers(DEFAULT_STAFF_USERS);
      }
      if (Array.isArray(patientData)) {
        setPatients(patientData);
      }
    } catch {
      setUsers(DEFAULT_STAFF_USERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useDataSync(loadUsers);

  const staffUsers = users.filter((u) => u.role !== 'patient');

  const displayedStaff = staffUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  });

  const displayedPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.uhid || '').toLowerCase().includes(q) ||
      (p.contact_number || p.phone || '').toLowerCase().includes(q)
    );
  });

  const handleStatusToggle = (user: any) => {
    const nextStatus = user.status === 'inactive' ? 'active' : 'inactive';
    const actionLabel = nextStatus === 'active' ? 'Activate' : 'Deactivate';

    Alert.alert(
      `${actionLabel} Account?`,
      `Are you sure you want to ${actionLabel.toLowerCase()} '${user.full_name || user.username}'?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: nextStatus === 'inactive' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await adminApi.setUserStatus(user._id, nextStatus);
              setUsers((prev) =>
                prev.map((item) => (item._id === user._id ? { ...item, status: nextStatus } : item))
              );
              Alert.alert('Status Updated', `User account marked as ${nextStatus}.`);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to update user status.');
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
      return;
    }
    try {
      await adminApi.resetPassword(selectedUser._id, newPassword);
      Alert.alert('Success', `Password reset successfully for ${selectedUser.username}.`);
      setShowResetModal(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not reset password.');
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.full_name || !newUser.username || !newUser.password) {
      Alert.alert('Missing Fields', 'Full Name, Username, and Password are required.');
      return;
    }
    if (newUser.password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    try {
      const res = await adminApi.createUser({
        full_name: newUser.full_name,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        password: newUser.password,
      });
      const created = res.user || {
        _id: String(Date.now()),
        ...newUser,
        status: 'active',
        last_login: 'Just now',
      };
      setUsers((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setNewUser({ full_name: '', username: '', email: '', phone: '', role: 'receptionist', password: '' });
      Alert.alert('User Created ✅', `Staff account for '${newUser.full_name}' created.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create user.');
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'doctor':
        return { bg: '#DCFCE7', text: '#15803d', border: '#BBF7D0' };
      case 'admin':
        return { bg: '#F3E8FF', text: '#7E22CE', border: '#E9D5FF' };
      case 'receptionist':
        return { bg: '#E0F2FE', text: '#0284C7', border: '#BAE6FD' };
      case 'billing':
        return { bg: '#CCFBF1', text: '#0F766E', border: '#99F6E4' };
      case 'lab_technician':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
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

          <TouchableOpacity
            style={styles.addStaffHeaderBtn}
            activeOpacity={0.8}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="person-add" size={17} color="#FFFFFF" />
            <Text style={styles.addStaffHeaderText}>Add User</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadUsers} colors={['#0F766E']} />}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>User &amp; Role Management</Text>
          <Text style={styles.screenSubtitle}>
            Manage staff credentials, role-based access, and active credentials.
          </Text>
        </View>

        {/* Tab Switcher: Staff vs Patients */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'staff' && styles.tabBtnActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('staff')}
          >
            <Ionicons
              name="medkit-outline"
              size={16}
              color={activeTab === 'staff' ? '#0F766E' : '#64748B'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'staff' && styles.tabBtnTextActive]}>
              Staff Accounts ({staffUsers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'patients' && styles.tabBtnActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('patients')}
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={activeTab === 'patients' ? '#0F766E' : '#64748B'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'patients' && styles.tabBtnTextActive]}>
              Patient Logins ({patients.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'staff' ? "Search by name, username, or role..." : "Search patient name, UHID, or phone..."}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Users / Patients List */}
        {loading ? (
          <ActivityIndicator size="large" color="#0F766E" style={{ marginVertical: 30 }} />
        ) : activeTab === 'patients' ? (
          displayedPatients.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={36} color="#CBD5E1" />
              <Text style={styles.emptyText}>No registered patients found.</Text>
            </View>
          ) : (
            displayedPatients.map((patient: any) => (
              <View key={patient.uhid || patient.id || patient._id} style={styles.userCard}>
                <View style={styles.userCardTop}>
                  <View style={[styles.avatarCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="person" size={20} color="#2563EB" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{patient.name || 'Unnamed Patient'}</Text>
                    <Text style={styles.userUsername}>UHID: {patient.uhid || '—'}</Text>
                    {patient.contact_number || patient.phone ? (
                      <Text style={styles.userEmail}>📱 {patient.contact_number || patient.phone}</Text>
                    ) : null}
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {patient.gender || 'Patient'} {patient.age ? `• ${patient.age} yrs` : ''}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: '#1D4ED8' }]}>Patient</Text>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: '#15803D' }]}>Registered</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.userCardActions}>
                  <Text style={styles.lastLoginText}>
                    Enrolled: {patient.created_at ? new Date(patient.created_at).toLocaleDateString() : 'Active Hospital Patient'}
                  </Text>
                </View>
              </View>
            ))
          )
        ) : displayedStaff.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyText}>No users found matching your search.</Text>
          </View>
        ) : (
          displayedStaff.map((item) => {
            const roleBadge = getRoleBadgeStyle(item.role);
            const isInactive = item.status === 'inactive';

            return (
              <View key={item._id || item.username} style={styles.userCard}>
                <View style={styles.userCardTop}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={20} color="#0F766E" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{item.full_name || '—'}</Text>
                    <Text style={styles.userUsername}>@{item.username}</Text>
                    {item.email ? <Text style={styles.userEmail}>✉ {item.email}</Text> : null}
                    {item.phone ? <Text style={styles.userEmail}>📱 {item.phone}</Text> : null}
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: roleBadge.bg, borderColor: roleBadge.border },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: roleBadge.text }]}>
                        {item.role}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        isInactive
                          ? { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }
                          : { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: isInactive ? '#DC2626' : '#15803D' },
                        ]}
                      >
                        {isInactive ? 'Inactive' : 'Active'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Footer Actions */}
                <View style={styles.userCardActions}>
                  <Text style={styles.lastLoginText}>
                    Last: {item.last_login || item.created_at || 'Recently'}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.actionBtnOutline}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedUser(item);
                        setShowResetModal(true);
                      }}
                    >
                      <Feather name="key" size={12} color="#0F766E" />
                      <Text style={styles.actionBtnOutlineText}>Reset Pwd</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionBtnStatus,
                        isInactive ? styles.actionBtnActive : styles.actionBtnDanger,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleStatusToggle(item)}
                    >
                      <Ionicons
                        name={isInactive ? 'checkmark-circle-outline' : 'ban-outline'}
                        size={13}
                        color={isInactive ? '#15803D' : '#DC2626'}
                      />
                      <Text
                        style={[
                          styles.actionBtnStatusText,
                          { color: isInactive ? '#15803D' : '#DC2626' },
                        ]}
                      >
                        {isInactive ? 'Activate' : 'Deactivate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal: Create Staff User */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Staff User</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dr. Ramesh Joshi"
                value={newUser.full_name}
                onChangeText={(t) => setNewUser((p) => ({ ...p, full_name: t }))}
              />

              <Text style={styles.inputLabel}>Username *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. dr.ramesh"
                autoCapitalize="none"
                value={newUser.username}
                onChangeText={(t) => setNewUser((p) => ({ ...p, username: t }))}
              />

              <Text style={styles.inputLabel}>Authorized Email (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. employee@swastik.org"
                autoCapitalize="none"
                keyboardType="email-address"
                value={newUser.email}
                onChangeText={(t) => setNewUser((p) => ({ ...p, email: t }))}
              />
              <Text style={styles.inputHelper}>
                Allows login via work email and Google SSO.
              </Text>

              <Text style={styles.inputLabel}>Mobile / Phone Number (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. +91 9876543210"
                keyboardType="phone-pad"
                value={newUser.phone}
                onChangeText={(t) => setNewUser((p) => ({ ...p, phone: t }))}
              />
              <Text style={styles.inputHelper}>
                Allows mobile number and OTP login (code: 123456).
              </Text>

              <Text style={styles.inputLabel}>Assigned Role *</Text>
              <View style={styles.rolePickerRow}>
                {['doctor', 'receptionist', 'lab_technician', 'billing', 'admin'].map((r) => {
                  const sel = newUser.role === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleChip, sel && styles.roleChipSelected]}
                      onPress={() => setNewUser((p) => ({ ...p, role: r }))}
                    >
                      <Text style={[styles.roleChipText, sel && styles.roleChipTextSelected]}>
                        {r.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Initial Password * (min 6 chars)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="••••••••"
                secureTextEntry
                value={newUser.password}
                onChangeText={(t) => setNewUser((p) => ({ ...p, password: t }))}
              />

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                activeOpacity={0.85}
                onPress={handleCreateUser}
              >
                <Text style={styles.modalSubmitBtnText}>Create Staff Account</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Reset Password */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 320 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset User Password</Text>
              <TouchableOpacity onPress={() => setShowResetModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
              Set new password for{' '}
              <Text style={{ fontWeight: '800', color: '#0F172A' }}>
                {selectedUser?.username}
              </Text>
            </Text>

            <Text style={styles.inputLabel}>New Password * (min 6 chars)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="••••••••"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              activeOpacity={0.85}
              onPress={handleResetPassword}
            >
              <Text style={styles.modalSubmitBtnText}>Confirm Password Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  addStaffHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addStaffHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    fontWeight: '800',
    color: '#0F766E',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  userCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  userUsername: {
    fontSize: 11.5,
    color: '#64748B',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  userEmail: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  userCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  lastLoginText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  actionBtnOutlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  actionBtnStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
  },
  actionBtnActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  actionBtnDanger: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  actionBtnStatusText: {
    fontSize: 11,
    fontWeight: '800',
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
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  inputHelper: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 6,
  },
  rolePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleChipSelected: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0F766E',
  },
  roleChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  roleChipTextSelected: {
    color: '#0F766E',
  },
  modalSubmitBtn: {
    backgroundColor: '#0F766E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSubmitBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
