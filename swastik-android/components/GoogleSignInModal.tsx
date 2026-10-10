// swastik-android/components/GoogleSignInModal.tsx
// Professional Google Sign-In Component for Swastik Hospital
// Integrates real Google OAuth flow with system Gmail account chooser and server token verification.

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { GoogleLogo } from './GoogleLogo';

WebBrowser.maybeCompleteAuthSession();

export interface GoogleAccountItem {
  name: string;
  email: string;
  desc: string;
  role: string;
}

interface GoogleSignInModalProps {
  visible: boolean;
  roleName?: string;
  roleValue?: string;
  onClose: () => void;
  onSuccess?: (role?: string) => void;
  onSelectAccount?: (account: GoogleAccountItem) => void;
}

const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '1027164735664-tkhh39l9gdl13mfkkdd2uj5qdghvi6h1.apps.googleusercontent.com';

const GOOGLE_REDIRECT_URI = 'https://swastik.orelse.ai';

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  visible,
  roleName = 'Swastik Healthcare',
  roleValue = 'doctor',
  onClose,
  onSuccess,
}) => {
  const { googleLogin } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartGoogleOAuth = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const nonce = Math.random().toString(36).substring(2, 15);
      const state = Math.random().toString(36).substring(2, 15);

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'id_token',
        scope: 'openid email profile',
        prompt: 'select_account',
        nonce,
        state,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, GOOGLE_REDIRECT_URI);

      if (result.type === 'success' && result.url) {
        // Parse fragment (#id_token=...) or query string
        const urlPart = result.url.includes('#') ? result.url.split('#')[1] : result.url.split('?')[1];
        const searchParams = new URLSearchParams(urlPart || '');
        const idToken = searchParams.get('id_token');

        if (!idToken) {
          throw new Error('Google did not return an identity token. Please try again.');
        }

        // Verify token with backend
        await googleLogin(idToken, roleValue);
        onClose();
        onSuccess?.(roleValue);
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User closed the account chooser
        setLoading(false);
      } else {
        throw new Error('Authentication flow was not completed.');
      }
    } catch (err: any) {
      const msg = err.message || 'Google sign-in failed. Please ensure you are authorized.';
      setErrorMessage(msg);
      Alert.alert('Google Sign-In Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.card}>
          {/* Header with Google Logo & Close Button */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <GoogleLogo size={28} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Sign in with Google</Text>
          <Text style={styles.subtitle}>
            to continue to Swastik Hospital – <Text style={styles.roleHighlight}>{roleName}</Text>
          </Text>

          {/* Secure Information Box */}
          <View style={styles.infoBox}>
            <Feather name="shield" size={14} color="#0D9488" style={{ marginTop: 2 }} />
            <Text style={styles.infoText}>
              Signing in will prompt you to select your authorized hospital Gmail account from your device.
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color="#EF4444" style={{ marginTop: 2 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Google Sign In CTA Button */}
          <TouchableOpacity
            style={[styles.googleCtaBtn, loading && styles.googleCtaBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleStartGoogleOAuth}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#0D9488" />
                <Text style={styles.googleCtaText}>Connecting to Google...</Text>
              </View>
            ) : (
              <View style={styles.ctaContentRow}>
                <GoogleLogo size={20} />
                <Text style={styles.googleCtaText}>Continue with Google</Text>
                <Feather name="arrow-right" size={16} color="#1E293B" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  roleHighlight: {
    color: '#0D9488',
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#0F766E',
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    lineHeight: 17,
  },
  googleCtaBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  googleCtaBtnDisabled: {
    opacity: 0.7,
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  googleCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
