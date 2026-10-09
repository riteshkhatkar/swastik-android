// swastik-android/screens/lab/LabSettingsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';

interface LabSettingsScreenProps {
  onOpenDrawer: () => void;
}

export const LabSettingsScreen: React.FC<LabSettingsScreenProps> = ({ onOpenDrawer }) => {
  const insets = useSafeAreaInsets();

  const { user, updateUserProfile } = useAuthStore();
  // Picker selection modal state
  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    options: string[];
    selected: string;
    onSelect: (val: string) => void;
  }>({
    visible: false,
    title: '',
    options: [],
    selected: '',
    onSelect: () => {},
  });

  // Profile Information
  const [fullName, setFullName] = useState(user?.full_name || 'Dr. Prerana Suryawanshi');
  const [username, setUsername] = useState(user?.username || 'lab');
  const [email, setEmail] = useState(user?.email || 'suryawanshiprerana107@gmail.com');
  const [phone, setPhone] = useState(user?.phone || '+91 91234 56789');
  const [department, setDepartment] = useState('Laboratory');
  const [role, setRole] = useState('Lab Technician');

  // Preferences
  const [defaultStatus, setDefaultStatus] = useState('Pending Review');
  const [reportVerification, setReportVerification] = useState('Single-Signoff (Technician)');
  const [reportFormat, setReportFormat] = useState('PDF (With Hospital Header)');
  const [autoPrint, setAutoPrint] = useState('Disabled');

  // Notification toggles
  const [smsOnCollection, setSmsOnCollection] = useState(true);
  const [emailOnReport, setEmailOnReport] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = () => {
    updateUserProfile({
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
    Alert.alert('Profile Saved ✅', 'Laboratory profile details updated and synchronized.');
  };

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in required password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    Alert.alert('Success', 'Password updated successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Laboratory Settings</Text>
          <Text style={styles.subTitle}>
            Manage your laboratory profile, preferences, and notifications.
          </Text>
        </View>

        {/* Section 1: Profile Information */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.accentBar} />
            <View>
              <Text style={styles.sectionTitle}>Profile Information</Text>
              <Text style={styles.sectionSubtitle}>View and update your laboratory account details.</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F1F5F9', color: '#64748B' }]}
              value={`@${username}`}
              editable={false}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address (For Login &amp; Google SSO)</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="e.g. lab@swastik.hospital"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mobile Number (For OTP Login)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="e.g. +91 91234 56789"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Assigned Department</Text>
            <TouchableOpacity
              style={styles.dropdownFake}
              activeOpacity={0.7}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: 'Select Assigned Department',
                  options: ['Laboratory', 'Pathology', 'Biochemistry', 'Microbiology', 'Hematology'],
                  selected: department,
                  onSelect: (val) => setDepartment(val),
                })
              }
            >
              <Text style={styles.dropdownFakeText}>{department}</Text>
              <Feather name="chevron-down" size={18} color="#0F766E" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Role</Text>
            <TouchableOpacity
              style={styles.dropdownFake}
              activeOpacity={0.7}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: 'Select Role',
                  options: ['Lab Technician', 'Senior Pathologist', 'Biochemist', 'Lab Supervisor', 'Diagnostics Head'],
                  selected: role,
                  onSelect: (val) => setRole(val),
                })
              }
            >
              <Text style={styles.dropdownFakeText}>{role}</Text>
              <Feather name="chevron-down" size={18} color="#0F766E" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.actionBtnSolid}
            activeOpacity={0.85}
            onPress={handleSaveProfile}
          >
            <Feather name="save" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Save Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: Lab Preferences */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.accentBar} />
            <View>
              <Text style={styles.sectionTitle}>Lab Preferences</Text>
              <Text style={styles.sectionSubtitle}>Configure laboratory workflow and report settings.</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Default Test Status After Entry</Text>
            <TouchableOpacity
              style={styles.dropdownFake}
              activeOpacity={0.7}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: 'Select Default Test Status',
                  options: ['Pending Review', 'Under Analysis', 'Completed', 'Verified'],
                  selected: defaultStatus,
                  onSelect: (val) => setDefaultStatus(val),
                })
              }
            >
              <Text style={styles.dropdownFakeText}>{defaultStatus}</Text>
              <Feather name="chevron-down" size={18} color="#0F766E" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Report Verification</Text>
            <TouchableOpacity
              style={styles.dropdownFake}
              activeOpacity={0.7}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: 'Select Report Verification Mode',
                  options: [
                    'Single-Signoff (Technician)',
                    'Dual-Signoff (Technician + Doctor)',
                    'Supervisor Approval Required',
                  ],
                  selected: reportVerification,
                  onSelect: (val) => setReportVerification(val),
                })
              }
            >
              <Text style={styles.dropdownFakeText}>{reportVerification}</Text>
              <Feather name="chevron-down" size={18} color="#0F766E" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Default Report Format</Text>
            <TouchableOpacity
              style={styles.dropdownFake}
              activeOpacity={0.7}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: 'Select Default Report Format',
                  options: [
                    'PDF (With Hospital Header)',
                    'PDF (Plain Letterhead)',
                    'Digital Link via SMS',
                    'Full Lab Summary',
                  ],
                  selected: reportFormat,
                  onSelect: (val) => setReportFormat(val),
                })
              }
            >
              <Text style={styles.dropdownFakeText}>{reportFormat}</Text>
              <Feather name="chevron-down" size={18} color="#0F766E" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Auto Print Report</Text>
            <TouchableOpacity
              style={styles.dropdownFake}
              activeOpacity={0.7}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: 'Select Auto Print Policy',
                  options: ['Disabled', 'Immediately After Verification', 'On Sample Receipt'],
                  selected: autoPrint,
                  onSelect: (val) => setAutoPrint(val),
                })
              }
            >
              <Text style={styles.dropdownFakeText}>{autoPrint}</Text>
              <Feather name="chevron-down" size={18} color="#0F766E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Notification Preferences */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.accentBar} />
            <View>
              <Text style={styles.sectionTitle}>Notification Preferences</Text>
              <Text style={styles.sectionSubtitle}>Configure alerts and notifications for laboratory events.</Text>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>SMS Patient on Sample Collection</Text>
              <Text style={styles.toggleSub}>Automatically send SMS to patient when sample is collected.</Text>
            </View>
            <Switch
              value={smsOnCollection}
              onValueChange={setSmsOnCollection}
              trackColor={{ false: '#E2E8F0', true: '#0F766E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Email Patient on Report Ready</Text>
              <Text style={styles.toggleSub}>Automatically send email to patient when report is ready.</Text>
            </View>
            <Switch
              value={emailOnReport}
              onValueChange={setEmailOnReport}
              trackColor={{ false: '#E2E8F0', true: '#0F766E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Critical Lab Value Alerts</Text>
              <Text style={styles.toggleSub}>Get notified immediately for critical laboratory values.</Text>
            </View>
            <Switch
              value={criticalAlerts}
              onValueChange={setCriticalAlerts}
              trackColor={{ false: '#E2E8F0', true: '#0F766E' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section 4: Change Password */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.accentBar} />
            <View>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <Text style={styles.sectionSubtitle}>Update your account password.</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.actionBtnSolid}
            activeOpacity={0.85}
            onPress={handleUpdatePassword}
          >
            <Feather name="lock" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Update Password</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Options Picker Modal */}
      <Modal
        visible={pickerModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModal((prev) => ({ ...prev, visible: false }))}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerModal((prev) => ({ ...prev, visible: false }))}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerModal.title}</Text>
              <TouchableOpacity
                onPress={() => setPickerModal((prev) => ({ ...prev, visible: false }))}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {pickerModal.options.map((opt) => {
                const isSelected = pickerModal.selected === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.modalOptionItem, isSelected && styles.modalOptionItemActive]}
                    onPress={() => {
                      pickerModal.onSelect(opt);
                      setPickerModal((prev) => ({ ...prev, visible: false }));
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected && styles.modalOptionTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#0F766E" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  accentBar: {
    width: 4,
    height: 18,
    backgroundColor: '#0F766E',
    borderRadius: 2,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  dropdownFake: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  dropdownFakeText: {
    fontSize: 13,
    color: '#1E293B',
  },
  actionBtnSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
    marginTop: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
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
  modalOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalOptionItemActive: {
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
