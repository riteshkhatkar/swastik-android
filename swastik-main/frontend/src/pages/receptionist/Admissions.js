import React, { useState, useEffect, useRef } from "react";
import { FiActivity, FiKey, FiMap, FiCreditCard, FiSearch, FiCheckCircle, FiUser, FiArrowRight, FiInfo, FiFileText, FiShield, FiLogOut, FiPrinter, FiUpload, FiX } from 'react-icons/fi';
import swastikLogo from "../../assets/swastiklogo.png";
import "./ReceptionistDashboard.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const WARD_TYPES = ["General", "Private", "ICU"];

export default function Admissions() {
  const [rooms, setRooms] = useState([]);
  const [selectedWard, setSelectedWard] = useState("");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [consentSigned, setConsentSigned] = useState(false);
  const [deposit, setDeposit] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generatedSlip, setGeneratedSlip] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  // New upload-based consent state
  const [consentFile, setConsentFile] = useState(null);       // File object
  const [consentPreview, setConsentPreview] = useState(null); // object URL or null
  const [consentFileUrl, setConsentFileUrl] = useState("");   // URL returned by backend
  const [uploadingConsent, setUploadingConsent] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [consentPrintStep, setConsentPrintStep] = useState("print"); // "print" | "upload"
  const consentFileInputRef = useRef(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { api } = await import("../../api/service");
        const [docs, config] = await Promise.all([
          api.getDoctors(),
          api.getSystemConfig().catch(() => ({ admission_deposit: 5000 }))
        ]);
        setDoctors(docs || []);
        if (config?.admission_deposit) setDeposit(config.admission_deposit);
      } catch (err) {
        console.error("Error fetching initial data:", err);
      }
    };
    fetchInitialData();
  }, []);

  const fetchRooms = async (ward = "") => {
    try {
      const { api } = await import("../../api/service");
      const data = await api.getRooms({ room_type: ward, status: "Available" });
      setRooms(data || []);
    } catch (err) {
      console.error("Error fetching rooms:", err);
    }
  };

  const fetchRecentPatients = async () => {
    try {
      const { api } = await import("../../api/service");
      const patients = await api.getPatients(0, 5);
      setRecentPatients(patients || []);
    } catch (err) {
      console.error("Error fetching recent patients:", err);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const { api } = await import("../../api/service");
      const patients = await api.getPatients();
      const filtered = patients.filter(p =>
        (p.uhid || "").toLowerCase().includes(query.toLowerCase()) ||
        (p.name || "").toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 5));
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const downloadAdmissionSlip = (data) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(13, 148, 136); // Teal-600
    doc.text("SWASTIK HOSPITAL", 105, 15, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Admission Confirmation Slip", 105, 22, { align: "center" });
    doc.line(20, 25, 190, 25);

    autoTable(doc, {
      startY: 30,
      body: [
        ["Patient Name", data.patient_name],
        ["Patient ID", data.uhid],
        ["Age / Gender", `${data.age} / ${data.gender}`],
        ["Admission Date", new Date().toLocaleString()],
        ["Primary Doctor", `Dr. ${data.doctor_name}`],
        ["Room Assigned", `Room ${data.room_number} (${data.ward} Ward)`],
        ["Initial Diagnosis", data.diagnosis],
        ["Deposit Paid", `INR ${data.deposit}`],
      ],
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
    });

    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("This is an electronically generated admission slip.", 105, 120, { align: "center" });
    doc.text("Swastik Hospital, Kolhapur, Maharashtra.", 105, 125, { align: "center" });

    doc.save(`Admission_Slip_${data.uhid}.pdf`);
  };

  const finalizeAdmission = async () => {
    if (!selectedPatient || !selectedRoom || !selectedDoctor || !diagnosis || !consentSigned) {
      alert("Please complete all required fields and ensure the signed consent form has been uploaded.");
      return;
    }
    setLoading(true);
    try {
      const { api } = await import("../../api/service");
      const doctor = doctors.find(d => d._id === selectedDoctor);
      const payload = {
        uhid: selectedPatient.uhid,
        patient_name: selectedPatient.name,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        contact_number: selectedPatient.phone,
        address: selectedPatient.address,
        diagnosis: diagnosis,
        doctor_id: selectedDoctor,
        doctor_name: doctor?.name,
        room_id: selectedRoom._id,
        room_number: selectedRoom.room_number,
        ward: selectedWard,
        insurance_provider: insuranceProvider,
        policy_number: policyNumber,
        consent_signed: consentSigned,
        deposit: parseFloat(deposit),
      };
      await api.admitPatient(payload);
      setGeneratedSlip(payload);
      setSuccess(true);
      resetForm();
      fetchRooms(selectedWard);
    } catch (err) {
      alert("Admission failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setSelectedRoom(null);
    setSelectedDoctor("");
    setDiagnosis("");
    setInsuranceProvider("");
    setPolicyNumber("");
    setConsentSigned(false);
    setConsentFile(null);
    setConsentPreview(null);
    setConsentFileUrl("");
    setUploadError("");
    setConsentPrintStep("print");
  };

  useEffect(() => {
    fetchRooms(selectedWard);
    fetchRecentPatients();
  }, [selectedWard]);

  return (
    <div className="recep-dash">
      <h1 className="recep-dash-title">Patient Admission</h1>
      <p className="recep-dash-subtitle">Complete the formal admission process for inpatient care.</p>

      {success && (
        <div style={{ background: '#ecfdf5', color: '#065f46', padding: '1.25rem', borderRadius: '15px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #10b981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
            <FiCheckCircle /> Patient Admitted Successfully! Room Allocated.
          </div>
          <button className="recep-btn recep-btn-primary" onClick={() => downloadAdmissionSlip(generatedSlip)}>
            <FiActivity /> Download Admission Slip (PDF)
          </button>
        </div>
      )}

      {/* 1. Patient Selection */}
      <section className="recep-dash-section">
        <h2 className="recep-dash-section-title">1. Select Patient</h2>
        <div className="recep-table-wrap" style={{ padding: '1.5rem' }}>
          {!selectedPatient ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                  <FiSearch style={{ color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Search Patient Name or UHID..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '1.1rem' }}
                  />
                </div>
                {searchResults.length > 0 && searchQuery.length >= 2 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FiSearch style={{ fontSize: '1rem' }} /> Search Results
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                      {searchResults.map(p => (
                        <div
                          key={p.uhid}
                          onClick={() => setSelectedPatient(p)}
                          style={{
                            padding: '1rem',
                            background: 'white',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.background = '#f0fdfa'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
                        >
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>UHID: {p.uhid}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {searchResults.length === 0 && searchQuery.length >= 2 && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef2f2', color: '#ef4444', borderRadius: '12px', textAlign: 'center' }}>
                    No patients found matching "{searchQuery}".
                  </div>
                )}
                {searchResults.length === 0 && searchQuery.length < 2 && recentPatients.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FiActivity style={{ fontSize: '1rem' }} /> Recently Registered Patients
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                      {recentPatients.map(p => (
                        <div
                          key={p.uhid}
                          onClick={() => setSelectedPatient(p)}
                          style={{
                            padding: '1rem',
                            background: 'white',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.background = '#f0fdfa'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
                        >
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>UHID: {p.uhid}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdfa', padding: '1.25rem', borderRadius: '15px', border: '1px solid #5eead4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <FiUser style={{ fontSize: '2rem', color: '#0d9488' }} />
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedPatient.name}</div>
                  <div style={{ color: '#64748b' }}>{selectedPatient.uhid} | {selectedPatient.gender} | {selectedPatient.age} years</div>
                </div>
              </div>
              <button className="recep-btn" onClick={() => resetForm()} style={{ background: 'white' }}>Change Patient</button>
            </div>
          )}
        </div>
      </section>

      {selectedPatient && (
        <>
          {/* 2. Clinical Info */}
          <section className="recep-dash-section">
            <h2 className="recep-dash-section-title">2. Clinical Details & Assignment</h2>
            <div className="recep-table-wrap" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div className="recep-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiUser style={{ color: '#0d9488' }} /> Assigned Doctor <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} style={{ padding: '0.875rem', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', fontSize: '1rem' }}>
                  <option value="">Select Primary Consultant</option>
                  {doctors.map(d => <option key={d._id} value={d._id}>{d.name} ({d.specialization})</option>)}
                </select>
              </div>
              <div className="recep-form-group">
                <label>Admission Diagnosis <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Acute Gastroenteritis" style={{ padding: '0.875rem', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', fontSize: '0.95rem' }} />
              </div>
            </div>
          </section>

          {/* 3. Room Management */}
          <section className="recep-dash-section">
            <h2 className="recep-dash-section-title">3. Ward & Room Assignment</h2>
            <div className="recep-table-wrap" style={{ padding: '2rem' }}>
              <div className="recep-ward-tabs" style={{ marginBottom: '1.5rem' }}>
                {WARD_TYPES.map(ward => (
                  <button 
                    key={ward} 
                    onClick={() => setSelectedWard(ward)} 
                    className={`recep-ward-tab ${selectedWard === ward ? 'active' : ''}`}
                  >
                    {ward} Ward
                  </button>
                ))}
              </div>
              <div className="recep-form-group" style={{ marginTop: '1rem' }}>
                <label>Select Room / Bed <span style={{ color: '#ef4444' }}>*</span></label>
                <select 
                  value={selectedRoom?._id || ""} 
                  onChange={(e) => {
                    const room = rooms.find(r => r._id === e.target.value);
                    setSelectedRoom(room);
                  }}
                  style={{ padding: '0.875rem', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', fontSize: '0.95rem' }}
                >
                  <option value="">-- Choose available room in {selectedWard} Ward --</option>
                  {rooms.map(room => (
                    <option key={room._id} value={room._id}>
                      {room.room_number} (₹{room.price_per_day}/day)
                    </option>
                  ))}
                </select>
                {rooms.length === 0 && <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>No {selectedWard} rooms currently available.</p>}
              </div>
            </div>
          </section>

          {/* 4. Insurance & Policy */}
          <section className="recep-dash-section">
            <h2 className="recep-dash-section-title">4. Insurance & Billing</h2>
            <div className="recep-table-wrap" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', alignItems: 'end' }}>
              <div className="recep-form-group">
                <label>Insurance Provider</label>
                <input type="text" value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} placeholder="e.g. Star Health" style={{ padding: '0.875rem', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%' }} />
              </div>
              <div className="recep-form-group">
                <label>Policy Number</label>
                <input type="text" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} placeholder="PN-XXXXXX" style={{ padding: '0.875rem', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%' }} />
              </div>
              <div className="recep-form-group">
                <label>Initial Deposit (₹)</label>
                <input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} style={{ padding: '0.875rem', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', fontWeight: 600, color: '#475569', fontSize: '0.95rem' }} />
              </div>
            </div>
          </section>

          {/* 5. Consent & Finalize */}
          <section className="recep-dash-section">
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '2rem', borderRadius: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <button
                    onClick={() => { setShowConsentModal(true); setConsentPrintStep("print"); }}
                    style={{
                      background: consentSigned ? '#10b981' : '#f59e0b',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    <FiFileText /> {consentSigned ? "✅ Signed Consent Uploaded" : "Review & Sign Admission Consent"}
                  </button>
                  {consentSigned && (
                    <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <FiCheckCircle /> Signed copy on file
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, color: '#b45309', fontSize: '0.9rem' }}>
                  A formally signed physical consent form (scanned copy) is required for inpatient admission per NABH standards.
                </p>
              </div>
              <button disabled={loading || !consentSigned} onClick={finalizeAdmission} className="recep-btn" style={{ background: '#d97706', color: 'white', padding: '1rem 2rem', fontSize: '1.1rem', fontWeight: 700, opacity: (loading || !consentSigned) ? 0.6 : 1 }}>
                {loading ? <FiActivity className="spin" /> : <FiCheckCircle />} Finalize Admission
              </button>
            </div>
          </section>

          {/* Consent Modal */}
          {showConsentModal && (
            <>
              {/* Print-only stylesheet injected into head */}
              <style>{`
                @media print {
                  body > *:not(#consent-print-root) { display: none !important; }
                  #consent-print-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
                  .recep-modal-overlay, .recep-modal-header, .recep-modal-footer,
                  .no-print { display: none !important; }
                  #consent-printable-body { max-height: none !important; overflow: visible !important; }
                }
              `}</style>

              <div className="recep-modal-overlay">
                <div className="recep-modal" style={{ maxWidth: '860px', display: 'flex', flexDirection: 'column' }}>

                  {/* Modal Header */}
                  <div className="recep-modal-header no-print" style={{ background: '#0d9488', color: 'white' }}>
                    <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FiShield /> Admission &amp; Treatment Consent Form
                    </h3>
                    <button onClick={() => setShowConsentModal(false)} style={{ color: 'white', fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
                  </div>

                  {/* Step tabs (no-print) */}
                  <div className="no-print" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    {[{ key: 'print', label: '① Review & Print' }, { key: 'upload', label: '② Upload Signed Copy' }].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setConsentPrintStep(tab.key)}
                        style={{
                          flex: 1,
                          padding: '0.85rem',
                          border: 'none',
                          borderBottom: consentPrintStep === tab.key ? '3px solid #0d9488' : '3px solid transparent',
                          background: 'transparent',
                          fontWeight: consentPrintStep === tab.key ? 700 : 500,
                          color: consentPrintStep === tab.key ? '#0d9488' : '#64748b',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          transition: 'all 0.15s',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* ======= STEP 1: Review & Print ======= */}
                  {consentPrintStep === 'print' && (
                    <>
                      <div id="consent-printable-body" className="recep-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', fontSize: '0.9rem', lineHeight: '1.7', color: '#1e293b', padding: '2rem' }}>

                        {/* Hospital Header */}
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #0d9488', paddingBottom: '1rem' }}>
                          <img src={swastikLogo} alt="Swastik Hospital Logo" style={{ height: '60px', width: 'auto', marginBottom: '0.5rem' }} />
                          <h2 style={{ margin: 0, color: '#134e4a', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '1px' }}>SWASTIK HOSPITAL</h2>
                          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>A Unit of Mental Health &amp; De-Addiction Services — Kolhapur, Maharashtra</p>
                          <h3 style={{ margin: '1rem 0 0', fontSize: '1rem', letterSpacing: '2px', color: '#0d9488', textTransform: 'uppercase' }}>Admission &amp; Treatment Consent Form</h3>
                        </div>

                        {/* Patient Details Block */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#f0fdfa', padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.75rem', border: '1px solid #99f6e4', fontSize: '0.88rem' }}>
                          <div><strong>Patient Name:</strong> {selectedPatient?.name}</div>
                          <div><strong>UHID:</strong> {selectedPatient?.uhid}</div>
                          <div><strong>Date of Admission:</strong> {new Date().toLocaleDateString('en-IN')}</div>
                          <div><strong>Proposed Ward:</strong> {selectedWard} Ward</div>
                          <div><strong>Attending Psychiatrist:</strong> Dr. {doctors.find(d => d._id === selectedDoctor)?.name || '______'}</div>
                          <div><strong>Initial Deposit:</strong> ₹{deposit}</div>
                        </div>

                        {/* Section 1 */}
                        <h4 style={{ color: '#134e4a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '1.5rem' }}>1. AUTHORIZATION FOR PSYCHIATRIC EVALUATION &amp; TREATMENT</h4>
                        <p>I / We (the patient / legally authorized representative) hereby voluntarily authorize the medical, nursing, and paramedical staff of <strong>Swastik Hospital</strong> to conduct such psychiatric evaluations, diagnostic procedures, psychological assessments, and treatments as are deemed clinically necessary by the attending psychiatrist, <strong>Dr. {doctors.find(d => d._id === selectedDoctor)?.name || '______'}</strong>. This authorization includes:</p>
                        <ul style={{ marginLeft: '1.5rem', lineHeight: 2 }}>
                          <li>Psychiatric evaluation and mental status examination (MSE)</li>
                          <li>Administration of psychotropic medications (antipsychotics, mood stabilizers, antidepressants, anxiolytics, and other medications as prescribed)</li>
                          <li>Psychotherapy and behavioral interventions</li>
                          <li>Routine diagnostic investigations including blood tests, urine tests, and imaging</li>
                        </ul>
                        <p>I understand that psychiatry is a medical specialty where individual responses to treatment may vary, and no guarantee of specific outcomes has been made to me.</p>

                        {/* Section 2 */}
                        <h4 style={{ color: '#134e4a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '1.5rem' }}>2. FINANCIAL AGREEMENT &amp; RESPONSIBILITY</h4>
                        <p>I understand that I am financially responsible for all charges incurred during this hospitalization including room rent, professional consultation fees, medication, investigations, nursing care, and any additional services provided. I agree to pay an initial deposit of <strong>₹{deposit}</strong> at the time of admission. I understand that further payments may be requested during the course of admission based on accrued charges, and that discharge will be processed only after full settlement of dues unless otherwise arranged.</p>

                        {/* Section 3 — ECT */}
                        <h4 style={{ color: '#134e4a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '1.5rem' }}>3. CONSENT FOR ELECTROCONVULSIVE THERAPY (ECT)</h4>
                        <p>If the attending psychiatrist recommends <strong>Electroconvulsive Therapy (ECT)</strong> during the course of treatment, I understand that a <strong>separate, detailed ECT-specific informed consent</strong> will be obtained before any ECT procedure is administered. That consent will include a full explanation of the procedure, risks, benefits, alternatives, and the right to withdraw consent at any time. <em>Signing this admission consent does not constitute consent for ECT.</em></p>

                        {/* Section 4 — De-addiction */}
                        <h4 style={{ color: '#134e4a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '1.5rem' }}>4. CONSENT FOR DE-ADDICTION TREATMENT</h4>
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#92400e' }}>
                          ⚠️ <strong>PENDING CLINICAL REVIEW:</strong> Exact treatment modalities offered are being confirmed with hospital clinical staff. The wording below is a placeholder and must be reviewed before this form is used as a binding consent document.
                        </div>
                        <p>I / We consent to the hospital's medically supervised de-addiction treatment program, which may include medically assisted detoxification, pharmacological support as clinically appropriate, counselling and psychotherapy, and relapse prevention planning. I understand that recovery is a process and that outcomes depend on individual clinical factors.</p>

                        {/* Section 5 — Restraint */}
                        <h4 style={{ color: '#134e4a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '1.5rem' }}>5. CONSENT FOR RESTRAINT / SECLUSION PROCEDURES</h4>
                        <p>I understand that in rare emergency situations where there is imminent risk of harm to the patient or others, the treating team may employ <strong>physical restraint</strong> or <strong>therapeutic seclusion</strong> as a temporary safety measure. I understand and agree that:</p>
                        <ul style={{ marginLeft: '1.5rem', lineHeight: 2 }}>
                          <li>Such measures will only be used as a <strong>last resort</strong> after other de-escalation methods have been attempted</li>
                          <li>They will be applied for the <strong>shortest medically necessary duration</strong></li>
                          <li>A doctor's written order and nursing documentation will be maintained for every episode</li>
                          <li>The patient / guardian will be informed and documentation will be made available upon request</li>
                        </ul>

                        {/* Section 6 — Admission Status */}
                        <h4 style={{ color: '#134e4a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '1.5rem' }}>6. ADMISSION STATUS</h4>
                        <p><strong>Voluntary Admission:</strong> I confirm this admission is voluntary. I have been informed of my right to apply for discharge with appropriate notice, subject to the treating psychiatrist's clinical assessment, in accordance with the <strong>Mental Healthcare Act, 2017</strong>.</p>
                        <p><strong>Emergency / Involuntary Provisions:</strong> If admitted under emergency provisions of the Mental Healthcare Act 2017, my rights will be communicated by the treating team. A formal assessment of capacity and compliance with applicable legal requirements will be conducted as required under the Act.</p>

                        {/* Section 7 — Confidentiality */}
                        <h4 style={{ color: '#134e4a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '1.5rem' }}>7. CONFIDENTIALITY OF MENTAL HEALTH RECORDS</h4>
                        <p>I understand that my mental health records are strictly confidential and protected under the Mental Healthcare Act, 2017 and applicable data protection norms. My clinical information will only be shared with members of my treating team, with my insurance provider for claim processing (with my authorization), when required by law, or when clinically necessary to prevent serious and imminent harm to myself or others.</p>

                        {/* Section 8 — Discharge */}
                        <h4 style={{ color: '#134e4a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '1.5rem' }}>8. DISCHARGE POLICY &amp; DAMA</h4>
                        <p>I agree to cooperate with the hospital's discharge process, which will be authorized by the treating psychiatrist based on clinical criteria. I understand that leaving <strong>against medical advice (DAMA/LAMA)</strong> carries risks to my health and recovery, and that in such cases a separate DAMA undertaking must be signed, relieving the hospital of liability for consequences arising from premature discharge.</p>

                        {/* Section 9 — Valuables */}
                        <h4 style={{ color: '#134e4a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '1.5rem' }}>9. PERSONAL VALUABLES</h4>
                        <p>I understand that the hospital is not responsible for loss of or damage to personal valuables including cash, jewellery, mobile phones, or other personal items brought into the hospital premises. I have been advised to send valuables home with a family member.</p>

                        {/* Signature Block — print only */}
                        <div style={{ marginTop: '2.5rem', padding: '1.5rem', border: '1.5px solid #94a3b8', borderRadius: '10px' }}>
                          <p style={{ fontWeight: 700, marginBottom: '1.25rem', color: '#0f172a' }}>DECLARATION &amp; SIGNATURE</p>
                          <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>I / We have read and understood the above consent, have had the opportunity to ask questions, and sign this form voluntarily and with full understanding of its implications.</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            {[['Patient / Guardian Signature', ''], ['Name of Signatory', ''], ['Relationship to Patient', '(if not patient)'], ['Date of Signing', ''], ['Witness (Staff Signature)', ''], ['Witness Name &amp; Designation', '']].map(([label, hint]) => (
                              <div key={label}>
                                <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}><strong>{label}</strong> {hint && <em style={{ color: '#94a3b8' }}>{hint}</em>}</div>
                                <div style={{ borderBottom: '1px solid #475569', minHeight: '32px' }}></div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>{/* end printable body */}

                      {/* Footer — Print button */}
                      <div className="recep-modal-footer no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button className="recep-btn recep-btn-secondary" onClick={() => setShowConsentModal(false)}>Cancel</button>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <button
                            className="recep-btn"
                            style={{ background: '#0d9488', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 700 }}
                            onClick={() => window.print()}
                          >
                            <FiPrinter /> Print Consent Form
                          </button>
                          <button
                            className="recep-btn recep-btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            onClick={() => setConsentPrintStep('upload')}
                          >
                            Next: Upload Signed Copy →
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ======= STEP 2: Upload Signed Copy ======= */}
                  {consentPrintStep === 'upload' && (
                    <>
                      <div className="recep-modal-body" style={{ padding: '2rem', minHeight: '300px' }}>
                        <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#134e4a' }}>
                          <strong>Instructions:</strong> Print the form using the previous step → have the patient or guardian sign the physical copy → scan or photograph it → upload it here. Accepted formats: <strong>JPG, PNG, PDF</strong>.
                        </div>

                        {/* Upload zone */}
                        {!consentFile ? (
                          <div
                            onClick={() => consentFileInputRef.current?.click()}
                            style={{
                              border: '2px dashed #94a3b8',
                              borderRadius: '14px',
                              padding: '3rem',
                              textAlign: 'center',
                              cursor: 'pointer',
                              background: '#f8fafc',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.background = '#f0fdfa'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f8fafc'; }}
                          >
                            <FiUpload size={32} style={{ color: '#0d9488', marginBottom: '0.75rem' }} />
                            <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>Click to select scanned consent file</p>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>JPG, PNG, or PDF · max 10 MB</p>
                          </div>
                        ) : (
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                              {/* Thumbnail */}
                              <div style={{ flexShrink: 0 }}>
                                {consentFile.type === 'application/pdf' ? (
                                  <div style={{ width: '80px', height: '100px', background: '#fee2e2', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#dc2626' }}>
                                    <FiFileText size={28} />
                                    PDF
                                  </div>
                                ) : (
                                  <img
                                    src={consentPreview}
                                    alt="Consent preview"
                                    style={{ width: '80px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                  />
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', wordBreak: 'break-all' }}>{consentFile.name}</p>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>{(consentFile.size / 1024).toFixed(1)} KB · {consentFile.type}</p>
                                {uploadError && <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>❌ {uploadError}</p>}
                              </div>
                              <button
                                onClick={() => { setConsentFile(null); setConsentPreview(null); setUploadError(""); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                                title="Remove file"
                              >
                                <FiX size={18} />
                              </button>
                            </div>
                            <button
                              style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                              onClick={() => consentFileInputRef.current?.click()}
                            >
                              Replace file
                            </button>
                          </div>
                        )}

                        <input
                          ref={consentFileInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            if (f.size > 10 * 1024 * 1024) { setUploadError("File is too large (max 10 MB)"); return; }
                            setConsentFile(f);
                            setUploadError("");
                            if (f.type !== 'application/pdf') {
                              setConsentPreview(URL.createObjectURL(f));
                            } else {
                              setConsentPreview(null);
                            }
                          }}
                        />
                      </div>

                      {/* Footer */}
                      <div className="recep-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button className="recep-btn recep-btn-secondary" onClick={() => setConsentPrintStep('print')}>← Back to Print</button>
                        <button
                          className="recep-btn recep-btn-primary"
                          disabled={!consentFile || uploadingConsent}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (!consentFile || uploadingConsent) ? 0.6 : 1 }}
                          onClick={async () => {
                            if (!consentFile || !selectedPatient) return;
                            setUploadingConsent(true);
                            setUploadError("");
                            try {
                              const { api } = await import("../../api/service");
                              const res = await api.uploadConsentFile(selectedPatient.uhid, consentFile);
                              setConsentFileUrl(res.consent_file_url || "");
                              setConsentSigned(true);
                              setShowConsentModal(false);
                            } catch (err) {
                              setUploadError(err.message || "Upload failed. Please try again.");
                            } finally {
                              setUploadingConsent(false);
                            }
                          }}
                        >
                          {uploadingConsent ? (
                            <><FiActivity className="spin" /> Uploading...</>
                          ) : (
                            <><FiCheckCircle /> Confirm Upload &amp; Mark Consent Complete</>
                          )}
                        </button>
                      </div>
                    </>
                  )}

                </div>{/* end recep-modal */}
              </div>{/* end overlay */}
            </>
          )}
        </>
      )}
    </div>
  );
}
