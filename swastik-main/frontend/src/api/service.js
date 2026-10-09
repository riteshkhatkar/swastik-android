import { API_BASE_URL, getAuthHeader } from "./config";

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...options.headers,
  };
  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    const msg = err && err.message && (err.message.toLowerCase().includes("fetch") || err.message.toLowerCase().includes("network"));
    throw new Error(
      msg
        ? `Cannot connect to server at ${API_BASE_URL}. Make sure the backend is running (e.g. in backend folder run: python -m uvicorn app.main:app --reload --port 8000).`
        : (err?.message || "Request failed")
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || "Request failed");
  return data;
}

export const api = {
  async getAdmissions(doctorId = null) {
    const q = doctorId ? `?doctor_id=${encodeURIComponent(doctorId)}` : "";
    return request(`/api/admissions${q}`);
  },

  async getAdmissionDetail(admissionId) {
    return request(`/api/admissions/${encodeURIComponent(admissionId)}`);
  },

  async updateAdmission(admissionId, data) {
    return request(`/api/admissions/${encodeURIComponent(admissionId)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async login(username, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  async loginWithGoogle(token, role) {
    return request("/auth/google", {
      method: "POST",
      body: JSON.stringify({ token, role }),
    });
  },

  async getMe() {
    return request("/auth/me", { method: "GET" });
  },

  async getDoctorCustomQuestions() {
    return request("/api/doctor/custom-questions", { method: "GET" });
  },

  async updateDoctorCustomQuestions(questions) {
    return request("/api/doctor/custom-questions", {
      method: "PUT",
      body: JSON.stringify({ questions }),
    });
  },

  async uploadConsentFile(uhid, file) {
    const { API_BASE_URL, getAuthHeader } = await import("./config");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/api/admissions/${encodeURIComponent(uhid)}/consent-upload`, {
      method: "POST",
      headers: { ...getAuthHeader() },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Consent upload failed");
    return data;
  },

  async getConsentInfo(uhid) {
    return request(`/api/admissions/${encodeURIComponent(uhid)}/consent`, { method: "GET" });
  },

  async createPatient(body) {
    return request("/api/patients", {
      method: "POST",
      body: JSON.stringify({
        name: body.patientName || body.name,
        age: body.age ? parseInt(body.age, 10) : null,
        gender: body.gender || null,
        phone: body.phone || null,
        email: body.email || null,
        dob: body.dob || null, // Include dob
        password: body.password || null, // Explicitly pass password
        address: [body.houseNoStreet, body.village, body.district, body.state, body.pincode].filter(Boolean).join(", ") || null,
        guardian_name: body.fatherHusbandName || null,
      }),
    });
  },

  async getPatients(skip = 0, limit = 100) {
    return request(`/api/patients?skip=${skip}&limit=${limit}`);
  },

  async getPatientByUhid(uhid) {
    return request(`/api/patients/${encodeURIComponent(uhid)}`);
  },

  async createOPD(body) {
    return request("/api/opd", { method: "POST", body: JSON.stringify(body) });
  },

  async createIPD(body) {
    return request("/api/ipd", {
      method: "POST",
      body: JSON.stringify({
        uhid: body.uhid,
        patient_name: body.patientName || body.patient_name,
        ward: body.ward,
        bed_id: body.bed_id,
        bed_number: body.bed_number,
        admission_reason: body.admissionReason || body.admission_reason,
        admitted_by: body.admitted_by,
        deposit: body.deposit,
        notes: body.notes
      })
    });
  },

  async getBeds(wardType = null) {
    const q = wardType ? `?ward_type=${encodeURIComponent(wardType)}` : "";
    return request(`/api/beds${q}`);
  },

  async getOPDList(skip = 0, limit = 100) {
    return request(`/api/opd?skip=${skip}&limit=${limit}`);
  },

  async getIPDList(skip = 0, limit = 100) {
    return request(`/api/ipd?skip=${skip}&limit=${limit}`);
  },

  async createDoctor(body) {
    return request("/api/doctors", { method: "POST", body: JSON.stringify(body) });
  },

  async getDoctors() {
    return request("/api/doctors");
  },

  async createStaff(body) {
    return request("/api/staff", { method: "POST", body: JSON.stringify(body) });
  },

  async createAppointment(body) {
    return request("/api/appointments", { method: "POST", body: JSON.stringify(body) });
  },

  async getAppointments(uhid = null, skip = 0, limit = 100, doctorId = null) {
    const q = new URLSearchParams({ skip, limit });
    if (uhid) q.set("uhid", uhid);
    if (doctorId) q.set("doctor_id", doctorId);
    return request(`/api/appointments?${q}`);
  },

  async updateAppointmentStatus(appointmentId, status, date = null, time = null, reason = null) {
    const q = new URLSearchParams({ status });
    if (date) q.set("date", date);
    if (time) q.set("time", time);
    if (reason) q.set("reason", reason);
    return request(`/api/appointments/${appointmentId}/status?${q}`, {
      method: "PUT",
    });
  },

  async cancelAppointment(appointmentId, reason = null) {
    const q = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    return request(`/api/appointments/cancel/${appointmentId}${q}`, {
      method: "PUT",
    });
  },

  async rescheduleAppointment(appointmentId, data) {
    return request(`/api/appointments/reschedule/${appointmentId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async getDashboardCounts() {
    return request("/api/dashboard/counts");
  },

  async generateToken(data) {
    return request("/api/tokens/generate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getTokensByDoctor(doctorId) {
    return request(`/api/tokens/doctor/${doctorId}`);
  },

  async updateTokenStatus(tokenId, status) {
    return request(`/api/tokens/update/${tokenId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  async getTokensToday() {
    return request("/api/tokens/today");
  },

  async getBookedSlots(doctorId, date) {
    return request(`/api/appointments/booked-slots?doctor_id=${doctorId}&date=${date}`);
  },

  async blockSlot(doctorId, date, time, reason) {
    return request(`/api/appointments/block-slot?doctor_id=${doctorId}&date=${date}&time=${time}&reason=${encodeURIComponent(reason)}`, {
      method: "POST",
    });
  },

  async getReportAnalytics(filters = {}) {
    const q = new URLSearchParams(filters);
    return request(`/api/reports/analytics?${q}`);
  },

  async getPatientRecord(uhid) {
    return request(`/api/patient-records/${uhid}`);
  },

  async addPatientDocument(uhid, docData) {
    return request(`/api/patient-records/${uhid}/documents`, {
      method: "POST",
      body: JSON.stringify(docData),
    });
  },

  async deletePatientDocument(docId) {
    return request(`/api/patient-records/documents/${docId}`, {
      method: "DELETE",
    });
  },

  async getAdminLogs(params = {}) {
    const q = new URLSearchParams();
    if (params.module) q.set("module", params.module);
    if (params.user) q.set("user", params.user);
    if (params.limit) q.set("limit", params.limit);
    const qs = q.toString() ? `?${q}` : "";
    return request(`/api/admin/logs${qs}`);
  },

  async createAdminLog(logData) {
    return request(`/api/admin/logs`, {
      method: "POST",
      body: JSON.stringify(logData),
    });
  },

  // Admin — Stats
  async getAdminStats() {
    return request("/api/admin/stats");
  },

  // Admin — User Management
  async getAdminUsers() {
    return request("/api/admin/users");
  },

  async createAdminUser(body) {
    return request("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async setUserStatus(userId, status) {
    return request(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async resetUserPassword(userId, newPassword) {
    return request(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ new_password: newPassword }),
    });
  },

  // Admin — Live Feeds
  async getAdminLiveBilling(limit = 20) {
    return request(`/api/admin/live-billing?limit=${limit}`);
  },

  async getAdminLiveLab(limit = 20) {
    return request(`/api/admin/live-lab?limit=${limit}`);
  },

  async getAdminLivePatients(limit = 20) {
    return request(`/api/admin/live-patients?limit=${limit}`);
  },

  async getSystemHealth() {
    return request("/api/admin/health");
  },

  async triggerBackup() {
    return request("/api/admin/backup", { method: "POST" });
  },

  async getSystemConfig() {
    return request("/api/admin/config");
  },

  async updateSystemConfig(config) {
    return request("/api/admin/config", {
      method: "POST",
      body: JSON.stringify(config),
    });
  },

  async createLabRequest(body) {
    return request("/api/lab/requests", { method: "POST", body: JSON.stringify(body) });
  },

  async getLabRequests(status = null, skip = 0, limit = 100) {
    const q = new URLSearchParams({ skip, limit });
    if (status) q.set("status", status);
    return request(`/api/lab/requests?${q}`);
  },

  async getLabRequest(orderId) {
    return request(`/api/lab/requests/${orderId}`);
  },

  async updateLabStatus(orderId, body) {
    return request(`/api/lab/requests/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async saveLabResults(orderId, body) {
    return request(`/api/lab/requests/${orderId}/results`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async getLabStats(todayOnly = true) {
    return request(`/api/lab/stats?today_only=${todayOnly}`);
  },

  // New lab flow (test-requests, catalog, etc.)
  async getLabCatalog(category = null) {
    const q = category ? `?category=${encodeURIComponent(category)}` : "";
    return request(`/api/lab/catalog${q}`);
  },
  async createLabTestRequest(body) {
    return request("/api/lab/test-requests", { method: "POST", body: JSON.stringify(body) });
  },
  async getLabTestRequests(params = {}) {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.patient_id) q.set("patient_id", params.patient_id);
    if (params.doctor_id) q.set("doctor_id", params.doctor_id);
    if (params.today_only) q.set("today_only", "true");
    q.set("skip", params.skip ?? 0);
    q.set("limit", params.limit ?? 100);
    return request(`/api/lab/test-requests?${q}`);
  },
  async getLabTestRequest(requestId) {
    return request(`/api/lab/test-requests/${requestId}`);
  },
  async referPatientToLab(requestId, referredBy) {
    return request(`/api/lab/test-requests/${requestId}/refer-to-lab?referred_by=${encodeURIComponent(referredBy)}`, { method: "POST" });
  },
  async checkInPatientAtLab(requestId, checkedInBy) {
    return request(`/api/lab/test-requests/${requestId}/check-in?checked_in_by=${encodeURIComponent(checkedInBy)}`, { method: "POST" });
  },
  async getLabWaitingPatients(todayOnly = true) {
    return request(`/api/lab/waiting-patients?today_only=${todayOnly}`);
  },
  async getLabTokenDisplay(todayOnly = true) {
    return request(`/api/lab/token-display?today_only=${todayOnly}`);
  },
  async getLabAverageWaitTime() {
    return request("/api/lab/average-wait-time");
  },
  async markLabNoShow(requestId, markedBy) {
    return request(`/api/lab/test-requests/${requestId}/mark-no-show?marked_by=${encodeURIComponent(markedBy)}`, { method: "POST" });
  },
  async processLabNoShows(hours = null) {
    const q = hours != null ? `?hours=${hours}` : "";
    return request(`/api/lab/process-no-shows${q}`, { method: "POST" });
  },
  async acknowledgeLabRequest(requestId, acknowledgedBy) {
    return request(`/api/lab/test-requests/${requestId}/acknowledge?acknowledged_by=${encodeURIComponent(acknowledgedBy)}`, { method: "POST" });
  },
  async startLabSampleCollection(requestId, startedBy) {
    return request(`/api/lab/test-requests/${requestId}/sample/start?started_by=${encodeURIComponent(startedBy)}`, { method: "POST" });
  },
  async completeLabSampleCollection(requestId, data) {
    return request(`/api/lab/test-requests/${requestId}/sample/complete`, { method: "POST", body: JSON.stringify(data) });
  },
  async markLabTestInProcess(requestId, updatedBy) {
    return request(`/api/lab/test-requests/${requestId}/test-in-process?updated_by=${encodeURIComponent(updatedBy)}`, { method: "POST" });
  },
  async getLabRequestResults(requestId) {
    return request(`/api/lab/test-requests/${requestId}/results`);
  },
  async submitLabResults(requestId, data) {
    return request(`/api/lab/test-requests/${requestId}/results`, { method: "POST", body: JSON.stringify(data) });
  },
  async generateLabReport(requestId, generatedBy) {
    return request(`/api/lab/test-requests/${requestId}/report-generate?generated_by=${encodeURIComponent(generatedBy)}`, { method: "POST" });
  },
  async sendLabReportToPatient(requestId, sentBy) {
    return request(`/api/lab/test-requests/${requestId}/send-to-patient?sent_by=${encodeURIComponent(sentBy)}`, { method: "POST" });
  },
  async sendLabReportToDoctor(requestId, sentBy) {
    return request(`/api/lab/test-requests/${requestId}/send-to-doctor?sent_by=${encodeURIComponent(sentBy)}`, { method: "POST" });
  },
  async getLabReportData(requestId) {
    return request(`/api/lab/test-requests/${requestId}/report`);
  },
  async getLabCriticalAlerts(todayOnly = true) {
    return request(`/api/lab/alerts/critical?today_only=${todayOnly}`);
  },
  async getLabNotifications(recipientType, recipientId, isRead = null) {
    const q = new URLSearchParams({ recipient_type: recipientType, recipient_id: recipientId });
    if (isRead != null) q.set("is_read", isRead);
    return request(`/api/lab/notifications?${q}`);
  },

  async saveConsultation(uhid, data) {
    return request(`/api/clinical/consultation/${uhid}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async savePrescription(uhid, data) {
    return request(`/api/clinical/prescription/${uhid}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getPrescriptions(params = {}) {
    const q = new URLSearchParams();
    if (params.uhid) q.set("uhid", params.uhid);
    if (params.doctor_id) q.set("doctor_id", params.doctor_id);
    if (params.search) q.set("search", params.search);
    const queryString = q.toString() ? `?${q}` : "";
    return request(`/api/clinical/prescription${queryString}`);
  },

  async saveIPDAdmissionDetails(uhid, data) {
    return request(`/api/clinical/ipd/admission/${uhid}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async saveIPDProgressNote(uhid, data) {
    return request(`/api/clinical/ipd/progress/${uhid}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateIPDAction(uhid, action, details) {
    return request(`/api/clinical/ipd/action/${uhid}?action=${action}`, {
      method: "PATCH",
      body: JSON.stringify(details),
    });
  },

  async saveRehabData(uhid, rehabType, data) {
    return request(`/api/clinical/rehab/${uhid}?rehab_type=${rehabType}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getClinicalHistory(uhid) {
    return request(`/api/clinical/history/${uhid}`);
  },

  async saveDailyRoutine(uhid, data) {
    return request(`/api/clinical/daily-routine/${uhid}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getBillingStats() {
    return request("/api/billing/stats");
  },

  async getBillingSettings() {
    return request("/api/billing/settings");
  },

  async updateBillingSettings(settings) {
    return request("/api/billing/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },

  // Billing – bills and payments
  async createBill(body) {
    return request("/api/bills", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async getBills(skip = 0, limit = 100) {
    return request(`/api/bills?skip=${skip}&limit=${limit}`);
  },

  async searchBills(q, skip = 0, limit = 50) {
    const params = new URLSearchParams({ q: (q || "").trim(), skip: String(skip), limit: String(limit) });
    return request(`/api/bills/search?${params}`);
  },

  async getBill(billId) {
    return request(`/api/bills/${encodeURIComponent(billId)}`);
  },

  async getBillsByPatient(patientId) {
    return request(`/api/bills/patient/${encodeURIComponent(patientId)}`);
  },

  async addBillPayment(billId, data) {
    return request(`/api/bills/${encodeURIComponent(billId)}/payment`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async createRazorpayOrder(billId) {
    return request("/api/create-razorpay-order", {
      method: "POST",
      body: JSON.stringify({ billId }),
    });
  },

  async verifyRazorpayPayment(billId, payload) {
    return request("/api/verify-razorpay-payment", {
      method: "POST",
      body: JSON.stringify({
        billId,
        razorpay_payment_id: payload.razorpay_payment_id,
        razorpay_order_id: payload.razorpay_order_id,
        razorpay_signature: payload.razorpay_signature,
      }),
    });
  },

  // EMR – Psychiatric Clinical Module
  async getEmrContext(uhid) {
    return request(`/api/emr/context/${encodeURIComponent(uhid)}`);
  },
  async createAdmission(uhid, data, createdBy) {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : "";
    return request(`/api/emr/admissions/${encodeURIComponent(uhid)}${q}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async getActiveAdmission(uhid) {
    return request(`/api/emr/admissions/active/${encodeURIComponent(uhid)}`);
  },
  async getAdmission(admissionId) {
    return request(`/api/emr/admissions/${encodeURIComponent(admissionId)}`);
  },
  async listAdmissions(uhid) {
    return request(`/api/emr/admissions/list/${encodeURIComponent(uhid)}`);
  },
  async updateEmrAdmission(admissionId, data, updatedBy) {
    const q = updatedBy ? `?updated_by=${encodeURIComponent(updatedBy)}` : "";
    return request(`/api/emr/admissions/${encodeURIComponent(admissionId)}${q}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  async saveSymptomsHpi(uhid, data, createdBy) {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : "";
    return request(`/api/emr/symptoms-hpi/${encodeURIComponent(uhid)}${q}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async getSymptomsHpi(uhid, admissionId) {
    return request(`/api/emr/symptoms-hpi/${encodeURIComponent(uhid)}?admission_id=${encodeURIComponent(admissionId)}`);
  },
  async saveMse(uhid, data, createdBy) {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : "";
    return request(`/api/emr/mse/${encodeURIComponent(uhid)}${q}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async getMse(uhid, admissionId) {
    return request(`/api/emr/mse/${encodeURIComponent(uhid)}?admission_id=${encodeURIComponent(admissionId)}`);
  },
  async saveDiagnosis(uhid, data, createdBy) {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : "";
    return request(`/api/emr/diagnosis/${encodeURIComponent(uhid)}${q}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async getDiagnosis(uhid, admissionId) {
    return request(`/api/emr/diagnosis/${encodeURIComponent(uhid)}?admission_id=${encodeURIComponent(admissionId)}`);
  },
  async saveRisk(uhid, data, createdBy) {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : "";
    return request(`/api/emr/risk/${encodeURIComponent(uhid)}${q}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async getRisk(uhid, admissionId) {
    return request(`/api/emr/risk/${encodeURIComponent(uhid)}?admission_id=${encodeURIComponent(admissionId)}`);
  },
  async addMedication(uhid, data, createdBy) {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : "";
    return request(`/api/emr/medications/${encodeURIComponent(uhid)}${q}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async listMedications(uhid, admissionId) {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : "";
    return request(`/api/emr/medications/${encodeURIComponent(uhid)}${q}`);
  },
  async updateMedication(medicationId, data, updatedBy) {
    const q = updatedBy ? `?updated_by=${encodeURIComponent(updatedBy)}` : "";
    return request(`/api/emr/medications/${medicationId}${q}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  async addLabMonitoring(uhid, data, createdBy) {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : "";
    return request(`/api/emr/lab-monitoring/${encodeURIComponent(uhid)}${q}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async listLabMonitoring(uhid, admissionId) {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : "";
    return request(`/api/emr/lab-monitoring/${encodeURIComponent(uhid)}${q}`);
  },
  async saveTreatmentPlan(uhid, data, createdBy) {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : "";
    return request(`/api/emr/treatment-plan/${encodeURIComponent(uhid)}${q}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async getTreatmentPlan(uhid, admissionId) {
    return request(`/api/emr/treatment-plan/${encodeURIComponent(uhid)}?admission_id=${encodeURIComponent(admissionId)}`);
  },
  async createSessionNote(uhid, data, createdBy) {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : "";
    return request(`/api/emr/session-notes/${encodeURIComponent(uhid)}${q}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateSessionNote(noteId, data, updatedBy) {
    const q = updatedBy ? `?updated_by=${encodeURIComponent(updatedBy)}` : "";
    return request(`/api/emr/session-notes/${noteId}${q}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  async listSessionNotes(uhid, admissionId) {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : "";
    return request(`/api/emr/session-notes/${encodeURIComponent(uhid)}${q}`);
  },
  async addVitals(uhid, data, recordedBy) {
    const q = recordedBy ? `?recorded_by=${encodeURIComponent(recordedBy)}` : "";
    return request(`/api/emr/vitals/${encodeURIComponent(uhid)}${q}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async listVitals(uhid, admissionId, limit = 100) {
    const params = new URLSearchParams();
    if (admissionId) params.set("admission_id", admissionId);
    params.set("limit", limit);
    return request(`/api/emr/vitals/${encodeURIComponent(uhid)}?${params}`);
  },
  async addHistoryEvent(uhid, data, createdBy) {
    const q = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : "";
    return request(`/api/emr/history/${encodeURIComponent(uhid)}${q}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async listHistoryEvents(uhid, eventType, year) {
    const params = new URLSearchParams();
    if (eventType) params.set("event_type", eventType);
    if (year) params.set("year", year);
    const q = params.toString() ? `?${params}` : "";
    return request(`/api/emr/history/${encodeURIComponent(uhid)}${q}`);
  },
  async getEmrAudit(entityType, entityId, limit = 100) {
    const params = new URLSearchParams();
    if (entityType) params.set("entity_type", entityType);
    if (entityId) params.set("entity_id", entityId);
    params.set("limit", limit);
    return request(`/api/emr/audit?${params}`);
  },
  async getWardSummary(uhid, admissionId = null) {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : "";
    return request(`/api/emr/ward-summary/${encodeURIComponent(uhid)}${q}`);
  },
  async getClinicalTimeline(uhid, admissionId = null) {
    const q = admissionId ? `?admission_id=${encodeURIComponent(admissionId)}` : "";
    return request(`/api/emr/timeline/${encodeURIComponent(uhid)}${q}`);
  },

  async bulkImportPatients(patientsData) {
    return request("/api/patients/bulk-import", {
      method: "POST",
      body: JSON.stringify(patientsData),
    });
  },

  async getNotifications(role) {
    return request(`/api/notifications?role=${role}`);
  },

  async markNotificationRead(notifId) {
    return request(`/api/notifications/${notifId}/read`, {
      method: "PATCH",
    });
  },

  // Hospital Grade Admissions (New)
  async admitPatient(body) {
    return request("/api/admissions", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  // Room Management
  async getRooms(params = {}) {
    const q = new URLSearchParams(params);
    return request(`/api/rooms?${q}`);
  },

  async createRoom(body) {
    return request("/api/rooms", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  // Discharge Management
  async dischargePatient(body) {
    return request("/api/discharges", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  
  // Session Locking
  async startSession(patientId) {
    return request(`/api/session/start?patient_id=${encodeURIComponent(patientId)}`, {
      method: "POST",
    });
  },

  async endSession(patientId) {
    return request(`/api/session/end?patient_id=${encodeURIComponent(patientId)}`, {
      method: "POST",
    });
  },

  async getSessionStatus(patientId) {
    return request(`/api/session/status/${encodeURIComponent(patientId)}`);
  },

  async getActiveSessions() {
    return request("/api/session/active");
  },
  
  // Doctor Settings
  async getDoctorProfile(username) {
    return request(`/api/doctor/profile?username=${encodeURIComponent(username)}`);
  },

  async updateDoctorProfile(username, data) {
    return request(`/api/doctor/profile?username=${encodeURIComponent(username)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async changeDoctorPassword(username, data) {
    return request(`/api/doctor/change-password?username=${encodeURIComponent(username)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};
