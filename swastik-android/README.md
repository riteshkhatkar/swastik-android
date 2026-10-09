# 📱 Swastik Hospital – Android Native Mobile App

Native mobile client for the Swastik Hospital Management System, built with **React Native** and **Expo SDK 57**.

---

## 🚀 Quick Start Guide

### Option 1: Test Instantly on Your Android Phone (Recommended)
1. Install the free **Expo Go** app from the [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent).
2. On your computer, open a terminal in this `mobile` folder and run:
   ```bash
   npx expo start
   ```
3. A QR code will appear in the terminal.
4. Open the **Expo Go** app on your Android phone, tap **Scan QR Code**, and point your camera at the screen.
5. The Swastik Hospital app will load directly on your phone with live reload!

### Option 2: Test on Android Studio Emulator
If you have an Android Studio emulator configured:
```bash
npx expo start --android
```

### Option 3: Test on Web Browser
```bash
npx expo start --web
```

---

## 🔐 Authentication & Role Testing

The app supports both **live backend authentication** and **instant demo role testing**:

### Live Credentials (Connected to `https://swastik.orelse.ai`)
- **Username:** `admin`
- **Password:** `admin123`

### Instant Demo Switcher (1-Tap Testing)
On the login screen or in the top navigation bar, tap any role to immediately test that role's interface:
- 👨‍💼 **Admin:** Hospital metrics, staff user directory, system health
- 🩺 **Doctor:** Ward board, critical vs stable patients, bedside EMR
- 🛎️ **Receptionist:** Today's admissions, bed availability, live appointment queue
- 🧪 **Lab Tech:** Diagnostic test orders, STAT priority queue, result logger
- 💰 **Billing:** Revenue analytics, invoice ledger, Razorpay checkout simulation
- 👤 **Patient Portal:** Upcoming appointment, verified lab reports, PDF downloads

---

## 📂 Project Architecture

```
mobile/
├── components/          # Reusable atomic UI widgets
│   ├── AppHeader.tsx    # Header with brand, role badge, logout, and role switcher
│   ├── CustomButton.tsx # Branded touchable button with loading state
│   ├── InputField.tsx   # Text input with label, icons, and password reveal
│   └── RoleBadge.tsx    # Color-coded role pill
├── constants/
│   └── theme.ts         # Colors, typography, and brand design tokens
├── screens/             # Dedicated role dashboards and views
│   ├── LoginScreen.tsx
│   ├── AdminDashboard.tsx
│   ├── DoctorDashboard.tsx
│   ├── ReceptionistDashboard.tsx
│   ├── LabDashboard.tsx
│   ├── BillingDashboard.tsx
│   └── PatientPortal.tsx
├── services/
│   └── api.ts           # Axios client with JWT interceptor and API services
├── store/
│   └── authStore.ts     # Zustand global auth state with SecureStore encryption
├── types/
│   └── index.ts         # TypeScript domain models (Patient, Appointment, EMR, etc.)
├── App.tsx              # Root application entry wiring auth & role routing
└── app.json             # Expo project configuration and Android package manifest
```
