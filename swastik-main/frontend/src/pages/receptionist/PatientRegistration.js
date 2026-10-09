import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiCheckCircle } from 'react-icons/fi';
import {
  generateUHID,
  generateCaseNumber,
  generateVisitId,
} from "./receptionistData";
import BillingReceipt from "./BillingReceipt";
import logo from "../../assets/swasstiklogo.png";
import "./PatientRegistration.css";

const STEPS = [
  "Basic & Contact Info",
  "Guardian & Legal Consent",
  "Visit Details & Finalize",
  "Generate Case Paper",
];

const initialForm = {
  fullName: "",
  dob: "",
  gender: "",
  maritalStatus: "",
  occupation: "",
  contact: "",
  email: "",
  address: "",
  guardianName: "",
  guardianRelation: "",
  guardianContact: "",
  guardianAddress: "",
  guardianIdType: "",
  guardianIdNumber: "",
  guardianConsent: false,
  emergencyName: "",
  emergencyRelation: "",
  emergencyContact: "",
  prevPsychiatric: "",
  onMedication: "",
  medicationDetails: "",
  substanceHistory: "",
  selfHarmHistory: "",
  violentHistory: "",
  visitType: "",
  insuranceProvider: "",
  policyNumber: "",
  validTill: "",
  selfPay: false,
  docGovId: "",
  docInsurance: "",
  docConsent: "",
};

function PatientRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEmergency = location.state?.emergency === true;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [uhid] = useState(() => generateUHID());
  const [generatedPaper, setGeneratedPaper] = useState(null);
  const [generatedInvoice, setGeneratedInvoice] = useState(null);

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState([]);
  const [systemConfig, setSystemConfig] = useState(null);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { api } = await import("../../api/service");
        const data = await api.getDoctors();
        setDoctors(data || []);
      } catch (err) {
        console.error("Error fetching doctors:", err);
      }
    };
    const fetchConfig = async () => {
      try {
        const { api } = await import("../../api/service");
        const config = await api.getSystemConfig();
        setSystemConfig(config);
      } catch (err) {
        console.error("Error fetching system config:", err);
      }
    };
    fetchDoctors();
    fetchConfig();
  }, []);

  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (selectedDoctorId && appointmentDate) {
        try {
          const { api } = await import("../../api/service");
          const slots = await api.getBookedSlots(selectedDoctorId, appointmentDate);
          setBookedSlots(slots || []);
        } catch (err) {
          console.error("Error fetching booked slots:", err);
        }
      } else {
        setBookedSlots([]);
      }
    };
    fetchBookedSlots();
  }, [selectedDoctorId, appointmentDate]);

  const handleReset = () => {
    setForm(initialForm);
    setStep(1);
    setGeneratedPaper(null);
    setGeneratedInvoice(null);
    window.location.reload();
  };


  const age = useMemo(() => {
    if (!form.dob) return null;
    const birth = new Date(form.dob);
    const today = new Date();
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    return a;
  }, [form.dob]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }

    try {
      const { api } = await import("../../api/service");
      const patientData = {
        name: form.fullName,
        age: age,
        gender: form.gender,
        phone: form.contact,
        address: form.address,
        email: form.email,
        dob: form.dob,

        // Guardian Info
        guardian_name: form.guardianName,
        guardian_relation: form.guardianRelation,
        guardian_contact: form.guardianContact,
        guardian_address: form.guardianAddress,
        guardian_id_type: form.guardianIdType,
        guardian_id_number: form.guardianIdNumber,
        guardian_consent: form.guardianConsent,

        // Emergency
        emergency_name: form.emergencyName,
        emergency_relation: form.emergencyRelation,
        emergency_contact: form.emergencyContact,

        // Medical History
        prev_psychiatric: form.prevPsychiatric,
        on_medication: form.onMedication,
        medication_details: form.medicationDetails,
        substance_history: form.substanceHistory,
        self_harm_history: form.selfHarmHistory,
        violent_history: form.violentHistory,

        // Visit
        visit_type: form.visitType,
        insurance_provider: form.insuranceProvider,
        policy_number: form.policyNumber,
        valid_till: form.validTill,
        self_pay: form.selfPay
      };

      const response = await api.createPatient(patientData);
      const patient = response;

      const caseNumber = generateCaseNumber();
      const visitId = generateVisitId();

      if ((form.visitType === "opd" || form.visitType === "therapy") && selectedDoctorId && appointmentDate && appointmentTime) {
        try {
          // Send raw appointment request
          await api.createAppointment({
            uhid: patient.uhid,
            patient_name: patient.name,
            doctor_id: selectedDoctorId,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            type: form.visitType === "opd" ? "OPD Consultation" : "Therapy Session",
            notes: "Booked during registration."
          });
        } catch (aptErr) {
          console.error("Failed to book appointment during registration:", aptErr);
          // Non-blocking error, allow registration to complete
        }
      }

      setGeneratedPaper({
        uhid: patient.uhid,
        caseNumber: caseNumber,
        visitId: visitId,
        fullName: patient.name
      });

      // Use live bill from backend (registration creates it). Show as payment receipt.
      let billForReceipt = response.initial_bill || null;
      if (!billForReceipt && patient.uhid) {
        try {
          const bills = await api.getBillsByPatient(patient.uhid);
          billForReceipt = Array.isArray(bills) && bills.length > 0 ? bills[0] : null;
        } catch (_) { }
      }
      setGeneratedInvoice(billForReceipt || {
        invoice_number: "—",
        uhid: patient.uhid,
        patient_name: patient.name,
        created_at: new Date().toISOString(),
        items: [],
        total: 0,
        due_amount: 0,
      });

      setStep(4);
    } catch (err) {
      alert("Registration failed: " + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };


  return (
    <div className="recep-reg">
      <div className="recep-reg-header">
        <h1 className="recep-reg-title">Psychiatric Registration</h1>
        {isEmergency && <span className="recep-badge-emergency">EMERGENCY</span>}
        <p className="recep-reg-uhid">UHID: {uhid}</p>
      </div>

      {/* Stepper */}
      <div className="recep-reg-stepper">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`recep-reg-step ${i + 1 === step ? "active" : ""} ${i + 1 < step ? "done" : ""}`}
          >
            <span className="recep-reg-step-num">{i + 1}</span>
            <span className="recep-reg-step-label">{label}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="recep-reg-form">
        {/* Step 1 – Basic & Contact Information */}
        {step === 1 && (
          <div className="recep-reg-step-content">
            <h2>Basic & Contact Information</h2>
            <div className="recep-reg-grid">
              <div className="recep-reg-field full">
                <label>Full Patient Name *</label>
                <input type="text" required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Full name" />
              </div>
              <div className="recep-reg-field">
                <label>Date of Birth *</label>
                <input type="date" required value={form.dob} onChange={(e) => update("dob", e.target.value)} />
              </div>
              <div className="recep-reg-field">
                <label>Gender *</label>
                <select required value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="recep-reg-field">
                <label>Contact Number *</label>
                <input type="tel" required value={form.contact} onChange={(e) => update("contact", e.target.value)} placeholder="Mobile number" />
              </div>
              <div className="recep-reg-field">
                <label>Email Address</label>
                <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="Email" />
              </div>
              <div className="recep-reg-field full">
                <label>Complete Address *</label>
                <input type="text" required value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="House/Flat No, Street, Landmark, City, State" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 – Guardian & Legal */}
        {step === 2 && (
          <div className="recep-reg-step-content">
            <h2>Guardian & Legal Consent</h2>
            <div className="recep-reg-grid">
              <div className="recep-reg-field full">
                <label>Guardian/Responsible Person Name *</label>
                <input type="text" required value={form.guardianName} onChange={(e) => update("guardianName", e.target.value)} />
              </div>
              <div className="recep-reg-field">
                <label>Relationship *</label>
                <input type="text" required value={form.guardianRelation} onChange={(e) => update("guardianRelation", e.target.value)} placeholder="e.g. Father/Spouse" />
              </div>
              <div className="recep-reg-field">
                <label>Guardian Contact *</label>
                <input type="tel" required value={form.guardianContact} onChange={(e) => update("guardianContact", e.target.value)} />
              </div>
              <div className="recep-reg-field full">
                <label className="recep-reg-check">
                  <input type="checkbox" required checked={form.guardianConsent} onChange={(e) => update("guardianConsent", e.target.checked)} />
                  I/We hereby give consent for psychiatric assessment and treatment at Swastik Hospital.
                </label>
              </div>
              <div className="recep-reg-field full">
                <label>Emergency Contact Name & Number *</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input type="text" style={{ flex: 1 }} required value={form.emergencyName} onChange={(e) => update("emergencyName", e.target.value)} placeholder="Name" />
                  <input type="tel" style={{ flex: 1 }} required value={form.emergencyContact} onChange={(e) => update("emergencyContact", e.target.value)} placeholder="Number" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 – Visit & Finalize */}
        {step === 3 && (
          <div className="recep-reg-step-content">
            <h2>Visit Details & Finalization</h2>
            <div className="recep-reg-grid">
              <div className="recep-reg-field full">
                <label>Select Visit Type *</label>
                <select required value={form.visitType} onChange={(e) => update("visitType", e.target.value)}>
                  <option value="">Select</option>
                  <option value="opd">OPD Consultation</option>
                  <option value="therapy">Therapy Session</option>
                  <option value="emergency">Emergency Case</option>
                  <option value="admission">IPD Admission</option>
                </select>
              </div>

              {(form.visitType === "opd" || form.visitType === "therapy") && (
                <>
                  <div className="recep-reg-field">
                    <label>Select Doctor *</label>
                    <select required value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)}>
                      <option value="">Choose Doctor</option>
                      {doctors.map(d => (
                        <option key={d._id} value={d._id}>{d.name} ({d.specialization || d.department})</option>
                      ))}
                    </select>
                  </div>
                  <div className="recep-reg-field">
                    <label>Appointment Date *</label>
                    <input
                      type="date"
                      required
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                    />
                  </div>
                  <div className="recep-reg-field">
                    <label>Time Slot *</label>
                    <select required value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)}>
                      <option value="">Select Time</option>
                      {['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'].map(slot => (
                        <option
                          key={slot}
                          value={slot}
                          disabled={bookedSlots.includes(slot)}
                          style={bookedSlots.includes(slot) ? { color: '#cbd5e1', textDecoration: 'line-through' } : {}}
                        >
                          {slot} {bookedSlots.includes(slot) ? '(Unavailable)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="recep-reg-field full">
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 1rem', color: '#0f172a' }}>Standard Registration Fees</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Consultation Fee</span>
                    <span style={{ fontWeight: 600 }}>₹{systemConfig?.consultation_fee || 500}.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Case Paper Fee (Validity: 1 Year)</span>
                    <span style={{ fontWeight: 600 }}>₹100.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #fff', fontSize: '1.1rem', fontWeight: 700, color: '#0d9488' }}>
                    <span>Total Amount to Collect</span>
                    <span>₹{(parseInt(systemConfig?.consultation_fee || 500)) + 100}.00</span>
                  </div>
                </div>
              </div>
              <div className="recep-reg-field full">
                <label className="recep-reg-check">
                  <input type="checkbox" required />
                  Confirm all details are correct and patient/guardian is ready to proceed.
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 – Final Case Paper Output */}
        {step === 4 && (
          <div className="recep-reg-step-content recep-reg-summary no-print">
            <h2 style={{ color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
              <FiCheckCircle /> Registration Successful
            </h2>

            <div className="case-paper-preview-wrapper" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              {/* Real Case Paper Design */}
              <div id="swastik-case-paper" className="swastik-case-paper">
                <div className="case-paper-header">
                  <img src={logo} alt="Swastik Hospital" className="case-paper-logo" />
                  <div className="case-paper-hospital-info">
                    <h1>SWASTIK HOSPITAL</h1>
                    <p>Psychiatric Care & Rehabilitation Center</p>
                    <span className="case-paper-address">Kolhapur, Maharashtra | Contact: +91 98765 43210</span>
                  </div>
                </div>

                <div className="case-paper-body">
                  <div className="case-paper-section-title">PATIENT INFORMATION</div>
                  <div className="case-paper-grid">
                    <div className="case-item"><strong>Patient Name:</strong> {generatedPaper?.fullName}</div>
                    <div className="case-item"><strong>UHID:</strong> {generatedPaper?.uhid}</div>
                    <div className="case-item"><strong>Age/Gender:</strong> {age} / {form.gender}</div>
                    <div className="case-item"><strong>Contact:</strong> {form.contact}</div>
                    <div className="case-item full"><strong>Address:</strong> {form.address}</div>
                  </div>

                  <div className="case-paper-section-title">VISIT DETAILS</div>
                  <div className="case-paper-grid">
                    <div className="case-item"><strong>Case Number:</strong> {generatedPaper?.caseNumber}</div>
                    <div className="case-item"><strong>Visit ID:</strong> {generatedPaper?.visitId}</div>
                    <div className="case-item"><strong>Visit Type:</strong> {form.visitType?.toUpperCase()}</div>
                    <div className="case-item"><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                  </div>

                  <div className="case-paper-section-title">GUARDIAN INFO</div>
                  <div className="case-paper-grid">
                    <div className="case-item"><strong>Guardian:</strong> {form.guardianName}</div>
                    <div className="case-item"><strong>Relation:</strong> {form.guardianRelation}</div>
                  </div>

                  <div className="case-paper-footer">
                    <div className="case-notes-area">
                      <strong>Clinical Notes / Assessment:</strong>
                      <div className="notes-line"></div>
                      <div className="notes-line"></div>
                      <div className="notes-line"></div>
                    </div>
                    <div className="case-signature">
                      <div className="sig-line"></div>
                      <p>Medical Officer Signature</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="case-paper-actions no-print" style={{ minWidth: '300px' }}>
                <h3 style={{ marginBottom: '1rem' }}>Actions</h3>
                <button type="button" className="recep-btn recep-btn-primary" onClick={handlePrint} style={{ width: '100%', marginBottom: '1rem' }}>
                  🖨 Print Case Paper
                </button>
                <button type="button" className="recep-btn recep-btn-secondary" onClick={() => window.print()} style={{ width: '100%', marginBottom: '2rem' }}>
                  📄 Download PDF
                </button>

                <h3 style={{ marginBottom: '1rem' }}>Billing Summary</h3>
                <BillingReceipt invoice={generatedInvoice} />
              </div>
            </div>

            <div style={{ marginTop: '3rem', borderTop: '1px solid #f1f5f9', paddingTop: '2rem' }} className="no-print">
              <button type="button" className="recep-btn recep-btn-secondary" onClick={() => navigate("/receptionist")}>
                Go to Dashboard
              </button>
              <button type="button" className="recep-btn recep-btn-primary" style={{ marginLeft: '1rem' }} onClick={handleReset}>
                Register Another Patient
              </button>
            </div>
          </div>
        )}

        {step < 4 && !generatedPaper && (
          <div className="recep-reg-actions">
            {step > 1 && (
              <button type="button" className="recep-btn recep-btn-secondary" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
            <button type="submit" className="recep-btn recep-btn-primary">
              {step === 3 ? "Finalize & Submit" : "Next Step"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default PatientRegistration;
