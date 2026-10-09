// swastik-android/screens/admin/AdminSystemConfigScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { adminApi } from '../../services/api';

interface AdminSystemConfigScreenProps {
  onOpenDrawer: () => void;
}

export const AdminSystemConfigScreen: React.FC<AdminSystemConfigScreenProps> = ({
  onOpenDrawer,
}) => {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<'General' | 'Pricing' | 'Working Hours' | 'Notifications' | 'Others'>('General');
  const [saving, setSaving] = useState(false);

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

  // Form State matching Image 8
  const [hospitalName, setHospitalName] = useState('Swastik Hospital');
  const [contactNumber, setContactNumber] = useState('+91 98765 43210');
  const [emailAddress, setEmailAddress] = useState('info@swastikhospital.co.in');

  const [consultationFee, setConsultationFee] = useState('500');
  const [labBasePrice, setLabBasePrice] = useState('300');
  const [admissionDeposit, setAdmissionDeposit] = useState('5000');

  const [startTime, setStartTime] = useState('08:00 AM');
  const [endTime, setEndTime] = useState('08:00 PM');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [slotDuration, setSlotDuration] = useState('30 minutes');
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  const [reminderTime, setReminderTime] = useState('24 hours before');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [sendSms, setSendSms] = useState(true);

  useEffect(() => {
    adminApi.getConfig().then((cfg) => {
      if (cfg) {
        if (cfg.hospital_name) setHospitalName(cfg.hospital_name);
        if (cfg.contact_number) setContactNumber(cfg.contact_number);
        if (cfg.email_address) setEmailAddress(cfg.email_address);
        if (cfg.consultation_fee) setConsultationFee(String(cfg.consultation_fee));
        if (cfg.lab_base_fee) setLabBasePrice(String(cfg.lab_base_fee));
        if (cfg.admission_deposit) setAdmissionDeposit(String(cfg.admission_deposit));
        if (cfg.work_start) setStartTime(cfg.work_start);
        if (cfg.work_end) setEndTime(cfg.work_end);
        if (cfg.working_days) setWorkingDays(cfg.working_days);
        if (cfg.sms_enabled !== undefined) setSendSms(cfg.sms_enabled);
      }
    });
  }, []);

  const toggleDay = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleResetToDefault = () => {
    Alert.alert(
      'Reset Configuration?',
      'Restore all hospital settings to original factory defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setHospitalName('Swastik Hospital');
            setContactNumber('+91 98765 43210');
            setEmailAddress('info@swastikhospital.co.in');
            setConsultationFee('500');
            setLabBasePrice('300');
            setAdmissionDeposit('5000');
            setStartTime('08:00 AM');
            setEndTime('08:00 PM');
            setTimezone('Asia/Kolkata');
            setSlotDuration('30 minutes');
            setWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
            setReminderTime('24 hours before');
            setLowStockThreshold('10');
            setSendSms(true);
            Alert.alert('Reset Complete', 'Default hospital configurations restored.');
          },
        },
      ]
    );
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const payload = {
        hospital_name: hospitalName,
        contact_number: contactNumber,
        email_address: emailAddress,
        consultation_fee: parseInt(consultationFee, 10) || 500,
        lab_base_fee: parseInt(labBasePrice, 10) || 300,
        admission_deposit: parseInt(admissionDeposit, 10) || 5000,
        work_start: startTime,
        work_end: endTime,
        timezone,
        slot_duration: slotDuration,
        working_days: workingDays,
        reminder_time: reminderTime,
        low_stock_threshold: parseInt(lowStockThreshold, 10) || 10,
        sms_enabled: sendSms,
      };

      await adminApi.updateConfig(payload);
      Alert.alert('Success ✅', 'Hospital configuration saved to database successfully.');
    } catch (err: any) {
      Alert.alert('Save Error', err?.message || 'Could not update configuration.');
    } finally {
      setSaving(false);
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

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>System Configuration</Text>
          <Text style={styles.screenSubtitle}>
            Configure hospital-wide settings, working hours, and operational thresholds.
          </Text>
        </View>

        {/* Top Category Tabs (Matches Image 8) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          <View style={styles.tabsRow}>
            {[
              { id: 'General', label: 'General', icon: 'settings-outline' },
              { id: 'Pricing', label: 'Pricing', icon: 'cash-outline' },
              { id: 'Working Hours', label: 'Working Hours', icon: 'time-outline' },
              { id: 'Notifications', label: 'Notifications', icon: 'notifications-outline' },
              { id: 'Others', label: 'Others', icon: 'grid-outline' },
            ].map((tab) => {
              const sel = activeCategory === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.categoryTab, sel && styles.categoryTabActive]}
                  onPress={() => setActiveCategory(tab.id as any)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={16}
                    color={sel ? '#0F766E' : '#64748B'}
                  />
                  <Text style={[styles.categoryTabText, sel && styles.categoryTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Section 1: Hospital Information */}
        <View style={styles.configCard}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: '#CCFBF1' }]}>
              <Ionicons name="business-outline" size={18} color="#0F766E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Hospital Information</Text>
              <Text style={styles.cardSub}>Basic details used in invoices, reports and communication.</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Hospital Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={hospitalName}
              onChangeText={setHospitalName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Contact Number</Text>
            <TextInput
              style={styles.fieldInput}
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.fieldInput}
              value={emailAddress}
              onChangeText={setEmailAddress}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Section 2: Pricing Settings */}
        <View style={styles.configCard}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: '#CCFBF1' }]}>
              <FontAwesome5 name="rupee-sign" size={16} color="#0F766E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Pricing Settings</Text>
              <Text style={styles.cardSub}>Configure standard charges for services (default values).</Text>
            </View>
          </View>

          <View style={styles.threeColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Consultation (₹)</Text>
              <TextInput
                style={styles.fieldInput}
                value={consultationFee}
                onChangeText={setConsultationFee}
                keyboardType="numeric"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Lab Base (₹)</Text>
              <TextInput
                style={styles.fieldInput}
                value={labBasePrice}
                onChangeText={setLabBasePrice}
                keyboardType="numeric"
              />
            </View>

            <View style={{ flex: 1.2 }}>
              <Text style={styles.fieldLabel}>Deposit (₹)</Text>
              <TextInput
                style={styles.fieldInput}
                value={admissionDeposit}
                onChangeText={setAdmissionDeposit}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Section 3: Working Hours & Timezone */}
        <View style={styles.configCard}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="time-outline" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Working Hours &amp; Timezone</Text>
              <Text style={styles.cardSub}>Set hospital operational hours and timezone for schedules.</Text>
            </View>
          </View>

          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Start Time</Text>
              <TextInput
                style={styles.fieldInput}
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>End Time</Text>
              <TextInput
                style={styles.fieldInput}
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Timezone</Text>
            <TouchableOpacity
              style={styles.pickerBox}
              activeOpacity={0.7}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: 'Select System Timezone',
                  options: [
                    'Asia/Kolkata (IST)',
                    'Asia/Dubai (GST)',
                    'UTC',
                    'America/New_York (EST)',
                    'Europe/London (GMT)',
                    'Asia/Singapore (SGT)',
                  ],
                  selected: timezone,
                  onSelect: (val) => setTimezone(val),
                })
              }
            >
              <Text style={styles.pickerValText}>{timezone}</Text>
              <Ionicons name="chevron-down" size={16} color="#0F766E" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Default Slot Duration</Text>
            <TouchableOpacity
              style={styles.pickerBox}
              activeOpacity={0.7}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: 'Select Slot Duration',
                  options: ['15 minutes', '20 minutes', '30 minutes', '45 minutes', '60 minutes'],
                  selected: slotDuration,
                  onSelect: (val) => setSlotDuration(val),
                })
              }
            >
              <Text style={styles.pickerValText}>{slotDuration}</Text>
              <Ionicons name="chevron-down" size={16} color="#0F766E" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Working Days</Text>
            <View style={styles.daysRow}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                const isSelected = workingDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, isSelected && styles.dayChipActive]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Section 4: Notification Settings */}
        <View style={styles.configCard}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: '#F0FDFA' }]}>
              <Ionicons name="notifications-outline" size={18} color="#0F766E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Notification Settings</Text>
              <Text style={styles.cardSub}>Configure alerts and reminders for staff and patients.</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Appointment Reminder</Text>
            <TouchableOpacity
              style={styles.pickerBox}
              activeOpacity={0.7}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: 'Select Appointment Reminder Window',
                  options: [
                    '2 hours before',
                    '4 hours before',
                    '12 hours before',
                    '24 hours before',
                    '48 hours before',
                  ],
                  selected: reminderTime,
                  onSelect: (val) => setReminderTime(val),
                })
              }
            >
              <Text style={styles.pickerValText}>{reminderTime}</Text>
              <Ionicons name="chevron-down" size={16} color="#0F766E" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Low Stock Alert Threshold</Text>
            <View style={styles.unitInputRow}>
              <TextInput
                style={[styles.fieldInput, { flex: 1 }]}
                value={lowStockThreshold}
                onChangeText={setLowStockThreshold}
                keyboardType="numeric"
              />
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>items</Text>
              </View>
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Send SMS Notifications</Text>
            <Switch
              value={sendSms}
              onValueChange={setSendSms}
              trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
              thumbColor={sendSms ? '#0F766E' : '#94A3B8'}
            />
          </View>
        </View>

        {/* Bottom Action Buttons (Matches Image 8 exactly) */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.resetBtn}
            activeOpacity={0.8}
            onPress={handleResetToDefault}
          >
            <Ionicons name="refresh-outline" size={18} color="#DC2626" />
            <Text style={styles.resetBtnText}>Reset to Default</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.85}
            onPress={handleSaveConfig}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Configuration</Text>
              </>
            )}
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
                <Ionicons name="close" size={22} color="#64748B" />
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
    paddingBottom: 40,
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
  tabScroll: {
    marginBottom: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0F766E',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryTabTextActive: {
    color: '#0F766E',
  },
  configCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  formGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  threeColRow: {
    flexDirection: 'row',
    gap: 8,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pickerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerValText: {
    fontSize: 13,
    color: '#0F172A',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  dayChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dayChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  dayChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  dayChipTextActive: {
    color: '#15803D',
    fontWeight: '800',
  },
  unitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitBadgeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 6,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  saveBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 6,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
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
    maxWidth: 380,
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
