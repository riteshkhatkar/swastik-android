import React, { useState } from "react";
import { FiSearch, FiUser, FiPhone, FiCalendar, FiShield, FiMapPin, FiMail, FiInfo, FiActivity, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import "./ReceptionistDashboard.css";

export default function SearchUHID() {
  const [uhid, setUhid] = useState("");
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!uhid.trim()) return;

    setLoading(true);
    setSearched(true);
    setShowMoreInfo(false);

    try {
      const { api } = await import("../../api/service");
      const found = await api.getPatientByUhid(uhid.trim());
      setResult(found);
    } catch (err) {
      console.error("UHID Search Error:", err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recep-dash">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="recep-dash-title">Patient Portal Search</h1>
        <p className="recep-dash-subtitle">Enter a Unique Health ID to verify registration and access clinical records.</p>
      </header>

      <section className="recep-dash-section">
        <div className="recep-table-wrap" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)' }}>
          <form onSubmit={handleSearch} className="recep-reg-form" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', maxWidth: '800px' }}>
            <div className="recep-reg-field" style={{ flex: 1 }}>
              <label style={{ fontWeight: 800, color: '#1a5f5c' }}>Search Registry</label>
              <div style={{ position: 'relative' }}>
                <FiSearch style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#1a5f5c', fontSize: '1.2rem' }} />
                <input
                  type="text"
                  value={uhid}
                  onChange={(e) => setUhid(e.target.value)}
                  placeholder="e.g. UHID-2026-123456"
                  style={{
                    paddingLeft: '3.25rem',
                    width: '100%',
                    height: '54px',
                    fontSize: '1.1rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    transition: 'all 0.3s'
                  }}
                  className="search-input-fancy"
                />
              </div>
            </div>
            <button type="submit" className="recep-btn recep-btn-primary" style={{ height: '54px', padding: '0 2.5rem', background: '#1a5f5c', borderRadius: '12px', fontWeight: 700 }}>
              {loading ? "Searching..." : "Locate Patient"}
            </button>
          </form>

          {searched && !loading && (
            <div style={{ marginTop: '3rem', animation: 'fadeIn 0.4s ease-out' }}>
              {result ? (
                <div style={{ maxWidth: '900px' }}>
                  {/* Summary Box */}
                  <div style={{
                    background: '#fff',
                    borderRadius: '24px',
                    padding: '2rem',
                    boxShadow: '0 10px 25px rgba(26, 95, 92, 0.08)',
                    border: '1px solid #e2e8f0',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: '#1a5f5c' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{
                          width: '70px',
                          height: '70px',
                          background: '#f1f5f9',
                          borderRadius: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2rem',
                          color: '#1a5f5c'
                        }}>
                          <FiUser />
                        </div>
                        <div>
                          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.75rem' }}>{result.name || result.fullName}</h2>
                          <span style={{ color: '#64748b', fontWeight: 600 }}>{result.gender || "Gender N/A"} • {result.age || "Age N/A"} Years</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <code style={{
                          background: '#1a5f5c',
                          color: '#fff',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          fontSize: '1.1rem',
                          fontWeight: 800
                        }}>{result.uhid}</code>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Registered: {new Date(result.created_at || result.registeredAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Primary Contact</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', fontWeight: 600 }}>
                          <FiPhone style={{ color: '#1a5f5c' }} /> {result.phone || result.contact || "N/A"}
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Email Address</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', fontWeight: 600 }}>
                          <FiMail style={{ color: '#1a5f5c' }} /> {result.email || "No email linked"}
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Guardian Name</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', fontWeight: 600 }}>
                          <FiShield style={{ color: '#1a5f5c' }} /> {result.guardian_name || result.guardianName || "N/A"}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                      <button
                        onClick={() => setShowMoreInfo(!showMoreInfo)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1a5f5c',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          background: '#f1f5f9'
                        }}
                      >
                        {showMoreInfo ? <><FiChevronUp /> Show Less Details</> : <><FiChevronDown /> More Information & Clinical View</>}
                      </button>
                    </div>

                    {showMoreInfo && (
                      <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px dashed #e2e8f0', animation: 'fadeIn 0.3s ease-in' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                          <div>
                            <h4 style={{ color: '#1a5f5c', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><FiMapPin /> Residential Address</h4>
                            <p style={{ color: '#475569', lineHeight: 1.6, margin: 0 }}>
                              {result.address || "Address details not available in primary record."}
                            </p>
                          </div>
                          <div>
                            <h4 style={{ color: '#1a5f5c', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><FiActivity /> Medical Summary</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b' }}>Blood Group</span>
                                <span style={{ fontWeight: 600 }}>{result.bloodGroup || "O+"}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b' }}>Emergency Contact</span>
                                <span style={{ fontWeight: 600 }}>{result.emergency_contact || result.emergencyContact || "N/A"}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                                <span style={{ color: '#64748b' }}>Marital Status</span>
                                <span style={{ fontWeight: 600 }}>{result.maritalStatus || "N/A"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                  <div style={{ width: '80px', height: '80px', background: '#fef2f2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 1.5rem' }}>
                    <FiInfo />
                  </div>
                  <h2 style={{ color: '#1e293b' }}>UHID Not Detected</h2>
                  <p style={{ color: '#64748b', maxWidth: '400px', margin: '0.5rem auto 2rem' }}>No patient found matching the health ID: <strong>{uhid}</strong>. Please verify the ID or register as a new patient.</p>
                  <button className="recep-btn recep-btn-primary" style={{ background: '#1a5f5c' }} onClick={() => setUhid("")}>Try Another Search</button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
