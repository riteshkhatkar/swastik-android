// swastik-android/screens/WorkspacesScreen.tsx
// Exact 1:1 mobile adaptation of the live website homepage (swastik.orelse.ai)

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  SafeAreaView 
} from 'react-native';
import { Colors } from '../constants/theme';
import { UserRole } from '../types';
import { WhatsAppFloat } from '../components/WhatsAppFloat';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

interface Props {
  onSelectRole: (role: UserRole) => void;
  onOpenPatientPortal: () => void;
}

const ROLES_DATA = [
  {
    role: 'doctor' as UserRole,
    title: 'Doctor',
    icon: 'stethoscope' as const,
    color: '#0ea5e9',
  },
  {
    role: 'receptionist' as UserRole,
    title: 'Receptionist',
    icon: 'hospital' as const,
    color: '#0d9488',
  },
  {
    role: 'lab' as UserRole,
    title: 'Lab\nTechnician',
    icon: 'flask' as const,
    color: '#f59e0b',
  },
  {
    role: 'billing' as UserRole,
    title: 'Billing',
    icon: 'credit-card' as const,
    color: '#8b5cf6',
  },
  {
    role: 'admin' as UserRole,
    title: 'Admin',
    icon: 'cog' as const,
    color: '#64748b',
  },
];

export const WorkspacesScreen: React.FC<Props> = ({ 
  onSelectRole, 
  onOpenPatientPortal 
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navbar Matching Website */}
      <View style={styles.navbar}>
        <View style={styles.navBrand}>
          <Image 
            source={require('../assets/swasstiklogo.png')} 
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>Swastik Hospital</Text>
        </View>

        <TouchableOpacity 
          style={styles.portalBtn} 
          activeOpacity={0.8}
          onPress={onOpenPatientPortal}
        >
          <Text style={styles.portalBtnText}>Patient Portal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.tagline}>WORKSPACES</Text>
          <Text style={styles.heroTitle}>Staff Role-Based Login</Text>
          <Text style={styles.heroSubtitle}>
            Direct access to dedicated dashboard interfaces for Swastik Hospital staff members.
          </Text>
        </View>

        {/* 2-Column Responsive Mobile Grid */}
        <View style={styles.cardsGrid}>
          {ROLES_DATA.map((item) => (
            <TouchableOpacity
              key={item.role}
              style={styles.roleCard}
              activeOpacity={0.85}
              onPress={() => onSelectRole(item.role)}
            >
              <View style={styles.iconTile}>
                <FontAwesome5 
                  name={item.icon} 
                  size={32} 
                  color={Colors.brandTeal} 
                />
              </View>

              <View style={styles.cardLabelArea}>
                <Text style={styles.roleNameText}>{item.title}</Text>
                <Text style={styles.loginActionText}>LOGIN</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Patient Portal Card */}
        <TouchableOpacity
          style={styles.patientCard}
          activeOpacity={0.85}
          onPress={onOpenPatientPortal}
        >
          <View style={[styles.iconTile, { backgroundColor: '#fdf2f8', borderColor: '#fbcfe8' }]}>
            <Ionicons name="heart" size={32} color="#db2777" />
          </View>
          <View style={styles.cardLabelArea}>
            <Text style={styles.roleNameText}>Patient Portal</Text>
            <Text style={[styles.loginActionText, { color: '#db2777' }]}>ACCESS</Text>
          </View>
        </TouchableOpacity>

        {/* Footer Attribution */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerText}>Swastik Hospital Management System</Text>
          <Text style={styles.footerSubText}>Mobile Native Android Application</Text>
        </View>
      </ScrollView>

      {/* Floating WhatsApp Support Button */}
      <WhatsAppFloat />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  navbar: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImg: {
    width: 32,
    height: 32,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.3,
  },
  portalBtn: {
    backgroundColor: Colors.headerTeal,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  portalBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 80,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.brandTeal,
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  roleCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.tileBg,
    borderWidth: 1.5,
    borderColor: Colors.tileBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardLabelArea: {
    alignItems: 'center',
  },
  roleNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
    textAlign: 'center',
    lineHeight: 18,
  },
  loginActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.brandTeal,
    marginTop: 4,
    letterSpacing: 0.8,
  },
  patientCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fce7f3',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  footerWrap: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '600',
  },
  footerSubText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
});
