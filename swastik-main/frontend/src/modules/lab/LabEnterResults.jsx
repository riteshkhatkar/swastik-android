import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/service";

function LabEnterResults() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const labUser = localStorage.getItem("swastik_lab_user") || "Lab Assistant";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [reqRes, catRes] = await Promise.all([
          api.getLabTestRequest(requestId),
          api.getLabCatalog(),
        ]);
        if (cancelled) return;
        setRequest(reqRes);
        setCatalog(Array.isArray(catRes) ? catRes : []);
        const tests = reqRes?.tests_ordered || [];
        const initial = {};
        tests.forEach((t) => {
          initial[t] = { value: "", value_text: "", unit: "" };
        });
        setValues(initial);
      } catch (e) {
        setRequest(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [requestId]);

  const handleChange = (testName, field, v) => {
    setValues((prev) => ({
      ...prev,
      [testName]: { ...(prev[testName] || {}), [field]: v },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tests = request?.tests_ordered || [];
      const results = tests.map((test_catalog_id) => {
        const v = values[test_catalog_id] || {};
        const cat = catalogMap[test_catalog_id];
        const num = parseFloat(v.value, 10);
        const value = Number.isNaN(num) ? null : num;
        const valueText = v.value_text || null;
        const unit = v.unit || (cat?.unit || "");
        let referenceRange = null;
        if (cat?.reference_range_text) referenceRange = cat.reference_range_text;
        else if (cat?.reference_range_min != null && cat?.reference_range_max != null)
          referenceRange = `${cat.reference_range_min}–${cat.reference_range_max}`;
        let isAbnormal = false;
        if (value != null && cat?.reference_range_min != null && cat?.reference_range_max != null) {
          if (value < cat.reference_range_min || value > cat.reference_range_max) isAbnormal = true;
        }
        return {
          test_catalog_id,
          value,
          value_text: valueText,
          unit,
          reference_range: referenceRange,
          is_abnormal: isAbnormal,
          is_critical: false,
        };
      });
      await api.submitLabResults(requestId, { results, entered_by: labUser, status: "RESULTS_ENTERED" });
      navigate("/lab");
    } catch (err) {
      alert(err.message || "Failed to save results");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !request) {
    return (
      <div className="lab-section">
        <p>{loading ? "Loading…" : "Request not found."}</p>
        <button type="button" className="lab-btn" onClick={() => navigate("/lab")}>Back to Lab</button>
      </div>
    );
  }

  const tests = request.tests_ordered || [];
  const catalogMap = {};
  catalog.forEach((c) => {
    catalogMap[c.test_name || c.id] = c;
  });

  return (
    <div className="lab-section">
      <h2 className="lab-section__title">Enter results – {request.request_id}</h2>
      <p style={{ marginBottom: "1rem", color: "#64748b" }}>
        Patient: {request.patient_name} | Doctor: {request.doctor_name}
      </p>
      <form onSubmit={handleSubmit}>
        <table className="lab-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Value</th>
              <th>Unit</th>
              <th>Ref range</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((testName) => {
              const cat = catalogMap[testName];
              const v = values[testName] || {};
              return (
                <tr key={testName}>
                  <td>{testName}</td>
                  <td>
                    {cat?.reference_range_text === "Negative/Positive" ? (
                      <select value={v.value_text || ""} onChange={(e) => handleChange(testName, "value_text", e.target.value)}>
                        <option value="">—</option>
                        <option value="Negative">Negative</option>
                        <option value="Positive">Positive</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Value"
                        value={v.value}
                        onChange={(e) => handleChange(testName, "value", e.target.value)}
                      />
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder={cat?.unit || ""}
                      value={v.unit}
                      onChange={(e) => handleChange(testName, "unit", e.target.value)}
                      style={{ width: "80px" }}
                    />
                  </td>
                  <td style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    {cat?.reference_range_text || (cat?.reference_range_min != null && cat?.reference_range_max != null
                      ? `${cat.reference_range_min}–${cat.reference_range_max}` : "—")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
          <button type="submit" className="lab-btn lab-btn--primary" disabled={submitting}>
            {submitting ? "Saving…" : "Save results"}
          </button>
          <button type="button" className="lab-btn" onClick={() => navigate("/lab")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default LabEnterResults;
