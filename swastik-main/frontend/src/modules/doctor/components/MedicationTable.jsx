import React, { useState, useMemo } from "react";

const DRUG_LIST = [
  "Lithium carbonate",
  "Escitalopram",
  "Sertraline",
  "Olanzapine",
  "Risperidone",
  "Clozapine",
  "Fluoxetine",
  "Quetiapine",
  "Aripiprazole",
  "Valproate",
  "Lamotrigine",
  "Clonazepam",
  "Diazepam",
  "Amitriptyline",
  "Venlafaxine",
];

const ROUTES = ["PO", "IM", "IV", "SL", "Topical"];
const FREQUENCIES = ["OD", "BD", "TDS", "QDS", "Nocte", "PRN", "Weekly"];

function MedicationTable({ value = [], onChange, canEdit = true }) {
  const [allergyBanner] = useState(true);
  const [drugSearch, setDrugSearch] = useState("");

  const filteredDrugs = useMemo(() => {
    if (!drugSearch.trim()) return DRUG_LIST.slice(0, 8);
    const q = drugSearch.toLowerCase();
    return DRUG_LIST.filter((d) => d.toLowerCase().includes(q));
  }, [drugSearch]);

  const addRow = () => {
    onChange([
      ...value,
      {
        id: `med-${Date.now()}`,
        drug: "",
        dose: "",
        frequency: "",
        route: "PO",
        startDate: "",
        endDate: "",
        duration: "",
        prescriber: "",
      },
    ]);
  };

  const updateRow = (id, field, val) => {
    onChange(
      value.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const removeRow = (id) => {
    onChange(value.filter((r) => r.id !== id));
  };

  return (
    <div className="doctor-medication">
      {allergyBanner && (
        <div className="doctor-allergy-banner">
          <strong>Allergy Alert:</strong> Please check patient allergy list before prescribing.
        </div>
      )}
      <div className="doctor-table-wrap">
        <table className="doctor-table doctor-medication-table">
          <thead>
            <tr>
              <th>Drug</th>
              <th>Dose</th>
              <th>Frequency</th>
              <th>Route</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Duration</th>
              <th>Prescriber</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {value.map((row) => (
              <tr key={row.id}>
                <td>
                  <input
                    type="text"
                    list={`drug-list-${row.id}`}
                    value={row.drug}
                    onChange={(e) => updateRow(row.id, "drug", e.target.value)}
                    placeholder="Drug name"
                    disabled={!canEdit}
                  />
                  <datalist id={`drug-list-${row.id}`}>
                    {DRUG_LIST.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </td>
                <td>
                  <input
                    type="text"
                    value={row.dose}
                    onChange={(e) => updateRow(row.id, "dose", e.target.value)}
                    placeholder="e.g. 10mg"
                    disabled={!canEdit}
                  />
                </td>
                <td>
                  <select
                    value={row.frequency}
                    onChange={(e) => updateRow(row.id, "frequency", e.target.value)}
                    disabled={!canEdit}
                  >
                    <option value="">Select</option>
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={row.route}
                    onChange={(e) => updateRow(row.id, "route", e.target.value)}
                    disabled={!canEdit}
                  >
                    {ROUTES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="date"
                    value={row.startDate}
                    onChange={(e) => updateRow(row.id, "startDate", e.target.value)}
                    disabled={!canEdit}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={row.endDate}
                    onChange={(e) => updateRow(row.id, "endDate", e.target.value)}
                    disabled={!canEdit}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.duration}
                    onChange={(e) => updateRow(row.id, "duration", e.target.value)}
                    placeholder="e.g. 7 days"
                    disabled={!canEdit}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.prescriber}
                    onChange={(e) => updateRow(row.id, "prescriber", e.target.value)}
                    placeholder="Prescriber"
                    disabled={!canEdit}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="doctor-btn doctor-btn--danger doctor-btn--sm"
                    onClick={() => removeRow(row.id)}
                    disabled={!canEdit}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="doctor-btn doctor-btn--secondary" onClick={addRow} disabled={!canEdit}>
        + Add Medication
      </button>
    </div>
  );
}

export default MedicationTable;
