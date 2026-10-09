// swastik-android/screens/billing/BillingSettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { billingApi, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface BillingSettingsScreenProps {
  onOpenDrawer: () => void;
}

export const BillingSettingsScreen: React.FC<BillingSettingsScreenProps> = ({ onOpenDrawer }) => {
  const insets = useSafeAreaInsets();
  const { user, updateUserProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'hospital' | 'profile'>('hospital');

  // Hospital Billing Settings State
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hospitalName, setHospitalName] = useState('Swastik Hospital');
  const [defaultTax, setDefaultTax] = useState('5');
  const [upiId, setUpiId] = useState('swastikhospital@upi');
  const [upiRecipient, setUpiRecipient] = useState('Swastik Hospital');
  const [currency, setCurrency] = useState('INR');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [footerText, setFooterText] = useState(
    'Thank you for choosing Swastik Hospital. Get well soon!'
  );

  // Personal Staff Profile State
  const [staffFullName, setStaffFullName] = useState(user?.full_name || 'Billing Admin');
  const [staffUsername, setStaffUsername] = useState(user?.username || 'billing');
  const [staffEmail, setStaffEmail] = useState(user?.email || 'vaishali@ova.ngo');
  const [staffPhone, setStaffPhone] = useState(user?.phone || '+91 98765 11223');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const currencyOptions = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)' },
    { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
    { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
    { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham (AED)' },
  ];

  useEffect(() => {
    loadSettings();
    if (user) {
      if (user.full_name) setStaffFullName(user.full_name);
      if (user.username) setStaffUsername(user.username);
      if (user.email) setStaffEmail(user.email);
      if (user.phone) setStaffPhone(user.phone);
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const data = await billingApi.getSettings();
      if (data) {
        setHospitalName(data.hospital_name || data.hospitalName || 'Swastik Hospital');
        setDefaultTax(String(data.default_tax_percent ?? data.defaultTax ?? '5'));
        setUpiId(data.upi_id || data.upiId || 'swastikhospital@upi');
        setUpiRecipient(data.upi_recipient_name || data.upiRecipient || 'Swastik Hospital');
        setCurrency(data.currency || 'INR');
        setFooterText(data.receipt_footer || data.footerText || 'Thank you for choosing Swastik Hospital. Get well soon!');
      }
    } catch (err) {
      console.warn('Could not load billing settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleReset = () => {
    setHospitalName('Swastik Hospital');
    setDefaultTax('5');
    setUpiId('swastikhospital@upi');
    setUpiRecipient('Swastik Hospital');
    setCurrency('INR');
    setFooterText('Thank you for choosing Swastik Hospital. Get well soon!');
    Alert.alert('Reset', 'Settings reset to hospital defaults.');
  };

  const handleSaveHospitalSettings = async () => {
    if (!hospitalName.trim()) {
      Alert.alert('Validation', 'Hospital name is required.');
      return;
    }
    const taxNum = parseFloat(defaultTax);
    if (isNaN(taxNum) || taxNum < 0 || taxNum > 100) {
      Alert.alert('Validation', 'Default tax must be a percentage between 0 and 100.');
      return;
    }

    setSaving(true);
    try {
      await billingApi.saveSettings({
        hospital_name: hospitalName.trim(),
        default_tax_percent: taxNum,
        upi_id: upiId.trim(),
        upi_recipient_name: upiRecipient.trim(),
        receipt_footer: footerText.trim(),
        currency: currency.trim(),
      });
      Alert.alert('Settings Saved ✅', 'Hospital billing settings updated successfully.');
    } catch (err: any) {
      Alert.alert('Save Failed', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStaffProfile = () => {
    if (!staffFullName.trim()) {
      Alert.alert('Required', 'Staff Full Name is required.');
      return;
    }
    setSavingProfile(true);
    try {
      updateUserProfile({
        full_name: staffFullName.trim(),
        email: staffEmail.trim(),
        phone: staffPhone.trim(),
      });
      Alert.alert('Profile Saved ✅', 'Your staff profile details have been updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Required', 'Please fill in current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    setTimeout(() => {
      setSavingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password Updated ✅', 'Your login password has been changed successfully.');
    }, 600);
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
          <Text style={styles.mainTitle}>Billing &amp; Staff Settings</Text>
          <Text style={styles.subTitle}>Manage hospital billing preferences and your staff profile.</Text>
        </View>

        {/* Top Tab Switcher: Hospital vs Staff Profile */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'hospital' && styles.tabBtnActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('hospital')}
          >
            <Ionicons
              name="business-outline"
              size={15}
              color={activeTab === 'hospital' ? '#0F766E' : '#64748B'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'hospital' && styles.tabBtnTextActive]}>
              Hospital Billing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('profile')}
          >
            <Ionicons
              name="person-outline"
              size={15}
              color={activeTab === 'profile' ? '#0F766E' : '#64748B'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'profile' && styles.tabBtnTextActive]}>
              My Staff Profile
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'hospital' ? (
          <>
            {/* Setting Card 1: Hospital Name */}
            <View style={styles.settingCard}>
              <View style={styles.cardHeaderCol}>
                <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="business-outline" size={18} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Hospital Name</Text>
                  <Text style={styles.settingSub}>This name will appear on bills and receipts.</Text>
                </View>
              </View>
              <TextInput
                style={styles.inputField}
                value={hospitalName}
                onChangeText={setHospitalName}
              />
            </View>

            {/* Setting Card 2: Default Tax */}
            <View style={styles.settingCard}>
              <View style={styles.cardHeaderCol}>
                <View style={[styles.iconCircle, { backgroundColor: '#E6FFFA' }]}>
                  <Text style={{ fontWeight: '800', color: '#0D9488', fontSize: 16 }}>%</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Default Tax (%)</Text>
                  <Text style={styles.settingSub}>Applied to patient bills by default.</Text>
                </View>
              </View>
              <View style={styles.taxInputRow}>
                <TextInput
                  style={[styles.inputField, { flex: 1 }]}
                  value={defaultTax}
                  keyboardType="numeric"
                  onChangeText={setDefaultTax}
                />
                <View style={styles.percentUnitBox}>
                  <Text style={styles.percentUnitText}>%</Text>
                </View>
              </View>
            </View>

            {/* Setting Card 3: UPI ID */}
            <View style={styles.settingCard}>
              <View style={styles.cardHeaderCol}>
                <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="flash-outline" size={18} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>UPI ID</Text>
                  <Text style={styles.settingSub}>Used for receiving payments via UPI.</Text>
                </View>
              </View>
              <TextInput
                style={styles.inputField}
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
              />
            </View>

            {/* Setting Card 4: UPI Recipient Name */}
            <View style={styles.settingCard}>
              <View style={styles.cardHeaderCol}>
                <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="person-outline" size={18} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>UPI Recipient Name</Text>
                  <Text style={styles.settingSub}>Name that appears to patients during payment.</Text>
                </View>
              </View>
              <TextInput
                style={styles.inputField}
                value={upiRecipient}
                onChangeText={setUpiRecipient}
              />
            </View>

            {/* Setting Card 5: Currency */}
            <View style={styles.settingCard}>
              <View style={styles.cardHeaderCol}>
                <View style={[styles.iconCircle, { backgroundColor: '#E6FFFA' }]}>
                  <Ionicons name="cash-outline" size={18} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Currency</Text>
                  <Text style={styles.settingSub}>Select the default currency for bills.</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.currencyBox}
                activeOpacity={0.7}
                onPress={() => setShowCurrencyModal(true)}
              >
                <View style={styles.currencyLeft}>
                  <Text style={styles.currencySymbolBadgeText}>
                    {currencyOptions.find((c) => c.code === currency)?.symbol || '₹'}
                  </Text>
                  <Text style={styles.currencyText}>
                    {currencyOptions.find((c) => c.code === currency)?.name || `${currency} (Default)`}
                  </Text>
                </View>
                <Feather name="chevron-down" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Setting Card 6: Receipt Footer */}
            <View style={styles.settingCard}>
              <View style={styles.cardHeaderCol}>
                <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="document-text-outline" size={18} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Receipt Footer Note</Text>
                  <Text style={styles.settingSub}>Shown at the bottom of generated invoices.</Text>
                </View>
              </View>
              <TextInput
                style={[styles.inputField, { height: 75, textAlignVertical: 'top' }]}
                multiline
                value={footerText}
                onChangeText={setFooterText}
              />
            </View>

            {/* Actions Buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.resetBtn} activeOpacity={0.8} onPress={handleReset}>
                <Feather name="refresh-cw" size={16} color="#0F766E" />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                activeOpacity={0.85}
                onPress={handleSaveHospitalSettings}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="save" size={16} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Settings</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* Staff Personal Profile Mode */
          <>
            <View style={styles.settingCard}>
              <View style={styles.cardHeaderCol}>
                <View style={[styles.iconCircle, { backgroundColor: '#CCFBF1' }]}>
                  <Ionicons name="person" size={20} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Personal Information</Text>
                  <Text style={styles.settingSub}>Used for system login, invoices, and audit tracking</Text>
                </View>
              </View>

              <View style={styles.profileFieldRow}>
                <Text style={styles.fieldLabel}>FULL NAME *</Text>
                <TextInput
                  style={styles.inputField}
                  value={staffFullName}
                  onChangeText={setStaffFullName}
                  placeholder="e.g. Ramesh Patil"
                />
              </View>

              <View style={styles.profileFieldRow}>
                <Text style={styles.fieldLabel}>USERNAME</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: '#F1F5F9', color: '#64748B' }]}
                  value={`@${staffUsername}`}
                  editable={false}
                />
              </View>

              <View style={styles.profileFieldRow}>
                <Text style={styles.fieldLabel}>EMAIL ADDRESS (FOR LOGIN &amp; GOOGLE SSO)</Text>
                <TextInput
                  style={styles.inputField}
                  value={staffEmail}
                  onChangeText={setStaffEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="e.g. billing@swastik.hospital"
                />
              </View>

              <View style={styles.profileFieldRow}>
                <Text style={styles.fieldLabel}>MOBILE NUMBER (FOR OTP LOGIN)</Text>
                <TextInput
                  style={styles.inputField}
                  value={staffPhone}
                  onChangeText={setStaffPhone}
                  keyboardType="phone-pad"
                  placeholder="e.g. +91 98765 11223"
                />
              </View>

              <View style={styles.profileFieldRow}>
                <Text style={styles.fieldLabel}>ROLE / DEPARTMENT</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: '#F1F5F9', color: '#64748B' }]}
                  value="Billing & Accounts Desk"
                  editable={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { width: '100%', marginTop: 10 }]}
                activeOpacity={0.85}
                onPress={handleSaveStaffProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Staff Profile</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Change Password Card */}
            <View style={styles.settingCard}>
              <View style={styles.cardHeaderCol}>
                <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="lock-closed" size={18} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Change Password</Text>
                  <Text style={styles.settingSub}>Keep your cashier credentials secure</Text>
                </View>
              </View>

              <View style={styles.profileFieldRow}>
                <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
                <TextInput
                  style={styles.inputField}
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="••••••••"
                />
              </View>

              <View style={styles.profileFieldRow}>
                <Text style={styles.fieldLabel}>NEW PASSWORD (MIN 6 CHARS)</Text>
                <TextInput
                  style={styles.inputField}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                />
              </View>

              <View style={styles.profileFieldRow}>
                <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
                <TextInput
                  style={styles.inputField}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { width: '100%', backgroundColor: '#D97706', marginTop: 10 }]}
                activeOpacity={0.85}
                onPress={handleUpdatePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="shield" size={16} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCurrencyModal(false)}
        >
          <View style={styles.currencyModalCard}>
            <View style={styles.currencyModalHeader}>
              <Text style={styles.currencyModalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {currencyOptions.map((opt) => (
              <TouchableOpacity
                key={opt.code}
                style={[
                  styles.currencyOptionRow,
                  currency === opt.code && styles.currencyOptionActive,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setCurrency(opt.code);
                  setShowCurrencyModal(false);
                }}
              >
                <View style={styles.currencySymbolBadge}>
                  <Text style={styles.currencySymbolText}>{opt.symbol}</Text>
                </View>
                <Text style={styles.currencyOptionName}>{opt.name}</Text>
                {currency === opt.code && (
                  <Ionicons name="checkmark-circle" size={20} color="#0D9488" />
                )}
              </TouchableOpacity>
            ))}
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
    paddingBottom: 10,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  hamburgerBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerLogo: {
    width: 155,
    height: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 14,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#0F766E',
    fontWeight: '700',
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  cardHeaderCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  profileFieldRow: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  taxInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentUnitBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E6FFFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentUnitText: {
    color: '#0D9488',
    fontWeight: '800',
    fontSize: 16,
  },
  currencyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currencySymbolBadgeText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F766E',
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  currencyModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  currencyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  currencyModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  currencyOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
    gap: 12,
  },
  currencyOptionActive: {
    backgroundColor: '#F0FDFA',
  },
  currencySymbolBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbolText: {
    color: '#0D9488',
    fontWeight: '700',
    fontSize: 14,
  },
  currencyOptionName: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0F766E',
    backgroundColor: '#FFFFFF',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F766E',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
