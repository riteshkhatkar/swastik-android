import React, { useState, useEffect, useRef } from "react";
import { FiClock, FiUser, FiCheckCircle, FiLock, FiPlus, FiX } from 'react-icons/fi';
import { api } from "../../../api/service";

const ROLE = "Psychiatrist";

const QUESTIONS = [
  { id: "oriented", text: "Oriented to time, place, and person?", isRisk: false },
  { id: "grooming", text: "Appropriate grooming and hygiene?", isRisk: false },
  { id: "eyeContact", text: "Normal eye contact maintained?", isRisk: false },
  { id: "speech", text: "Speech coherent and normal in rate/tone?", isRisk: false },
  { id: "moodAffect", text: "Mood and affect congruent?", isRisk: false },
  { id: "suicidal", text: "Any suicidal ideation reported or observed?", isRisk: true },
  { id: "homicidal", text: "Any homicidal ideation reported or observed?", isRisk: true },
  { id: "hallucinations", text: "Any hallucinations (auditory/visual) present?", isRisk: true },
  { id: "delusions", text: "Any delusions or abnormal thought content present?", isRisk: true },
  { id: "memory", text: "Memory and concentration intact?", isRisk: false },
  { id: "insight", text: "Insight into illness present?", isRisk: false },
  { id: "judgment", text: "Judgment appears intact?", isRisk: false },
];

function formatObjective(objectiveStr) {
  if (!objectiveStr) return "";
  try {
    const parsed = JSON.parse(objectiveStr);
    const parts = [];

    if (parsed.vitals) {
      const v = parsed.vitals;
      const vParts = [];
      if (v.bp) vParts.push(`BP: ${v.bp}`);
      if (v.pulse) vParts.push(`Pulse: ${v.pulse}`);
      if (v.temp) vParts.push(`Temp: ${v.temp}°F`);
      if (v.weight) vParts.push(`Wt: ${v.weight}kg`);
      if (vParts.length) parts.push(`Vitals: [${vParts.join(", ")}]`);
    }

    if (parsed.questions) {
      const qAnswers = [];
      // Predefined questions
      QUESTIONS.forEach(q => {
        const ans = parsed.questions[q.id];
        if (ans) {
          qAnswers.push(`${q.text.replace(/\?$/, "")}: ${ans.toUpperCase()}`);
        }
      });
      // Custom questions stored in customQuestionsData
      if (Array.isArray(parsed.customQuestionsData)) {
        parsed.customQuestionsData.forEach(cq => {
          const ans = parsed.questions[cq.id];
          if (ans) {
            qAnswers.push(`${cq.text.replace(/\?$/, "")} [custom]: ${ans.toUpperCase()}`);
          }
        });
      }
      if (qAnswers.length) parts.push(`Checklist: [${qAnswers.join("; ")}]`);
    }

    if (parsed.additionalNotes) {
      parts.push(`Notes: ${parsed.additionalNotes}`);
    }

    return parts.join(" | ") || objectiveStr;
  } catch (e) {
    return objectiveStr;
  }
}

function YesNoRow({ q, ans, canEdit, onAnswer, onRemove }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #f1f5f9',
        background: '#ffffff',
        gap: '8px',
      }}
    >
      <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 500, flex: 1 }}>
        {q.text}
        {q.isCustom && (
          <span style={{
            marginLeft: '6px',
            fontSize: '0.65rem',
            background: '#f1f5f9',
            color: '#64748b',
            borderRadius: '4px',
            padding: '1px 5px',
            fontWeight: 600,
            verticalAlign: 'middle',
          }}>custom</span>
        )}
      </span>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        {/* Yes Button */}
        <button
          type="button"
          onClick={() => {
            if (!canEdit) return;
            onAnswer(ans === "yes" ? undefined : "yes");
          }}
          style={{
            padding: '4px 14px',
            borderRadius: '20px',
            border: '1px solid',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: canEdit ? 'pointer' : 'default',
            transition: 'all 0.2s',
            borderColor: ans === "yes" ? (q.isRisk ? '#f43f5e' : '#10b981') : '#cbd5e1',
            background: ans === "yes" ? (q.isRisk ? '#fff1f2' : '#ecfdf5') : 'transparent',
            color: ans === "yes" ? (q.isRisk ? '#e11d48' : '#047857') : '#64748b',
          }}
          disabled={!canEdit}
        >
          Yes
        </button>

        {/* No Button */}
        <button
          type="button"
          onClick={() => {
            if (!canEdit) return;
            onAnswer(ans === "no" ? undefined : "no");
          }}
          style={{
            padding: '4px 14px',
            borderRadius: '20px',
            border: '1px solid',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: canEdit ? 'pointer' : 'default',
            transition: 'all 0.2s',
            borderColor: ans === "no" ? (q.isRisk ? '#10b981' : '#f43f5e') : '#cbd5e1',
            background: ans === "no" ? (q.isRisk ? '#ecfdf5' : '#fff1f2') : 'transparent',
            color: ans === "no" ? (q.isRisk ? '#047857' : '#e11d48') : '#64748b',
          }}
          disabled={!canEdit}
        >
          No
        </button>

        {/* Remove button — custom questions only */}
        {q.isCustom && canEdit && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove this question"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              border: '1px solid #fca5a5',
              background: '#fff1f2',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.borderColor = '#f87171';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#fff1f2';
              e.currentTarget.style.borderColor = '#fca5a5';
            }}
          >
            <FiX size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

function SOAPNotes({ value = {}, onChange, admissionId, uhid, canEdit = true }) {
  const [s, setS] = useState(value.s ?? "");
  const [a, setA] = useState(value.a ?? "");
  const [p, setP] = useState(value.p ?? "");

  // Structured Objective State
  const [vitals, setVitals] = useState({ bp: "", pulse: "", temp: "", weight: "" });
  const [questions, setQuestions] = useState({});
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Custom questions state
  const [customQuestions, setCustomQuestions] = useState([]); // [{ id, text, isCustom: true }]
  const [showAddInput, setShowAddInput] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [addingQuestion, setAddingQuestion] = useState(false);
  const addInputRef = useRef(null);

  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load custom questions from backend on mount
  useEffect(() => {
    const fetchCustomQuestions = async () => {
      try {
        const res = await api.getDoctorCustomQuestions();
        if (res && Array.isArray(res.questions)) {
          setCustomQuestions(res.questions);
        }
      } catch (err) {
        // Silently fail — custom questions are a non-critical feature
        console.warn("Could not load custom questions:", err.message);
      }
    };
    fetchCustomQuestions();
  }, []);

  useEffect(() => {
    if (uhid && admissionId) fetchHistory();
  }, [uhid, admissionId]);

  useEffect(() => {
    if (value.o) {
      try {
        const parsed = JSON.parse(value.o);
        if (parsed && (parsed.vitals || parsed.questions || parsed.additionalNotes)) {
          setVitals(parsed.vitals || { bp: "", pulse: "", temp: "", weight: "" });
          setQuestions(parsed.questions || {});
          setAdditionalNotes(parsed.additionalNotes || "");
          return;
        }
      } catch (e) {
        setAdditionalNotes(value.o);
      }
    } else {
      setVitals({ bp: "", pulse: "", temp: "", weight: "" });
      setQuestions({});
      setAdditionalNotes("");
    }
  }, [value.o]);

  // Focus the inline input when it appears
  useEffect(() => {
    if (showAddInput && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [showAddInput]);

  const fetchHistory = async () => {
    try {
      const notes = await api.listSessionNotes(uhid, admissionId);
      setHistory(notes || []);
    } catch (err) {
      console.error("Error fetching notes history:", err);
    }
  };

  // Persist custom questions list to backend
  const persistCustomQuestions = async (updatedList) => {
    try {
      await api.updateDoctorCustomQuestions(updatedList);
    } catch (err) {
      console.warn("Failed to persist custom questions:", err.message);
    }
  };

  const handleAddQuestion = async () => {
    const text = newQuestionText.trim();
    if (!text) return;
    setAddingQuestion(true);
    const newQ = {
      id: `cq_${Date.now()}`,
      text,
      isCustom: true,
    };
    const updated = [...customQuestions, newQ];
    setCustomQuestions(updated);
    setNewQuestionText("");
    setShowAddInput(false);
    await persistCustomQuestions(updated);
    setAddingQuestion(false);
  };

  const handleRemoveCustomQuestion = async (qId) => {
    const updated = customQuestions.filter(q => q.id !== qId);
    setCustomQuestions(updated);
    // Also clear any stored answer for this question
    const updatedAnswers = { ...questions };
    delete updatedAnswers[qId];
    setQuestions(updatedAnswers);
    await persistCustomQuestions(updated);
  };

  const handleSave = async () => {
    if (!uhid || !admissionId) return;
    setSaving(true);

    const serializedObjective = JSON.stringify({
      vitals,
      questions,
      additionalNotes,
      // Store custom question definitions alongside, so history display can use them
      customQuestionsData: customQuestions,
    });

    try {
      await api.createSessionNote(uhid, {
        admission_id: admissionId,
        subjective: s,
        objective: serializedObjective,
        assessment: a,
        plan: p,
        role_tag: ROLE,
        draft: false,
        signed: true,
        signed_by: localStorage.getItem("swastik_username") || ROLE,
      });

      // Clear form states
      setS("");
      setVitals({ bp: "", pulse: "", temp: "", weight: "" });
      setQuestions({});
      setAdditionalNotes("");
      setA("");
      setP("");
      fetchHistory();
    } catch (err) {
      alert("Error saving note: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasAnyInput =
    s || a || p ||
    vitals.bp || vitals.pulse || vitals.temp || vitals.weight ||
    Object.keys(questions).length > 0 ||
    additionalNotes;

  return (
    <div className="doctor-soap">
      {/* SOAP Input Form */}
      <section className="doctor-emr-section" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '2rem', marginBottom: '2rem' }}>
        <div className="doctor-soap-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h4 className="doctor-emr-subtitle" style={{ margin: 0 }}>Create Daily Progress Note (SOAP)</h4>
          <button type="button" className="doctor-btn doctor-btn--primary" onClick={handleSave} disabled={saving || !hasAnyInput || !canEdit}>
            {saving ? "Signing..." : "Sign & Save Note"}
          </button>
        </div>
        <div className="doctor-soap-grid">
          <div className="doctor-form-group">
            <label>S (Subjective)</label>
            <textarea rows={3} value={s} onChange={(e) => setS(e.target.value)} placeholder="History, symptoms, patient report" disabled={!canEdit} />
          </div>

          <div className="doctor-form-group doctor-form-group--full">
            <label>O (Objective) Checklist</label>
            <div className="doctor-card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', marginTop: '8px' }}>

              {/* Vitals compact grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>BP (mmHg)</label>
                  <input type="text" placeholder="120/80" value={vitals.bp} onChange={(e) => setVitals({ ...vitals, bp: e.target.value })} style={{ width: '100%', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }} disabled={!canEdit} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Pulse (bpm)</label>
                  <input type="text" placeholder="72" value={vitals.pulse} onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })} style={{ width: '100%', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }} disabled={!canEdit} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Temp (°F)</label>
                  <input type="text" placeholder="98.6" value={vitals.temp} onChange={(e) => setVitals({ ...vitals, temp: e.target.value })} style={{ width: '100%', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }} disabled={!canEdit} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Weight (kg)</label>
                  <input type="text" placeholder="70" value={vitals.weight} onChange={(e) => setVitals({ ...vitals, weight: e.target.value })} style={{ width: '100%', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }} disabled={!canEdit} />
                </div>
              </div>

              {/* Yes/No rows — predefined questions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {QUESTIONS.map((q) => (
                  <YesNoRow
                    key={q.id}
                    q={q}
                    ans={questions[q.id]}
                    canEdit={canEdit}
                    onAnswer={(val) => {
                      if (val === undefined) {
                        const updated = { ...questions };
                        delete updated[q.id];
                        setQuestions(updated);
                      } else {
                        setQuestions({ ...questions, [q.id]: val });
                      }
                    }}
                    onRemove={null}
                  />
                ))}

                {/* Custom questions */}
                {customQuestions.map((q) => (
                  <YesNoRow
                    key={q.id}
                    q={q}
                    ans={questions[q.id]}
                    canEdit={canEdit}
                    onAnswer={(val) => {
                      if (val === undefined) {
                        const updated = { ...questions };
                        delete updated[q.id];
                        setQuestions(updated);
                      } else {
                        setQuestions({ ...questions, [q.id]: val });
                      }
                    }}
                    onRemove={() => handleRemoveCustomQuestion(q.id)}
                  />
                ))}

                {/* Inline add-question row */}
                {showAddInput && (
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px dashed #94a3b8',
                    background: '#f8fafc',
                    animation: 'fadeInRow 0.18s ease',
                  }}>
                    <input
                      ref={addInputRef}
                      type="text"
                      placeholder="Type your question here..."
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleAddQuestion(); }
                        if (e.key === 'Escape') { setShowAddInput(false); setNewQuestionText(""); }
                      }}
                      style={{
                        flex: 1,
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        outline: 'none',
                        color: '#1e293b',
                      }}
                      disabled={addingQuestion}
                    />
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      disabled={!newQuestionText.trim() || addingQuestion}
                      style={{
                        padding: '5px 14px',
                        borderRadius: '6px',
                        border: '1px solid #3b82f6',
                        background: '#3b82f6',
                        color: '#fff',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: newQuestionText.trim() ? 'pointer' : 'not-allowed',
                        opacity: newQuestionText.trim() ? 1 : 0.5,
                        transition: 'all 0.15s',
                      }}
                    >
                      {addingQuestion ? "Adding..." : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddInput(false); setNewQuestionText(""); }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: 'transparent',
                        color: '#64748b',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* + Add Question button */}
              {canEdit && !showAddInput && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddInput(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: 'transparent',
                      color: '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.color = '#3b82f6';
                      e.currentTarget.style.background = '#eff6ff';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.color = '#475569';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <FiPlus size={12} />
                    Add Question
                  </button>
                </div>
              )}

              {/* Free-text additional objective notes */}
              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Additional Objective Notes</label>
                <textarea
                  rows={2}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Any other physical findings, labs or notes not covered by the checklist"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                  disabled={!canEdit}
                />
              </div>

            </div>
          </div>

          <div className="doctor-form-group">
            <label>A (Assessment)</label>
            <textarea rows={3} value={a} onChange={(e) => setA(e.target.value)} placeholder="Clinical impression, diagnosis" disabled={!canEdit} />
          </div>
          <div className="doctor-form-group">
            <label>P (Plan)</label>
            <textarea rows={3} value={p} onChange={(e) => setP(e.target.value)} placeholder="Daily orders, medication changes" disabled={!canEdit} />
          </div>
        </div>
      </section>

      {/* Inline animation style */}
      <style>{`
        @keyframes fadeInRow {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Clinical Notes Timeline */}
      <section className="soap-timeline">
        <h4 className="doctor-emr-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiClock /> Clinical Notes Timeline
        </h4>
        <div className="timeline-container" style={{ paddingLeft: '20px', borderLeft: '2px solid #e2e8f0' }}>
          {history.length === 0 ? (
            <p style={{ color: '#64748b', fontStyle: 'italic' }}>No notes recorded for this admission.</p>
          ) : (
            history.map((note) => (
              <div key={note.id} className="timeline-item" style={{ position: 'relative', marginBottom: '2rem' }}>
                <div style={{ position: 'absolute', left: '-27px', top: '0', background: 'white', padding: '4px', borderRadius: '50%', border: '2px solid #3b82f6', color: '#3b82f6' }}>
                  <FiCheckCircle size={14} />
                </div>
                <div className="doctor-card" style={{ padding: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                      {new Date(note.session_date).toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569' }}>
                      <FiUser size={10} /> {note.signed_by || note.role_tag}
                    </span>
                  </div>
                  <div className="note-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', fontSize: '0.9rem' }}>
                    <div><strong>S:</strong> <span style={{ color: '#475569' }}>{note.subjective}</span></div>
                    <div><strong>O:</strong> <span style={{ color: '#475569', whiteSpace: 'pre-wrap' }}>{formatObjective(note.objective)}</span></div>
                    <div><strong>A:</strong> <span style={{ color: '#475569' }}>{note.assessment}</span></div>
                    <div><strong>P:</strong> <span style={{ color: '#475569' }}>{note.plan}</span></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default SOAPNotes;
