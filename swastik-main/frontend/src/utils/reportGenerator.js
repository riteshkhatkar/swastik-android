import jsPDF from "jspdf";
import "jspdf-autotable";
import swastikLogo from "../assets/swastiklogo.png";

/**
 * Generates a comprehensive medical report PDF.
 * @param {Object} data - The data for the report.
 * @param {Object} data.patient - Patient information (name, uhid, etc.).
 * @param {Object} data.admission - Active admission details.
 * @param {Object} data.emrData - Symptoms, MSE, Diagnosis, Treatment Plan, SOAP, Vitals, etc.
 * @param {Array} data.labOrders - List of lab orders.
 * @param {Array} data.histories - Patient history events.
 * @param {string} data.doctorName - Name of the doctor generating the report.
 */
export const generateComprehensiveReport = (data) => {
    const { patient, admission, emrData, labOrders, histories, doctorName } = data;
    const doc = new jsPDF();
    const now = new Date().toLocaleString();

    // Helper for sections
    let currentY = 15;
    const checkPageBreak = (needed) => {
        if (currentY + needed > 280) {
            doc.addPage();
            currentY = 20;
            return true;
        }
        return false;
    };

    // --- HEADER ---
    try {
        doc.addImage(swastikLogo, 'PNG', 15, 10, 25, 25);
    } catch (e) { console.warn("Logo failed", e); }

    doc.setFontSize(22);
    doc.setTextColor(13, 148, 136);
    doc.setFont(undefined, 'bold');
    doc.text("SWASTIK HOSPITAL", 45, 20);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont(undefined, 'normal');
    doc.text("Psychiatric Care & Rehabilitation Center", 45, 26);
    doc.text("123 Health Ave, Medical District, MH - 400001", 45, 31);

    doc.setDrawColor(13, 148, 136);
    doc.line(15, 38, 195, 38);

    // --- PATIENT INFO STRIP ---
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 42, 180, 22, 'F');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.setFont(undefined, 'bold');
    doc.text(`PATIENT: ${(patient?.name || "N/A").toUpperCase()} (${patient?.uhid})`, 20, 49);
    doc.text(`REPORT DATE: ${new Date().toLocaleDateString()}`, 20, 56);
    doc.text(`AGE/SEX: ${patient?.age || "N/A"} / ${patient?.gender || "N/A"}`, 120, 49);
    doc.text(`DOCTOR: ${doctorName || "Consultant Psychiatrist"}`, 120, 56);

    currentY = 75;

    // --- SECTION: SYMPTOMS & MSE ---
    doc.setFontSize(12);
    doc.setTextColor(13, 148, 136);
    doc.text("1. SYMPTOMS & MENTAL STATE EXAMINATION", 15, currentY);
    doc.line(15, currentY + 2, 105, currentY + 2);
    currentY += 10;

    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.setFont(undefined, 'bold');
    doc.text("Chief Complaint:", 15, currentY);
    doc.setFont(undefined, 'normal');
    const complaint = emrData?.chief_complaint || "None recorded";
    const splitComplaint = doc.splitTextToSize(complaint, 175);
    doc.text(splitComplaint, 15, currentY + 6);
    currentY += 10 + (splitComplaint.length * 5);

    doc.setFont(undefined, 'bold');
    doc.text("Mental State Examination (MSE) Summary:", 15, currentY);
    doc.setFont(undefined, 'normal');

    let mseSummary = emrData?.mse?.summary || "No recent MSE summary available.";
    if (typeof emrData?.mse === 'object' && !emrData.mse.summary) {
        // Maybe it's a list of findings
        const findings = Object.entries(emrData.mse)
            .filter(([_, v]) => Array.isArray(v) && v.length > 0)
            .map(([k, v]) => `${k}: ${v.join(', ')}`)
            .join('; ');
        if (findings) mseSummary = findings;
    }

    const splitMse = doc.splitTextToSize(mseSummary, 175);
    doc.text(splitMse, 15, currentY + 6);
    currentY += 10 + (splitMse.length * 5);

    // --- SECTION: DIAGNOSIS ---
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setTextColor(13, 148, 136);
    doc.text("2. DIAGNOSIS & RISK ASSESSMENT", 15, currentY);
    doc.line(15, currentY + 2, 85, currentY + 2);
    currentY += 10;

    // Support both raw API and EMR state structures
    const primaryDiag = emrData?.diagnosis?.primary_diagnosis ||
        (emrData?.diagnosis?.primary?.title ? `[${emrData?.diagnosis?.primary?.code}] ${emrData?.diagnosis?.primary?.title}` : null) ||
        "Provisional / Pending";

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Primary Diagnosis: ${primaryDiag}`, 15, currentY);
    currentY += 8;

    const riskSelf = emrData?.risk?.risk_to_self ?? emrData?.risk?.suicide_risk ?? "Low";
    const riskOthers = emrData?.risk?.risk_to_others ?? emrData?.risk?.violence_risk ?? "Low";

    doc.text(`Risk to Self: ${riskSelf}`, 15, currentY);
    doc.text(`Risk to Others: ${riskOthers}`, 120, currentY);
    currentY += 12;

    // --- SECTION: MEDICATION ---
    checkPageBreak(50);
    doc.setFontSize(12);
    doc.setTextColor(13, 148, 136);
    doc.text("3. CURRENT MEDICATION PLAN", 15, currentY);
    doc.line(15, currentY + 2, 75, currentY + 2);
    currentY += 8;

    const medRows = (emrData?.medications || []).map(m => [
        m.drug || m.drug_name || "-",
        m.dose || "-",
        m.frequency || "-",
        m.route || "PO",
        m.duration || "-"
    ]);

    doc.autoTable({
        startY: currentY,
        head: [["Medicine", "Dose", "Freq", "Route", "Duration"]],
        body: medRows.length ? medRows : [["No active medications", "-", "-", "-", "-"]],
        theme: 'grid',
        headStyles: { fillColor: [13, 148, 136] },
        styles: { fontSize: 9 }
    });
    currentY = doc.lastAutoTable.finalY + 15;

    // --- SECTION: TREATMENT PLAN ---
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setTextColor(13, 148, 136);
    doc.text("4. TREATMENT PLAN & MODALITIES", 15, currentY);
    doc.line(15, currentY + 2, 85, currentY + 2);
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Short-term Goals:", 15, currentY);
    doc.setFont(undefined, 'normal');
    const goals = Array.isArray(emrData?.treatment?.short_term_goals)
        ? emrData.treatment.short_term_goals.join(", ")
        : "Pending assessment";
    const splitGoals = doc.splitTextToSize(goals, 175);
    doc.text(splitGoals, 15, currentY + 6);
    currentY += 10 + (splitGoals.length * 5);

    // --- SECTION: SESSION NOTES ---
    checkPageBreak(50);
    doc.setFontSize(12);
    doc.setTextColor(13, 148, 136);
    doc.text("5. CLINICAL SESSION NOTES (SOAP)", 15, currentY);
    doc.line(15, currentY + 2, 85, currentY + 2);
    currentY += 10;

    const soap = emrData?.soap || {};
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text("S (Subjective):", 15, currentY); doc.setFont(undefined, 'normal');
    const sTxt = doc.splitTextToSize(soap.s || "Not recorded", 170);
    doc.text(sTxt, 20, currentY + 5); currentY += 8 + (sTxt.length * 4);

    checkPageBreak(20);
    doc.setFont(undefined, 'bold');
    doc.text("O (Objective):", 15, currentY); doc.setFont(undefined, 'normal');
    const oTxt = doc.splitTextToSize(soap.o || "Not recorded", 170);
    doc.text(oTxt, 20, currentY + 5); currentY += 8 + (oTxt.length * 4);

    // --- SECTION: VITALS ---
    checkPageBreak(50);
    doc.setFontSize(12);
    doc.setTextColor(13, 148, 136);
    doc.text("6. RECENT VITALS", 15, currentY);
    doc.line(15, currentY + 2, 50, currentY + 2);
    currentY += 8;

    const vitalRows = (emrData?.vitals || []).slice(0, 5).map(v => [
        new Date(v.recorded_at).toLocaleDateString(),
        `${v.bp_systolic || "-"}/${v.bp_diastolic || "-"}`,
        v.hr || "-",
        v.temp || "-",
        v.spo2 || "-"
    ]);

    doc.autoTable({
        startY: currentY,
        head: [["Date", "BP", "HR", "Temp", "SpO2"]],
        body: vitalRows.length ? vitalRows : [["No recent vitals recorded", "-", "-", "-", "-"]],
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139] },
        styles: { fontSize: 8 }
    });
    currentY = doc.lastAutoTable.finalY + 15;

    // --- SECTION: LAB & MONITORING ---
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setTextColor(13, 148, 136);
    doc.text("7. LAB & MONITORING", 15, currentY);
    doc.line(15, currentY + 2, 60, currentY + 2);
    currentY += 10;

    const labRows = (emrData?.labResults || []).slice(0, 5).map(l => [
        l.test_name || "-",
        l.value || "-",
        l.unit || "-",
        l.reference_range || "-",
        l.abnormal ? "ABNORMAL" : "Normal"
    ]);

    doc.autoTable({
        startY: currentY,
        head: [["Test Name", "Value", "Unit", "Reference", "Status"]],
        body: labRows.length ? labRows : [["No recent lab results", "-", "-", "-", "-"]],
        theme: 'grid',
        headStyles: { fillColor: [13, 148, 136] },
        styles: { fontSize: 8 }
    });
    currentY = doc.lastAutoTable.finalY + 15;

    // --- SECTION: HISTORY ---
    checkPageBreak(50);
    doc.setFontSize(12);
    doc.setTextColor(13, 148, 136);
    doc.text("8. PATIENT HISTORY TIMELINE", 15, currentY);
    doc.line(15, currentY + 2, 75, currentY + 2);
    currentY += 10;

    const historyRows = (histories || []).slice(0, 10).map(h => [
        h.date || "-",
        h.description || "-"
    ]);

    doc.autoTable({
        startY: currentY,
        head: [["Date", "Event Description"]],
        body: historyRows.length ? historyRows : [["No historical events recorded", "-"]],
        theme: 'plain',
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 35 } }
    });

    // --- FOOTER / SIGNATURE ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`SWASTIK HOSPITAL - Confidential Medical Report | Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
        doc.text(`Generated on: ${now}`, 195, 287, { align: 'right' });
    }

    currentY = doc.lastAutoTable.finalY + 30;
    if (currentY > 260) { doc.addPage(); currentY = 40; }
    doc.line(15, currentY, 80, currentY);
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(doctorName || "Consultant Psychiatrist", 15, currentY + 6);
    doc.text("Registration No: MH/2023/004251", 15, currentY + 11);

    doc.save(`Medical_Report_${patient?.uhid}_${Date.now()}.pdf`);
};
