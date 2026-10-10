// swastik-android/screens/LoginScreen.tsx
// Exact 1:1 mobile adaptation of the live website login screen (swastik.orelse.ai/login)

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput,
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { Colors } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';
import { WhatsAppFloat } from '../components/WhatsAppFloat';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  selectedRole?: UserRole;
  onBackToWorkspaces: () => void;
}

export const LoginScreen: React.FC<Props> = ({ 
  selectedRole = 'admin', 
  onBackToWorkspaces 
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [locale, setLocale] = useState('English');
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLoginSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your username and password.');
      return;
    }
    const success = await login(username.trim(), password);
    if (!success) {
      // Error will be shown in red error banner
    }
  };

  const handleGoogleSignIn = () => {
    Alert.alert(
      'Google Sign-In',
      `Please use the official Google Sign-In with an authorized hospital email account.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Navigation Button */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBackToWorkspaces}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.headerTeal} />
            <Text style={styles.backButtonText}>← All Workspaces</Text>
          </TouchableOpacity>

          {/* Centered Red Swastik Hospital Logo */}
          <View style={styles.logoWrapper}>
            <Image 
              source={require('../assets/swasstiklogo.png')} 
              style={styles.hospitalLogo}
              resizeMode="contain"
            />
          </View>

          {/* The Exact Card from Image 1 */}
          <View style={styles.loginCard}>
            {/* Dark Teal Header Bar */}
            <View style={styles.cardHeader}>
              <View style={styles.activeTab}>
                <Text style={styles.tabText}>Login</Text>
              </View>

              <View style={styles.localeGroup}>
                <Text style={styles.localeLabel}>Select Locale</Text>
                <View style={styles.localeSelector}>
                  <Text style={styles.localeSelectedText}>{locale}</Text>
                  <Ionicons name="chevron-down" size={13} color={Colors.headerTeal} />
                </View>
              </View>
            </View>

            {/* Card Body */}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>SWASTIK HOSPITAL LOGIN</Text>
              
              <View style={styles.roleSubBadge}>
                <Text style={styles.roleSubBadgeText}>
                  WORKSPACE: {selectedRole.toUpperCase()}
                </Text>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.red} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Username Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Username *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your username"
                  placeholderTextColor="#999999"
                  value={username}
                  onChangeText={(txt) => { clearError(); setUsername(txt); }}
                  autoCapitalize="none"
                />
              </View>

              {/* Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Password *</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    placeholderTextColor="#999999"
                    value={password}
                    onChangeText={(txt) => { clearError(); setPassword(txt); }}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={18} 
                      color="#666666" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Main Dark Teal Login Button */}
              <TouchableOpacity
                style={styles.loginBtn}
                activeOpacity={0.85}
                onPress={handleLoginSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.loginBtnText}>Login</Text>
                )}
              </TouchableOpacity>

              {/* OR Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign-in Button */}
              <TouchableOpacity
                style={styles.googleBtn}
                activeOpacity={0.8}
                onPress={handleGoogleSignIn}
              >
                {/* Google Multi-Color G Icon */}
                <View style={styles.googleIconBox}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#4285F4' }}>G</Text>
                </View>
                <Text style={styles.googleBtnText}>Sign in with Google</Text>
              </TouchableOpacity>


            </View>
          </View>

          {/* Footer Logo */}
          <View style={styles.footerWrap}>
            <Image 
              source={require('../assets/orelse.png')} 
              style={styles.orelseLogo}
              resizeMode="contain"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating WhatsApp Support Button */}
      <WhatsAppFloat />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 70,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.headerTeal,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  hospitalLogo: {
    width: 220,
    height: 70,
  },
  loginCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  cardHeader: {
    backgroundColor: Colors.headerTeal,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.headerTeal,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  tabText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  localeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  localeLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  localeSelector: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  localeSelectedText: {
    color: Colors.headerTeal,
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    padding: 24,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111111',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  roleSubBadge: {
    alignSelf: 'center',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    marginBottom: 20,
  },
  roleSubBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.brandTeal,
    letterSpacing: 0.8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.red,
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111111',
    backgroundColor: '#ffffff',
  },
  passwordWrapper: {
    height: 48,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
  loginBtn: {
    backgroundColor: Colors.headerTeal,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: Colors.headerTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  googleBtn: {
    height: 46,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIconBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#3c4043',
  },
  quickFillArea: {
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickFillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    marginBottom: 8,
  },
  quickFillChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.slate,
  },
  footerWrap: {
    alignItems: 'center',
    marginTop: 24,
  },
  orelseLogo: {
    width: 120,
    height: 45,
  },
});
