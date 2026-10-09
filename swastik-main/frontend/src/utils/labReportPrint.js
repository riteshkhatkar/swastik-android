export function buildLabReportPrintHtml(data, requestId, logoUrl = "") {
  const req = data?.request || {};
  const results = Array.isArray(data?.results) ? data.results : [];
  const hospitalName = "SWASTIK PATHOLOGY LAB";
  const hospitalTagline = "Accurate | Caring | Instant";
  const hospitalAddress = "Plot No. 12, Swastik Complex, Sangli-Miraj Road, Sangli - 416410";
  const hospitalContact = "0233-2345678 | 9876543210";
  const hospitalEmail = "lab@swastikhospital.com";
  
  const requestIdDisplay = requestId || req.request_id || "—";
  const patientName = req.patient_name || "—";
  const uhid = req.uhid || req.patient_id || "—";
  const age = req.patient_age || "—";
  const sex = req.patient_sex || req.sex || "—";
  const doctorName = req.doctor_name || "—";
  const sampleCollectedAt = req.collection_time || (req.collection_end_time ? new Date(req.collection_end_time).toLocaleString() : "—");
  const reportedAt = req.report_generated_at ? new Date(req.report_generated_at).toLocaleString() : new Date().toLocaleString();
  const createdAt = req.created_at ? new Date(req.created_at).toLocaleString() : "—";

  const rows = results.map((r) => {
    const testName = r.test_name || r.test_catalog_id || "—";
    const value = r.value != null ? String(r.value) : (r.value_text || "—");
    const unit = r.unit || "";
    const refRange = r.reference_range || "—";
    const abnormalClass = r.is_abnormal || r.is_critical ? 'abnormal' : '';
    return `<tr class="${abnormalClass}">
      <td>${escapeHtml(testName)}</td>
      <td class="bold">${escapeHtml(value)}</td>
      <td>${escapeHtml(refRange)}</td>
      <td>${escapeHtml(unit)}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lab Report - ${escapeHtml(requestIdDisplay)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * { box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; background: #fff; color: #1e293b; font-size: 11px; line-height: 1.4; }
    .report-container { width: 100%; max-width: 800px; margin: 0 auto; padding: 40px; position: relative; min-height: 100vh; display: flex; flex-direction: column; }
    
    /* Header Styles */
    .header { border-bottom: 3px solid #0891b2; padding-bottom: 20px; margin-bottom: 0px; display: flex; justify-content: space-between; align-items: center; }
    .header-branding { display: flex; align-items: center; gap: 24px; }
    .logo { width: 80px; height: 80px; border-radius: 12px; object-fit: contain; }
    .hospital-info h1 { margin: 0; font-size: 28px; font-weight: 800; color: #0e7490; letter-spacing: -0.5px; text-transform: uppercase; }
    .hospital-tagline { font-size: 14px; color: #0891b2; font-weight: 700; margin-top: 4px; letter-spacing: 1px; }
    .hospital-address { font-size: 9px; color: #64748b; margin-top: 6px; font-weight: 500; max-width: 300px; line-height: 1.3; }
    
    .contact-info { text-align: right; }
    .contact-info p { margin: 4px 0; font-size: 11px; color: #1e293b; font-weight: 600; }
    .contact-info .contact-label { color: #64748b; font-size: 9px; font-weight: 500; text-transform: uppercase; display: block; margin-bottom: 2px; }
    
    /* Blue belt */
    .blue-belt { background: #0e7490; height: 32px; margin: 0 -40px 25px -40px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
    
    /* Patient Info Section - Stable Grid */
    .patient-section { display: flex; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 30px; background: #fbfcfd; overflow: hidden; }
    .patient-col { padding: 15px 20px; flex: 1; }
    .patient-col:not(:last-child) { border-right: 1px solid #e2e8f0; }
    
    .info-row { display: flex; margin-bottom: 8px; align-items: flex-start; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #64748b; font-size: 10px; font-weight: 600; text-transform: uppercase; width: 100px; flex-shrink: 0; }
    .info-value { color: #0f172a; font-weight: 700; font-size: 11px; word-break: break-word; }
    
    .patient-name-large { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    
    /* Table Styles */
    .report-title { text-align: center; font-size: 20px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 15px 0 25px 0; letter-spacing: 2px; position: relative; }
    .report-title::after { content: ''; display: block; width: 60px; height: 3px; background: #0891b2; margin: 8px auto 0; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    th { text-align: left; padding: 14px 12px; background: #f8fafc; border-bottom: 2px solid #0891b2; color: #0e7490; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
    td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-size: 11px; }
    .bold { font-weight: 700; color: #0f172a; }
    .abnormal { background-color: #fff1f2; }
    .abnormal td { color: #be123c; font-weight: 700; }
    
    /* Comments */
    .comments-section { margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 5px solid #0891b2; }
    .comments-title { font-weight: 800; margin-bottom: 10px; color: #0e7490; font-size: 12px; text-transform: uppercase; }
    .comments-text { color: #475569; font-size: 11px; line-height: 1.6; }
    
    /* Signatures */
    .signature-container { display: flex; justify-content: space-between; margin-top: auto; padding-top: 60px; padding-bottom: 20px; }
    .sig-block { text-align: center; width: 30%; }
    .sig-line { border-top: 2px solid #1e293b; margin-top: 50px; padding-top: 12px; }
    .sig-name { font-weight: 800; color: #0f172a; font-size: 13px; margin-bottom: 4px; }
    .sig-desc { color: #64748b; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    
    /* Footer */
    .footer { margin-top: 30px; padding: 15px 0; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; font-weight: 500; }
    .footer strong { color: #475569; }
    
    @media print {
      .report-container { width: 100%; max-width: 100%; padding: 0; border: none; }
      body { padding: 40px; }
      .blue-belt { margin: 0 -40px 25px -40px; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <div class="header-branding">
        ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" class="logo" />` : '<div class="logo" style="background:#0e7490;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:32px;">S</div>'}
        <div class="hospital-info">
          <h1>${escapeHtml(hospitalName)}</h1>
          <div class="hospital-tagline">${escapeHtml(hospitalTagline)}</div>
          <p class="hospital-address">${escapeHtml(hospitalAddress)}</p>
        </div>
      </div>
      <div class="contact-info">
        <div>
          <span class="contact-label">Contact</span>
          <p>${escapeHtml(hospitalContact)}</p>
        </div>
        <div style="margin-top: 12px;">
          <span class="contact-label">Email & Web</span>
          <p>${escapeHtml(hospitalEmail)}</p>
          <p style="font-size: 10px; color: #0891b2;">www.swastikhospital.com</p>
        </div>
      </div>
    </div>
    
    <div class="blue-belt">
      Pathology Laboratory Report
    </div>

    <div class="patient-section">
      <div class="patient-col" style="flex: 1.2;">
        <div class="patient-name-large">${escapeHtml(patientName)}</div>
        <div class="info-row">
          <span class="info-label">UHID / PID</span>
          <span class="info-value">: ${escapeHtml(uhid)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Age / Sex</span>
          <span class="info-value">: ${escapeHtml(age)} / ${escapeHtml(sex)}</span>
        </div>
      </div>
      
      <div class="patient-col">
        <div class="info-row" style="margin-top: 5px;">
          <span class="info-label">Collected</span>
          <span class="info-value">: ${escapeHtml(sampleCollectedAt)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Registered</span>
          <span class="info-value">: ${escapeHtml(createdAt)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Reported</span>
          <span class="info-value">: ${escapeHtml(reportedAt)}</span>
        </div>
      </div>

      <div class="patient-col" style="flex: 0.8; background: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="border: 1px dashed #cbd5e1; padding: 10px; text-align: center; color: #94a3b8; font-size: 9px; font-weight: 600;">
          <div style="margin-bottom: 5px;">REQ ID: ${escapeHtml(requestIdDisplay)}</div>
          <div style="background:#fff; width: 100%; height: 40px; display: flex; align-items: center; justify-content: center;">[ BARCODE ]</div>
        </div>
        <div style="margin-top: 10px; font-size: 10px; color: #64748b; font-weight: 600;">Ref Dr: <span style="color: #0f172a;">${escapeHtml(doctorName)}</span></div>
      </div>
    </div>

    <div class="report-title">Internal Test Report</div>

    <table>
      <thead>
        <tr>
          <th style="width: 40%;">Investigation</th>
          <th style="width: 20%;">Result</th>
          <th style="width: 25%;">Reference Range</th>
          <th style="width: 15%;">Unit</th>
        </tr>
      </thead>
      <tbody>
        ${rows || "<tr><td colspan='4' style='text-align:center;padding:60px;color:#94a3b8;font-style:italic;'>No results available for this laboratory request.</td></tr>"}
      </tbody>
    </table>

    <div class="comments-section">
      <div class="comments-title">Clinical Interpretation & Remarks</div>
      <div class="comments-text">
        <p style="margin: 0;">• All the Pathological tests are performed on professional automated systems with strict internal and external quality controls.</p>
        <p style="margin: 6px 0 0 0;">• Results should be clinically correlated with patient history and other diagnostic findings by the treating physician.</p>
        <p style="margin: 6px 0 0 0;">• In case of any disparity, a repeat sample may be processed for confirmation.</p>
      </div>
    </div>

    <div style="text-align: center; margin: 50px 0; color: #cbd5e1; font-weight: 700; font-size: 11px; letter-spacing: 4px; text-transform: uppercase;">
      *** End of Report ***
    </div>

    <div class="signature-container">
      <div class="sig-block">
        <div class="sig-line">
          <div class="sig-name">Technician</div>
          <div class="sig-desc">Medical Lab Tech (DMLT)</div>
        </div>
      </div>
      <div class="sig-block">
        <div class="sig-line">
          <div class="sig-name">Dr. Nikhil Chougule</div>
          <div class="sig-desc">Consultant Pathologist</div>
        </div>
      </div>
      <div class="sig-block">
        <div class="sig-line">
          <div class="sig-name">Dr. P. M. Chougule</div>
          <div class="sig-desc">Consultant Physician</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>This is an <strong>Electronically Generated Report</strong> and does not require a physical signature.</div>
      <div>Page <strong>1 of 1</strong></div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (str == null) return "";
  const s = String(str);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
