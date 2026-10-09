// swastik-android/constants/theme.ts
// Pixel-accurate brand tokens extracted from the live Swastik Hospital mobile references

export const Colors = {
  // Primary Teal & Brand
  primary: '#1A7B76',          // Exact button & active accent teal
  primaryDark: '#135A56',
  primaryLight: '#E8F5F4',     // Light teal for cards, active drawer items
  primaryHover: '#146662',
  primaryMuted: '#F0FDFA',
  brandTeal: '#0D9488',
  brandTealDark: '#0F766E',
  brandTealLight: '#CCFBF1',
  headerTeal: '#1A7B76',
  headerTealHover: '#135A56',
  tileBg: '#F0FDFA',
  tileBorder: '#CCFBF1',
  
  // Base & Neutrals
  background: '#F8FAFC',       // Clean healthcare background
  cardBg: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',
  navy: '#0F1E36',             // Main heading dark navy
  slate: '#334155',            // Secondary text
  muted: '#64748B',            // Caption & icon gray
  lightGray: '#94A3B8',
  border: '#E2E8F0',           // Border stroke
  cardBorder: '#F1F5F9',
  borderLight: '#F1F5F9',
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  titleBlack: '#111111',

  // Brand Red (Swastik Logo)
  brandRed: '#C5221F',

  // Social & Actions
  whatsapp: '#25D366',
  googleBlue: '#4285F4',
  googleRed: '#EA4335',
  googleYellow: '#FBBC05',
  googleGreen: '#34A853',

  // Standard Colors
  blue: '#0EA5E9',
  blueLight: '#EFF6FF',
  green: '#10B981',
  greenLight: '#ECFDF5',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  red: '#DC2626',
  redLight: '#FEE2E2',
  teal: '#0D9488',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
  gray: '#64748B',
  pink: '#DB2777',

  // Status & Lab Order Badges
  status: {
    requested: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Requested' },
    sampleCollected: { bg: '#D1FAE5', text: '#065F46', label: 'Sample collected' },
    sampleInProgress: { bg: '#E0F2FE', text: '#0284C7', label: 'Sample in progress' },
    testInProcess: { bg: '#FEF3C7', text: '#92400E', label: 'Test in process' },
    resultsEntered: { bg: '#FEF9C3', text: '#854D0E', label: 'Results entered' },
    reportReady: { bg: '#CCFBF1', text: '#0F766E', label: 'Report ready' },
    acknowledged: { bg: '#EEF2FF', text: '#4338CA', label: 'Acknowledged' },
    cancelled: { bg: '#FEE2E2', text: '#B91C1C', label: 'Cancelled' },
  },

  // Role Badges
  roles: {
    admin: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    doctor: { bg: '#E8F5F4', text: '#1A7B76', border: '#A7F3D0' },
    receptionist: { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' },
    lab: { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
    billing: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
    patient: { bg: '#FDF2F8', text: '#9D174D', border: '#FBCFE8' },
  },

  // Alerts
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  info: '#3B82F6',
};

export const Typography = {
  h1: { fontSize: 24, fontWeight: '700' as const, color: Colors.navy },
  h2: { fontSize: 20, fontWeight: '700' as const, color: Colors.navy },
  h3: { fontSize: 16, fontWeight: '600' as const, color: Colors.navy },
  body: { fontSize: 14, color: Colors.slate },
  caption: { fontSize: 12, color: Colors.muted },
  label: { fontSize: 11, fontWeight: '600' as const, color: Colors.muted, textTransform: 'uppercase' as const },
};
