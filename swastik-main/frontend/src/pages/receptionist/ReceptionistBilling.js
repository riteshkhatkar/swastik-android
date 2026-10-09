import React, { useState, useEffect } from "react";
import { FiCreditCard, FiSearch, FiPlus, FiFileText, FiPrinter, FiUser, FiXCircle } from 'react-icons/fi';
import { STORAGE_KEYS, getInvoices, saveInvoice, HOSPITAL_PRICING, generateInvoiceID } from "./receptionistData";
import BillingReceipt from "./BillingReceipt";
import RazorpayModal from "../billing/views/RazorpayModal";
import swastikLogo from "../../assets/swasstiklogo.png";
import orelseLogo from "../../assets/orelse.png";
import "./ReceptionistDashboard.css";

export default function ReceptionistBilling() {
  const [searchQuery, setSearchQuery] = useState("");
  const [patient, setPatient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [showInvoiceCreator, setShowInvoiceCreator] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [activeCategory, setActiveCategory] = useState("CONSULTATION");

  // Razorpay Modal State
  const [razorpayOpen, setRazorpayOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(null);

  useEffect(() => {
    refreshInvoices();
  }, []);

  const refreshInvoices = async () => {
    try {
      const { api } = await import("../../api/service");
      const all = await api.getBills();
      // Map backend 'bills' to UI 'invoices' format if necessary
      const mapped = (all || []).map(b => ({
        ...b,
        id: b.bill_id || b._id,
        date: b.created_at,
        totalAmount: b.amount,
        status: b.status
      }));
      setInvoices(mapped);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setPatient(null);
    setInvoices([]);
    setViewingInvoice(null);
    setShowInvoiceCreator(false);

    try {
      const { api } = await import("../../api/service");
      // Search by UHID first
      const found = await api.getPatientByUhid(searchQuery.trim());

      if (found) {
        setPatient(found);
        // Fetch specific bills for this patient
        const bills = await api.getBillsByPatient(found.uhid);
        const mapped = (bills || []).map(b => ({
          ...b,
          id: b.bill_id || b._id,
          date: b.created_at,
          totalAmount: b.amount || b.total,
          status: b.status
        }));
        setInvoices(mapped);
      } else {
        alert("Patient record not found. Please verify the UHID.");
      }
    } catch (err) {
      console.error("Search failed:", err);
      alert("Search failed: " + err.message);
    }
  };

  const toggleItem = (itemKey, description, amount) => {
    if (selectedItems.find(i => i.key === itemKey)) {
      setSelectedItems(selectedItems.filter(i => i.key !== itemKey));
    } else {
      setSelectedItems([...selectedItems, { key: itemKey, description, amount }]);
    }
  };

  const createInvoice = async () => {
    if (!patient || selectedItems.length === 0) return;

    const subtotal = selectedItems.reduce((sum, i) => sum + i.amount, 0);
    const newBill = {
      uhid: patient.uhid,
      patient_id: patient._id || patient.id,
      subtotal: subtotal,
      total: subtotal,
      items: selectedItems.map(i => ({ description: i.description, amount: i.amount })),
      status: "unpaid",
      created_by: "Receptionist"
    };

    try {
      const { api } = await import("../../api/service");
      const saved = await api.createBill(newBill);
      refreshInvoices();
      setViewingInvoice(saved);
      setShowInvoiceCreator(false);
      setSelectedItems([]);
      alert("Bill generated successfully.");
    } catch (err) {
      alert("Billing Error: " + err.message);
    }
  };

  const handleCollectPayment = async (inv) => {
    if (!window.confirm(`Collect ₹${inv.totalAmount || inv.total} in cash for Invoice ${inv.invoice_number || inv.id}?`)) return;

    try {
      const { api } = await import("../../api/service");
      const updatedBill = await api.addBillPayment(inv._id || inv.id, {
        amount: inv.totalAmount || inv.total,
        method: "Cash",
        transaction_reference: "RECEPTION-CASH",
        created_by: "Receptionist"
      });
      alert("Payment recorded successfully.");
      await refreshInvoices();
      // Update the viewing receipt instantly if it was the one being viewed
      if (viewingInvoice && (viewingInvoice.id === inv.id || viewingInvoice._id === inv._id)) {
        setViewingInvoice({
          ...updatedBill,
          id: updatedBill.bill_id || updatedBill._id,
          totalAmount: updatedBill.amount || updatedBill.total
        });
      }
    } catch (err) {
      alert("Payment Error: " + err.message);
    }
  };

  const handleOnlinePayment = (inv) => {
    setPayingInvoice(inv);
    setRazorpayOpen(true);
  };

  const onRazorpaySuccess = async (amount, options) => {
    try {
      const { api } = await import("../../api/service");
      await api.addBillPayment(payingInvoice._id || payingInvoice.id, {
        amount: amount,
        method: options.method || "Online",
        transaction_reference: options.transactionReference || "RZP-MANUAL",
        created_by: "Receptionist"
      });
      await refreshInvoices();
      return { success: true };
    } catch (err) {
      alert("Payment Verification Error: " + err.message);
      return { success: false };
    }
  };

  const patientInvoices = invoices; // Already filtered by handleSearch

  const totalOutstanding = patientInvoices.filter(i => (i.status || "").toLowerCase() !== "paid").reduce((sum, i) => sum + (i.totalAmount || i.total || 0), 0);
  const lastPayment = patientInvoices.filter(i => (i.status || "").toLowerCase() === "paid").sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))[0];

  const getStatusStyle = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "paid") return { background: '#dcfce7', color: '#166534' };
    if (s === "partial") return { background: '#fef3c7', color: '#92400e' };
    return { background: '#fee2e2', color: '#991b1b' };
  };

  // Categorize services
  const categories = {
    "CONSULTATION": ["REGISTRATION", "CASE_PAPER", "OPD_CONSULTATION", "SPECIALIST_CONSULTATION", "EMERGENCY_VISIT"],
    "WARDS/IPD": ["IPD_GENERAL_BED", "IPD_PRIVATE_ROOM", "IPD_OBSERVATION", "ICU_CHARGES"],
    "LABORATORY": ["BLOOD_TEST_CBC", "KIDNEY_PROFILE", "LIVER_FUNCTION_TEST", "URINE_ANALYSIS", "COVID_RT_PCR"],
    "RADIOLOGY": ["X_RAY_CHEST", "ULTRASOUND_ABDOMEN", "MRI_BRAIN", "CT_SCAN_WHOLE_BODY"],
    "PHARMACY": ["MEDICATION_PACKAGE_BASIC", "SURGICAL_CONSUMABLES", "IV_FLUIDS_SET"],
    "PROCEDURES": ["MINOR_STITCHING", "DRESSING_CHARGES", "PHYSIOTHERAPY_SESSION"]
  };

  return (
    <div className="recep-dash" style={{ display: 'flex', flexDirection: 'column', minHeight: '90vh' }}>

      {/* Official Top Branding */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '2px solid #1a5f5c' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src={swastikLogo} alt="Logo" style={{ height: '50px', filter: 'brightness(0.95) saturate(1.3) hue-rotate(-15deg) sepia(0.15)' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1a5f5c', letterSpacing: '1px' }}>SWASTIK HOSPITAL</h2>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>BILLING & REVENUE MANAGEMENT</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Operator: <strong>Receptionist</strong></p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Real-time Sync: <span style={{ color: '#059669' }}>Connected</span></p>
        </div>
      </div>

      <header style={{ marginBottom: '2rem' }}>
        <h1 className="recep-dash-title" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Hospital Billing Center</h1>
        <p className="recep-dash-subtitle">Manage patient accounts, medical services, and official receipts.</p>
      </header>

      {/* Search Header */}
      <section className="recep-dash-section">
        <div className="recep-table-wrap" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
          <div className="recep-reg-field" style={{ flex: 1, maxWidth: '400px' }}>
            <label style={{ fontWeight: 700, color: '#1a5f5c' }}>Patient Registry Lookup</label>
            <div style={{ position: 'relative' }}>
              <FiUser style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#1a5f5c' }} />
              <input
                type="text"
                placeholder="Enter UHID (e.g. UHID-2026-123456)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.75rem', width: '100%', borderColor: '#cbd5e1' }}
              />
            </div>
          </div>
          <button className="recep-btn recep-btn-primary" onClick={handleSearch} style={{ height: '46px', padding: '0 2rem', background: '#1a5f5c' }}>
            <FiSearch style={{ marginRight: '8px' }} /> Locate Record
          </button>
        </div>
      </section>

      {patient ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '2.5rem', marginTop: '2.5rem' }}>
          {/* Left Column: Financial Profile & Invoices */}
          <div>
            {/* Financial Profile Box */}
            <div style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '1.5rem',
              marginBottom: '2rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              gap: '2rem',
              alignItems: 'center'
            }}>
              <div style={{ borderRight: '1px solid #f1f5f9', paddingRight: '2rem' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>{patient.name || patient.fullName}</h3>
                <code style={{ color: '#1a5f5c', fontWeight: 800 }}>{patient.uhid}</code>
              </div>
              <div style={{ flex: 1, display: 'flex', gap: '3rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Total Outstanding</label>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: totalOutstanding > 0 ? '#e11d48' : '#059669' }}>
                    ₹{totalOutstanding.toLocaleString()}
                  </span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Last Receipt</label>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
                    {lastPayment ? `₹${(lastPayment.totalAmount || lastPayment.total || 0).toLocaleString()} (${new Date(lastPayment.date || lastPayment.created_at).toLocaleDateString()})` : "No payments yet"}
                  </span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Visit Status</label>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a5f5c' }}>{patient.visit_type || "Standard"}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="recep-dash-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FiFileText color="#1a5f5c" /> Patient Financial Ledger
              </h2>
              <button className="recep-btn recep-btn-primary" onClick={() => setShowInvoiceCreator(!showInvoiceCreator)} style={{ background: showInvoiceCreator ? '#e11d48' : '#1a5f5c' }}>
                {showInvoiceCreator ? <><FiXCircle style={{ marginRight: '8px' }} /> Cancel Entry</> : <><FiPlus style={{ marginRight: '8px' }} /> Add Service</>}
              </button>
            </div>

            {showInvoiceCreator && (
              <div className="recep-table-wrap" style={{ padding: '1.5rem', marginBottom: '2.5rem', border: '2px solid #1a5f5c', background: '#fff' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1a5f5c', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>Medical Service Selection</h3>

                {/* Category Tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {Object.keys(categories).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid #1a5f5c',
                        background: activeCategory === cat ? '#1a5f5c' : 'white',
                        color: activeCategory === cat ? 'white' : '#1a5f5c',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {categories[activeCategory].map(key => {
                    const price = HOSPITAL_PRICING[key];
                    return (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <input
                          type="checkbox"
                          checked={selectedItems.some(i => i.key === key)}
                          onChange={() => toggleItem(key, key.replace(/_/g, ' '), price)}
                          style={{ accentColor: '#1a5f5c' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.2 }}>{key.replace(/_/g, ' ')}</div>
                          <div style={{ color: '#1a5f5c', fontSize: '0.9rem', fontWeight: 800 }}>₹{price.toLocaleString()}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '1.25rem', borderRadius: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Selected Items: {selectedItems.length}</span>
                    <h3 style={{ margin: 0, color: '#1a5f5c', fontSize: '1.5rem' }}>Total: ₹{selectedItems.reduce((s, i) => s + i.amount, 0).toLocaleString()}</h3>
                  </div>
                  <button className="recep-btn recep-btn-primary" onClick={createInvoice} disabled={selectedItems.length === 0} style={{ padding: '0.75rem 2.5rem', background: '#1a5f5c' }}>
                    Generate Official Bill
                  </button>
                </div>
              </div>
            )}

            <div className="recep-table-wrap">
              <table className="recep-table">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ color: '#1a5f5c' }}>Invoice ID</th>
                    <th style={{ color: '#1a5f5c' }}>Date</th>
                    <th style={{ color: '#1a5f5c' }}>Amount</th>
                    <th style={{ color: '#1a5f5c' }}>Status</th>
                    <th style={{ textAlign: 'right', color: '#1a5f5c' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patientInvoices.length === 0 ? (
                    <tr><td colSpan={5} className="recep-table-empty">No billing records found for this patient.</td></tr>
                  ) : (
                    patientInvoices.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at)).reverse().map(inv => (
                      <tr key={inv.id || inv._id} style={{ cursor: 'pointer' }} onClick={() => setViewingInvoice(inv)}>
                        <td><code style={{ background: '#f1f5f9', color: '#1a5f5c', padding: '2px 6px', borderRadius: '4px' }}>{inv.invoice_number || inv.id}</code></td>
                        <td>{new Date(inv.date || inv.created_at).toLocaleDateString()}</td>
                        <td><strong>₹{(inv.totalAmount || inv.total || 0).toLocaleString()}</strong></td>
                        <td><span className="recep-status" style={{ ...getStatusStyle(inv.status), fontWeight: 700, textTransform: 'uppercase', padding: '4px 12px', borderRadius: '12px' }}>{inv.status || "unpaid"}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            {(inv.status || "").toLowerCase() !== "paid" && (
                              <button
                                className="recep-btn recep-btn-small"
                                onClick={(e) => { e.stopPropagation(); handleCollectPayment(inv); }}
                                style={{ background: '#059669', color: '#fff', border: 'none' }}
                              >
                                <FiCreditCard /> Collect Cash
                              </button>
                            )}
                            {(inv.status || "").toLowerCase() !== "paid" && (
                              <button
                                className="recep-btn recep-btn-small"
                                onClick={(e) => { e.stopPropagation(); handleOnlinePayment(inv); }}
                                style={{ background: '#3b82f6', color: '#fff', border: 'none' }}
                              >
                                <FiCreditCard /> Online Pay
                              </button>
                            )}
                            <button className="recep-btn recep-btn-small" style={{ borderColor: '#1a5f5c', color: '#1a5f5c' }} onClick={(e) => { e.stopPropagation(); setViewingInvoice(inv); }}><FiPrinter /> View</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Receipt View */}
          <div>
            <h2 className="recep-dash-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FiPrinter color="#1a5f5c" /> Receipt Preview
            </h2>
            {viewingInvoice ? (
              <BillingReceipt invoice={viewingInvoice} />
            ) : (
              <div style={{ textAlign: 'center', padding: '5rem 2rem', background: '#f8fafc', borderRadius: '24px', border: '2px dashed #cbd5e1' }}>
                <FiFileText style={{ fontSize: '3.5rem', color: '#cbd5e1', marginBottom: '1.5rem' }} />
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Select an invoice record to populate the official payment receipt for printing.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '8rem 2rem', background: '#fff', borderRadius: '32px', marginTop: '2.5rem', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <FiCreditCard style={{ fontSize: '5rem', color: '#1a5f5c', opacity: 0.1, marginBottom: '2rem' }} />
          <h2 style={{ color: '#1a5f5c', fontWeight: 800 }}>Hospital Financial Management</h2>
          <p style={{ color: '#64748b', maxWidth: '500px', margin: '1rem auto' }}>
            Securely manage patient service charges, pharmacy dues, and lab test invoices. Locate a patient by their official UHID to begin.
          </p>
        </div>
      )}

      {/* Official Footer */}
      <footer style={{ marginTop: 'auto', paddingTop: '4rem', paddingBottom: '2rem', textAlign: 'center' }}>
        <img src={orelseLogo} alt="or else" style={{ height: '30px', marginBottom: '10px' }} />
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>powered by possibilities</p>
        <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>SWASTIK HOSPITAL ADMINISTRATION PORTAL v2.0</p>
      </footer>

      <RazorpayModal
        open={razorpayOpen}
        onClose={() => {
          setRazorpayOpen(false);
          setPayingInvoice(null);
        }}
        billAmount={payingInvoice ? (payingInvoice.totalAmount || payingInvoice.total) : 0}
        patientName={patient ? (patient.name || patient.fullName) : ""}
        billId={payingInvoice ? (payingInvoice.bill_id || payingInvoice._id || payingInvoice.id) : null}
        onPaymentSuccess={onRazorpaySuccess}
        onVerifySuccess={async () => {
          await refreshInvoices();
          alert("Online payment verified and recorded.");
        }}
      />
    </div>
  );
}
