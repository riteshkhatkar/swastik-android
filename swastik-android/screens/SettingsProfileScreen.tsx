// swastik-android/screens/SettingsProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { AppHeader } from '../components/AppHeader';
import { useAuthStore } from '../store/authStore';
import { doctorApi, getApiErrorMessage } from '../services/api';

const { width } = Dimensions.get('window');

interface SettingsProfileScreenProps {
  onOpenDrawer: () => void;
}

export const SettingsProfileScreen: React.FC<SettingsProfileScreenProps> = ({ onOpenDrawer }) => {
  const { user, updateUserProfile } = useAuthStore();

  // Profile form state
  const [fullName, setFullName] = useState(user?.full_name || 'Dr. P. M. Chougule');
  const [email, setEmail] = useState('vaishali@ova.ngo');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [specialization, setSpecialization] = useState('Psychiatry');
  const [qualification, setQualification] = useState('MD (Psychiatry)');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Security password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Doctor custom questions state
  const [customQuestions, setCustomQuestions] = useState<any[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [savingQuestions, setSavingQuestions] = useState(false);

  useEffect(() => {
    loadLiveProfile();
    loadCustomQuestions();
  }, [user]);

  const loadLiveProfile = async () => {
    try {
      setLoadingProfile(true);
      const profile = await doctorApi.getProfile();
      if (profile) {
        if (profile.full_name) setFullName(profile.full_name);
        if (profile.email) setEmail(profile.email);
        if (profile.phone) setPhone(profile.phone);
        if (profile.specialization) setSpecialization(profile.specialization);
        if (profile.qualification) setQualification(profile.qualification);
      }
    } catch (err: any) {
      console.log('Error loading doctor profile:', err);
      if (user?.full_name) {
        setFullName(user.full_name);
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadCustomQuestions = async () => {
    try {
      const res = await doctorApi.getCustomQuestions();
      if (res && Array.isArray(res.questions)) {
        setCustomQuestions(res.questions);
      } else if (Array.isArray(res)) {
        setCustomQuestions(res);
      }
    } catch (err) {
      console.log('Error loading custom questions:', err);
    }
  };

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full Name cannot be empty.');
      return;
    }

    setUpdatingProfile(true);
    try {
      await doctorApi.updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        specialization: specialization.trim(),
        qualification: qualification.trim(),
      });

      updateUserProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      Alert.alert('Profile Updated', 'Doctor profile has been updated and synchronized with the clinical server.');
    } catch (err: any) {
      Alert.alert('Update Failed', getApiErrorMessage(err, 'Failed to update doctor profile on server.'));
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Validation Error', 'Please enter both current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'New password must be at least 6 characters.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await doctorApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      Alert.alert('Success', 'Account password has been successfully updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Password Change Failed', getApiErrorMessage(err, 'Current password may be incorrect or session expired.'));
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    const newQ = {
      id: `q_${Date.now()}`,
      text: newQuestionText.trim(),
      isCustom: true,
    };
    setCustomQuestions([...customQuestions, newQ]);
    setNewQuestionText('');
  };

  const handleRemoveQuestion = (id: string) => {
    setCustomQuestions(customQuestions.filter((q) => q.id !== id));
  };

  const handleSaveQuestions = async () => {
    try {
      setSavingQuestions(true);
      await doctorApi.updateCustomQuestions(customQuestions);
      Alert.alert('Saved', 'Custom consultation checklist questions updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to save custom questions.'));
    } finally {
      setSavingQuestions(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Header with Hamburger & Swastik Logo (NO back button) */}
      <AppHeader onOpenDrawer={onOpenDrawer} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Title */}
        <Text style={styles.screenTitle}>Settings & Profile</Text>

        {loadingProfile && (
          <View style={{ marginBottom: 12, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#1A7B76" />
          </View>
        )}

        {/* Container for the Two Cards */}
        <View style={styles.cardsContainer}>
          {/* CARD 1: Profile Information */}
          <View style={styles.card}>
            {/* Top Icon Badge */}
            <View style={styles.iconCircle}>
              <Ionicons name="person-outline" size={24} color="#1A7B76" />
            </View>

            <Text style={styles.cardHeading}>Profile Information</Text>
            <Text style={styles.cardSub}>
              Update your personal and professional details.
            </Text>

            {/* Form Fields */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                style={styles.fieldInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Dr. Full Name"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
              <TextInput
                style={styles.fieldInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>SPECIALIZATION</Text>
              <TextInput
                style={styles.fieldInput}
                value={specialization}
                onChangeText={setSpecialization}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>QUALIFICATION</Text>
              <TextInput
                style={styles.fieldInput}
                value={qualification}
                onChangeText={setQualification}
              />
            </View>

            {/* Update Profile Button */}
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.8}
              onPress={handleUpdateProfile}
              disabled={updatingProfile}
            >
              {updatingProfile ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="person" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>Update Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* CARD 2: Security Settings */}
          <View style={styles.card}>
            {/* Top Icon Badge */}
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed-outline" size={24} color="#1A7B76" />
            </View>

            <Text style={styles.cardHeading}>Security Settings</Text>
            <Text style={styles.cardSub}>
              Change your password to keep your account secure.
            </Text>

            {/* Form Fields */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
              <TextInput
                style={styles.fieldInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
              <TextInput
                style={styles.fieldInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
              <TextInput
                style={styles.fieldInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                secureTextEntry
              />
            </View>

            {/* Change Password Button */}
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.8}
              onPress={handleChangePassword}
              disabled={updatingPassword}
            >
              {updatingPassword ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>Change Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* CARD 3: Consultation Custom Questions */}
          <View style={styles.card}>
            {/* Top Icon Badge */}
            <View style={styles.iconCircle}>
              <Feather name="help-circle" size={24} color="#1A7B76" />
            </View>

            <Text style={styles.cardHeading}>Consultation Checklist Questions</Text>
            <Text style={styles.cardSub}>
              Customize clinical examination questions and prompts for psychiatric consultations.
            </Text>

            {/* Existing Questions List */}
            <View style={{ marginBottom: 14 }}>
              {customQuestions.length === 0 ? (
                <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', marginVertical: 6 }}>
                  No custom checklist questions configured. Add below.
                </Text>
              ) : (
                customQuestions.map((q, idx) => (
                  <View
                    key={q.id || idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#F8FAFC',
                      padding: 10,
                      borderRadius: 8,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 13, color: '#1E293B', fontWeight: '500' }}>
                      {idx + 1}. {q.text}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveQuestion(q.id)}
                      style={{ padding: 4, marginLeft: 8 }}
                    >
                      <Feather name="trash-2" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {/* Add New Question Row */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <TextInput
                style={[styles.fieldInput, { flex: 1 }]}
                value={newQuestionText}
                onChangeText={setNewQuestionText}
                placeholder="e.g. History of sleep disturbance..."
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity
                onPress={handleAddQuestion}
                style={{
                  backgroundColor: '#1A7B76',
                  borderRadius: 10,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="plus" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Save Questions Button */}
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.8}
              onPress={handleSaveQuestions}
              disabled={savingQuestions}
            >
              {savingQuestions ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="check-circle" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>Save Checklist Questions</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
    fontSize: 26,
    fontWeight: '800',
    color: '#0F1E36',
    marginTop: 6,
    marginBottom: 18,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    padding: 20,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#0E877F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
