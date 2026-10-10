// swastik-android/services/googleAuth.ts
// Direct One-Tap Google OAuth Service for Swastik Hospital Android App
// Direct redirect to Gmail account chooser without intermediate dialogs.

import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '1027164735664-tkhh39l9gdl13mfkkdd2uj5qdghvi6h1.apps.googleusercontent.com';

const REDIRECT_URI = 'https://swastik.orelse.ai';

export interface GoogleAuthResult {
  success: boolean;
  cancelled?: boolean;
  error?: string;
  user?: any;
}

/**
 * Directly initiates the Google OAuth 2.0 flow.
 * Opens Google's system account chooser to let the user select their Gmail account.
 * Upon selection, extracts the Google ID token and logs the user into the Swastik backend.
 */
export async function promptGoogleSignIn(roleValue: string): Promise<GoogleAuthResult> {
  try {
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const state = Math.random().toString(36).substring(2, 15);

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'id_token',
      scope: 'openid email profile',
      prompt: 'select_account',
      nonce,
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

    if (result.type === 'success' && result.url) {
      // Parse fragment (#id_token=...) or query string (?id_token=...)
      const urlPart = result.url.includes('#') ? result.url.split('#')[1] : result.url.split('?')[1];
      const searchParams = new URLSearchParams(urlPart || '');
      const idToken = searchParams.get('id_token');

      if (!idToken) {
        throw new Error('Google did not return an identity token. Please try again.');
      }

      // Verify token with backend
      const user = await useAuthStore.getState().googleLogin(idToken, roleValue);
      return { success: true, user };
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, cancelled: true };
    }

    throw new Error('Authentication flow was not completed.');
  } catch (err: any) {
    const msg = err.message || 'Google sign-in failed. Please verify your internet and account access.';
    Alert.alert('Google Sign-In Failed', msg);
    return { success: false, error: msg };
  }
}
