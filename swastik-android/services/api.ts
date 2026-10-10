// mobile/services/api.ts
// Axios API Client with JWT Interceptors for Swastik Hospital
// 100% parity with web frontend (frontend/src/api/service.js) & FastAPI backend routes.
// ZERO simulated data; truthful error propagation with getApiErrorMessage().

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { AuthResponse, User, Patient, Appointment, EMRRecord, LabOrder, Invoice } from '../types';
import { dataSync } from '../store/dataSync';

// Default API base URL from project config
const DEFAULT_API_URL = 'https://swastik.orelse.ai';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Normalized error extractor
export function getApiErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error === 'string') return error;

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data) {
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        // Pydantic validation errors
        return data.detail.map((d: any) => `${d.loc?.slice(-1)?.[0] || 'field'}: ${d.msg}`).join(', ');
      }
      if (typeof data.message === 'string') return data.message;
      if (typeof data.error === 'string') return data.error;
    }
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'Request timed out. Please check your internet connection.';
    }
    if (error.message.includes('Network Error') || !error.response) {
      return `Cannot connect to server at ${API_BASE_URL}. Ensure backend is running.`;
    }
    if (error.response?.status === 401) {
      return 'Session expired or invalid credentials. Please log in again.';
    }
    if (error.response?.status === 403) {
      return 'Access denied. You do not have permission for this action.';
    }
    if (error.response?.status === 404) {
      return 'The requested resource was not found on the server.';
    }
  }

  return error.message || 'Request failed. Please try again.';
}

// In-memory token storage (synced with SecureStore in authStore)
let currentToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = (): string | null => currentToken;

// 401 Session Expiration Event Listeners
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export const onUnauthorized = (listener: UnauthorizedListener): (() => void) => {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
};

export const triggerUnauthorized = () => {
  setAuthToken(null);
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('Error in unauthorized listener:', e);
    }
  });
};

// Request Interceptor: Attach JWT token
api.interceptors.request.use(
  async (config) => {
    if (currentToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${currentToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle errors & 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      triggerUnauthorized();
    }
    return Promise.reject(error);
  }
);

// ==========================================
// 1. AUTH SERVICE
// ==========================================
export const authService = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', { username, password });
    if (response.data?.access_token) {
      setAuthToken(response.data.access_token);
    }
    return response.data;
  },

  googleLogin: async (token: string, role: string = 'doctor'): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/google', { token, role });
    if (response.data?.access_token) {
      setAuthToken(response.data.access_token);
    }
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  // Alias for registration if called
  register: async (userData: any): Promise<any> => {
    const response = await api.post('/api/patients', userData);
    return response.data;
  },
};
export const authApi = authService;

// ==========================================
// 2. PATIENT SERVICE
// ==========================================
export const patientService = {
  createPatient: async (body: any): Promise<any> => {
    const payload = {
      name: body.patientName || body.name,
      age: body.age ? parseInt(body.age, 10) : null,
      gender: body.gender || null,
      phone: body.phone || null,
      email: body.email || null,
      dob: body.dob || null,
      password: body.password || null,
      address:
        body.address ||
        [body.houseNoStreet, body.village, body.district, body.state, body.pincode].filter(Boolean).join(', ') ||
        null,
      guardian_name: body.fatherHusbandName || body.guardian_name || null,
      guardian_relation: body.guardian_relation || null,
      guardian_contact: body.guardian_contact || null,
      guardian_address: body.guardian_address || null,
      guardian_id_type: body.guardian_id_type || null,
      guardian_id_number: body.guardian_id_number || null,
      guardian_consent: body.guardian_consent ?? false,
      emergency_name: body.emergency_name || null,
      emergency_relation: body.emergency_relation || null,
      emergency_contact: body.emergency_contact || null,
      prev_psychiatric: body.prev_psychiatric || null,
      on_medication: body.on_medication || null,
      medication_details: body.medication_details || null,
      substance_history: body.substance_history || null,
      self_harm_history: body.self_harm_history || null,
      violent_history: body.violent_history || null,
      visit_type: body.visit_type || null,
      insurance_provider: body.insurance_provider || null,
      policy_number: body.policy_number || null,
      valid_till: body.valid_till || null,
      self_pay: body.self_pay ?? false,
      photo_base64: body.photo_base64 || null,
    };
    const response = await api.post('/api/patients', payload);
    dataSync.notify('patient');
    return response.data;
  },

  registerPatient: async (patientData: any): Promise<any> => {
    return patientService.createPatient(patientData);
  },

  getPatients: async (skip: number = 0, limit: number = 100, search?: string): Promise<any[]> => {
    const params: any = { skip, limit };
    if (search) params.search = search;
    const response = await api.get<any[]>('/api/patients', { params });
    return response.data;
  },

  getPatientByUhid: async (uhid: string): Promise<any> => {
    const response = await api.get<any>(`/api/patients/${encodeURIComponent(uhid)}`);
    return response.data;
  },

  getPatientById: async (id: string): Promise<any> => {
    const response = await api.get<any>(`/api/patients/${encodeURIComponent(id)}`);
    return response.data;
  },

  bulkImportPatients: async (patientsData: any[]): Promise<any> => {
    const response = await api.post('/api/patients/bulk-import', patientsData);
    return response.data;
  },

  getDashboardStats: async (): Promise<any> => {
    const response = await api.get('/api/patients/stats/counts');
    return response.data;
  },
};
export const patientApi = patientService;

// ==========================================
// 3. APPOINTMENTS SERVICE
// ==========================================
export const appointmentService = {
  getAppointments: async (params?: { uhid?: string; doctor_id?: string; date?: string; skip?: number; limit?: number } | string): Promise<any[]> => {
    let queryParams: any = {};
    if (typeof params === 'string') {
      queryParams = { date: params };
    } else if (params) {
      queryParams = { ...params };
    }
    const response = await api.get<any[]>('/api/appointments', { params: queryParams });
    return response.data;
  },

  createAppointment: async (data: any): Promise<any> => {
    const response = await api.post<any>('/api/appointments', data);
    dataSync.notify('appointment');
    return response.data;
  },

  updateAppointmentStatus: async (
    appointmentId: string,
    status: string,
    date?: string | null,
    time?: string | null,
    reason?: string | null
  ): Promise<any> => {
    const params = new URLSearchParams({ status });
    if (date) params.set('date', date);
    if (time) params.set('time', time);
    if (reason) params.set('reason', reason);
    const response = await api.put(`/api/appointments/${encodeURIComponent(appointmentId)}/status?${params.toString()}`);
    dataSync.notify('appointment');
    return response.data;
  },

  updateStatus: async (id: string, status: string): Promise<any> => {
    return appointmentService.updateAppointmentStatus(id, status);
  },

  cancelAppointment: async (appointmentId: string, reason?: string | null): Promise<any> => {
    const q = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const response = await api.put(`/api/appointments/cancel/${encodeURIComponent(appointmentId)}${q}`);
    dataSync.notify('appointment');
    return response.data;
  },

  rescheduleAppointment: async (appointmentId: string, data: { date: string; time: string }): Promise<any> => {
    const response = await api.put(`/api/appointments/reschedule/${encodeURIComponent(appointmentId)}`, data);
    dataSync.notify('appointment');
    return response.data;
  },

  getBookedSlots: async (doctorId: string, date: string): Promise<string[]> => {
    const response = await api.get<string[]>(`/api/appointments/booked-slots?doctor_id=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`);
    return response.data;
  },

  blockSlot: async (doctorId: string, date: string, time: string, reason: string): Promise<any> => {
    const response = await api.post(
      `/api/appointments/block-slot?doctor_id=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&reason=${encodeURIComponent(reason)}`
    );
    return response.data;
  },

  getDashboardCounts: async (): Promise<any> => {
    const response = await api.get('/api/dashboard/counts');
    return response.data;
  },
};
export const appointmentApi = appointmentService;

// ==========================================
// 4. OPD / IPD SERVICE
// ==========================================
export const opdIpdService = {
  createOPD: async (body: any): Promise<any> => {
    const response = await api.post('/api/opd', body);
    return response.data;
  },

  getOPDList: async (skip: number = 0, limit: number = 100): Promise<any[]> => {
    const response = await api.get<any[]>(`/api/opd?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  createIPD: async (body: any): Promise<any> => {
    const response = await api.post('/api/ipd', {
      uhid: body.uhid,
      patient_name: body.patientName || body.patient_name,
      ward: body.ward,
      bed_id: body.bed_id,
      bed_number: body.bed_number,
      admission_reason: body.admissionReason || body.admission_reason,
      admitted_by: body.admitted_by,
      deposit: body.deposit,
      notes: body.notes,
    });
    return response.data;
  },

  getIPDList: async (skip: number = 0, limit: number = 100): Promise<any[]> => {
    const response = await api.get<any[]>(`/api/ipd?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getBeds: async (wardType?: string | null): Promise<any[]> => {
    const q = wardType ? `?ward_type=${encodeURIComponent(wardType)}` : '';
    const response = await api.get<any[]>(`/api/beds${q}`);
    return response.data;
  },
};

// ==========================================
// 5. ADMISSIONS, ROOMS & DISCHARGE
// ==========================================
export const admissionService = {
  getAdmissions: async (doctorId?: string | null): Promise<any[]> => {
    const q = doctorId ? `?doctor_id=${encodeURIComponent(doctorId)}` : '';
    const response = await api.get<any[]>(`/api/admissions${q}`);
    return response.data;
  },

  getAdmissionDetail: async (admissionId: string): Promise<any> => {
    const response = await api.get<any>(`/api/admissions/${encodeURIComponent(admissionId)}`);
    return response.data;
  },

  admitPatient: async (body: any): Promise<any> => {
    const response = await api.post('/api/admissions', body);
    return response.data;
  },

  updateAdmission: async (admissionId: string, data: any): Promise<any> => {
    const response = await api.put(`/api/admissions/${encodeURIComponent(admissionId)}`, data);
    return response.data;
  },

  uploadConsentFile: async (uhid: string, fileUri: string, fileName: string = 'consent.jpg', mimeType: string = 'image/jpeg'): Promise<any> => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await api.post(`/api/admissions/${encodeURIComponent(uhid)}/consent-upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getConsentInfo: async (uhid: string): Promise<any> => {
    const response = await api.get(`/api/admissions/${encodeURIComponent(uhid)}/consent`);
    return response.data;
  },

  dischargePatient: async (body: {
    admission_id: string;
    discharge_date?: string;
    discharge_type?: string;
    discharge_summary?: string;
    follow_up_instructions?: string;
    discharged_by?: string;
  }): Promise<any> => {
    const response = await api.post('/api/discharges', body);
    return response.data;
  },
};
export const admissionApi = admissionService;

export const roomService = {
  getRooms: async (params: any = {}): Promise<any[]> => {
    const q = new URLSearchParams(params);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const response = await api.get<any[]>(`/api/rooms${qs}`);
    return response.data;
  },

  createRoom: async (data: any): Promise<any> => {
    const response = await api.post('/api/rooms', data);
    return response.data;
  },

  updateRoomStatus: async (roomId: string, status: string): Promise<any> => {
    const response = await api.patch(`/api/rooms/${roomId}/status`, { status });
    return response.data;
  },
};
export const roomApi = roomService;

// ==========================================
// 6. DOCTORS & STAFF
// ==========================================
export const doctorService = {
  getDoctors: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/api/doctors');
    return response.data;
  },

  createDoctor: async (body: any): Promise<any> => {
    const response = await api.post('/api/doctors', body);
    return response.data;
  },

  createStaff: async (body: any): Promise<any> => {
    const response = await api.post('/api/staff', body);
    return response.data;
  },

  getProfile: async (username?: string): Promise<any> => {
    const q = username ? `?username=${encodeURIComponent(username)}` : '';
    const response = await api.get(`/api/doctor/profile${q}`);
    return response.data;
  },

  updateProfile: async (data: any, username?: string): Promise<any> => {
    const q = username ? `?username=${encodeURIComponent(username)}` : '';
    const response = await api.put(`/api/doctor/profile${q}`, data);
    return response.data;
  },

  changePassword: async (data: any, username?: string): Promise<any> => {
    const q = username ? `?username=${encodeURIComponent(username)}` : '';
    const response = await api.put(`/api/doctor/change-password${q}`, data);
    return response.data;
  },

  getCustomQuestions: async (): Promise<any> => {
    const response = await api.get('/api/doctor/custom-questions');
    return response.data;
  },

  updateCustomQuestions: async (questions: any[]): Promise<any> => {
    const response = await api.put('/api/doctor/custom-questions', { questions });
    return response.data;
  },

  getAppointments: async (date?: string): Promise<any[]> => {
    return appointmentService.getAppointments({ date });
  },
};
export const doctorApi = doctorService;

// ==========================================
// 7. TOKENS SERVICE
// ==========================================
export const tokenService = {
  generateToken: async (data: { patient_id: string; doctor_id: string; appointment_id?: string }): Promise<any> => {
    const response = await api.post('/api/tokens/generate', data);
    return response.data;
  },

  getTokensToday: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/api/tokens/today');
    return response.data;
  },

  getTokensByDoctor: async (doctorId: string): Promise<any[]> => {
    const response = await api.get<any[]>(`/api/tokens/doctor/${encodeURIComponent(doctorId)}`);
    return response.data;
  },

  updateTokenStatus: async (tokenId: string, status: string): Promise<any> => {
    const response = await api.put(`/api/tokens/update/${encodeURIComponent(tokenId)}`, { status });
    return response.data;
  },
};
export const tokenApi = tokenService;

// ==========================================
// 8. EMR & CLINICAL MODULE
// ==========================================
export const emrService = {
  getEmrContext: async (uhid: string): Promise<any> => {
    const response = await api.get(`/api/emr/context/${encodeURIComponent(uhid)}`);
    return response.data;
  },

  createAdmission: async (uhid: string, data: any, createdBy?: string): Promise<any> => {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : '';
    const response = await api.post(`/api/emr/admissions/${encodeURIComponent(uhid)}${q}`, data);
    return response.data;
  },

  getActiveAdmission: async (uhid: string): Promise<any> => {
    const response = await api.get(`/api/emr/admissions/active/${encodeURIComponent(uhid)}`);
    return response.data;
  },

  getAdmission: async (admissionId: string): Promise<any> => {
    const response = await api.get(`/api/emr/admissions/${encodeURIComponent(admissionId)}`);
    return response.data;
  },

  listAdmissions: async (uhid: string): Promise<any[]> => {
    const response = await api.get<any[]>(`/api/emr/admissions/list/${encodeURIComponent(uhid)}`);
    return response.data;
  },

  updateEmrAdmission: async (admissionId: string, data: any, updatedBy?: string): Promise<any> => {
    const q = updatedBy ? `?updated_by=${encodeURIComponent(updatedBy)}` : '';
    const response = await api.patch(`/api/emr/admissions/${encodeURIComponent(admissionId)}${q}`, data);
    return response.data;
  },

  saveSymptomsHpi: async (uhid: string, data: any, createdBy?: string): Promise<any> => {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : '';
    const response = await api.post(`/api/emr/symptoms-hpi/${encodeURIComponent(uhid)}${q}`, data);
    return response.data;
  },

  getSymptomsHpi: async (uhid: string, admissionId: string): Promise<any> => {
    const response = await api.get(`/api/emr/symptoms-hpi/${encodeURIComponent(uhid)}?admission_id=${encodeURIComponent(admissionId)}`);
    return response.data;
  },

  saveMse: async (uhid: string, data: any, createdBy?: string): Promise<any> => {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : '';
    const response = await api.post(`/api/emr/mse/${encodeURIComponent(uhid)}${q}`, data);
    return response.data;
  },

  getMse: async (uhid: string, admissionId?: string): Promise<any> => {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : '';
    const response = await api.get(`/api/emr/mse/${encodeURIComponent(uhid)}${q}`);
    return response.data;
  },

  saveDiagnosis: async (uhid: string, data: any, createdBy?: string): Promise<any> => {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : '';
    const response = await api.post(`/api/emr/diagnosis/${encodeURIComponent(uhid)}${q}`, data);
    return response.data;
  },

  getDiagnosis: async (uhid: string, admissionId?: string): Promise<any> => {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : '';
    const response = await api.get(`/api/emr/diagnosis/${encodeURIComponent(uhid)}${q}`);
    return response.data;
  },

  saveRisk: async (uhid: string, data: any, createdBy?: string): Promise<any> => {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : '';
    const response = await api.post(`/api/emr/risk/${encodeURIComponent(uhid)}${q}`, data);
    return response.data;
  },

  getRisk: async (uhid: string, admissionId?: string): Promise<any> => {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : '';
    const response = await api.get(`/api/emr/risk/${encodeURIComponent(uhid)}${q}`);
    return response.data;
  },

  addMedication: async (uhid: string, data: any, createdBy?: string): Promise<any> => {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : '';
    const response = await api.post(`/api/emr/medications/${encodeURIComponent(uhid)}${q}`, data);
    return response.data;
  },

  listMedications: async (uhid: string, admissionId?: string): Promise<any[]> => {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : '';
    const response = await api.get<any[]>(`/api/emr/medications/${encodeURIComponent(uhid)}${q}`);
    return response.data;
  },

  updateMedication: async (medicationId: string, data: any, updatedBy?: string): Promise<any> => {
    const q = updatedBy ? `?updated_by=${encodeURIComponent(updatedBy)}` : '';
    const response = await api.patch(`/api/emr/medications/${encodeURIComponent(medicationId)}${q}`, data);
    return response.data;
  },

  addLabMonitoring: async (uhid: string, data: any, createdBy?: string): Promise<any> => {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : '';
    const response = await api.post(`/api/emr/lab-monitoring/${encodeURIComponent(uhid)}${q}`, data);
    return response.data;
  },

  listLabMonitoring: async (uhid: string, admissionId?: string): Promise<any[]> => {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : '';
    const response = await api.get<any[]>(`/api/emr/lab-monitoring/${encodeURIComponent(uhid)}${q}`);
    return response.data;
  },

  saveTreatmentPlan: async (uhid: string, data: any, createdBy?: string): Promise<any> => {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : '';
    const response = await api.post(`/api/emr/treatment-plan/${encodeURIComponent(uhid)}${q}`, data);
    return response.data;
  },

  getTreatmentPlan: async (uhid: string, admissionId?: string): Promise<any> => {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : '';
    const response = await api.get(`/api/emr/treatment-plan/${encodeURIComponent(uhid)}${q}`);
    return response.data;
  },

  createSessionNote: async (uhid: string, data: any, createdBy?: string): Promise<any> => {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : '';
    const response = await api.post(`/api/emr/session-notes/${encodeURIComponent(uhid)}${q}`, data);
    return response.data;
  },

  updateSessionNote: async (noteId: string, data: any, updatedBy?: string): Promise<any> => {
    const q = updatedBy ? `?updated_by=${encodeURIComponent(updatedBy)}` : '';
    const response = await api.patch(`/api/emr/session-notes/${encodeURIComponent(noteId)}${q}`, data);
    return response.data;
  },

  listSessionNotes: async (uhid: string, admissionId?: string): Promise<any[]> => {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : '';
    const response = await api.get<any[]>(`/api/emr/session-notes/${encodeURIComponent(uhid)}${q}`);
    return response.data;
  },

  addVitals: async (uhid: string, data: any, recordedBy?: string): Promise<any> => {
    const q = recordedBy ? `?recorded_by=${encodeURIComponent(recordedBy)}` : '';
    const response = await api.post(`/api/emr/vitals/${encodeURIComponent(uhid)}${q}`, data);
    return response.data;
  },

  listVitals: async (uhid: string, admissionId?: string, limit: number = 100): Promise<any[]> => {
    const params = new URLSearchParams();
    if (admissionId) params.set('admission_id', admissionId);
    params.set('limit', String(limit));
    const response = await api.get<any[]>(`/api/emr/vitals/${encodeURIComponent(uhid)}?${params.toString()}`);
    return response.data;
  },

  addHistoryEvent: async (uhid: string, data: any, createdBy?: string): Promise<any> => {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : '';
    const response = await api.post(`/api/emr/history/${encodeURIComponent(uhid)}${q}`, data);
    return response.data;
  },

  listHistoryEvents: async (uhid: string, eventType?: string, year?: string): Promise<any[]> => {
    const params = new URLSearchParams();
    if (eventType) params.set('event_type', eventType);
    if (year) params.set('year', year);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<any[]>(`/api/emr/history/${encodeURIComponent(uhid)}${qs}`);
    return response.data;
  },

  getEmrAudit: async (entityType?: string, entityId?: string, limit: number = 100): Promise<any[]> => {
    const params = new URLSearchParams();
    if (entityType) params.set('entity_type', entityType);
    if (entityId) params.set('entity_id', entityId);
    params.set('limit', String(limit));
    const response = await api.get<any[]>(`/api/emr/audit?${params.toString()}`);
    return response.data;
  },

  getWardSummary: async (uhid: string, admissionId?: string): Promise<any> => {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : '';
    const response = await api.get(`/api/emr/ward-summary/${encodeURIComponent(uhid)}${q}`);
    return response.data;
  },

  getClinicalTimeline: async (uhid: string, admissionId?: string): Promise<any[]> => {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : '';
    const response = await api.get<any[]>(`/api/emr/timeline/${encodeURIComponent(uhid)}${q}`);
    return response.data;
  },
};
export const emrApi = emrService;

export const clinicalService = {
  saveConsultation: async (uhid: string, data: any): Promise<any> => {
    const response = await api.post(`/api/clinical/consultation/${encodeURIComponent(uhid)}`, data);
    return response.data;
  },

  savePrescription: async (uhid: string, data: any): Promise<any> => {
    const response = await api.post(`/api/clinical/prescription/${encodeURIComponent(uhid)}`, data);
    return response.data;
  },

  getPrescriptions: async (params?: { uhid?: string; doctor_id?: string; search?: string }): Promise<any[]> => {
    const q = new URLSearchParams();
    if (params?.uhid) q.set('uhid', params.uhid);
    if (params?.doctor_id) q.set('doctor_id', params.doctor_id);
    if (params?.search) q.set('search', params.search);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    const response = await api.get<any[]>(`/api/clinical/prescription${queryString}`);
    return response.data;
  },

  saveIPDAdmissionDetails: async (uhid: string, data: any): Promise<any> => {
    const response = await api.post(`/api/clinical/ipd/admission/${encodeURIComponent(uhid)}`, data);
    return response.data;
  },

  saveIPDProgressNote: async (uhid: string, data: any): Promise<any> => {
    const response = await api.post(`/api/clinical/ipd/progress/${encodeURIComponent(uhid)}`, data);
    return response.data;
  },

  updateIPDAction: async (uhid: string, action: string, details: any): Promise<any> => {
    const response = await api.patch(`/api/clinical/ipd/action/${encodeURIComponent(uhid)}?action=${encodeURIComponent(action)}`, details);
    return response.data;
  },

  saveRehabData: async (uhid: string, rehabType: string, data: any): Promise<any> => {
    const response = await api.post(`/api/clinical/rehab/${encodeURIComponent(uhid)}?rehab_type=${encodeURIComponent(rehabType)}`, data);
    return response.data;
  },

  getClinicalHistory: async (uhid: string): Promise<any> => {
    const response = await api.get(`/api/clinical/history/${encodeURIComponent(uhid)}`);
    return response.data;
  },

  saveDailyRoutine: async (uhid: string, data: any): Promise<any> => {
    const response = await api.post(`/api/clinical/daily-routine/${encodeURIComponent(uhid)}`, data);
    return response.data;
  },

  startSession: async (patientId: string): Promise<any> => {
    const response = await api.post(`/api/session/start?patient_id=${encodeURIComponent(patientId)}`);
    return response.data;
  },

  endSession: async (patientId: string): Promise<any> => {
    const response = await api.post(`/api/session/end?patient_id=${encodeURIComponent(patientId)}`);
    return response.data;
  },

  getSessionStatus: async (patientId: string): Promise<any> => {
    const response = await api.get(`/api/session/status/${encodeURIComponent(patientId)}`);
    return response.data;
  },

  getActiveSessions: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/api/session/active');
    return response.data;
  },
};
export const clinicalApi = { ...emrService, ...clinicalService };

// ==========================================
// 9. LAB SERVICE
// ==========================================
export const labService = {
  getDashboardCounts: async (): Promise<any> => {
    const response = await api.get('/api/dashboard/counts');
    return response.data;
  },

  getLabStats: async (todayOnly: boolean = true): Promise<any> => {
    const response = await api.get(`/api/lab/stats?today_only=${todayOnly}`);
    return response.data;
  },

  getLabCatalog: async (category?: string | null): Promise<any[]> => {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    const response = await api.get<any[]>(`/api/lab/catalog${q}`);
    return response.data;
  },

  createLabTestRequest: async (body: {
    patient_id: string;
    doctor_id: string;
    tests_ordered: string[];
    clinical_notes?: string;
    admission_id?: string;
  }): Promise<any> => {
    const response = await api.post('/api/lab/test-requests', body);
    return response.data;
  },

  getLabTestRequests: async (params: {
    status?: string;
    patient_id?: string;
    doctor_id?: string;
    today_only?: boolean;
    skip?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<any[]> => {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'All Status') q.set('status', params.status);
    if (params.patient_id) q.set('patient_id', params.patient_id);
    if (params.doctor_id) q.set('doctor_id', params.doctor_id);
    if (params.today_only) q.set('today_only', 'true');
    if (params.search) q.set('search', params.search);
    q.set('skip', String(params.skip ?? 0));
    q.set('limit', String(params.limit ?? 100));
    const response = await api.get<any[]>(`/api/lab/test-requests?${q.toString()}`);
    return response.data;
  },

  getTestRequests: async (status?: string, search?: string): Promise<any[]> => {
    return labService.getLabTestRequests({ status, search });
  },

  getLabTestRequest: async (requestId: string): Promise<any> => {
    const response = await api.get(`/api/lab/test-requests/${encodeURIComponent(requestId)}`);
    return response.data;
  },

  referPatientToLab: async (requestId: string, referredBy: string): Promise<any> => {
    const response = await api.post(`/api/lab/test-requests/${encodeURIComponent(requestId)}/refer-to-lab?referred_by=${encodeURIComponent(referredBy)}`);
    return response.data;
  },

  checkInPatientAtLab: async (requestId: string, checkedInBy: string): Promise<any> => {
    const response = await api.post(`/api/lab/test-requests/${encodeURIComponent(requestId)}/check-in?checked_in_by=${encodeURIComponent(checkedInBy)}`);
    return response.data;
  },

  getLabWaitingPatients: async (todayOnly: boolean = true): Promise<any[]> => {
    const response = await api.get<any[]>(`/api/lab/waiting-patients?today_only=${todayOnly}`);
    return response.data;
  },

  getLabTokenDisplay: async (todayOnly: boolean = true): Promise<any[]> => {
    const response = await api.get<any[]>(`/api/lab/token-display?today_only=${todayOnly}`);
    return response.data;
  },

  getLabAverageWaitTime: async (): Promise<any> => {
    const response = await api.get('/api/lab/average-wait-time');
    return response.data;
  },

  markLabNoShow: async (requestId: string, markedBy: string): Promise<any> => {
    const response = await api.post(`/api/lab/test-requests/${encodeURIComponent(requestId)}/mark-no-show?marked_by=${encodeURIComponent(markedBy)}`);
    return response.data;
  },

  processLabNoShows: async (hours?: number | null): Promise<any> => {
    const q = hours != null ? `?hours=${hours}` : '';
    const response = await api.post(`/api/lab/process-no-shows${q}`);
    return response.data;
  },

  acknowledgeLabRequest: async (requestId: string, acknowledgedBy: string = 'Lab Assistant'): Promise<any> => {
    const response = await api.post(`/api/lab/test-requests/${encodeURIComponent(requestId)}/acknowledge?acknowledged_by=${encodeURIComponent(acknowledgedBy)}`);
    return response.data;
  },
  acknowledgeRequest: async (requestId: string, acknowledgedBy: string = 'Lab Assistant'): Promise<any> => {
    return labService.acknowledgeLabRequest(requestId, acknowledgedBy);
  },

  startLabSampleCollection: async (requestId: string, startedBy: string = 'Lab Assistant'): Promise<any> => {
    const response = await api.post(`/api/lab/test-requests/${encodeURIComponent(requestId)}/sample/start?started_by=${encodeURIComponent(startedBy)}`);
    return response.data;
  },
  startSampleCollection: async (requestId: string, startedBy: string = 'Lab Assistant'): Promise<any> => {
    return labService.startLabSampleCollection(requestId, startedBy);
  },

  completeLabSampleCollection: async (requestId: string, data: any = {}): Promise<any> => {
    const response = await api.post(`/api/lab/test-requests/${encodeURIComponent(requestId)}/sample/complete`, data);
    return response.data;
  },
  completeSampleCollection: async (requestId: string, data: any = {}): Promise<any> => {
    return labService.completeLabSampleCollection(requestId, data);
  },

  markLabTestInProcess: async (requestId: string, updatedBy: string = 'Lab Assistant'): Promise<any> => {
    const response = await api.post(`/api/lab/test-requests/${encodeURIComponent(requestId)}/test-in-process?updated_by=${encodeURIComponent(updatedBy)}`);
    return response.data;
  },
  markTestInProcess: async (requestId: string, updatedBy: string = 'Lab Assistant'): Promise<any> => {
    return labService.markLabTestInProcess(requestId, updatedBy);
  },

  getLabRequestResults: async (requestId: string): Promise<any> => {
    const response = await api.get(`/api/lab/test-requests/${encodeURIComponent(requestId)}/results`);
    return response.data;
  },

  submitLabResults: async (requestId: string, data: any): Promise<any> => {
    const response = await api.post(`/api/lab/test-requests/${encodeURIComponent(requestId)}/results`, data);
    return response.data;
  },
  submitResults: async (requestId: string, data: any): Promise<any> => {
    return labService.submitLabResults(requestId, data);
  },

  generateLabReport: async (requestId: string, generatedBy: string = 'Lab Assistant'): Promise<any> => {
    const response = await api.post(`/api/lab/test-requests/${encodeURIComponent(requestId)}/report-generate?generated_by=${encodeURIComponent(generatedBy)}`);
    return response.data;
  },
  generateReport: async (requestId: string, generatedBy: string = 'Lab Assistant'): Promise<any> => {
    return labService.generateLabReport(requestId, generatedBy);
  },

  sendLabReportToPatient: async (requestId: string, sentBy: string = 'Lab Assistant'): Promise<any> => {
    const response = await api.post(`/api/lab/test-requests/${encodeURIComponent(requestId)}/send-to-patient?sent_by=${encodeURIComponent(sentBy)}`);
    return response.data;
  },

  sendLabReportToDoctor: async (requestId: string, sentBy: string = 'Lab Assistant'): Promise<any> => {
    const response = await api.post(`/api/lab/test-requests/${encodeURIComponent(requestId)}/send-to-doctor?sent_by=${encodeURIComponent(sentBy)}`);
    return response.data;
  },

  getLabReportData: async (requestId: string): Promise<any> => {
    const response = await api.get(`/api/lab/test-requests/${encodeURIComponent(requestId)}/report`);
    return response.data;
  },
  getReportData: async (requestId: string): Promise<any> => {
    return labService.getLabReportData(requestId);
  },

  getLabCriticalAlerts: async (todayOnly: boolean = true): Promise<any[]> => {
    const response = await api.get<any[]>(`/api/lab/alerts/critical?today_only=${todayOnly}`);
    return response.data;
  },

  getLabNotifications: async (recipientType: string, recipientId: string, isRead?: boolean | null): Promise<any[]> => {
    const q = new URLSearchParams({ recipient_type: recipientType, recipient_id: recipientId });
    if (isRead != null) q.set('is_read', String(isRead));
    const response = await api.get<any[]>(`/api/lab/notifications?${q.toString()}`);
    return response.data;
  },

  getPendingOrders: async (status?: string): Promise<any[]> => {
    return labService.getTestRequests(status);
  },
};
export const labApi = labService;

// ==========================================
// 10. BILLING & PAYMENTS SERVICE
// ==========================================
export const billingService = {
  getStats: async (): Promise<any> => {
    const response = await api.get('/api/billing/stats');
    return response.data;
  },

  getBillingStats: async (): Promise<any> => {
    return billingService.getStats();
  },

  getSettings: async (): Promise<any> => {
    const response = await api.get('/api/billing/settings');
    return response.data;
  },
  getBillingSettings: async (): Promise<any> => {
    return billingService.getSettings();
  },

  saveSettings: async (settings: any): Promise<any> => {
    const response = await api.put('/api/billing/settings', settings);
    return response.data;
  },
  updateBillingSettings: async (settings: any): Promise<any> => {
    return billingService.saveSettings(settings);
  },

  createBill: async (data: any): Promise<any> => {
    const response = await api.post('/api/bills', data);
    dataSync.notify('invoice');
    return response.data;
  },
  createInvoice: async (data: any): Promise<any> => {
    return billingService.createBill(data);
  },

  getBills: async (skip: number = 0, limit: number = 100): Promise<any[]> => {
    const response = await api.get<any[]>(`/api/bills?skip=${skip}&limit=${limit}`);
    return response.data;
  },
  getInvoices: async (): Promise<any[]> => {
    return billingService.getBills();
  },

  searchBills: async (query: string, skip: number = 0, limit: number = 50): Promise<any[]> => {
    const params = new URLSearchParams({ q: (query || '').trim(), skip: String(skip), limit: String(limit) });
    const response = await api.get<any[]>(`/api/bills/search?${params.toString()}`);
    return response.data;
  },

  getBill: async (billId: string): Promise<any> => {
    const response = await api.get(`/api/bills/${encodeURIComponent(billId)}`);
    return response.data;
  },

  getBillsByPatient: async (patientId: string): Promise<any[]> => {
    const response = await api.get<any[]>(`/api/bills/patient/${encodeURIComponent(patientId)}`);
    return response.data;
  },

  addBillPayment: async (
    billId: string,
    data: {
      amount: number;
      method: string;
      transaction_reference?: string;
      created_by?: string;
    }
  ): Promise<any> => {
    const payload = {
      amount: Number(data.amount) || 0,
      method: data.method || 'Cash',
      transaction_reference:
        (data.transaction_reference || '').trim() ||
        (data.method === 'Cash'
          ? 'CASH-' + Date.now().toString().slice(-6)
          : 'TXN-' + Date.now().toString().slice(-8)),
      created_by: (data.created_by || '').trim() || 'Staff',
    };
    const response = await api.post(`/api/bills/${encodeURIComponent(billId)}/payment`, payload);
    dataSync.notify('invoice');
    return response.data;
  },

  createRazorpayOrder: async (billId: string): Promise<{ order_id: string; amount: number; currency: string; key_id: string }> => {
    const response = await api.post('/api/create-razorpay-order', { billId });
    return response.data;
  },

  verifyRazorpayPayment: async (
    billId: string,
    payload: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }
  ): Promise<{ success: boolean; bill: any; receipt_number: string }> => {
    const response = await api.post('/api/verify-razorpay-payment', {
      billId,
      razorpay_payment_id: payload.razorpay_payment_id,
      razorpay_order_id: payload.razorpay_order_id,
      razorpay_signature: payload.razorpay_signature,
    });
    return response.data;
  },
};
export const billingApi = billingService;

// ==========================================
// 11. PATIENT RECORDS & DOCUMENTS
// ==========================================
export const patientRecordsService = {
  getPatientRecord: async (uhid: string): Promise<any> => {
    const response = await api.get(`/api/patient-records/${encodeURIComponent(uhid)}`);
    return response.data;
  },

  addPatientDocument: async (
    uhid: string,
    docData: {
      document_name: string;
      category: string;
      risk_level: string;
      uploaded_by: string;
      therapist: string;
      confidential: boolean;
      notes?: string;
      file_type: string;
      file_name: string;
      file_data?: string;
    }
  ): Promise<any> => {
    const response = await api.post(`/api/patient-records/${encodeURIComponent(uhid)}/documents`, docData);
    return response.data;
  },

  deletePatientDocument: async (docId: string): Promise<any> => {
    const response = await api.delete(`/api/patient-records/documents/${encodeURIComponent(docId)}`);
    return response.data;
  },
};
export const patientRecordsApi = patientRecordsService;

// ==========================================
// 12. ADMIN SERVICE
// ==========================================
export const adminService = {
  getStats: async (): Promise<any> => {
    const response = await api.get('/api/admin/stats');
    return response.data;
  },
  getAdminStats: async (): Promise<any> => {
    return adminService.getStats();
  },

  getUsers: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/api/admin/users');
    return Array.isArray(response.data) ? response.data : [];
  },
  getAdminUsers: async (): Promise<any[]> => {
    return adminService.getUsers();
  },

  createUser: async (userData: { username: string; full_name: string; email?: string; phone?: string; role: string; password: string }): Promise<any> => {
    const response = await api.post('/api/admin/users', userData);
    dataSync.notify('user');
    return response.data;
  },
  createAdminUser: async (userData: any): Promise<any> => {
    return adminService.createUser(userData);
  },

  setUserStatus: async (userId: string, status: 'active' | 'inactive'): Promise<any> => {
    const response = await api.patch(`/api/admin/users/${encodeURIComponent(userId)}/status`, { status });
    return response.data;
  },

  resetPassword: async (userId: string, newPassword: string): Promise<any> => {
    const response = await api.post(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, { new_password: newPassword });
    return response.data;
  },
  resetUserPassword: async (userId: string, newPassword: string): Promise<any> => {
    return adminService.resetPassword(userId, newPassword);
  },

  getLivePatients: async (limit: number = 20): Promise<any[]> => {
    const response = await api.get<any[]>(`/api/admin/live-patients?limit=${limit}`);
    return Array.isArray(response.data) ? response.data : [];
  },
  getAdminLivePatients: async (limit: number = 20): Promise<any[]> => {
    return adminService.getLivePatients(limit);
  },

  getLiveBilling: async (limit: number = 20): Promise<any[]> => {
    const response = await api.get<any[]>(`/api/admin/live-billing?limit=${limit}`);
    return Array.isArray(response.data) ? response.data : [];
  },
  getAdminLiveBilling: async (limit: number = 20): Promise<any[]> => {
    return adminService.getLiveBilling(limit);
  },

  getLiveLab: async (limit: number = 20): Promise<any[]> => {
    const response = await api.get<any[]>(`/api/admin/live-lab?limit=${limit}`);
    return Array.isArray(response.data) ? response.data : [];
  },
  getAdminLiveLab: async (limit: number = 20): Promise<any[]> => {
    return adminService.getLiveLab(limit);
  },

  getSystemHealth: async (): Promise<any> => {
    const response = await api.get('/api/admin/health');
    return response.data;
  },

  triggerBackup: async (): Promise<any> => {
    const response = await api.post('/api/admin/backup');
    return response.data;
  },

  getConfig: async (): Promise<any> => {
    const response = await api.get('/api/admin/config');
    return response.data;
  },
  getSystemConfig: async (): Promise<any> => {
    return adminService.getConfig();
  },

  updateConfig: async (config: any): Promise<any> => {
    const response = await api.post('/api/admin/config', config);
    return response.data;
  },
  updateSystemConfig: async (config: any): Promise<any> => {
    return adminService.updateConfig(config);
  },

  getLogs: async (params: { module?: string; user?: string; limit?: number } = {}): Promise<any[]> => {
    const response = await api.get<any[]>('/api/admin/logs', { params });
    return Array.isArray(response.data) ? response.data : [];
  },
  getAdminLogs: async (params?: any): Promise<any[]> => {
    return adminService.getLogs(params);
  },

  createLog: async (logData: { user: string; module: string; action: string; ip?: string }): Promise<any> => {
    const response = await api.post('/api/admin/logs', logData);
    return response.data;
  },
  createAdminLog: async (logData: any): Promise<any> => {
    return adminService.createLog(logData);
  },
};
export const adminApi = adminService;

// ==========================================
// 13. REPORTS & NOTIFICATIONS SERVICE
// ==========================================
export const reportsService = {
  getReportAnalytics: async (filters: { from_date?: string; to_date?: string; doctor_id?: string; program_type?: string } = {}): Promise<any> => {
    const q = new URLSearchParams(filters as any);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const response = await api.get(`/api/reports/analytics${qs}`);
    return response.data;
  },

  getReportDownload: async (reportType: string): Promise<any> => {
    const response = await api.get(`/api/reports/download?report_type=${encodeURIComponent(reportType)}`);
    return response.data;
  },
};
export const reportsApi = reportsService;

export const notificationService = {
  getNotifications: async (role: string = 'receptionist'): Promise<any[]> => {
    const response = await api.get<any[]>('/api/notifications', { params: { role } });
    return Array.isArray(response.data) ? response.data : [];
  },

  markNotificationRead: async (notifId: string): Promise<any> => {
    const response = await api.patch(`/api/notifications/${encodeURIComponent(notifId)}/read`);
    return response.data;
  },
};
export const notificationApi = notificationService;

// ==========================================
// 14. RECEPTIONIST CONVENIENCE BUNDLE
// ==========================================
export const receptionistApi = {
  getDashboardCounts: appointmentService.getDashboardCounts,
  getAppointments: appointmentService.getAppointments,
  createAppointment: appointmentService.createAppointment,
  updateAppointmentStatus: appointmentService.updateAppointmentStatus,
  rescheduleAppointment: appointmentService.rescheduleAppointment,
  cancelAppointment: appointmentService.cancelAppointment,
  blockSlot: appointmentService.blockSlot,
  getBookedSlots: appointmentService.getBookedSlots,

  getPatients: patientService.getPatients,
  getPatientByUhid: patientService.getPatientByUhid,
  createPatient: patientService.createPatient,
  registerPatient: patientService.createPatient,
  bulkImportPatients: patientService.bulkImportPatients,

  getAdmissions: admissionService.getAdmissions,
  getAdmissionDetail: admissionService.getAdmissionDetail,
  admitPatient: admissionService.admitPatient,
  updateAdmission: admissionService.updateAdmission,
  uploadConsentFile: admissionService.uploadConsentFile,
  getConsentInfo: admissionService.getConsentInfo,
  dischargePatient: admissionService.dischargePatient,

  createOPD: opdIpdService.createOPD,
  getOPDList: opdIpdService.getOPDList,
  createIPD: opdIpdService.createIPD,
  getIPDList: opdIpdService.getIPDList,
  getBeds: opdIpdService.getBeds,

  getRooms: roomService.getRooms,
  createRoom: roomService.createRoom,
  updateRoomStatus: roomService.updateRoomStatus,

  getBills: billingService.getBills,
  getBillsByPatient: billingService.getBillsByPatient,
  createBill: billingService.createBill,
  addBillPayment: billingService.addBillPayment,

  generateToken: tokenService.generateToken,
  getTokensToday: tokenService.getTokensToday,
  getTokensByDoctor: tokenService.getTokensByDoctor,
  updateTokenStatus: tokenService.updateTokenStatus,

  getNotifications: notificationService.getNotifications,
  markNotificationRead: notificationService.markNotificationRead,

  getDoctors: doctorService.getDoctors,
  getSystemConfig: adminService.getConfig,
};

// Default export unified object matching web service.js
export const hospitalApi = {
  ...authService,
  ...patientService,
  ...appointmentService,
  ...opdIpdService,
  ...admissionService,
  ...roomService,
  ...doctorService,
  ...tokenService,
  ...emrService,
  ...clinicalService,
  ...labService,
  ...billingService,
  ...patientRecordsService,
  ...adminService,
  ...reportsService,
  ...notificationService,
  getApiErrorMessage,
};

export default hospitalApi;
