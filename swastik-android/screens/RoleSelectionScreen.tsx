// swastik-android/screens/RoleSelectionScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { WhatsAppFloat } from '../components/WhatsAppFloat';
import { GoogleLogo } from '../components/GoogleLogo';
import { GoogleSignInModal } from '../components/GoogleSignInModal';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

export type UserRoleType =
  | 'doctor'
  | 'receptionist'
  | 'lab'
  | 'billing'
  | 'admin'
  | 'patient';

interface RoleSelectionScreenProps {
  onSelectRole: (role: UserRoleType) => void;
  onLoginSuccess?: (role: UserRoleType) => void;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({
  onSelectRole,
  onLoginSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [pressedRoleId, setPressedRoleId] = React.useState<UserRoleType | null>(null);
  const [showGoogleModal, setShowGoogleModal] = React.useState(false);

  const roles = [
    {
      id: 'doctor' as UserRoleType,
      title: 'Doctor',
      subtitle: 'Access patient records, appointments and clinical tools.',
      iconFamily: 'fontAwesome5',
      iconName: 'stethoscope',
      isHighlight: false,
    },
    {
      id: 'receptionist' as UserRoleType,
      title: 'Receptionist',
      subtitle: 'Manage registrations, appointments and front desk operations.',
      iconFamily: 'ionicons',
      iconName: 'person-outline',
      isHighlight: false,
    },
    {
      id: 'lab' as UserRoleType,
      title: 'Lab Technician',
      subtitle: 'Access lab orders, update reports and manage samples.',
      iconFamily: 'materialCommunity',
      iconName: 'flask-outline',
      isHighlight: false,
    },
    {
      id: 'billing' as UserRoleType,
      title: 'Billing',
      subtitle: 'Manage invoices, payments and billing records.',
      iconFamily: 'materialCommunity',
      iconName: 'file-document-outline',
      isHighlight: false,
    },
    {
      id: 'admin' as UserRoleType,
      title: 'Admin',
      subtitle: 'Manage staff, settings and hospital operations.',
      iconFamily: 'feather',
      iconName: 'settings',
      isHighlight: false,
    },
    {
      id: 'patient' as UserRoleType,
      title: 'Patient Portal',
      subtitle: 'Book appointments and access your health records.',
      iconFamily: 'ionicons',
      iconName: 'person',
      isHighlight: false,
    },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 16 : 24),
            paddingBottom: 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand logo centered */}
        <View style={styles.brandRow}>
          <Image
            source={require('../assets/swastik_large_brand_transparent.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        {/* Welcome titles */}
        <View style={styles.headerTitles}>
          <Text style={styles.welcomeMain}>Welcome to</Text>
          <Text style={styles.welcomeHospital}>Swastik Hospital</Text>
          <Text style={styles.roleSubtext}>SELECT YOUR ROLE TO CONTINUE</Text>
          <View style={styles.accentBar} />
        </View>

        {/* Quick Google Sign-In Card */}
        <TouchableOpacity
          style={styles.googleQuickCard}
          activeOpacity={0.85}
          onPress={() => setShowGoogleModal(true)}
        >
          <View style={styles.googleIconBox}>
            <GoogleLogo size={22} />
          </View>
          <View style={{ flex: 1, paddingHorizontal: 10 }}>
            <Text style={styles.googleQuickTitle}>Sign in with Google</Text>
            <Text style={styles.googleQuickSub}>Instant login with authorized email</Text>
          </View>
          <Feather name="arrow-right" size={18} color="#0F766E" />
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR SELECT DOMAIN</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* List of Role Cards */}
        <View style={styles.cardsList}>
          {roles.map((role) => {
            const isPressed = pressedRoleId === role.id;
            return (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.roleCard,
                  isPressed && styles.roleCardHighlight,
                ]}
                activeOpacity={0.7}
                onPressIn={() => setPressedRoleId(role.id)}
                onPressOut={() => setPressedRoleId(null)}
                onPress={() => {
                  setPressedRoleId(role.id);
                  setTimeout(() => {
                    setPressedRoleId(null);
                    onSelectRole(role.id);
                  }, 120);
                }}
              >
                {/* Circular Icon badge */}
                <View
                  style={[
                    styles.iconCircle,
                    isPressed && styles.iconCircleHighlight,
                  ]}
                >
                  {role.iconFamily === 'fontAwesome5' && (
                    <FontAwesome5
                      name={role.iconName}
                      size={20}
                      color={isPressed ? '#FFFFFF' : '#1A7B76'}
                    />
                  )}
                  {role.iconFamily === 'ionicons' && (
                    <Ionicons
                      name={role.iconName as any}
                      size={22}
                      color={isPressed ? '#FFFFFF' : '#1A7B76'}
                    />
                  )}
                  {role.iconFamily === 'materialCommunity' && (
                    <MaterialCommunityIcons
                      name={role.iconName as any}
                      size={22}
                      color={isPressed ? '#FFFFFF' : '#1A7B76'}
                    />
                  )}
                  {role.iconFamily === 'feather' && (
                    <Feather
                      name={role.iconName as any}
                      size={21}
                      color={isPressed ? '#FFFFFF' : '#1A7B76'}
                    />
                  )}
                </View>

                {/* Role Titles */}
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, isPressed && { color: '#0F766E' }]}>{role.title}</Text>
                  <Text style={styles.cardSubtitle}>{role.subtitle}</Text>
                </View>

                {/* Right Arrow Chevron */}
                <Feather
                  name="chevron-right"
                  size={20}
                  color={isPressed ? '#0F766E' : '#94A3B8'}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating WhatsApp Action Button */}
      <WhatsAppFloat />

      {/* Google Sign In Account Picker Modal */}
      <GoogleSignInModal
        visible={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSelectAccount={(account) => {
          setShowGoogleModal(false);
          const mappedRole = (account.role as UserRoleType) || 'doctor';
          if (onLoginSuccess) {
            onLoginSuccess(mappedRole);
          } else {
            onSelectRole(mappedRole);
          }
        }}
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
  brandRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  brandLogo: {
    width: 200,
    height: 56,
  },
  headerTitles: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  welcomeMain: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 32,
  },
  welcomeHospital: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 8,
  },
  roleSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  accentBar: {
    width: 44,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#1A7B76',
    marginTop: 8,
  },
  googleQuickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  googleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  googleQuickTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  googleQuickSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    paddingHorizontal: 10,
  },
  cardsList: {
    gap: 10,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  roleCardHighlight: {
    backgroundColor: '#EFF9F8',
    borderColor: '#CCFBF1',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F5F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconCircleHighlight: {
    backgroundColor: '#1A7B76',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
});
