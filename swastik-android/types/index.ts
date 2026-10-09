// mobile/types/index.ts
// Core domain types for Swastik Hospital Management System

export type UserRole = 
  | 'admin'
  | 'doctor'
  | 'receptionist'
  | 'lab'
  | 'billing'
  | 'patient';

export interface User {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  role: UserRole;
  phone?: string;
  department?: string;
  is_active?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user?: User;
  role?: UserRole;
}

export interface Patient {
  _id: string;
  uhid: string;
  name: string;
  age?: number;
  gender: 'male' | 'female' | 'other';
  phone: string;
  address?: string;
  visit_type: 'OPD' | 'IPD';
  assigned_doctor?: string;
  room_number?: string;
  admission_date?: string;
  status: 'active' | 'discharged' | 'critical' | 'stable';
  diagnosis?: string;
}

export interface Appointment {
  _id: string;
  patient_id: string;
  patient_name: string;
  uhid: string;
  doctor_id: string;
  doctor_name: string;
  department: string;
  appointment_date: string;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled';
  notes?: string;
}

export interface Vitals {
  systolic_bp?: number;
  diastolic_bp?: number;
  pulse?: number;
  temperature?: number;
  spo2?: number;
  weight?: number;
  recorded_at?: string;
}

export interface Medication {
  drug: string;
  dosage: string;
  route: 'Oral' | 'IV' | 'IM' | 'Sublingual' | 'Topical';
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface SOAPNotes {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface EMRRecord {
  _id: string;
  patient_id: string;
  uhid: string;
  vitals?: Vitals;
  soap_notes?: SOAPNotes;
  diagnoses?: string[];
  medications?: Medication[];
  updated_at?: string;
}

export interface LabOrder {
  _id: string;
  patient_id: string;
  patient_name: string;
  uhid: string;
  test_name: string;
  category: string;
  priority: 'Routine' | 'STAT' | 'Urgent';
  status: 'pending' | 'in_progress' | 'completed';
  results?: Record<string, any>;
  ordered_by: string;
  ordered_at: string;
}

export interface Invoice {
  _id: string;
  invoice_number: string;
  patient_id: string;
  patient_name: string;
  uhid: string;
  items: {
    description: string;
    amount: number;
  }[];
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  status: 'paid' | 'pending' | 'partially_paid';
  payment_method?: 'UPI' | 'Card' | 'Cash' | 'NetBanking';
  created_at: string;
}
