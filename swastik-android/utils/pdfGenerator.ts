// swastik-android/utils/pdfGenerator.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export interface LabReportData {
  patientName: string;
  uhid: string;
  requestId: string;
  registeredOn: string;
  reportedOn: string;
  ageSex: string;
  referringDoctor: string;
  sampleType: string;
  sampleCollectedOn: string;
  status: string;
  investigations: Array<{
    name: string;
    result: string;
    referenceRange: string;
    unit: string;
    isAbnormal?: boolean;
  }>;
  remarks: string;
}

export interface InvoiceData {
  billNo: string;
  patientName: string;
  uhid: string;
  phone?: string;
  date: string;
  dueDate?: string;
  visitType: string;
  items: Array<{
    name: string;
    category: string;
    qty: number;
    unitPrice: number;
    taxPercent: number;
    discount: number;
    total: number;
  }>;
  subtotal: number;
  totalTax: number;
  totalDiscount: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: string;
  receiptFooter?: string;
}

export const generateLabReportHtml = (data: LabReportData): string => {
  const rows = data.investigations
    .map(
      (inv) => `
    <tr style="border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 10px 8px; font-weight: 600; color: #1E293B;">${inv.name}</td>
      <td style="padding: 10px 8px; text-align: center; font-weight: 700; ${
        inv.isAbnormal ? 'color: #EF4444; background: #FEF2F2; border-radius: 4px;' : 'color: #0F172A;'
      }">${inv.result}</td>
      <td style="padding: 10px 8px; text-align: center; color: #64748B;">${inv.referenceRange}</td>
      <td style="padding: 10px 8px; text-align: center; color: #64748B;">${inv.unit}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lab Report - ${data.requestId}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 24px; color: #1E293B; background: #FFF; }
    .header-table { width: 100%; border-bottom: 2px solid #0F766E; padding-bottom: 16px; margin-bottom: 20px; }
    .brand-title { font-size: 24px; font-weight: 800; color: #0F766E; margin: 0; }
    .sub-brand { font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    .report-title-box { text-align: right; }
    .report-title { font-size: 20px; font-weight: 800; color: #1E293B; margin: 0; }
    .tagline { font-size: 11px; color: #0D9488; }
    .patient-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-bottom: 24px; }
    .info-grid { width: 100%; }
    .info-grid td { padding: 4px 8px; font-size: 13px; }
    .label { color: #64748B; font-weight: 600; width: 22%; }
    .val { color: #0F172A; font-weight: 700; width: 28%; }
    .table-container { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .table-header { background: #E6FFFA; color: #0F766E; font-size: 13px; font-weight: 700; text-transform: uppercase; }
    .table-header th { padding: 10px 8px; border-bottom: 2px solid #0D9488; }
    .remarks-box { background: #F0FDF4; border-left: 4px solid #10B981; padding: 12px 16px; border-radius: 4px; margin-top: 20px; }
    .remarks-title { font-size: 13px; font-weight: 700; color: #065F46; margin: 0 0 4px 0; }
    .remarks-text { font-size: 12px; color: #047857; margin: 0; }
    .footer { margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 20px; display: flex; justify-content: space-between; font-size: 11px; color: #94A3B8; }
    .stamp-box { text-align: right; }
    .sign-title { font-weight: 700; color: #1E293B; font-size: 13px; margin-top: 40px; }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <h1 class="brand-title">SWASTIK PATHOLOGY LAB</h1>
        <div class="sub-brand">Accurate Diagnostics · Healthier Lives</div>
      </td>
      <td class="report-title-box">
        <h2 class="report-title">LABORATORY REPORT</h2>
        <div class="tagline">Official Diagnostic Record</div>
      </td>
    </tr>
  </table>

  <div class="patient-card">
    <table class="info-grid">
      <tr>
        <td class="label">Patient Name:</td>
        <td class="val">${data.patientName}</td>
        <td class="label">Request ID:</td>
        <td class="val">${data.requestId}</td>
      </tr>
      <tr>
        <td class="label">UHID:</td>
        <td class="val">${data.uhid}</td>
        <td class="label">Registered On:</td>
        <td class="val">${data.registeredOn}</td>
      </tr>
      <tr>
        <td class="label">Age / Gender:</td>
        <td class="val">${data.ageSex}</td>
        <td class="label">Reported On:</td>
        <td class="val">${data.reportedOn}</td>
      </tr>
      <tr>
        <td class="label">Referring Doctor:</td>
        <td class="val" colspan="3">${data.referringDoctor}</td>
      </tr>
      <tr>
        <td class="label">Sample Type:</td>
        <td class="val">${data.sampleType}</td>
        <td class="label">Report Status:</td>
        <td class="val" style="color: #059669;">${data.status}</td>
      </tr>
    </table>
  </div>

  <table class="table-container">
    <thead>
      <tr class="table-header">
        <th style="text-align: left;">Investigation</th>
        <th>Result</th>
        <th>Reference Range</th>
        <th>Unit</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="remarks-box">
    <div class="remarks-title">Remarks / Clinical Interpretation</div>
    <p class="remarks-text">${data.remarks}</p>
  </div>

  <table style="width: 100%; margin-top: 48px;">
    <tr>
      <td style="font-size: 11px; color: #64748B;">
        This report is electronically verified and does not require physical signature.<br/>
        For clinical queries, contact: support@swastikhospital.com | +91 98765 43210
      </td>
      <td style="text-align: right;">
        <div class="sign-title">Medical Lab Director</div>
        <div style="font-size: 11px; color: #64748B;">Swastik Diagnostics</div>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

export const generateInvoiceHtml = (data: InvoiceData): string => {
  const itemRows = data.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 10px 8px; font-weight: 600; color: #1E293B;">
        ${item.name}
        <div style="font-size: 11px; color: #64748B;">Category: ${item.category}</div>
      </td>
      <td style="padding: 10px 8px; text-align: center;">${item.qty}</td>
      <td style="padding: 10px 8px; text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 10px 8px; text-align: center;">${item.taxPercent}%</td>
      <td style="padding: 10px 8px; text-align: right; color: #EF4444;">${item.discount > 0 ? '-₹' + item.discount.toFixed(2) : '—'}</td>
      <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #0F172A;">₹${item.total.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${data.billNo}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 24px; color: #1E293B; background: #FFF; }
    .header-table { width: 100%; border-bottom: 2px solid #0F766E; padding-bottom: 16px; margin-bottom: 20px; }
    .brand-title { font-size: 24px; font-weight: 800; color: #0F766E; margin: 0; }
    .sub-brand { font-size: 12px; color: #64748B; margin-top: 4px; }
    .invoice-title-box { text-align: right; }
    .invoice-title { font-size: 20px; font-weight: 800; color: #1E293B; margin: 0; }
    .bill-no { font-size: 13px; font-weight: 700; color: #0D9488; margin-top: 4px; }
    .info-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-bottom: 24px; }
    .info-table { width: 100%; }
    .info-table td { padding: 4px 8px; font-size: 13px; }
    .label { color: #64748B; font-weight: 600; width: 20%; }
    .val { color: #0F172A; font-weight: 700; width: 30%; }
    .table-container { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .table-header { background: #E6FFFA; color: #0F766E; font-size: 13px; font-weight: 700; }
    .table-header th { padding: 10px 8px; border-bottom: 2px solid #0D9488; }
    .summary-table { width: 40%; margin-left: auto; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; }
    .summary-table td { padding: 6px 8px; font-size: 13px; }
    .summary-total { font-size: 16px; font-weight: 800; color: #0F766E; border-top: 2px solid #CBD5E1; }
    .footer { margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 16px; font-size: 11px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <h1 class="brand-title">SWASTIK HOSPITAL</h1>
        <div class="sub-brand">Accredited Multi-Specialty Healthcare Facility</div>
      </td>
      <td class="invoice-title-box">
        <h2 class="invoice-title">TAX INVOICE</h2>
        <div class="bill-no">Bill No: ${data.billNo}</div>
      </td>
    </tr>
  </table>

  <div class="info-card">
    <table class="info-table">
      <tr>
        <td class="label">Patient Name:</td>
        <td class="val">${data.patientName}</td>
        <td class="label">Invoice Date:</td>
        <td class="val">${data.date}</td>
      </tr>
      <tr>
        <td class="label">UHID:</td>
        <td class="val">${data.uhid}</td>
        <td class="label">Due Date:</td>
        <td class="val">${data.dueDate || data.date}</td>
      </tr>
      <tr>
        <td class="label">Phone:</td>
        <td class="val">${data.phone || 'N/A'}</td>
        <td class="label">Visit Type:</td>
        <td class="val">${data.visitType}</td>
      </tr>
    </table>
  </div>

  <table class="table-container">
    <thead>
      <tr class="table-header">
        <th style="text-align: left;">Item / Service</th>
        <th>Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th>Tax</th>
        <th style="text-align: right;">Discount</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <table class="summary-table">
    <tr>
      <td>Subtotal:</td>
      <td style="text-align: right; font-weight: 600;">₹${data.subtotal.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Total Tax:</td>
      <td style="text-align: right;">₹${data.totalTax.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Total Discount:</td>
      <td style="text-align: right; color: #EF4444;">-₹${data.totalDiscount.toFixed(2)}</td>
    </tr>
    <tr class="summary-total">
      <td>Grand Total:</td>
      <td style="text-align: right;">₹${data.grandTotal.toFixed(2)}</td>
    </tr>
    <tr>
      <td style="color: #059669; font-weight: 700;">Paid (${data.paymentMethod}):</td>
      <td style="text-align: right; color: #059669; font-weight: 700;">₹${data.amountPaid.toFixed(2)}</td>
    </tr>
    <tr>
      <td style="color: #DC2626; font-weight: 700;">Amount Due:</td>
      <td style="text-align: right; color: #DC2626; font-weight: 700;">₹${data.amountDue.toFixed(2)}</td>
    </tr>
  </table>

  <div class="footer">
    ${data.receiptFooter || 'Thank you for choosing Swastik Hospital. Get well soon!'}
  </div>
</body>
</html>
`;
};

export const printOrSharePdf = async (html: string, dialogTitle: string = 'Medical Document') => {
  try {
    const isAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (isAvailable) {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle });
    } else {
      await Print.printAsync({ html });
    }
  } catch (err: any) {
    try {
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert('PDF Export Error', err?.message || 'Unable to print or share PDF document.');
    }
  }
};

export interface CasePaperData {
  patientName: string;
  uhid: string;
  caseNumber?: string;
  visitId?: string;
  age?: number | string;
  gender?: string;
  contact?: string;
  address?: string;
  guardianName?: string;
  guardianRelation?: string;
  visitType?: string;
  doctorName?: string;
  date?: string;
  consultationFee?: number;
  casePaperFee?: number;
  totalFee?: number;
}

export const generateCasePaperHtml = (data: CasePaperData): string => {
  const cFee = data.consultationFee ?? 500;
  const pFee = data.casePaperFee ?? 100;
  const tot = data.totalFee ?? (cFee + pFee);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Case Paper - ${data.uhid}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 24px; color: #1E293B; background: #FFF; }
    .header { border-bottom: 2px solid #0D9488; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .title-box h1 { font-size: 22px; color: #0D9488; margin: 0; font-weight: 800; letter-spacing: 0.5px; }
    .title-box p { font-size: 11px; color: #64748B; margin: 2px 0 0 0; }
    .case-badge { text-align: right; background: #F0FDFA; border: 1px solid #99F6E4; border-radius: 6px; padding: 6px 12px; }
    .case-badge .badge-title { font-size: 12px; font-weight: 800; color: #0F766E; }
    .case-badge .badge-id { font-size: 11px; color: #0D9488; }
    .section-title { font-size: 12px; font-weight: 800; color: #0F766E; text-transform: uppercase; margin: 14px 0 6px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
    table.info-grid { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    table.info-grid td { padding: 4px 6px; font-size: 12px; vertical-align: top; }
    .lbl { color: #64748B; font-weight: 600; width: 22%; }
    .val { color: #0F172A; font-weight: 700; width: 28%; }
    .fee-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; margin-top: 10px; }
    .fee-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
    .fee-total { display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; color: #0D9488; border-top: 1px dashed #CBD5E1; padding-top: 6px; margin-top: 6px; }
    .clinical-notes-box { height: 260px; border: 1px dashed #CBD5E1; border-radius: 6px; margin-top: 12px; padding: 12px; font-size: 11px; color: #94A3B8; }
    .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; }
    .sig-line { width: 160px; border-top: 1px solid #0F172A; text-align: center; font-weight: 700; font-size: 11px; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-box">
      <h1>SWASTIK HOSPITAL</h1>
      <p>Psychiatric Care &amp; Rehabilitation Center</p>
      <p style="font-size: 10px; color: #94A3B8;">Kolhapur, Maharashtra · Contact: +91 98765 43210</p>
    </div>
    <div class="case-badge">
      <div class="badge-title">OUTPATIENT CASE PAPER</div>
      <div class="badge-id">UHID: ${data.uhid}</div>
      <div class="badge-id">Case No: ${data.caseNumber || 'CP-' + Date.now().toString().slice(-6)}</div>
    </div>
  </div>

  <div class="section-title">Patient Identification</div>
  <table class="info-grid">
    <tr>
      <td class="lbl">Patient Name:</td>
      <td class="val">${data.patientName}</td>
      <td class="lbl">Age / Gender:</td>
      <td class="val">${data.age || '30'} Yrs / ${data.gender || 'General'}</td>
    </tr>
    <tr>
      <td class="lbl">Contact Phone:</td>
      <td class="val">${data.contact || 'N/A'}</td>
      <td class="lbl">Date of Visit:</td>
      <td class="val">${data.date || new Date().toLocaleDateString('en-GB')}</td>
    </tr>
    <tr>
      <td class="lbl">Guardian / Relation:</td>
      <td class="val">${data.guardianName || 'Self'} (${data.guardianRelation || 'Primary'})</td>
      <td class="lbl">Consulting Doctor:</td>
      <td class="val">${data.doctorName || 'Dr. P. M. Chougule'}</td>
    </tr>
    <tr>
      <td class="lbl">Address:</td>
      <td class="val" colspan="3">${data.address || 'Kolhapur, Maharashtra'}</td>
    </tr>
  </table>

  <div class="section-title">Registration &amp; Consultation Fees</div>
  <div class="fee-card">
    <div class="fee-row">
      <span>Consultation Fee:</span>
      <span>₹${cFee.toFixed(2)}</span>
    </div>
    <div class="fee-row">
      <span>Case Paper Fee (Valid for 1 Year):</span>
      <span>₹${pFee.toFixed(2)}</span>
    </div>
    <div class="fee-total">
      <span>Total Amount Paid (Receipt Confirmed):</span>
      <span>₹${tot.toFixed(2)}</span>
    </div>
  </div>

  <div class="section-title">Clinical Findings &amp; Prescriptions (Doctor's Notes)</div>
  <div class="clinical-notes-box">
    Chief Complaints / Mental Status Examination / Diagnosis / Recommended Treatment Plan:
  </div>

  <div class="footer">
    <div>Hospital Reg No: MH/KOP/MED/2024/098</div>
    <div class="sig-line">Doctor's Signature &amp; Stamp</div>
  </div>
</body>
</html>
`;
};

export const generateAdmissionSlipHtml = (data: {
  patientName: string;
  uhid: string;
  ipdNo: string;
  admissionDate: string;
  ward: string;
  roomBed: string;
  doctorName: string;
  diagnosis?: string;
  deposit?: string | number;
  attenderName?: string;
  attenderPhone?: string;
}): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Admission Slip - ${data.ipdNo}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 24px; color: #1E293B; background: #FFF; }
    .header { border-bottom: 2px solid #0D9488; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .title-box h1 { font-size: 22px; color: #0D9488; margin: 0; font-weight: 800; }
    .title-box p { font-size: 11px; color: #64748B; margin: 2px 0 0 0; }
    .badge { background: #FEF3C7; border: 1px solid #FCD34D; color: #92400E; padding: 6px 12px; border-radius: 6px; font-weight: 800; font-size: 12px; text-align: right; }
    .section-title { font-size: 12px; font-weight: 800; color: #0F766E; text-transform: uppercase; margin: 16px 0 6px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    table.info td { padding: 6px 8px; font-size: 12px; }
    .lbl { color: #64748B; font-weight: 600; width: 25%; }
    .val { color: #0F172A; font-weight: 700; width: 25%; }
    .deposit-box { background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 12px; margin: 14px 0; font-size: 13px; font-weight: 700; color: #166534; display: flex; justify-content: space-between; }
    .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; }
    .sig-line { width: 160px; border-top: 1px solid #0F172A; text-align: center; font-weight: 700; font-size: 11px; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-box">
      <h1>SWASTIK HOSPITAL</h1>
      <p>Inpatient Department (IPD) · Admission Order</p>
    </div>
    <div class="badge">
      <div>INPATIENT ADMISSION SLIP</div>
      <div>IPD No: ${data.ipdNo}</div>
    </div>
  </div>

  <div class="section-title">Patient Particulars</div>
  <table class="info">
    <tr>
      <td class="lbl">Patient Name:</td>
      <td class="val">${data.patientName}</td>
      <td class="lbl">UHID:</td>
      <td class="val">${data.uhid}</td>
    </tr>
    <tr>
      <td class="lbl">Admission Date &amp; Time:</td>
      <td class="val">${data.admissionDate}</td>
      <td class="lbl">Admitting Consultant:</td>
      <td class="val">${data.doctorName}</td>
    </tr>
    <tr>
      <td class="lbl">Ward Allocated:</td>
      <td class="val" style="color: #0F766E;">${data.ward}</td>
      <td class="lbl">Room / Bed No:</td>
      <td class="val" style="color: #0F766E;">${data.roomBed}</td>
    </tr>
    <tr>
      <td class="lbl">Attender Name:</td>
      <td class="val">${data.attenderName || 'Family Member'}</td>
      <td class="lbl">Attender Contact:</td>
      <td class="val">${data.attenderPhone || 'N/A'}</td>
    </tr>
    <tr>
      <td class="lbl">Initial Clinical Diagnosis:</td>
      <td class="val" colspan="3">${data.diagnosis || 'Psychiatric Assessment & Inpatient Observation'}</td>
    </tr>
  </table>

  <div class="deposit-box">
    <span>Admission Deposit Collected:</span>
    <span>₹${data.deposit || '5000'}.00 (Receipt Acknowledged)</span>
  </div>

  <div style="font-size: 11px; color: #64748B; margin-top: 10px; line-height: 1.5;">
    • Patients and relatives are informed of hospital guidelines and psychiatric care protocols.<br/>
    • Visiting hours: 4:00 PM to 6:00 PM only. Valuables are the responsibility of the patient/attender.
  </div>

  <div class="footer">
    <div class="sig-line">Receptionist / Ward Clerk</div>
    <div class="sig-line">Medical Superintendent</div>
  </div>
</body>
</html>
`;
};

export const generatePrescriptionHtml = (data: {
  patientName: string;
  uhid: string;
  date: string;
  doctorName?: string;
  diagnosis?: string;
  medicines: Array<{
    name: string;
    dose?: string;
    timing?: string;
    duration?: string;
    instructions?: string;
  }>;
  advice?: string;
}): string => {
  const medRows = data.medicines
    .map(
      (m, idx) => `
    <tr style="border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 8px; font-weight: 700; color: #0F172A;">${idx + 1}. ${m.name}</td>
      <td style="padding: 8px; text-align: center; color: #0F766E; font-weight: 600;">${m.dose || '1-0-1'}</td>
      <td style="padding: 8px; text-align: center; color: #64748B;">${m.timing || 'After Food'}</td>
      <td style="padding: 8px; text-align: center; color: #64748B;">${m.duration || '30 days'}</td>
      <td style="padding: 8px; color: #475569;">${m.instructions || '-'}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Prescription - ${data.uhid}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 24px; color: #1E293B; background: #FFF; }
    .header { border-bottom: 2px solid #0D9488; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .title-box h1 { font-size: 22px; color: #0D9488; margin: 0; font-weight: 800; }
    .title-box p { font-size: 11px; color: #64748B; margin: 2px 0 0 0; }
    .rx-symbol { font-size: 32px; font-weight: 900; color: #0D9488; font-family: serif; }
    .patient-bar { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; display: flex; justify-content: space-between; }
    table.rx-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    table.rx-table th { background: #E6FFFA; color: #0F766E; padding: 8px; text-align: left; border-bottom: 2px solid #0D9488; }
    .advice-box { background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 10px 14px; border-radius: 4px; margin-top: 20px; font-size: 12px; }
    .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; }
    .sig-line { width: 160px; border-top: 1px solid #0F172A; text-align: center; font-weight: 700; font-size: 11px; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-box">
      <h1>SWASTIK HOSPITAL</h1>
      <p>Psychiatric Care &amp; Rehabilitation Center · Kolhapur, Maharashtra</p>
    </div>
    <div class="rx-symbol">℞</div>
  </div>

  <div class="patient-bar">
    <div><strong>Patient:</strong> ${data.patientName} (${data.uhid})</div>
    <div><strong>Date:</strong> ${data.date}</div>
    <div><strong>Doctor:</strong> ${data.doctorName || 'Dr. P. M. Chougule'}</div>
  </div>

  ${data.diagnosis ? `<div style="font-size: 12px; margin-bottom: 12px; color: #0F766E;"><strong>Diagnosis:</strong> ${data.diagnosis}</div>` : ''}

  <table class="rx-table">
    <thead>
      <tr>
        <th>Medicine &amp; Strength</th>
        <th style="text-align: center;">Dosage</th>
        <th style="text-align: center;">Timing</th>
        <th style="text-align: center;">Duration</th>
        <th>Special Instructions</th>
      </tr>
    </thead>
    <tbody>
      ${medRows}
    </tbody>
  </table>

  ${
    data.advice
      ? `
    <div class="advice-box">
      <strong>Doctor's Advice &amp; Instructions:</strong><br/>
      ${data.advice}
    </div>
  `
      : ''
  }

  <div class="footer">
    <div>Next Follow-up: As advised by consultant</div>
    <div class="sig-line">Doctor's Signature &amp; Reg No</div>
  </div>
</body>
</html>
`;
};

export interface ConsultationReportData {
  patientName: string;
  uhid: string;
  age?: number | string;
  gender?: string;
  date: string;
  doctorName?: string;
  chiefComplaints?: string;
  hpi?: string;
  suicidalIdeation?: string;
  mseFindings?: Record<string, string[]>;
  diagnosis?: string;
  severity?: string;
  riskLevels?: {
    suicide?: string;
    selfHarm?: string;
    aggression?: string;
  };
  vitals?: {
    bp?: string;
    pulse?: string;
    temp?: string;
    weight?: string;
    bmi?: string;
  };
  medicines?: Array<{
    name: string;
    dose?: string;
    timing?: string;
    duration?: string;
    instructions?: string;
  }>;
  treatmentPlan?: {
    pharmacotherapy?: string;
    modalities?: string[];
    labOrders?: string[];
    followUp?: string;
  };
  soapNotes?: {
    s?: string;
    o?: string;
    a?: string;
    p?: string;
  };
}

export const generateConsultationReportHtml = (data: ConsultationReportData): string => {
  const mseRows = data.mseFindings
    ? Object.entries(data.mseFindings)
        .filter(([_, vals]) => vals && vals.length > 0)
        .map(
          ([category, vals]) => `
      <tr>
        <td style="padding: 6px 8px; font-weight: 700; color: #0F766E; width: 30%; text-transform: capitalize;">${category.replace(/([A-Z])/g, ' $1')}:</td>
        <td style="padding: 6px 8px; color: #1E293B;">${vals.join(', ')}</td>
      </tr>
    `
        )
        .join('')
    : '';

  const medRows = (data.medicines || [])
    .map(
      (m, idx) => `
    <tr style="border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 6px 8px; font-weight: 700; color: #0F172A;">${idx + 1}. ${m.name}</td>
      <td style="padding: 6px 8px; text-align: center; color: #0F766E;">${m.dose || '1-0-1'}</td>
      <td style="padding: 6px 8px; text-align: center; color: #64748B;">${m.timing || 'After Food'}</td>
      <td style="padding: 6px 8px; text-align: center; color: #64748B;">${m.duration || '30 days'}</td>
      <td style="padding: 6px 8px; color: #475569;">${m.instructions || '-'}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Consultation Report - ${data.uhid}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 24px; color: #1E293B; background: #FFF; font-size: 12px; }
    .header { border-bottom: 2px solid #0D9488; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .title-box h1 { font-size: 22px; color: #0D9488; margin: 0; font-weight: 800; }
    .title-box p { font-size: 11px; color: #64748B; margin: 2px 0 0 0; }
    .report-badge { background: #F0FDFA; border: 1px solid #99F6E4; color: #0F766E; padding: 6px 12px; border-radius: 6px; font-weight: 800; font-size: 11px; text-align: right; }
    .patient-bar { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; }
    .sec-head { font-size: 12px; font-weight: 800; color: #0F766E; text-transform: uppercase; margin: 14px 0 6px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
    .text-box { background: #FAFAFA; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; line-height: 1.5; }
    table.table-custom { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 10px; font-size: 12px; }
    table.table-custom th { background: #E6FFFA; color: #0F766E; padding: 6px 8px; text-align: left; }
    .risk-strip { display: flex; gap: 12px; margin: 8px 0; }
    .risk-pill { flex: 1; padding: 6px 10px; border-radius: 6px; font-weight: 700; text-align: center; }
    .risk-low { background: #DCFCE7; color: #166534; }
    .risk-mod { background: #FEF3C7; color: #92400E; }
    .risk-high { background: #FEE2E2; color: #991B1B; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; }
    .sig-line { width: 160px; border-top: 1px solid #0F172A; text-align: center; font-weight: 700; font-size: 11px; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-box">
      <h1>SWASTIK HOSPITAL</h1>
      <p>Psychiatric Care &amp; Clinical Rehabilitation Center · Kolhapur</p>
    </div>
    <div class="report-badge">
      <div>EMR CONSULTATION SUMMARY</div>
      <div>Date: ${data.date}</div>
    </div>
  </div>

  <div class="patient-bar">
    <div><strong>Patient:</strong> ${data.patientName} | <strong>UHID:</strong> ${data.uhid}</div>
    <div><strong>Age / Gender:</strong> ${data.age || 30} Yrs / ${data.gender || 'General'}</div>
    <div><strong>Doctor:</strong> ${data.doctorName || 'Dr. P. M. Chougule'}</div>
  </div>

  ${
    data.vitals
      ? `
    <div style="background: #F1F5F9; border-radius: 6px; padding: 6px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; font-size: 11px;">
      <span><strong>BP:</strong> ${data.vitals.bp || '120/80'} mmHg</span>
      <span><strong>Pulse:</strong> ${data.vitals.pulse || '72'} bpm</span>
      <span><strong>Temp:</strong> ${data.vitals.temp || '98.6'} °F</span>
      <span><strong>Weight:</strong> ${data.vitals.weight || '68'} kg</span>
      <span><strong>BMI:</strong> ${data.vitals.bmi || '23.0'} kg/m²</span>
    </div>
  `
      : ''
  }

  <div class="sec-head">1. Presenting Symptoms &amp; Clinical History</div>
  <div class="text-box">
    <strong>Chief Complaint:</strong> ${data.chiefComplaints || 'Patient presented for routine psychiatric evaluation.'}<br/>
    ${data.hpi ? `<strong>History of Present Illness (HPI):</strong> ${data.hpi}<br/>` : ''}
    <strong>Suicidal Ideation Assessment:</strong> <span style="font-weight: 700; color: ${
      data.suicidalIdeation && data.suicidalIdeation !== 'None' ? '#DC2626' : '#166534'
    };">${data.suicidalIdeation || 'None reported'}</span>
  </div>

  ${
    mseRows
      ? `
    <div class="sec-head">2. Mental Status Examination (MSE)</div>
    <table class="table-custom" style="border: 1px solid #E2E8F0;">
      <tbody>
        ${mseRows}
      </tbody>
    </table>
  `
      : ''
  }

  <div class="sec-head">3. Clinical Diagnosis &amp; Psychiatric Risk</div>
  <div class="text-box">
    <strong>Diagnosis (ICD-10):</strong> ${data.diagnosis || 'Major Depressive Disorder (F32.1)'} [${data.severity || 'Moderate'}]
  </div>
  ${
    data.riskLevels
      ? `
    <div class="risk-strip">
      <div class="risk-pill ${data.riskLevels.suicide === 'High' ? 'risk-high' : data.riskLevels.suicide === 'Moderate' ? 'risk-mod' : 'risk-low'}">
        Suicide Risk: ${data.riskLevels.suicide || 'Low'}
      </div>
      <div class="risk-pill ${data.riskLevels.selfHarm === 'High' ? 'risk-high' : data.riskLevels.selfHarm === 'Moderate' ? 'risk-mod' : 'risk-low'}">
        Self-Harm: ${data.riskLevels.selfHarm || 'Low'}
      </div>
      <div class="risk-pill ${data.riskLevels.aggression === 'High' ? 'risk-high' : data.riskLevels.aggression === 'Moderate' ? 'risk-mod' : 'risk-low'}">
        Aggression Risk: ${data.riskLevels.aggression || 'Low'}
      </div>
    </div>
  `
      : ''
  }

  ${
    medRows
      ? `
    <div class="sec-head">4. Pharmacotherapy (Prescriptions)</div>
    <table class="table-custom">
      <thead>
        <tr>
          <th>Medicine</th>
          <th style="text-align: center;">Dosage</th>
          <th style="text-align: center;">Timing</th>
          <th style="text-align: center;">Duration</th>
          <th>Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${medRows}
      </tbody>
    </table>
  `
      : ''
  }

  ${
    data.treatmentPlan
      ? `
    <div class="sec-head">5. Psychotherapy &amp; Management Plan</div>
    <div class="text-box">
      ${data.treatmentPlan.modalities?.length ? `<strong>Therapy Modalities:</strong> ${data.treatmentPlan.modalities.join(', ')}<br/>` : ''}
      ${data.treatmentPlan.labOrders?.length ? `<strong>Lab Investigations Ordered:</strong> ${data.treatmentPlan.labOrders.join(', ')}<br/>` : ''}
      <strong>Follow-up Scheduled:</strong> ${data.treatmentPlan.followUp || 'After 2 weeks'}
    </div>
  `
      : ''
  }

  <div class="footer">
    <div>Swastik Hospital EMR System · Confidential Clinical Record</div>
    <div class="sig-line">Consultant Psychiatrist</div>
  </div>
</body>
</html>
`;
};


