// App routes – uses pages and layouts only (no modules folder).
import { BrowserRouter, Routes, Route } from "react-router-dom";

import PatientHome from "./pages/PatientHome";
import Contact from "./pages/Contact";
import PatientPortal from "./pages/PatientPortal";
import WhatsAppFloat from "./components/WhatsAppFloat";
import PortalLogin from "./pages/PortalLogin";
import PortalRegistration from "./pages/PortalRegistration";
import PortalDashboard from "./pages/PortalDashboard";
import PortalAppointmentBook from "./pages/PortalAppointmentBook";
import PortalMedicalRecords from "./pages/PortalMedicalRecords";
import PortalLabTests from "./pages/PortalLabTests";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUserRole from "./pages/admin/AdminUserRole";
import AdminDepartments from "./pages/admin/AdminDepartments";
import AdminFinancial from "./pages/admin/AdminFinancial";
import AdminLabClinical from "./pages/admin/AdminLabClinical";
import AdminSystemConfig from "./pages/admin/AdminSystemConfig";
import AdminAuditSecurity from "./pages/admin/AdminAuditSecurity";
import AdminSystemHealth from "./pages/admin/AdminSystemHealth";
import AdminReports from "./pages/admin/AdminReports";
import DoctorLayout from "./modules/doctor/DoctorLayout";
import DoctorDashboard from "./modules/doctor/DoctorDashboard";
import PatientProfile from "./modules/doctor/PatientProfile";
import DoctorAppointments from "./modules/doctor/DoctorAppointments";
import DoctorPatients from "./modules/doctor/DoctorPatients";
import DoctorConsultation from "./modules/doctor/DoctorConsultation";
import DoctorPrescriptions from "./modules/doctor/DoctorPrescriptions";
import DoctorReports from "./modules/doctor/DoctorReports";
import DoctorSettings from "./modules/doctor/DoctorSettings";
import BillingGate from "./pages/billing/BillingGate";
import PlaceholderPage from "./pages/PlaceholderPage";
import LabLayout from "./modules/lab/LabLayout";
import LabDashboard from "./modules/lab/LabDashboard";
import LabEnterResults from "./modules/lab/LabEnterResults";
import LabTests from "./modules/lab/LabTests";
import LabSettings from "./modules/lab/LabSettings";
import DoctorLabOrders from "./modules/doctor/DoctorLabOrders";

import ReceptionistLayout from "./pages/receptionist/ReceptionistLayout";
import ReceptionistDashboard from "./pages/receptionist/ReceptionistDashboard";
import ReceptionistAppointments from "./pages/receptionist/ReceptionistAppointments";
import PatientRegistration from "./pages/receptionist/PatientRegistration";
import PatientList from "./pages/receptionist/PatientList";
import SearchUHID from "./pages/receptionist/SearchUHID";
import Admissions from "./pages/receptionist/Admissions";
import RoomManagement from "./pages/receptionist/RoomManagement";
import ReceptionistBilling from "./pages/receptionist/ReceptionistBilling";
import Notifications from "./pages/receptionist/Notifications";

import AuthLayout from "./layouts/AuthLayout";
import RegistrationLayout from "./layouts/RegistrationLayout";
import MainLayout from "./layouts/MainLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PatientHome />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/patient-portal" element={<PatientPortal />}>
          <Route path="login" element={<PortalLogin />} />
          <Route path="register" element={<PortalRegistration />} />
          <Route path="dashboard" element={<PortalDashboard />} />
          <Route path="appointments" element={<PortalAppointmentBook />} />
          <Route path="records" element={<PortalMedicalRecords />} />
          <Route path="lab-tests" element={<PortalLabTests />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route path="/registration" element={<RegistrationLayout />}>
          <Route index element={<Register />} />
          <Route path="patient" element={<PlaceholderPage />} />
          <Route path="doctor" element={<PlaceholderPage />} />
          <Route path="staff" element={<PlaceholderPage />} />
          <Route path="opd" element={<PlaceholderPage />} />
          <Route path="ipd" element={<PlaceholderPage />} />
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/billing" element={<BillingGate />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/receptionist" element={<ReceptionistLayout />}>
            <Route index element={<ReceptionistDashboard />} />
            <Route path="appointments" element={<ReceptionistAppointments />} />
            <Route path="patients" element={<PatientList />} />
            <Route path="patients/register" element={<PatientRegistration />} />
            <Route path="patients/search" element={<SearchUHID />} />
            <Route path="admissions" element={<Admissions />} />
            <Route path="room-management" element={<RoomManagement />} />
            <Route path="billing" element={<ReceptionistBilling />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
          <Route path="/doctor" element={<DoctorLayout />}>
            <Route index element={<DoctorDashboard />} />
            <Route path="ward-rounds" element={<DoctorDashboard defaultTab="ipd" />} />
            <Route path="patient-profile" element={<PatientProfile />} />
            <Route path="appointments" element={<DoctorAppointments />} />
            <Route path="patients" element={<DoctorPatients />} />
            <Route path="consultation" element={<DoctorConsultation />} />
            <Route path="consultation/:uhid" element={<DoctorConsultation />} />
            <Route path="lab-orders" element={<DoctorLabOrders />} />
            <Route path="prescriptions" element={<DoctorPrescriptions />} />
            <Route path="reports" element={<DoctorReports />} />
            <Route path="settings" element={<DoctorSettings />} />
          </Route>
          <Route path="/lab" element={<LabLayout />}>
            <Route index element={<LabDashboard />} />
            <Route path="enter-results/:requestId" element={<LabEnterResults />} />
            <Route path="tests" element={<LabTests />} />
            <Route path="settings" element={<LabSettings />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUserRole />} />
            <Route path="departments" element={<AdminDepartments />} />
            <Route path="financial" element={<AdminFinancial />} />
            <Route path="lab-clinical" element={<AdminLabClinical />} />
            <Route path="config" element={<AdminSystemConfig />} />
            <Route path="audit" element={<AdminAuditSecurity />} />
            <Route path="health" element={<AdminSystemHealth />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>
          <Route path="/clinical/*" element={<PlaceholderPage />} />
          <Route path="/reports/*" element={<PlaceholderPage />} />
          <Route path="/implementer/*" element={<PlaceholderPage />} />
          <Route path="/patient-documents/*" element={<PlaceholderPage />} />
          <Route path="/appointments/*" element={<PlaceholderPage />} />
          <Route path="/analytics" element={<PlaceholderPage />} />
        </Route>
      </Routes>
      {/* Floating WhatsApp button – visible on all pages */}
      <WhatsAppFloat />
    </BrowserRouter>
  );
}

export default App;
