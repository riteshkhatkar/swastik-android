import React, { useState, useEffect, useMemo } from "react";
import { api } from "../../../api/service";

const formatTimelineDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const s = String(dateStr).trim();
    const yearOnly = /^\d{4}$/.test(s);
    if (yearOnly) return s;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const isCurrentYear = d.getFullYear() === now.getFullYear();
    const month = d.toLocaleString("en-IN", { month: "short" });
    const year = d.getFullYear();
    return `${month} ${year}${isCurrentYear ? " (current)" : ""}`;
  } catch {
    return dateStr;
  }
}

function PatientHistory({ patientId }) {
  const [items, setItems] = useState([]);
  const [clinicalHistory, setClinicalHistory] = useState([]);
  const [yearFilter, setYearFilter] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    setLoading(true);

    const fetchData = async () => {
      try {
        const [historyEvents, clinicalRecords] = await Promise.all([
          api.listHistoryEvents(patientId, null, yearFilter ? parseInt(yearFilter, 10) : null),
          api.getClinicalHistory(patientId)
        ]);

        if (!cancelled) {
          setItems(Array.isArray(historyEvents) ? historyEvents : []);
          setClinicalHistory(Array.isArray(clinicalRecords) ? clinicalRecords : []);
        }
      } catch (err) {
        console.error("Error fetching history:", err);
        if (!cancelled) {
          setItems([]);
          setClinicalHistory([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [patientId, yearFilter]);

  const timelineEntries = useMemo(() => {
    // Transform Clinical Records into timeline-compatible items
    const clinicalItems = clinicalHistory.map(record => ({
      id: record._id,
      date: record.created_at,
      description: record.type === 'Medication'
        ? `Prescribed Medication: ${record.data?.drug_name || record.data?.drug} (${record.data?.dose})`
        : record.type === 'Diagnosis'
          ? `Clinical Diagnosis: ${record.data?.primary_diagnosis || "Updated"}`
          : record.type === 'Daily Routine'
            ? `Daily Routine Shared: ${record.data?.daily_routine?.substring(0, 100)}...`
            : `${record.type} Recorded: ${record.data?.short_term_goals ? 'Treatment Plan Update' : 'Clinical Entry'}`,
      isClinical: true,
      event_type: 'clinical'
    }));

    const combined = [...items, ...clinicalItems]
      .map((item) => ({
        ...item,
        sortDate: item.date ? new Date(item.date).getTime() : 0,
      }))
      .sort((a, b) => b.sortDate - a.sortDate);

    return combined.map((item, index) => ({
      ...item,
      isCurrent: index === 0 && item.date && new Date(item.date).getFullYear() === new Date().getFullYear(),
    }));
  }, [items, clinicalHistory]);

  const otherHistoryContent = useMemo(() => {
    const byType = items.reduce((acc, item) => {
      const t = item.event_type || "major_event";
      if (!acc[t]) acc[t] = [];
      acc[t].push(item);
      return acc;
    }, {});

    const substanceText = (byType.substance || []).map((e) => `${e.date || ""}: ${e.description || ""}`).join("\n\n");
    const majorEventText = (byType.major_event || []).map((e) => e.description).join("\n\n");
    const familyText = (byType.past_diagnosis || []).map((e) => e.description).join("\n\n");
    const medicalText = (byType.medication_reaction || []).map((e) => e.description).join("\n\n");

    const empty = "No record found.";
    return {
      family_psychiatric: familyText || empty,
      substance_use: substanceText || empty,
      social_occupational: majorEventText || empty,
      medical: medicalText || empty,
      forensic_legal: empty,
      developmental_childhood: empty,
    };
  }, [items]);

  return (
    <div className="doctor-history doctor-history--structured">
      <div className="patient-history-card">
        <div className="patient-history-card__header">
          <span className="patient-history-card__icon" aria-hidden />
          <h4 className="patient-history-card__title">Comprehensive Patient History</h4>
          <span className="patient-history-card__badge">Completed at admission</span>
        </div>

        <div className="patient-history-filter">
          <label className="patient-history-filter__label">Filter by year</label>
          <input
            type="number"
            placeholder="e.g. 2023"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            min="2000"
            max={new Date().getFullYear()}
            className="patient-history-filter__input"
          />
        </div>

        {loading && <p className="doctor-history-block__empty">Loading…</p>}

        {!loading && (
          <>
            <h5 className="history-section-title history-section-title--psych">PSYCHIATRIC HISTORY</h5>
            {timelineEntries.length === 0 && items.length > 0 ? (
              <p className="doctor-history-block__empty">No history entries yet.</p>
            ) : timelineEntries.length > 0 ? (
              <div className="history-timeline">
                {timelineEntries.map((entry, index) => (
                  <div
                    key={entry.id || index}
                    className={`history-timeline__entry ${entry.isCurrent ? "history-timeline__entry--current" : ""}`}
                  >
                    <div className="history-timeline__line-dot">
                      <span className={`history-timeline__dot ${entry.isCurrent ? "history-timeline__dot--active" : ""}`} />
                      {index < timelineEntries.length - 1 && <span className="history-timeline__line" />}
                    </div>
                    <div className="history-timeline__content-wrap">
                      <span className="history-timeline__date-label">{formatTimelineDate(entry.date)}</span>
                      <div className="history-timeline__card">
                        <p className="history-timeline__description">{entry.description || "—"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="history-divider" />

            <h5 className="history-section-title history-section-title--other">OTHER HISTORY</h5>
            <div className="history-other">
              <div className="history-other__column">
                <div className="history-other__block">
                  <div className="history-other__block-header">
                    <span className="history-other__block-title">FAMILY PSYCHIATRIC HISTORY</span>
                  </div>
                  <div className="history-other__content">{otherHistoryContent.family_psychiatric}</div>
                </div>
                <div className="history-other__block">
                  <div className="history-other__block-header">
                    <span className="history-other__block-title">SUBSTANCE USE HISTORY</span>
                  </div>
                  <div className="history-other__content">{otherHistoryContent.substance_use}</div>
                </div>
                <div className="history-other__block">
                  <div className="history-other__block-header">
                    <span className="history-other__block-title">SOCIAL & OCCUPATIONAL HISTORY</span>
                  </div>
                  <div className="history-other__content">{otherHistoryContent.social_occupational}</div>
                </div>
              </div>
              <div className="history-other__column">
                <div className="history-other__block">
                  <div className="history-other__block-header">
                    <span className="history-other__block-title">MEDICAL HISTORY</span>
                  </div>
                  <div className="history-other__content">{otherHistoryContent.medical}</div>
                </div>
                <div className="history-other__block">
                  <div className="history-other__block-header">
                    <span className="history-other__block-title">FORENSIC / LEGAL HISTORY</span>
                  </div>
                  <div className="history-other__content">{otherHistoryContent.forensic_legal}</div>
                </div>
                <div className="history-other__block">
                  <div className="history-other__block-header">
                    <span className="history-other__block-title">DEVELOPMENTAL / CHILDHOOD HISTORY</span>
                  </div>
                  <div className="history-other__content">{otherHistoryContent.developmental_childhood}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PatientHistory;
