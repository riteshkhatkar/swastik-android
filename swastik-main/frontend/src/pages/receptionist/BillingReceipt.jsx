import React from "react";
import { FiPrinter, FiDownload, FiCheckCircle } from "react-icons/fi";
import swastikLogo from "../../assets/swasstiklogo.png";
import orelseLogo from "../../assets/orelse.png";

export default function BillingReceipt({ invoice, onPrint }) {
    if (!invoice) return null;

    return (
        <div className="recep-receipt-container" style={{ padding: '2rem', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto' }}>
            <div id="printable-receipt" style={{ border: '1px solid #e2e8f0', padding: '2rem', color: '#1e293b', position: 'relative', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>

                {/* Swastik Official Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <img
                            src={swastikLogo}
                            alt="Swastik Hospital"
                            style={{ height: '60px', width: 'auto', objectFit: 'contain', filter: 'brightness(0.95) saturate(1.3) hue-rotate(-15deg) sepia(0.15)' }}
                        />
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1a5f5c', letterSpacing: '2px', fontWeight: '800' }}>SWASTIK HOSPITAL</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Multi-Speciality Healthcare Center</p>
                </div>

                {/* Receipt Meta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', borderBottom: '2px solid #1a5f5c', paddingBottom: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, color: '#1a5f5c', fontSize: '1.1rem' }}>PAYMENT RECEIPT</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Date: {new Date(invoice.date || invoice.created_at).toLocaleDateString()}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>Invoice: {invoice.invoice_number || invoice.id}</p>
                    </div>
                </div>

                {/* Patient Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '24px', fontSize: '0.9rem', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div>
                        <p style={{ margin: '4px 0' }}><span style={{ color: '#64748b' }}>Patient Name:</span></p>
                        <strong style={{ fontSize: '1.05rem' }}>{invoice.patient_name || invoice.patientName}</strong>
                        <p style={{ margin: '8px 0 0' }}><span style={{ color: '#64748b' }}>Patient UHID:</span> <strong>{invoice.uhid}</strong></p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '4px 0' }}><span style={{ color: '#64748b' }}>Visit ID:</span></p>
                        <strong>{invoice.visit_id || invoice.visitId || "N/A"}</strong>
                        <p style={{ margin: '8px 0 0' }}><span style={{ color: '#64748b' }}>Payment Mode:</span> <strong>{invoice.payments?.[0]?.method || "CASH/ONLINE"}</strong></p>
                    </div>
                </div>

                {/* Billing Items */}
                <div style={{ flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #1a5f5c', textAlign: 'left' }}>
                                <th style={{ padding: '12px 0', fontSize: '0.9rem', color: '#1a5f5c' }}>Description of Services</th>
                                <th style={{ padding: '12px 0', fontSize: '0.9rem', color: '#1a5f5c', textAlign: 'right' }}>Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(invoice.items || []).map((item, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 0', fontSize: '0.95rem' }}>{item.item_name || item.description || '—'}</td>
                                    <td style={{ padding: '12px 0', fontSize: '0.95rem', textAlign: 'right' }}>{(item.total ?? item.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td style={{ padding: '24px 0 12px', fontWeight: 800, fontSize: '1.1rem', color: '#1a5f5c' }}>Grand Total</td>
                                <td style={{ padding: '24px 0 12px', fontWeight: 800, fontSize: '1.4rem', textAlign: 'right', color: '#1a5f5c' }}>
                                    ₹ {(invoice.totalAmount ?? invoice.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Official Status */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: (invoice.status || "").toLowerCase() === "paid" ? '#059669' : '#dc2626',
                    marginBottom: '32px',
                    fontWeight: '800',
                    fontSize: '1.25rem',
                    textTransform: 'uppercase',
                    border: `2px solid ${(invoice.status || "").toLowerCase() === "paid" ? '#059669' : '#dc2626'}`,
                    padding: '8px',
                    borderRadius: '8px',
                    transform: 'rotate(-5deg)'
                }}>
                    {(invoice.status || "").toLowerCase() === "paid" ? <FiCheckCircle /> : null}
                    <span>{invoice.status || "unpaid"}</span>
                </div>

                {/* Orelse Official Footer */}
                <div style={{ marginTop: 'auto', paddingTop: '24px', textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
                    <img
                        src={orelseLogo}
                        alt="or else"
                        style={{ height: '24px', width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 8px' }}
                    />
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>powered by possibilities</p>
                    <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: '#94a3b8 italic' }}>This is an electronically generated document. No signature required.</p>
                </div>
            </div>

            {/* Action Buttons (Non-Printable) */}
            <div className="no-print" style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
                <button onClick={() => window.print()} className="recep-btn recep-btn-primary" style={{ background: '#1a5f5c' }}>
                    <FiPrinter style={{ marginRight: '8px' }} /> Print Receipt
                </button>
                <button className="recep-btn recep-btn-secondary">
                    <FiDownload style={{ marginRight: '8px' }} /> Download PDF
                </button>
            </div>

            <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .recep-receipt-container { boxShadow: none !important; padding: 0 !important; maxWidth: 100% !important; }
        }
      `}</style>
        </div>
    );
}
