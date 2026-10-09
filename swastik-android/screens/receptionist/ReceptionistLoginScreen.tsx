// swastik-android/screens/receptionist/ReceptionistLoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { GoogleSignInModal } from '../../components/GoogleSignInModal';
import { GoogleLogo } from '../../components/GoogleLogo';

const { width } = Dimensions.get('window');

interface ReceptionistLoginScreenProps {
  onBackToRoles: () => void;
  onLoginSuccess: () => void;
}

export const ReceptionistLoginScreen: React.FC<ReceptionistLoginScreenProps> = ({
  onBackToRoles,
  onLoginSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');

  // Password Login State
  const [username, setUsername] = useState('receptionist');
  const [password, setPassword] = useState('receptionist123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP Login State
  const [otpIdentifier, setOtpIdentifier] = useState('+91 98765 43210');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Google Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const { login, requestOtp, otpLogin } = useAuthStore();

  const handlePasswordLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your username/email/mobile and password.');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password.trim(), 'receptionist');
      onLoginSuccess();
    } catch (err: any) {
      Alert.alert(
        'Login Failed',
        err.message || 'Invalid receptionist credentials. Please check username and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!otpIdentifier.trim()) {
      Alert.alert('Required', 'Please enter your registered mobile number or email.');
      return;
    }
    setSendingOtp(true);
    try {
      const res = await requestOtp(otpIdentifier.trim());
      setOtpSent(true);
      setOtpCode('123456');
      Alert.alert('OTP Sent 📲', res.message);
    } catch (err: any) {
      Alert.alert('OTP Error', err.message || 'Failed to send OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpIdentifier.trim() || !otpCode.trim()) {
      Alert.alert('Required', 'Please enter both your mobile number and the OTP code.');
      return;
    }
    setVerifyingOtp(true);
    try {
      await otpLogin(otpIdentifier.trim(), otpCode.trim(), 'receptionist');
      onLoginSuccess();
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid OTP code. Please retry.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleContactIT = () => {
    Alert.alert(
      'IT Support Helpdesk',
      'Hospital IT Helpline: +91 7385660739\nContact Person: Vaishali (Front Desk Tech Support)\nEmail: vaishali@ova.ngo\nAvailable 24x7 for reception & admissions support.'
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 14 : 20),
            paddingBottom: 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row with Back navigation to Roles */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onBackToRoles} activeOpacity={0.7} style={styles.logoBtn}>
            <Image
              source={require('../../assets/swastik_large_brand_transparent.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Floating Card */}
        <View style={styles.card}>
          {/* Avatar Icon */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Ionicons name="people" size={40} color="#0D9488" />
            </View>
          </View>

          {/* Titles */}
          <Text style={styles.cardTitle}>Receptionist Login</Text>
          <Text style={styles.cardSubtitle}>Sign in to access registration workspace</Text>
          <View style={styles.accentBar} />

          {/* Auth Mode Toggle Tabs (Password vs Mobile/OTP) */}
          <View style={styles.authModeTabs}>
            <TouchableOpacity
              style={[styles.authModeTab, authMode === 'password' && styles.authModeTabActive]}
              activeOpacity={0.8}
              onPress={() => setAuthMode('password')}
            >
              <Feather
                name="lock"
                size={13}
                color={authMode === 'password' ? '#0D9488' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.authModeTabText, authMode === 'password' && styles.authModeTabTextActive]}
              >
                Password Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.authModeTab, authMode === 'otp' && styles.authModeTabActive]}
              activeOpacity={0.8}
              onPress={() => setAuthMode('otp')}
            >
              <Feather
                name="smartphone"
                size={13}
                color={authMode === 'otp' ? '#0D9488' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.authModeTabText, authMode === 'otp' && styles.authModeTabTextActive]}
              >
                Mobile / OTP
              </Text>
            </TouchableOpacity>
          </View>

          {authMode === 'password' ? (
            /* Form Fields */
            <View style={styles.formContainer}>
              {/* Username Input */}
              <View style={styles.inputContainer}>
                <Feather name="user" size={19} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Username, Email or Mobile"
                  placeholderTextColor="#94A3B8"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Feather name="lock" size={19} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={19}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={styles.loginBtn}
                activeOpacity={0.8}
                onPress={handlePasswordLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.loginBtnContent}>
                    <Text style={styles.loginBtnText}>Sign In as Receptionist</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* OTP Form Mode */
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Feather name="smartphone" size={19} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Registered Mobile or Email"
                  placeholderTextColor="#94A3B8"
                  value={otpIdentifier}
                  onChangeText={setOtpIdentifier}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.sendOtpBtn}
                  activeOpacity={0.7}
                  onPress={handleSendOtp}
                  disabled={sendingOtp}
                >
                  {sendingOtp ? (
                    <ActivityIndicator size="small" color="#0D9488" />
                  ) : (
                    <Text style={styles.sendOtpBtnText}>{otpSent ? 'Resend' : 'Get OTP'}</Text>
                  )}
                </TouchableOpacity>
              </View>

              {otpSent && (
                <View style={styles.otpNoticeBox}>
                  <Ionicons name="information-circle-outline" size={15} color="#0D9488" />
                  <Text style={styles.otpNoticeText}>
                    Testing OTP is <Text style={{ fontWeight: '700' }}>123456</Text>
                  </Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Feather name="key" size={19} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter 6-Digit OTP"
                  placeholderTextColor="#94A3B8"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity
                style={styles.loginBtn}
                activeOpacity={0.8}
                onPress={handleVerifyOtp}
                disabled={verifyingOtp}
              >
                {verifyingOtp ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.loginBtnContent}>
                    <Text style={styles.loginBtnText}>Verify OTP &amp; Login</Text>
                    <Feather name="check-circle" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* OR Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign in with Google */}
          <TouchableOpacity
            style={styles.googleBtn}
            activeOpacity={0.8}
            onPress={() => setShowGoogleModal(true)}
          >
            <GoogleLogo size={20} />
            <Text style={[styles.googleBtnText, { marginLeft: 10 }]}>Sign in with Google</Text>
          </TouchableOpacity>

          {/* Help / IT Support Footer */}
          <View style={styles.helpRow}>
            <Text style={styles.helpText}>Need assistance? </Text>
            <TouchableOpacity onPress={handleContactIT} activeOpacity={0.7}>
              <Text style={styles.helpLink}>Contact Front Desk IT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Unified Google Sign-in Modal */}
      <GoogleSignInModal
        visible={showGoogleModal}
        roleName="Receptionist Desk"
        roleValue="receptionist"
        onClose={() => setShowGoogleModal(false)}
        onSuccess={onLoginSuccess}
      />
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
  },
  scrollContent: {
    paddingHorizontal: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoBtn: {
    paddingVertical: 4,
  },
  brandLogo: {
    width: 160,
    height: 48,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
    marginTop: 4,
  },
  avatarWrapper: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  accentBar: {
    width: 44,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#0D9488',
    marginBottom: 16,
  },
  authModeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    width: '100%',
    marginBottom: 16,
  },
  authModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  authModeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  authModeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  authModeTabTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  formContainer: {
    width: '100%',
    gap: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  sendOtpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#CCFBF1',
  },
  sendOtpBtnText: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: '700',
  },
  otpNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  otpNoticeText: {
    fontSize: 12,
    color: '#0D9488',
  },
  loginBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  loginBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 48,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  googleBtnText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  helpText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  helpLink: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: '700',
  },
});
