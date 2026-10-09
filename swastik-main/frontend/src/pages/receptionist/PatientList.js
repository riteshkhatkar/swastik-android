import React, { useState, useEffect } from "react";
import { FiFilter, FiDownload, FiUpload, FiSearch, FiLogOut, FiActivity } from 'react-icons/fi';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./ReceptionistDashboard.css";
import DischargeDialog from "../../components/receptionist/DischargeDialog";

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const { api } = await import("../../api/service");
      const [patientsData, admissionsData] = await Promise.all([
        api.getPatients(),
        api.getAdmissions()
      ]);
      setPatients(patientsData || []);
      setAdmissions(admissionsData || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      const data = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = values[i];
        });
        return obj;
      });

      try {
        const { api } = await import("../../api/service");
        await api.bulkImportPatients(data);
        alert("Patients imported successfully!");
        fetchPatients();
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const filteredPatients = patients.filter(p =>
    (p.uhid || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Hospital Header
    doc.setFontSize(22);
    doc.setTextColor(13, 148, 136); // Teal-600
    doc.text("SWASTIK HOSPITAL", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Psychiatric Care & Rehabilitation Center", 105, 26, { align: "center" });
    doc.text("Patient Directory Export", 105, 32, { align: "center" });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 38, { align: "center" });

    // Table content
    const tableHeaders = [["UHID", "Patient Name", "Contact", "Reg. Date", "Status"]];
    const tableData = filteredPatients.map(p => [
      p.uhid,
      p.name || p.fullName,
      p.phone || p.contact,
      p.created_at ? new Date(p.created_at).toLocaleDateString() : "—",
      "Active"
    ]);

    autoTable(doc, {
      startY: 45,
      head: tableHeaders,
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] }, // Teal-600
      styles: { fontSize: 9 },
      margin: { top: 45 }
    });

    doc.save(`Swastik_PatientList_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="recep-dash">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 className="recep-dash-title">Patient Directory</h1>
          <p className="recep-dash-subtitle">Registry of all patients admitted or treated at Swastik Hospital.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <label className="recep-btn recep-btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiUpload /> Import CSV
            <input type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
          </label>
          <button className="recep-btn recep-btn-secondary" onClick={handleExportPDF} disabled={filteredPatients.length === 0}>
            <FiDownload /> Export
          </button>
        </div>
      </div>

      <div className="recep-dash-section" style={{ marginBottom: '1.5rem' }}>
        <div className="recep-table-wrap" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <FiSearch style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search by UHID or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', padding: '0.75rem', outline: 'none', flex: 1, fontSize: '1rem' }}
          />
        </div>
      </div>

      <section className="recep-dash-section">
        <div className="recep-table-wrap">
          <table className="recep-table">
            <thead>
              <tr>
                <th>Medical ID (UHID)</th>
                <th>Patient Full Name</th>
                <th>Primary Contact</th>
                <th>Registration Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="recep-table-empty">Loading records...</td></tr>
              ) : filteredPatients.length === 0 ? (
                <tr><td colSpan={5} className="recep-table-empty">No patient records matching your search.</td></tr>
              ) : (
                filteredPatients.map((p) => (
                  <tr key={p.uhid}>
                    <td><code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{p.uhid}</code></td>
                    <td><strong>{p.name || p.fullName}</strong></td>
                    <td>{p.phone || p.contact}</td>
                    <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                    <td>
                      {admissions.find(a => a.uhid === p.uhid && a.status === "admitted") ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="recep-status recep-status-pending" style={{ background: '#fef3c7', color: '#92400e' }}>Admitted</span>
                          <button
                            className="recep-btn recep-btn-small"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              const adm = admissions.find(a => a.uhid === p.uhid && a.status === "admitted");
                              setSelectedAdmission(adm);
                              setShowDischargeModal(true);
                            }}
                          >Discharge</button>
                        </div>
                      ) : (
                        <span className="recep-status recep-status-completed">Outpatient</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showDischargeModal && selectedAdmission && (
        <DischargeDialog
          admission={selectedAdmission}
          onClose={() => setShowDischargeModal(false)}
          onDischarge={() => {
            fetchPatients();
          }}
        />
      )}
    </div>
  );
}
