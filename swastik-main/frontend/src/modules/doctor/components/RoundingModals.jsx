import React, { useState } from "react";
import { FiX, FiSave, FiActivity, FiFileText, FiPlusSquare, FiLayers, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import DiagnosisSelector from "./DiagnosisSelector";

function Modal({ title, isOpen, onClose, children }) {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="doctor-card" style={{ width: '600px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>{title}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><FiX size={24} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function AddNoteModal({ isOpen, onClose, onSave, saving }) {
    const [form, setForm] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
    return (
        <Modal title={<><FiFileText color="#3b82f6" /> Add Rounding Note (SOAP)</>} isOpen={isOpen} onClose={onClose}>
            <div className="doctor-form-grid">
                <div className="doctor-form-group doctor-form-group--full">
                    <label>Subjective (Patient's complaints/feedback)</label>
                    <textarea value={form.subjective} onChange={e => setForm({ ...form, subjective: e.target.value })} rows={2} />
                </div>
                <div className="doctor-form-group doctor-form-group--full">
                    <label>Objective (Vitals, observations, physical exam)</label>
                    <textarea value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} rows={2} />
                </div>
                <div className="doctor-form-group doctor-form-group--full">
                    <label>Assessment (Clinical summary, risk status)</label>
                    <textarea value={form.assessment} onChange={e => setForm({ ...form, assessment: e.target.value })} rows={2} />
                </div>
                <div className="doctor-form-group doctor-form-group--full">
                    <label>Plan (Treatment updates, interventions)</label>
                    <textarea value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} rows={2} />
                </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="doctor-btn doctor-btn--secondary" onClick={onClose}>Cancel</button>
                <button className="doctor-btn doctor-btn--primary" onClick={() => onSave(form)} disabled={saving}>
                    <FiSave /> {saving ? "Saving..." : "Save Note"}
                </button>
            </div>
        </Modal>
    );
}

export function AddVitalsModal({ isOpen, onClose, onSave, saving }) {
    const [form, setForm] = useState({ temp: "", bp_systolic: "", bp_diastolic: "", hr: "", rr: "", spo2: "" });
    return (
        <Modal title={<><FiActivity color="#10b981" /> Record Vitals</>} isOpen={isOpen} onClose={onClose}>
            <div className="doctor-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="doctor-form-group">
                    <label>Temperature (°C)</label>
                    <input type="number" step="0.1" value={form.temp} onChange={e => setForm({ ...form, temp: e.target.value })} />
                </div>
                <div className="doctor-form-group">
                    <label>Heart Rate (bpm)</label>
                    <input type="number" value={form.hr} onChange={e => setForm({ ...form, hr: e.target.value })} />
                </div>
                <div className="doctor-form-group">
                    <label>BP (Systolic)</label>
                    <input type="number" value={form.bp_systolic} onChange={e => setForm({ ...form, bp_systolic: e.target.value })} />
                </div>
                <div className="doctor-form-group">
                    <label>BP (Diastolic)</label>
                    <input type="number" value={form.bp_diastolic} onChange={e => setForm({ ...form, bp_diastolic: e.target.value })} />
                </div>
                <div className="doctor-form-group">
                    <label>Respiratory Rate (RR)</label>
                    <input type="number" value={form.rr} onChange={e => setForm({ ...form, rr: e.target.value })} />
                </div>
                <div className="doctor-form-group">
                    <label>SpO2 (%)</label>
                    <input type="number" value={form.spo2} onChange={e => setForm({ ...form, spo2: e.target.value })} />
                </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="doctor-btn doctor-btn--secondary" onClick={onClose}>Cancel</button>
                <button className="doctor-btn doctor-btn--primary" onClick={() => onSave(form)} disabled={saving}>
                    <FiSave /> {saving ? "Saving..." : "Save Vitals"}
                </button>
            </div>
        </Modal>
    );
}

export function AddMedicationModal({ isOpen, onClose, onSave, saving, allergyList = [] }) {
    const [medications, setMedications] = useState([
        { drugName: "", dose: "", frequency: "", route: "PO", startDate: new Date().toISOString().split('T')[0], endDate: "" }
    ]);

    const addRow = () => {
        setMedications([...medications, { drugName: "", dose: "", frequency: "", route: "PO", startDate: new Date().toISOString().split('T')[0], endDate: "" }]);
    };

    const updateRow = (index, field, value) => {
        const updated = [...medications];
        updated[index][field] = value;
        setMedications(updated);
    };

    const removeRow = (index) => {
        if (medications.length > 1) {
            setMedications(medications.filter((_, i) => i !== index));
        }
    };

    return (
        <Modal title={<><FiPlusSquare color="#8b5cf6" /> Prescribe Medications</>} isOpen={isOpen} onClose={onClose}>
            <div style={{ width: '800px', maxWidth: '100%' }}>
                {/* Allergy Alert */}
                <div style={{ 
                    background: '#fff1f2', 
                    border: '1px solid #fda4af', 
                    borderRadius: '8px', 
                    padding: '12px 16px', 
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#e11d48',
                    fontSize: '0.9rem'
                }}>
                    <FiAlertCircle size={20} />
                    <span><strong>Allergy Alert:</strong> Please check patient allergy list before prescribing.</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                                <th style={{ padding: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Drug</th>
                                <th style={{ padding: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dose</th>
                                <th style={{ padding: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Frequency</th>
                                <th style={{ padding: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Route</th>
                                <th style={{ padding: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</th>
                                <th style={{ padding: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Date</th>
                                <th style={{ padding: '12px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {medications.map((med, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px' }}>
                                        <input 
                                            type="text" value={med.drugName} onChange={e => updateRow(idx, 'drugName', e.target.value)} 
                                            placeholder="Drug name" className="doctor-input" style={{ width: '100%' }} 
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input 
                                            type="text" value={med.dose} onChange={e => updateRow(idx, 'dose', e.target.value)} 
                                            placeholder="e.g. 1" className="doctor-input" style={{ width: '60px' }} 
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <select value={med.frequency} onChange={e => updateRow(idx, 'frequency', e.target.value)} className="doctor-input">
                                            <option value="">Select</option>
                                            <option value="OD">Once daily (OD)</option>
                                            <option value="BD">Twice daily (BD)</option>
                                            <option value="TDS">Thrice daily (TDS)</option>
                                            <option value="QID">Four times/day (QID)</option>
                                            <option value="PRN">As needed (PRN)</option>
                                            <option value="STAT">Immediately (STAT)</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <select value={med.route} onChange={e => updateRow(idx, 'route', e.target.value)} className="doctor-input">
                                            <option value="PO">PO / Oral</option>
                                            <option value="IV">IV</option>
                                            <option value="IM">IM</option>
                                            <option value="SC">SC</option>
                                            <option value="Topical">Topical</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input type="date" value={med.startDate} onChange={e => updateRow(idx, 'startDate', e.target.value)} className="doctor-input" />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input type="date" value={med.endDate} onChange={e => updateRow(idx, 'endDate', e.target.value)} className="doctor-input" />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        {medications.length > 1 && (
                                            <button onClick={() => removeRow(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                <FiX size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                    <button className="doctor-btn doctor-btn--secondary" onClick={addRow} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                        <FiPlusSquare /> Add Medication
                    </button>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                    <button className="doctor-btn doctor-btn--secondary" onClick={onClose}>Cancel</button>
                    <button className="doctor-btn doctor-btn--primary" onClick={() => onSave(medications)} disabled={saving || medications.some(m => !m.drugName)}>
                        {saving ? "Prescribing..." : "Save Prescriptions"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export function OrderLabModal({ isOpen, onClose, onSave, saving }) {
    const [selectedTests, setSelectedTests] = useState([]);
    const [priority, setPriority] = useState("Routine");
    const [instructions, setInstructions] = useState("");
    const [customTest, setCustomTest] = useState("");

    const LAB_TESTS = ["CBC", "Blood Sugar (R/F/PP)", "LFT", "KFT", "Lipid Profile", "X-Ray Chest", "CT Scan Head", "MRI Head", "ECG", "Urine Routine"];

    const toggleTest = (test) => {
        if (selectedTests.includes(test)) {
            setSelectedTests(selectedTests.filter(t => t !== test));
        } else {
            setSelectedTests([...selectedTests, test]);
        }
    };

    const addCustom = () => {
        if (customTest.trim() && !selectedTests.includes(customTest.trim())) {
            setSelectedTests([...selectedTests, customTest.trim()]);
            setCustomTest("");
        }
    };

    return (
        <Modal title={<><FiLayers color="#f59e0b" /> Order Lab Investigations</>} isOpen={isOpen} onClose={onClose}>
            <div className="doctor-form-grid">
                <div className="doctor-form-group doctor-form-group--full">
                    <label>Common Investigations (Select Multiple)</label>
                    <div className="doctor-mse-chips">
                        {LAB_TESTS.map(test => (
                            <button 
                                key={test} 
                                className={`doctor-chip ${selectedTests.includes(test) ? 'doctor-chip--active' : ''}`} 
                                onClick={() => toggleTest(test)}
                                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                            >
                                {test}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="doctor-form-group doctor-form-group--full">
                    <label>Add Custom Test</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            type="text" 
                            value={customTest} 
                            onChange={e => setCustomTest(e.target.value)} 
                            placeholder="Type test name..." 
                            style={{ flex: 1 }}
                            onKeyPress={e => e.key === 'Enter' && addCustom()}
                        />
                        <button className="doctor-btn doctor-btn--secondary" onClick={addCustom} style={{ padding: '0 15px' }}>Add</button>
                    </div>
                </div>

                {selectedTests.length > 0 && (
                    <div className="doctor-form-group doctor-form-group--full">
                        <label>Selected Tests</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '12px', minHeight: '40px' }}>
                            {selectedTests.map(test => (
                                <span key={test} style={{ 
                                    background: '#fff', 
                                    border: '1px solid #e2e8f0', 
                                    padding: '4px 12px', 
                                    borderRadius: '20px', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {test}
                                    <FiX size={14} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => toggleTest(test)} />
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="doctor-form-group">
                    <label>Priority</label>
                    <select value={priority} onChange={e => setPriority(e.target.value)} className="doctor-input">
                        <option value="Routine">Routine</option>
                        <option value="Urgent">Urgent</option>
                        <option value="STAT">STAT / Emergency</option>
                    </select>
                </div>
                
                <div className="doctor-form-group doctor-form-group--full">
                    <label>Clinical Notes / Instructions</label>
                    <textarea 
                        value={instructions} 
                        onChange={e => setInstructions(e.target.value)} 
                        rows={2} 
                        placeholder="Clinical indication or specific instructions for lab technician..."
                        className="doctor-input"
                    />
                </div>
            </div>
            
            <div style={{ marginTop: '2rem', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <button className="doctor-btn doctor-btn--secondary" onClick={onClose}>Cancel</button>
                <button 
                    className="doctor-btn doctor-btn--primary" 
                    onClick={() => onSave({ testsOrdered: selectedTests, priority, instructions })} 
                    disabled={saving || selectedTests.length === 0}
                    style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                >
                    {saving ? "Creating Request..." : `Order ${selectedTests.length} Investigation${selectedTests.length !== 1 ? 's' : ''}`}
                </button>
            </div>
        </Modal>
    );
}

export function AddDiagnosisModal({ isOpen, onClose, onSave, saving }) {
    const [diagnosis, setDiagnosis] = useState({});
    return (
        <Modal title={<><FiAlertCircle color="#ef4444" /> Update Diagnosis</>} isOpen={isOpen} onClose={onClose}>
            <DiagnosisSelector value={diagnosis} onChange={setDiagnosis} />
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="doctor-btn doctor-btn--secondary" onClick={onClose}>Cancel</button>
                <button className="doctor-btn doctor-btn--primary" onClick={() => onSave(diagnosis)} disabled={saving}>
                    Save Diagnosis
                </button>
            </div>
        </Modal>
    );
}

export function DischargeRecommendationModal({ isOpen, onClose, onSave, saving }) {
    const [form, setForm] = useState({ condition: "Stable", followUp: "After 1 week", instructions: "" });
    return (
        <Modal title={<><FiCheckCircle color="#10b981" /> Discharge Recommendation</>} isOpen={isOpen} onClose={onClose}>
            <div className="doctor-form-grid">
                <div className="doctor-form-group doctor-form-group--full">
                    <label>Condition at Discharge</label>
                    <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
                        <option value="Stable">Stable / Improved</option>
                        <option value="Recovered">Recovered</option>
                        <option value="DAMA">Discharged Against Medical Advice (DAMA)</option>
                        <option value="Relieved">Relieved</option>
                    </select>
                </div>
                <div className="doctor-form-group doctor-form-group--full">
                    <label>Follow-up Instructions</label>
                    <input type="text" value={form.followUp} onChange={e => setForm({ ...form, followUp: e.target.value })} />
                </div>
                <div className="doctor-form-group doctor-form-group--full">
                    <label>Discharge Medication & Instructions</label>
                    <textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={4} placeholder="Summary of medications to continue and special care instructions..." />
                </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="doctor-btn doctor-btn--secondary" onClick={onClose}>Cancel</button>
                <button className="doctor-btn doctor-btn--primary" onClick={() => onSave(form)} disabled={saving} style={{ background: '#059669' }}>
                    Confirm Recommendation
                </button>
            </div>
        </Modal>
    );
}
