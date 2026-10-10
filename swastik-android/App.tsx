// swastik-android/App.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, BackHandler, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './store/authStore';

// Components
import { NavigationDrawer, DoctorScreenKey } from './components/NavigationDrawer';
import { ReceptionistDrawer, ReceptionistScreenKey } from './components/ReceptionistDrawer';
import { LabDrawer, LabScreenKey } from './components/LabDrawer';
import { BillingDrawer, BillingScreenKey } from './components/BillingDrawer';

// Introduction / Landing Screen
import { LandingIntroScreen } from './screens/LandingIntroScreen';

// Doctor Screens
import { RoleSelectionScreen, UserRoleType } from './screens/RoleSelectionScreen';
import { DoctorLoginScreen } from './screens/DoctorLoginScreen';
import { GenericLoginScreen } from './screens/GenericLoginScreen';
import { DoctorWorkstationScreen } from './screens/DoctorWorkstationScreen';
import { TodayAppointmentsScreen } from './screens/TodayAppointmentsScreen';
import { NewConsultationScreen } from './screens/NewConsultationScreen';
import { LabOrdersScreen } from './screens/LabOrdersScreen';
import { MedicalReportsScreen } from './screens/MedicalReportsScreen';
import { SettingsProfileScreen } from './screens/SettingsProfileScreen';
import { WardRoundsScreen } from './screens/WardRoundsScreen';
import { PatientListScreen } from './screens/PatientListScreen';
import { PrescriptionsScreen } from './screens/PrescriptionsScreen';

// Receptionist Screens
import { ReceptionistLoginScreen } from './screens/receptionist/ReceptionistLoginScreen';
import { ReceptionistDashboardScreen } from './screens/receptionist/ReceptionistDashboardScreen';
import { ReceptionistAppointmentsScreen } from './screens/receptionist/ReceptionistAppointmentsScreen';
import { PatientRegistrationScreen } from './screens/receptionist/PatientRegistrationScreen';
import { PatientDirectoryScreen } from './screens/receptionist/PatientDirectoryScreen';
import { SearchUHIDScreen } from './screens/receptionist/SearchUHIDScreen';
import { ReceptionistAdmissionsScreen } from './screens/receptionist/ReceptionistAdmissionsScreen';
import { RoomManagementScreen } from './screens/receptionist/RoomManagementScreen';
import { ReceptionistBillingScreen } from './screens/receptionist/ReceptionistBillingScreen';
import { ReceptionistNotificationsScreen } from './screens/receptionist/ReceptionistNotificationsScreen';
import { ReceptionistMetricsScreen } from './screens/receptionist/ReceptionistMetricsScreen';
import { ReceptionistProfileScreen } from './screens/receptionist/ReceptionistProfileScreen';

// Lab Screens
import { LabDashboardScreen } from './screens/lab/LabDashboardScreen';
import { LabTestsSamplesScreen } from './screens/lab/LabTestsSamplesScreen';
import { LabReportDetailScreen } from './screens/lab/LabReportDetailScreen';
import { LabSettingsScreen } from './screens/lab/LabSettingsScreen';

// Billing Screens
import { BillingDashboard } from './screens/BillingDashboard';
import { InvoicesListScreen } from './screens/billing/InvoicesListScreen';
import { CreateInvoiceScreen } from './screens/billing/CreateInvoiceScreen';
import { PaymentsScreen } from './screens/billing/PaymentsScreen';
import { PatientsBillingScreen } from './screens/billing/PatientsBillingScreen';
import { BillingReportsScreen } from './screens/billing/BillingReportsScreen';
import { BillingSettingsScreen } from './screens/billing/BillingSettingsScreen';

// Admin Screens & Drawer
import { AdminDrawer, AdminScreenKey } from './screens/admin/AdminDrawer';
import { AdminOverviewScreen } from './screens/admin/AdminOverviewScreen';
import { AdminUserManagementScreen } from './screens/admin/AdminUserManagementScreen';
import { AdminDepartmentsScreen } from './screens/admin/AdminDepartmentsScreen';
import { AdminFinancialScreen } from './screens/admin/AdminFinancialScreen';
import { AdminLabMonitoringScreen } from './screens/admin/AdminLabMonitoringScreen';
import { AdminSystemConfigScreen } from './screens/admin/AdminSystemConfigScreen';
import { AdminAuditSecurityScreen } from './screens/admin/AdminAuditSecurityScreen';
import { AdminSystemHealthScreen } from './screens/admin/AdminSystemHealthScreen';
import { AdminReportsScreen } from './screens/admin/AdminReportsScreen';
import { PatientPortal } from './screens/PatientPortal';

export default function App() {
  const { user, isAuthenticated, logout, restoreSession } = useAuthStore();

  // Landing / Intro Screen State (True on app start)
  const [showLanding, setShowLanding] = useState(true);

  // Active Selected Role Module (null shows RoleSelectionScreen by default)
  const [activeRoleModule, setActiveRoleModule] = useState<UserRoleType | null>(null);

  // Role currently being logged into
  const [selectedRoleForLogin, setSelectedRoleForLogin] = useState<UserRoleType | null>(null);

  // Doctor Module Navigation
  const [activeDoctorScreen, setActiveDoctorScreen] = useState<DoctorScreenKey>('Dashboard');
  const [isDoctorDrawerOpen, setIsDoctorDrawerOpen] = useState(false);
  const [selectedConsultationPatient, setSelectedConsultationPatient] = useState<any>(null);

  // Receptionist Module Navigation
  const [activeReceptionistScreen, setActiveReceptionistScreen] = useState<ReceptionistScreenKey>('Dashboard');
  const [isReceptionistDrawerOpen, setIsReceptionistDrawerOpen] = useState(false);

  // Lab Module Navigation
  const [activeLabScreen, setActiveLabScreen] = useState<LabScreenKey>('Dashboard');
  const [isLabDrawerOpen, setIsLabDrawerOpen] = useState(false);
  const [selectedLabReport, setSelectedLabReport] = useState<{ id: string; patient?: any } | null>(null);

  // Billing Module Navigation
  const [activeBillingScreen, setActiveBillingScreen] = useState<BillingScreenKey>('Dashboard');
  const [isBillingDrawerOpen, setIsBillingDrawerOpen] = useState(false);

  // Admin Module Navigation
  const [activeAdminScreen, setActiveAdminScreen] = useState<AdminScreenKey>('Overview');
  const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);

  useEffect(() => {
    restoreSession();
  }, []);

  // Global Session-Expired / 401 Reactive Guard:
  // Whenever authentication is revoked or expired, return to login/role-selection immediately
  useEffect(() => {
    if (!isAuthenticated && activeRoleModule !== null) {
      setActiveRoleModule(null);
      setSelectedRoleForLogin(null);
    }
  }, [isAuthenticated, activeRoleModule]);

  // Comprehensive Android Hardware Back Button Handler
  useEffect(() => {
    const onBackPress = () => {
      // 1. Close overlay drawers if open
      if (isDoctorDrawerOpen) {
        setIsDoctorDrawerOpen(false);
        return true;
      }
      if (isReceptionistDrawerOpen) {
        setIsReceptionistDrawerOpen(false);
        return true;
      }
      if (isLabDrawerOpen) {
        setIsLabDrawerOpen(false);
        return true;
      }
      if (isBillingDrawerOpen) {
        setIsBillingDrawerOpen(false);
        return true;
      }
      if (isAdminDrawerOpen) {
        setIsAdminDrawerOpen(false);
        return true;
      }

      // 2. If in login screen, return to Role Selection
      if (selectedRoleForLogin) {
        setSelectedRoleForLogin(null);
        return true;
      }

      // 3. Sub-screens within modules navigate back to that module's Dashboard
      if (activeRoleModule === 'doctor' && activeDoctorScreen !== 'Dashboard') {
        setActiveDoctorScreen('Dashboard');
        return true;
      }

      if (activeRoleModule === 'receptionist' && activeReceptionistScreen !== 'Dashboard') {
        setActiveReceptionistScreen('Dashboard');
        return true;
      }

      if (activeRoleModule === 'lab') {
        if (selectedLabReport) {
          setSelectedLabReport(null);
          return true;
        }
        if (activeLabScreen !== 'Dashboard') {
          setActiveLabScreen('Dashboard');
          return true;
        }
      }

      if (activeRoleModule === 'billing' && activeBillingScreen !== 'Dashboard') {
        setActiveBillingScreen('Dashboard');
        return true;
      }

      if (activeRoleModule === 'admin' && activeAdminScreen !== 'Overview') {
        setActiveAdminScreen('Overview');
        return true;
      }

      // 4. If on the root of ANY module (Doctor, Receptionist, Lab, Billing, Admin, Patient):
      // Ask user to confirm exit from workspace back to Welcome / Role Selection
      if (activeRoleModule !== null) {
        Alert.alert(
          'Exit Workspace',
          'Do you want to exit from this app?',
          [
            { text: 'No', style: 'cancel', onPress: () => {} },
            {
              text: 'Yes',
              onPress: () => {
                setActiveRoleModule(null);
              },
            },
          ],
          { cancelable: true }
        );
        return true;
      }

      // 5. If already on the Role Selection Options root, prompt to exit the application
      Alert.alert(
        'Exit Swastik Hospital',
        'Do you want to exit from this app?',
        [
          { text: 'No', style: 'cancel', onPress: () => {} },
          {
            text: 'Yes',
            onPress: () => {
              BackHandler.exitApp();
            },
          },
        ],
        { cancelable: true }
      );
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [
    isDoctorDrawerOpen,
    isReceptionistDrawerOpen,
    isLabDrawerOpen,
    isBillingDrawerOpen,
    isAdminDrawerOpen,
    activeRoleModule,
    activeDoctorScreen,
    activeReceptionistScreen,
    activeLabScreen,
    selectedLabReport,
    activeBillingScreen,
    activeAdminScreen,
    selectedRoleForLogin,
  ]);

  const handleRoleSelect = (role: UserRoleType) => {
    // For all roles (Doctor, Receptionist, Lab, Billing, Admin, Patient):
    // Authenticate via server token & verify server role matches requested workspace.
    // Admin has universal administrative access across hospital management.
    const hasRoleAccess =
      isAuthenticated &&
      (user?.role === role ||
        (user?.role === 'admin' &&
          (role === 'admin' ||
            role === 'billing' ||
            role === 'doctor' ||
            role === 'receptionist' ||
            role === 'lab')));

    if (hasRoleAccess) {
      setActiveRoleModule(role);
      if (role === 'doctor') setActiveDoctorScreen('Dashboard');
      if (role === 'receptionist') setActiveReceptionistScreen('Dashboard');
      if (role === 'lab') setActiveLabScreen('Dashboard');
      if (role === 'billing') setActiveBillingScreen('Dashboard');
      if (role === 'admin') setActiveAdminScreen('Overview');
    } else {
      setSelectedRoleForLogin(role);
    }
  };

  const handleLoginSuccess = (role: UserRoleType) => {
    setSelectedRoleForLogin(null);
    setActiveRoleModule(role);
    if (role === 'doctor') setActiveDoctorScreen('Dashboard');
    if (role === 'receptionist') setActiveReceptionistScreen('Dashboard');
    if (role === 'lab') setActiveLabScreen('Dashboard');
    if (role === 'billing') setActiveBillingScreen('Dashboard');
    if (role === 'admin') setActiveAdminScreen('Overview');
  };

  const handleDoctorNavigate = (screenKey: DoctorScreenKey, patientData?: any) => {
    if (patientData) {
      setSelectedConsultationPatient(patientData);
    }
    setActiveDoctorScreen(screenKey);
  };

  const handleReceptionistNavigate = (screenKey: ReceptionistScreenKey) => {
    setActiveReceptionistScreen(screenKey);
  };

  const handleLabNavigate = (screenKey: LabScreenKey) => {
    setSelectedLabReport(null);
    setActiveLabScreen(screenKey);
  };

  const handleBillingNavigate = (screenKey: BillingScreenKey) => {
    setActiveBillingScreen(screenKey);
  };

  const handleLogout = () => {
    setIsDoctorDrawerOpen(false);
    setIsReceptionistDrawerOpen(false);
    setIsLabDrawerOpen(false);
    setIsBillingDrawerOpen(false);
    setIsAdminDrawerOpen(false);
    logout();
    setActiveRoleModule(null);
    setSelectedRoleForLogin(null);
    setActiveDoctorScreen('Dashboard');
    setActiveReceptionistScreen('Dashboard');
    setActiveLabScreen('Dashboard');
    setActiveBillingScreen('Dashboard');
    setActiveAdminScreen('Overview');
    setSelectedLabReport(null);
  };

  // Render Doctor Module Screens
  const renderDoctorScreen = () => {
    switch (activeDoctorScreen) {
      case 'Dashboard':
        return (
          <DoctorWorkstationScreen
            onOpenDrawer={() => setIsDoctorDrawerOpen(true)}
            onNavigate={handleDoctorNavigate}
          />
        );
      case 'WardRounds':
        return (
          <WardRoundsScreen
            onOpenDrawer={() => setIsDoctorDrawerOpen(true)}
            onOpenEMR={(p) => handleDoctorNavigate('NewConsultation', p)}
          />
        );
      case 'TodayAppointments':
        return (
          <TodayAppointmentsScreen
            onOpenDrawer={() => setIsDoctorDrawerOpen(true)}
            onOpenConsultation={(apt) => handleDoctorNavigate('NewConsultation', apt)}
          />
        );
      case 'PatientList':
        return (
          <PatientListScreen
            onOpenDrawer={() => setIsDoctorDrawerOpen(true)}
            onOpenConsultation={(p) => handleDoctorNavigate('NewConsultation', p)}
          />
        );
      case 'NewConsultation':
        return (
          <NewConsultationScreen
            onOpenDrawer={() => setIsDoctorDrawerOpen(true)}
            initialPatient={selectedConsultationPatient}
          />
        );
      case 'LabOrders':
        return <LabOrdersScreen onOpenDrawer={() => setIsDoctorDrawerOpen(true)} />;
      case 'Prescriptions':
        return <PrescriptionsScreen onOpenDrawer={() => setIsDoctorDrawerOpen(true)} />;
      case 'Reports':
        return <MedicalReportsScreen onOpenDrawer={() => setIsDoctorDrawerOpen(true)} />;
      case 'Settings':
        return <SettingsProfileScreen onOpenDrawer={() => setIsDoctorDrawerOpen(true)} />;
      default:
        return (
          <DoctorWorkstationScreen
            onOpenDrawer={() => setIsDoctorDrawerOpen(true)}
            onNavigate={handleDoctorNavigate}
          />
        );
    }
  };

  // Render Receptionist Module Screens
  const renderReceptionistScreen = () => {
    switch (activeReceptionistScreen) {
      case 'Dashboard':
        return (
          <ReceptionistDashboardScreen
            onOpenDrawer={() => setIsReceptionistDrawerOpen(true)}
            onNavigate={handleReceptionistNavigate}
          />
        );
      case 'Appointments':
        return (
          <ReceptionistAppointmentsScreen
            onOpenDrawer={() => setIsReceptionistDrawerOpen(true)}
          />
        );
      case 'NewRegistration':
        return (
          <PatientRegistrationScreen
            onOpenDrawer={() => setIsReceptionistDrawerOpen(true)}
            onNavigateToBilling={() => setActiveReceptionistScreen('Billing')}
          />
        );
      case 'PatientDirectory':
        return (
          <PatientDirectoryScreen
            onOpenDrawer={() => setIsReceptionistDrawerOpen(true)}
          />
        );
      case 'PatientSearch':
        return (
          <SearchUHIDScreen
            onOpenDrawer={() => setIsReceptionistDrawerOpen(true)}
          />
        );
      case 'Admission':
        return (
          <ReceptionistAdmissionsScreen
            onOpenDrawer={() => setIsReceptionistDrawerOpen(true)}
          />
        );
      case 'RoomManagement':
        return (
          <RoomManagementScreen
            onOpenDrawer={() => setIsReceptionistDrawerOpen(true)}
          />
        );
      case 'Billing':
        return (
          <ReceptionistBillingScreen
            onOpenDrawer={() => setIsReceptionistDrawerOpen(true)}
          />
        );
      case 'Notifications':
        return (
          <ReceptionistNotificationsScreen
            onOpenDrawer={() => setIsReceptionistDrawerOpen(true)}
            onNavigateToModule={(mod) => setActiveReceptionistScreen(mod as ReceptionistScreenKey)}
          />
        );
      case 'Metrics':
        return (
          <ReceptionistMetricsScreen
            onOpenDrawer={() => setIsReceptionistDrawerOpen(true)}
            onNavigateToModule={(mod) => setActiveReceptionistScreen(mod as ReceptionistScreenKey)}
          />
        );
      case 'Profile':
        return (
          <ReceptionistProfileScreen
            onOpenDrawer={() => setIsReceptionistDrawerOpen(true)}
          />
        );
      default:
        return (
          <ReceptionistDashboardScreen
            onOpenDrawer={() => setIsReceptionistDrawerOpen(true)}
            onNavigate={handleReceptionistNavigate}
          />
        );
    }
  };

  // Render Lab Module Screens
  const renderLabScreen = () => {
    if (selectedLabReport) {
      return (
        <LabReportDetailScreen
          onOpenDrawer={() => setIsLabDrawerOpen(true)}
          requestId={selectedLabReport.id}
          patientData={selectedLabReport.patient}
        />
      );
    }

    switch (activeLabScreen) {
      case 'Dashboard':
        return (
          <LabDashboardScreen
            onOpenDrawer={() => setIsLabDrawerOpen(true)}
            onNavigateToReport={(reqId, p) => setSelectedLabReport({ id: reqId, patient: p })}
            onNavigateToSamples={() => setActiveLabScreen('TestsSamples')}
          />
        );
      case 'TestsSamples':
        return (
          <LabTestsSamplesScreen
            onOpenDrawer={() => setIsLabDrawerOpen(true)}
            onNavigateToReport={(reqId, p) => setSelectedLabReport({ id: reqId, patient: p })}
          />
        );
      case 'Settings':
        return <LabSettingsScreen onOpenDrawer={() => setIsLabDrawerOpen(true)} />;
      default:
        return (
          <LabDashboardScreen
            onOpenDrawer={() => setIsLabDrawerOpen(true)}
            onNavigateToReport={(reqId, p) => setSelectedLabReport({ id: reqId, patient: p })}
            onNavigateToSamples={() => setActiveLabScreen('TestsSamples')}
          />
        );
    }
  };

  // Render Billing Module Screens
  const renderBillingScreen = () => {
    switch (activeBillingScreen) {
      case 'Dashboard':
        return (
          <BillingDashboard
            onOpenDrawer={() => setIsBillingDrawerOpen(true)}
            onNavigate={handleBillingNavigate}
          />
        );
      case 'Invoices':
        return (
          <InvoicesListScreen
            onOpenDrawer={() => setIsBillingDrawerOpen(true)}
            onNavigateToCreate={() => setActiveBillingScreen('CreateInvoice')}
          />
        );
      case 'CreateInvoice':
        return (
          <CreateInvoiceScreen
            onOpenDrawer={() => setIsBillingDrawerOpen(true)}
            onInvoiceCreated={() => setActiveBillingScreen('Invoices')}
          />
        );
      case 'Payments':
        return <PaymentsScreen onOpenDrawer={() => setIsBillingDrawerOpen(true)} />;
      case 'Patients':
        return (
          <PatientsBillingScreen
            onOpenDrawer={() => setIsBillingDrawerOpen(true)}
            onNavigateToInvoices={() => setActiveBillingScreen('Invoices')}
          />
        );
      case 'Reports':
        return <BillingReportsScreen onOpenDrawer={() => setIsBillingDrawerOpen(true)} />;
      case 'Settings':
        return <BillingSettingsScreen onOpenDrawer={() => setIsBillingDrawerOpen(true)} />;
      default:
        return (
          <BillingDashboard
            onOpenDrawer={() => setIsBillingDrawerOpen(true)}
            onNavigate={handleBillingNavigate}
          />
        );
    }
  };

  // Render Admin Module Screens
  const renderAdminScreen = () => {
    switch (activeAdminScreen) {
      case 'Overview':
        return (
          <AdminOverviewScreen
            onOpenDrawer={() => setIsAdminDrawerOpen(true)}
            onNavigateToModule={(mod) => setActiveAdminScreen(mod)}
            onQuickAction={(action) => {
              if (action === 'register_patient') {
                setActiveRoleModule('receptionist');
                setActiveReceptionistScreen('NewRegistration');
              } else if (action === 'new_appointment') {
                setActiveRoleModule('receptionist');
                setActiveReceptionistScreen('Appointments');
              } else if (action === 'create_invoice') {
                setActiveRoleModule('billing');
                setActiveBillingScreen('CreateInvoice');
              } else if (action === 'add_lab') {
                setActiveAdminScreen('LabMonitoring');
              } else if (action === 'users') {
                setActiveAdminScreen('Users');
              }
            }}
          />
        );
      case 'Users':
        return <AdminUserManagementScreen onOpenDrawer={() => setIsAdminDrawerOpen(true)} />;
      case 'Departments':
        return <AdminDepartmentsScreen onOpenDrawer={() => setIsAdminDrawerOpen(true)} />;
      case 'Financials':
        return <AdminFinancialScreen onOpenDrawer={() => setIsAdminDrawerOpen(true)} />;
      case 'LabMonitoring':
        return <AdminLabMonitoringScreen onOpenDrawer={() => setIsAdminDrawerOpen(true)} />;
      case 'Configuration':
        return <AdminSystemConfigScreen onOpenDrawer={() => setIsAdminDrawerOpen(true)} />;
      case 'AuditLogs':
        return <AdminAuditSecurityScreen onOpenDrawer={() => setIsAdminDrawerOpen(true)} />;
      case 'SystemHealth':
        return (
          <AdminSystemHealthScreen
            onOpenDrawer={() => setIsAdminDrawerOpen(true)}
            onNavigateToLogs={() => setActiveAdminScreen('AuditLogs')}
          />
        );
      case 'Reports':
        return <AdminReportsScreen onOpenDrawer={() => setIsAdminDrawerOpen(true)} />;
      default:
        return (
          <AdminOverviewScreen
            onOpenDrawer={() => setIsAdminDrawerOpen(true)}
            onNavigateToModule={(mod) => setActiveAdminScreen(mod)}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <View style={styles.container}>
        {showLanding ? (
          // Default Home Landing / Introduction Screen (Swastik Hospital Loading Screen.png)
          <LandingIntroScreen onGetStarted={() => setShowLanding(false)} />
        ) : selectedRoleForLogin === 'doctor' ? (
          // Doctor Login Flow
          <DoctorLoginScreen
            onBackToRoles={() => setSelectedRoleForLogin(null)}
            onLoginSuccess={() => handleLoginSuccess('doctor')}
          />
        ) : selectedRoleForLogin === 'receptionist' ? (
          // Receptionist Login Flow
          <ReceptionistLoginScreen
            onBackToRoles={() => setSelectedRoleForLogin(null)}
            onLoginSuccess={() => handleLoginSuccess('receptionist')}
          />
        ) : selectedRoleForLogin ? (
          // Generic Login Flow (Lab, Billing, Admin, Patient)
          <GenericLoginScreen
            role={selectedRoleForLogin}
            onBackToRoles={() => setSelectedRoleForLogin(null)}
            onLoginSuccess={() => handleLoginSuccess(selectedRoleForLogin)}
          />
        ) : activeRoleModule === 'doctor' ? (
          // Authenticated Doctor Module Flow
          <View style={styles.moduleContainer}>
            {renderDoctorScreen()}
            <NavigationDrawer
              isOpen={isDoctorDrawerOpen}
              activeScreen={activeDoctorScreen}
              onNavigate={handleDoctorNavigate}
              onClose={() => setIsDoctorDrawerOpen(false)}
              onLogout={handleLogout}
              doctorName={user?.full_name || 'Dr. P. M. Chougule'}
            />
          </View>
        ) : activeRoleModule === 'receptionist' ? (
          // Authenticated Receptionist Module Flow
          <View style={styles.moduleContainer}>
            {renderReceptionistScreen()}
            <ReceptionistDrawer
              isOpen={isReceptionistDrawerOpen}
              activeScreen={activeReceptionistScreen}
              onNavigate={handleReceptionistNavigate}
              onClose={() => setIsReceptionistDrawerOpen(false)}
              onLogout={handleLogout}
              receptionistName={user?.full_name || 'Priya Sharma'}
            />
          </View>
        ) : activeRoleModule === 'lab' ? (
          // Authenticated Lab Module Flow
          <View style={styles.moduleContainer}>
            {renderLabScreen()}
            <LabDrawer
              isOpen={isLabDrawerOpen}
              activeScreen={activeLabScreen}
              onNavigate={handleLabNavigate}
              onClose={() => setIsLabDrawerOpen(false)}
              onLogout={handleLogout}
              assistantName={user?.full_name || 'Lab Assistant'}
            />
          </View>
        ) : activeRoleModule === 'billing' ? (
          // Authenticated Billing Module Flow
          <View style={styles.moduleContainer}>
            {renderBillingScreen()}
            <BillingDrawer
              isOpen={isBillingDrawerOpen}
              activeScreen={activeBillingScreen}
              onNavigate={handleBillingNavigate}
              onClose={() => setIsBillingDrawerOpen(false)}
              onLogout={handleLogout}
              deptName={user?.full_name || 'Billing Dept'}
            />
          </View>
        ) : activeRoleModule === 'admin' ? (
          // Authenticated Admin Module Flow with Drawer
          <View style={styles.moduleContainer}>
            {renderAdminScreen()}
            <AdminDrawer
              isOpen={isAdminDrawerOpen}
              activeScreen={activeAdminScreen}
              onNavigate={(screen) => setActiveAdminScreen(screen)}
              onClose={() => setIsAdminDrawerOpen(false)}
              onLogout={handleLogout}
              adminName={user?.full_name || 'System Admin'}
            />
          </View>
        ) : activeRoleModule === 'patient' ? (
          // Patient Portal with Back Button to Role Selection
          <PatientPortal onBack={() => setActiveRoleModule(null)} />
        ) : (
          // Default Role Selection Options Screen (shown when Get Started is clicked)
          <RoleSelectionScreen onSelectRole={handleRoleSelect} onLoginSuccess={handleLoginSuccess} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  moduleContainer: {
    flex: 1,
    position: 'relative',
  },
});
