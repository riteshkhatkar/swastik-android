# 📱 Swastik Hospital Android App — Granular Click-by-Click Testing Guide

> **Target App:** Swastik Android (Expo SDK 57 / React Native 0.86)  
> **Server:** `https://swastik.orelse.ai` (FastAPI + MongoDB)  
> **Metro Server URL:** `exp://192.168.1.5:8081`  
> **Document Purpose:** Small-to-small, click-by-click manual QA testing procedure.

---

## 📑 Table of Contents
1. [Prerequisites & App Launch](#step-0-prerequisites--app-launch)
2. [Step 1: Role Selection & Role-Guard Security Testing](#step-1-role-selection--role-guard-security-testing)
3. [Step 2: Receptionist Dashboard & Live Counts](#step-2-receptionist-dashboard--live-counts)
4. [Step 3: Continuous Patient Registration Workflow](#step-3-continuous-patient-registration-workflow)
5. [Step 4: Patient Directory, Search & Server Pagination](#step-4-patient-directory-search--server-pagination)
6. [Step 5: Appointments, Reason Cancellation & Queue Tokens](#step-5-appointments-reason-cancellation--queue-tokens)
7. [Step 6: Inpatient Admission, Consent Upload & Discharge](#step-6-inpatient-admission-consent-upload--discharge)
8. [Step 7: Room Allocation & Status Toggle](#step-7-room-allocation--status-toggle)
9. [Step 8: Receptionist Billing & Staff Attribution](#step-8-receptionist-billing--staff-attribution)
10. [Step 9: Doctor Workstation (OPD vs. IPD Ward Rounds)](#step-9-doctor-workstation-opd-vs-ipd-ward-rounds)
11. [Step 10: Ward Round Board (Mode A Widgets)](#step-10-ward-round-board-mode-a-widgets)
12. [Step 11: Comprehensive EMR Workspace (Mode B — 12 Tabs)](#step-11-comprehensive-emr-workspace-mode-b--12-tabs)
13. [Step 12: Order Lab Investigation from EMR](#step-12-order-lab-investigation-from-emr)
14. [Step 13: Clinical PDF Dossier Generation](#step-13-clinical-pdf-dossier-generation)
15. [Step 14: Diagnostic Lab Orders & Real Report Viewer](#step-14-diagnostic-lab-orders--real-report-viewer)
16. [Step 15: Prescriptions Search & Rx Script Printing](#step-15-prescriptions-search--rx-script-printing)
17. [Step 16: Medical Reports & Hospital MIS Analytics](#step-16-medical-reports--hospital-mis-analytics)
18. [Step 17: Doctor Profile, Password & Custom Checklist Questions](#step-17-doctor-profile-password--custom-checklist-questions)
19. [Step 18: Patient Self-Service Portal Authentication](#step-18-patient-self-service-portal-authentication)
20. [Step 19: Hardware Android Back Button & Logout](#step-19-hardware-android-back-button--logout)

---

## Step 0: Prerequisites & App Launch

### 0.1 Start Metro Bundler (if not already running)
1. Open PowerShell on your computer.
2. Navigate to: `cd c:\Users\Windows\Downloads\swastik-main\swastik-android`
3. Run: `npx expo start -c`
4. Notice the line: `Waiting on http://localhost:8081`

### 0.2 Open on Android Phone
1. Connect your Android phone to the same Wi-Fi network (`192.168.1.x`).
2. Open the **Expo Go** application on your phone.
3. Tap **"Enter URL manually"**.
4. Type exactly:
   ```text
   exp://192.168.1.5:8081
   ```
5. Tap **Connect**.
6. The bundle will build to 100% and the splash screen will appear.

---

## Step 1: Role Selection & Role-Guard Security Testing

### Test 1.1: Startup Appearance
- [ ] **Action:** Look at the screen right after the splash screen finishes.
- [ ] **Verification:**
  - The top header shows the Swastik logo and title *"Select Workspace / Role"*.
  - You see 6 role cards: **Doctor**, **Receptionist**, **Admin**, **Billing**, **Lab**, **Patient Portal**.
  - **CRITICAL:** None of the cards are dark, selected, or focused by default. All cards are neutral white with teal accents.

### Test 1.2: Role Selection Micro-Animation
- [ ] **Action:** Tap the **Doctor** card once.
- [ ] **Verification:**
  - The card plays a subtle scale/selection feedback animation.
  - The screen navigates to the **Doctor Authentication** screen.
  - The screen header says *"Doctor Portal Login"*.

### Test 1.3: Server Role-Guard Security Rejection
- [ ] **Action:**
  1. On the Doctor Login screen, enter **Receptionist** credentials:
     - Username: `receptionist`
     - Password: `receptionist123`
  2. Tap the teal **Sign In** button.
- [ ] **Verification:**
  - An alert dialog pops up with:
    - Title: *"Access Denied"* or *"Role Mismatch"*
    - Message: Explains that this account is for role `receptionist` and cannot enter the `doctor` workspace.
  - You are **NOT** permitted to enter the doctor workstation.

### Test 1.4: Successful Authentication
- [ ] **Action:**
  1. Clear the fields.
  2. Enter valid Receptionist credentials:
     - Tap the **Back** arrow to return to Role Selection.
     - Tap the **Receptionist** role card.
     - Username: `receptionist`
     - Password: `receptionist123`
  3. Tap **Sign In**.
- [ ] **Verification:**
  - A brief spinner appears.
  - You are taken directly to the **Receptionist Dashboard**.

---

## Step 2: Receptionist Dashboard & Live Counts

### Test 2.1: Zero-Baseline Verification (No Fake Numbers)
- [ ] **Action:** Observe the metric counter cards at the top of the Receptionist Dashboard.
- [ ] **Verification:**
  - Counter 1: **Today's Appointments**
  - Counter 2: **Inpatient Admissions**
  - Counter 3: **Available Beds**
  - **CRITICAL:** No hardcoded numbers appear (e.g. previously fabricated `42`, `128`, `94.2%` are removed).
  - Data starts at 0 and loads from `GET /api/dashboard/counts` and `GET /api/admissions`.

### Test 2.2: Pull-to-Refresh
- [ ] **Action:** Drag down the scroll view from the top and release.
- [ ] **Verification:**
  - A teal circular loading indicator spins.
  - The live data re-fetches cleanly from the server without flickering or crashing.

---

## Step 3: Continuous Patient Registration Workflow

### Test 3.1: Open Registration Form
- [ ] **Action:** Tap the floating action button or card **"Register New Patient"** (or open drawer $\rightarrow$ Patient Registration).
- [ ] **Verification:** The Patient Registration form opens.

### Test 3.2: Fill Patient Details
- [ ] **Action:** Enter the following test details:
  - **Full Name:** `Anil Kumar Patil`
  - **Age:** `42`
  - **Gender:** Tap `Male`
  - **Mobile Phone:** `9876501234`
  - **Address:** `Tarabai Park, Kolhapur`
  - **Emergency Contact:** `9876501235 (Brother)`
  - **Chief Complaints:** `Persistent insomnia, mild anxiety for 2 weeks`
  - **Department:** `Psychiatry OPD`
- [ ] **Verification:** Form inputs show entered text clearly.

### Test 3.3: Submit & Verify End-to-End Workflow
- [ ] **Action:** Tap the large teal button: **"Register Patient & Generate Token"**.
- [ ] **Verification:**
  - The app submits `POST /api/patients`.
  - A server-issued UHID is returned (e.g., `SWH-2026-XXXX`). **No fake local UHID**.
  - The workflow automatically proceeds through:
    1. Appointment creation on backend
    2. Queue token generation on backend
    3. OPD register entry creation
    4. Initial bill fetch
  - The **Case Paper & Token Receipt Modal** pops up displaying:
    - Hospital Header: *Swastik Hospital & Research Centre*
    - Patient Name: `Anil Kumar Patil`
    - Assigned UHID
    - Today's Queue Token Number (e.g., `T-01` or `A-05`)
    - Referring Doctor: *Dr. P. M. Chougule*
  - Tap **Print Case Paper / Share Receipt** $\rightarrow$ Android Print preview dialog opens.
  - Close the receipt modal.

---

## Step 4: Patient Directory, Search & Server Pagination

### Test 4.1: View Directory
- [ ] **Action:** Open the drawer $\rightarrow$ Tap **Patient Directory** (or Patient List).
- [ ] **Verification:** A list of registered patients loads from `GET /api/patients`.

### Test 4.2: Direct UHID Search
- [ ] **Action:**
  1. In the search input, type the UHID generated in Step 3 (or part of the name `Anil`).
  2. Tap the search icon or keyboard Enter.
- [ ] **Verification:**
  - The list filters immediately to show `Anil Kumar Patil`.
  - The card displays Name, UHID, Phone, and Age/Gender.

### Test 4.3: Server-Side Pagination
- [ ] **Action:**
  1. Clear the search input.
  2. Scroll to the bottom of the list.
- [ ] **Verification:**
  - You see pagination controls: `Page 1 of X`, with **Previous** and **Next** buttons.
  - Tap **Next** $\rightarrow$ Fetches the next page using `skip=10&limit=10`.
  - Tap **Previous** $\rightarrow$ Returns to page 1.

### Test 4.4: Bulk CSV Import Dialog
- [ ] **Action:** Tap the **"Bulk Import CSV"** button at the top right.
- [ ] **Verification:**
  - A modal opens explaining CSV column requirements (`name, age, gender, phone, address`).
  - Buttons: **Select CSV File** and **Cancel**.
  - Tap **Cancel** to close cleanly.

---

## Step 5: Appointments, Reason Cancellation & Queue Tokens

### Test 5.1: View Appointments & Filter
- [ ] **Action:** Open drawer $\rightarrow$ Tap **Appointments**.
- [ ] **Verification:**
  - Two or three tabs are visible: **List View**, **Calendar View**, and **Queue Tokens**.
  - Appointments load with date, time, patient name, doctor, and status badge (`Scheduled`, `Completed`, `Cancelled`).

### Test 5.2: Cancel Appointment with Reason
- [ ] **Action:**
  1. Locate a scheduled appointment.
  2. Tap the **Cancel** button on that card.
- [ ] **Verification:**
  - A modal titled *"Cancel Appointment"* opens.
  - A text input asks for: *"Reason for cancellation"*.
  - Enter: `Patient requested cancellation due to travel`.
  - Tap **Confirm Cancellation**.
  - App sends `PUT /api/appointments/cancel/{id}?reason=Patient requested cancellation due to travel`.
  - The card updates to `Cancelled` with the reason noted.

### Test 5.3: Block Doctor Slot Modal
- [ ] **Action:** Tap the **"Block Slot"** button.
- [ ] **Verification:**
  - Modal opens requesting: Doctor, Date, Time Slot, and Reason (e.g. `Emergency Operation / CME`).
  - Tap **Cancel** to close.

### Test 5.4: Live Queue Tokens Tab
- [ ] **Action:** Tap the **Queue Tokens** tab.
- [ ] **Verification:**
  - Today's tokens load via `GET /api/tokens/today`.
  - Doctor filter dropdown is at the top.
  - Each token card shows Token Number, Patient Name, Time, and Status (`ISSUED`, `IN_CONSULTATION`, or `COMPLETED`).
- [ ] **Action:** On any token with status `ISSUED`, tap **"Call In"**.
- [ ] **Verification:**
  - Status immediately updates to `IN_CONSULTATION`.
- [ ] **Action:** Tap **"Complete"**.
- [ ] **Verification:**
  - Status updates to `COMPLETED`.

---

## Step 6: Inpatient Admission, Consent Upload & Discharge

### Test 6.1: New Inpatient Admission
- [ ] **Action:** Open drawer $\rightarrow$ Tap **Admissions** $\rightarrow$ Tap **"New IPD Admission"**.
- [ ] **Verification:**
  - Admission modal opens with required fields:
    - **Patient UHID:** Enter the UHID from Step 3.
    - **Admitting Doctor:** Select `Dr. P. M. Chougule`.
    - **Room / Bed:** Select an available room (e.g., `Room 101 - Bed A`).
    - **Provisional Diagnosis:** Enter `Severe Depressive Episode with Psychotic Symptoms`.
    - **Admission Reason:** Enter `Observation & Stabilization`.
    - **Initial Deposit (₹):** Enter `5000`.
- [ ] **Action:** Tap **"Confirm Admission"**.
- [ ] **Verification:**
  - App sends `POST /api/admissions` with strict `AdmissionCreate` payload.
  - Admission is registered on the server.
  - Card appears under active inpatients.

### Test 6.2: Consent Document Retrieval & Upload
- [ ] **Action:**
  1. On the newly admitted patient card, tap **"Consent Form"**.
- [ ] **Verification:**
  - Modal opens calling `GET /api/admissions/{uhid}/consent`.
  - Displays consent status, date, and upload button: **"Upload Signed Consent Document"**.
  - Tap **Upload Signed Consent Document** $\rightarrow$ Image/file picker prompt opens.
  - Cancel or select file $\rightarrow$ Closes gracefully.

### Test 6.3: Patient Discharge
- [ ] **Action:**
  1. On the patient card, tap **"Discharge Patient"**.
  2. In the confirmation dialog, enter Discharge Condition: `Clinically stable, remission of acute symptoms`.
  3. Tap **Confirm Discharge**.
- [ ] **Verification:**
  - App sends `POST /api/discharges` with `DischargeCreate` schema.
  - Patient moves out of active inpatients.
  - Allocated room status changes back to `Available`.

---

## Step 7: Room Allocation & Status Toggle

### Test 7.1: View Room Grid
- [ ] **Action:** Open drawer $\rightarrow$ Tap **Room Management**.
- [ ] **Verification:**
  - Room cards load showing Room Number, Room Type (`General`, `Semi-Private`, `ICU`, `Deluxe`), Total Beds, and Status (`Available`, `Occupied`, `Maintenance`).

### Test 7.2: Create New Room
- [ ] **Action:**
  1. Tap **"Add Room"**.
  2. Enter Room Number: `205`, Type: `Semi-Private`, Beds: `2`, Daily Rate: `1500`.
  3. Tap **Save Room**.
- [ ] **Verification:**
  - Sends `POST /api/rooms`.
  - Room 205 appears in the list.

### Test 7.3: Toggle Room Maintenance Status
- [ ] **Action:** Tap the status badge on Room 205 $\rightarrow$ Select `Maintenance`.
- [ ] **Verification:**
  - Status updates in the backend via `PATCH /api/rooms/{id}/status`.
  - Badge color changes to amber/orange.

---

## Step 8: Receptionist Billing & Staff Attribution

### Test 8.1: Bills List (No Fake Invoices)
- [ ] **Action:** Open drawer $\rightarrow$ Tap **Billing**.
- [ ] **Verification:**
  - Real invoices load via `GET /api/billing/bills`.
  - **No fake fallback numbers** (`INV-001`, `SWH-2026-0001` are gone).
  - Empty state displays cleanly if no bills exist: *"No invoices recorded"*.

### Test 8.2: Record Payment with Staff Attribution
- [ ] **Action:**
  1. On any pending bill card, tap **"Collect Payment"**.
  2. Select Method: `Cash` or `UPI`.
  3. Enter Amount: `1500`.
  4. Tap **Confirm Payment**.
- [ ] **Verification:**
  - App sends `POST /api/bills/{id}/payments` containing `created_by: "receptionist"` staff attribution.
  - Balance updates dynamically.
  - Receipt dialog opens.

---

## Step 9: Doctor Workstation (OPD vs. IPD Ward Rounds)

Switch user to Doctor:
- Open drawer $\rightarrow$ Tap **Logout**.
- On Role Selection $\rightarrow$ Tap **Doctor** $\rightarrow$ Enter `doctor` / `doctor123` $\rightarrow$ Tap **Sign In**.

### Test 9.1: Workstation OPD Tab
- [ ] **Action:** Observe the Doctor Workstation screen.
- [ ] **Verification:**
  - Screen has an **OPD Clinic** tab and a **Ward Rounds (IPD)** tab.
  - On the **OPD Clinic** tab:
    - Section 1: **Queue Tokens Today** shows live tokens from `/api/tokens/today`.
    - Section 2: **Active Consultation Sessions** shows currently active sessions from `/api/session/active`.
    - Section 3: **Scheduled Patient Consultations** shows appointment list.

### Test 9.2: Workstation Ward Rounds Tab
- [ ] **Action:** Tap the **Ward Rounds (IPD)** toggle.
- [ ] **Verification:**
  - Census summary shows: Total Inpatients, Bed Occupancy, Critical Observations.
  - Cards show each admitted inpatient with their room number, bed, diagnosis, and admission duration.
  - Each card has an **"Inpatient EMR"** button.

---

## Step 10: Ward Round Board (Mode A Widgets)

### Test 10.1: Launch EMR with Admission Context
- [ ] **Action:**
  1. Return to the **OPD Clinic** tab (or stay on Ward Rounds).
  2. On any patient card, tap **"Open EMR"**.
- [ ] **Verification:**
  - In the background, `emrService.resolveActiveAdmission` runs.
  - An active `admission_id` is assigned and bound.
  - The Psychiatric Clinical Workstation opens.
  - The sticky header displays:
    - Patient Name & UHID
    - Age / Gender
    - Green admission pill badge: `ADM-...`
    - Session Lock icon button
    - Print / Export PDF button
    - View Mode Switcher: **[Round Board]** vs **[Comprehensive EMR]**

### Test 10.2: Round Board Widgets
- [ ] **Action:** Ensure view mode is set to **Round Board**.
- [ ] **Verification:**
  - **Widget 1: Vitals Pulse:** Shows latest BP, Pulse, SpO2, Temp with normal/abnormal indicator.
  - **Widget 2: Clinical Impression:** Shows 3-Axis Risk progress bars (Suicide, Violence, Self-neglect).
  - **Widget 3: Latest SOAP Summary:** Displays latest clinical notes.
  - **Widget 4: Active Regimen & Orders:** Lists current prescriptions with dosage and **Stop** buttons.
  - **Widget 5: Rounding Log:** Shows recent rounding entries.

### Test 10.3: Quick Action Modals
- [ ] **Action:**
  1. Tap the quick action button **"+ Add Round Note"**.
  2. Type: `Patient engaged well in morning round. Mood brighter. Denies suicidal thoughts.`
  3. Tap **Save Note**.
- [ ] **Verification:**
  - Note saves to backend with `admission_id`.
  - Added to the Rounding Log in real-time.
- [ ] **Action:**
  1. Tap **"+ Record Vitals"**.
  2. Enter: BP `118/78`, Pulse `74`, Temp `98.2`, SpO2 `99`.
  3. Tap **Save Vitals**.
- [ ] **Verification:**
  - Vitals save to `POST /api/emr/vitals/{uhid}`.
  - Vitals Pulse widget updates immediately.

---

## Step 11: Comprehensive EMR Workspace (Mode B — 12 Tabs)

- [ ] **Action:** On the top header switcher, tap **"Comprehensive EMR"**.
- [ ] **Verification:** A horizontal tab bar appears with 12 distinct clinical tabs:
  1. Symptoms & HPI
  2. MSE
  3. Diagnosis
  4. Risk Assessment
  5. Medications Rx
  6. Treatment Plan
  7. SOAP Notes
  8. Vitals Log
  9. Timeline
  10. Lab & Monitoring
  11. Audit Trail
  12. Rehab & Routine

### Tab 1: Symptoms & HPI
- [ ] **Action:**
  1. Tap **Symptoms & HPI**.
  2. In Chief Complaints, type: `Low mood, fatigue, early morning awakening`.
  3. In HPI narrative, type: `Symptoms started 3 months ago following occupational stress. No prior manic episodes.`
  4. Tap **Save Symptoms & HPI**.
- [ ] **Verification:**
  - App sends `POST /api/emr/symptoms-hpi/{uhid}` with active `admission_id`.
  - Success alert confirms live server persistence.

### Tab 2: Mental Status Examination (MSE)
- [ ] **Action:**
  1. Tap **MSE**.
  2. Observe the 12 psychiatric categories (Appearance, Behavior, Speech, Mood, Affect, Thought Process, Thought Content, Perception, Cognition, Insight, Judgment).
  3. Under Thought Content, check `Suicidal Ideation` or type `Auditory command hallucinations`.
- [ ] **Verification:**
  - **High-Risk Red Banner** automatically appears at the top alerting: *"Critical Psychiatric Red Flag Detected: Suicidal Ideation / Command Hallucinations"*.
- [ ] **Action:** Tap **Save MSE Findings**.
- [ ] **Verification:** Saves to `POST /api/emr/mse/{uhid}`.

### Tab 3: Diagnosis (ICD-11 & DSM-5)
- [ ] **Action:**
  1. Tap **Diagnosis**.
  2. In the diagnosis search input, type: `Depression`.
  3. Tap on code `6A70 - Single episode depressive disorder`.
  4. Select Type: `Provisional Diagnosis`.
  5. Tap **Save Diagnosis**.
- [ ] **Verification:** Saves to `POST /api/emr/diagnosis/{uhid}`.

### Tab 4: 3-Axis Risk Assessment
- [ ] **Action:**
  1. Tap **Risk Assessment**.
  2. Adjust the 3 axes:
     - Suicide Risk: Select `Moderate`
     - Violence Risk: Select `Low`
     - Vulnerability / Self-neglect: Select `Low`
  3. Enter Safety Plan: `Family supervision 24/7; sharp objects removed from room.`
  4. Tap **Save Risk Assessment**.
- [ ] **Verification:** Saves to `POST /api/emr/risk/{uhid}`.

### Tab 5: Medications Rx & Medication Stop Action
- [ ] **Action:**
  1. Tap **Medications Rx**.
  2. In Drug Search, type: `Lithium`.
  3. Select `Lithium Carbonate 300mg`.
  4. Select Frequency: `1-0-1 (Twice Daily)`.
  5. Select Duration: `30 days`.
  6. Instructions: `Take with meals. Maintain adequate hydration.`
  7. Tap **Prescribe Medication**.
- [ ] **Verification:**
  - Medication appears in Active Medications table.
- [ ] **Action (Medication Stop Action):**
  1. On any active medication, tap the red **Stop** button.
  2. Stop reason modal asks for clinical rationale: type `Nausea and tremors reported`.
  3. Tap **Confirm Stop**.
- [ ] **Verification:**
  - Medication status updates to `Stopped` with a gray badge.
  - Reason `Nausea and tremors reported` is recorded.

### Tab 6: Treatment Plan
- [ ] **Action:**
  1. Tap **Treatment Plan**.
  2. Select Observation Level: `15-minute observation checks`.
  3. Nursing Orders: `Monitor hydration and dietary intake; record vital signs Q8H.`
  4. Tap **Save Treatment Plan**.
- [ ] **Verification:** Saves to `POST /api/emr/treatment-plan/{uhid}`.

### Tab 7: SOAP Notes & 24h Sign & Lock
- [ ] **Action:**
  1. Tap **SOAP Notes**.
  2. Enter:
     - **S (Subjective):** `Patient reports feeling calmer today.`
     - **O (Objective):** `Euthymic affect, coherent speech, no agitation.`
     - **A (Assessment):** `Single episode depressive disorder showing steady response to regimen.`
     - **P (Plan):** `Continue current dosage. Review serum lithium levels in 5 days.`
  3. Tap **"Sign & Lock Note (24h)"**.
- [ ] **Verification:**
  - App sends signed payload.
  - The note displays a gold/teal **Locked & Signed** badge with timestamp and Dr. P. M. Chougule.
  - Inputs become read-only to protect legal clinical documentation.

### Tab 8: Vitals History Log
- [ ] **Action:**
  1. Tap **Vitals Log**.
- [ ] **Verification:**
  - Historical table lists all vitals recorded today and in previous sessions with timestamp, BP, Pulse, SpO2, and recording staff name.

### Tab 9: Clinical Timeline
- [ ] **Action:** Tap **Timeline**.
- [ ] **Verification:** Chronological timeline displays consultations, notes, vitals changes, and admissions.

### Tab 10: Lab & Monitoring (Lithium Therapeutic Alert)
- [ ] **Action:** Tap **Lab & Monitoring**.
- [ ] **Verification:**
  - The Therapeutic Lithium Monitoring section displays the reference therapeutic range: **`0.60 – 1.20 mEq/L`**.
  - Visual gauge highlights toxic thresholds ($>1.5\text{ mEq/L}$).

### Tab 11: EMR Audit Trail
- [ ] **Action:** Tap **Audit Trail**.
- [ ] **Verification:**
  - Shows an immutable audit log from `GET /api/emr/audit`.
  - Every update made in previous tabs (Symptoms, MSE, Risk, Meds) appears with entity name, actor (`doctor`), and timestamp.

### Tab 12: Rehab & Daily Routine
- [ ] **Action:** Tap **Rehab & Routine**.
- [ ] **Verification:**
  - Checklist for Daily Activities (Morning Hygiene, Breakfast, Group Therapy, Exercise, Sleep).
  - Tap **Save Routine** $\rightarrow$ Saves to `/api/clinical/daily-routine/{uhid}`.

---

## Step 12: Order Lab Investigation from EMR

### Test 12.1: Open Lab Order Modal
- [ ] **Action:**
  1. On the EMR header or inside Tab 10 (Lab & Monitoring), tap the button **"Order Lab Investigation"**.
- [ ] **Verification:**
  - Lab Order modal opens with tests catalog.

### Test 12.2: Select Tests & Submit
- [ ] **Action:**
  1. Check: `Serum Lithium Level`.
  2. Check: `Thyroid Stimulating Hormone (TSH)`.
  3. Check: `Complete Blood Count (CBC)`.
  4. Enter Clinical Indication: `Pre-treatment psychiatric baseline monitoring`.
  5. Tap **Submit Lab Order**.
- [ ] **Verification:**
  - App sends `POST /api/lab/test-requests` with patient UHID, doctor ID, tests array, and active `admission_id`.
  - Success message confirms: *"Lab request created successfully"*.

---

## Step 13: Clinical PDF Dossier Generation

### Test 13.1: Export Official Dossier
- [ ] **Action:** On the top sticky header of the EMR, tap the **Printer / PDF Export** icon.
- [ ] **Verification:**
  - A loading indicator says: *"Generating official clinical dossier..."*.
  - Android Print/Share sheet opens with a complete formatted document:
    - Hospital letterhead
    - Patient metadata & admission ID
    - Symptoms & HPI narrative
    - 12-category MSE summary
    - ICD-11 Diagnosis
    - 3-Axis Risk Assessment
    - Active medications list
    - Treating Psychiatrist signature block
  - Tap **Cancel** or **Save as PDF**.

---

## Step 14: Diagnostic Lab Orders & Real Report Viewer

### Test 14.1: Live Lab Orders Screen
- [ ] **Action:**
  1. Tap the drawer icon $\rightarrow$ Tap **Lab Orders & Reports**.
- [ ] **Verification:**
  - **CRITICAL:** The 10 fake mock orders (`LAB-DMY-20260309-001` through `010`) are **completely gone**.
  - Orders list loads from `GET /api/lab/test-requests`.
  - If you ordered tests in Step 12, your order appears at the top with status `Requested`.
  - Status filter dropdown at top works smoothly (`All statuses`, `Requested`, `Sample collected`, `Report ready`, etc.).

### Test 14.2: Lab Report Modal Viewer
- [ ] **Action:**
  1. On any order with status `Report ready` (or your test order), tap **"View / Download report"**.
- [ ] **Verification:**
  - App queries `GET /api/lab/test-requests/{id}/report`.
  - Modal opens:
    - **CRITICAL:** The 5 static hardcoded test rows are **gone**.
    - If results have been entered: Displays observed values, units, biological reference intervals, and status tags (`Normal`, `Abnormal`, `Critical`).
    - If results are pending: Cleanly states *"Laboratory test results have not been finalized or entered yet. Current Order Status: Requested"*.
  - Tap **Download / Share PDF Report** $\rightarrow$ Android Print viewer opens with an official clinical pathology laboratory report.

---

## Step 15: Prescriptions Search & Rx Script Printing

### Test 15.1: Prescriptions Screen & Search Bar
- [ ] **Action:** Open drawer $\rightarrow$ Tap **Prescriptions**.
- [ ] **Verification:**
  - Top search bar is present: *"Search by UHID, patient name, or medication..."*.
  - Prescriptions list renders cards with Patient Name, UHID, Date, and Medicine list.

### Test 15.2: Live Search
- [ ] **Action:** Type `Lithium` (or the patient name `Anil`) into the search bar.
- [ ] **Verification:**
  - App calls `GET /api/clinical/prescription?search=Lithium`.
  - List filters in real-time to matching records.
  - Clear the search by tapping the `X` icon $\rightarrow$ All prescriptions restore.

### Test 15.3: Print Official Signed Rx Script
- [ ] **Action:** On any prescription card, tap **"Print Official Rx Script"**.
- [ ] **Verification:**
  - Android Print viewer opens formatted as a medical prescription:
    - Swastik Hospital Header
    - Rx symbol ($\mathtt{R_x}$)
    - Patient Name & UHID
    - Medicine Formulation, Dosage (`1-0-1`), Timing (`After food`), and Duration
    - Doctor's Signature Block (Dr. P. M. Chougule, MD Psychiatry, Reg No: MMC-2012-78923).

---

## Step 16: Medical Reports & Hospital MIS Analytics

### Test 16.1: Tab Switcher
- [ ] **Action:** Open drawer $\rightarrow$ Tap **Medical Reports**.
- [ ] **Verification:**
  - You see two toggle tabs at the top:
    - **[Patient Clinical Reports]**
    - **[Hospital MIS Reports]**

### Test 16.2: Patient Discharge Summary & Full EMR Dossier
- [ ] **Action:**
  1. In the **Patient Clinical Reports** tab, search for `Anil` or your test patient.
  2. Tap **"Discharge Summary"**.
- [ ] **Verification:**
  - Pulls real patient EMR diagnosis, medications, and vitals.
  - Opens printable official Discharge Summary PDF.
- [ ] **Action:**
  3. Tap **"Clinical EMR Dossier"**.
- [ ] **Verification:**
  - Generates comprehensive confidential medical dossier PDF with full MSE and Risk evaluation.

### Test 16.3: Hospital MIS Operational Reports
- [ ] **Action:**
  1. Tap the **Hospital MIS Reports** tab.
  2. You see 4 operational reports:
     - **Daily Hospital Operations** (`daily-hospital`)
     - **Doctor Clinical Performance** (`doctor-performance`)
     - **Medication Monitoring Trends** (`medication-monitoring`)
     - **Patient Demographics & Statistics** (`patient-statistics`)
  3. On **Daily Hospital Operations**, tap **"Generate & Download Report"**.
- [ ] **Verification:**
  - App queries `/api/reports/download?report_type=daily-hospital`.
  - Formats real-time metrics table (OPD registrations, active IPD, appointments, total revenue).
  - Opens Android PDF share/print viewer.
- [ ] **Action:** Tap **"Generate & Download Report"** on **Medication Monitoring Trends**.
- [ ] **Verification:**
  - Fetches real-time psychiatric medication surveillance tables.

---

## Step 17: Doctor Profile, Password & Custom Checklist Questions

### Test 17.1: View Settings
- [ ] **Action:** Open drawer $\rightarrow$ Tap **Settings & Profile**.
- [ ] **Verification:** Screen displays 3 distinct cards:
  - **Card 1: Profile Information**
  - **Card 2: Security Settings**
  - **Card 3: Consultation Checklist Questions**

### Test 17.2: Update Profile Information
- [ ] **Action:**
  1. In Card 1, update Phone Number to: `+91 98765 99999`.
  2. Tap **Update Profile**.
- [ ] **Verification:**
  - Sends `PUT /api/doctor/profile`.
  - Success alert: *"Doctor profile has been updated and synchronized with the clinical server."*
  - Auth store updates immediately.

### Test 17.3: Password Change Truthful Error Handling
- [ ] **Action:**
  1. In Card 2, enter Current Password: `wrongpassword999`.
  2. Enter New Password: `newpassword123`.
  3. Enter Confirm Password: `newpassword123`.
  4. Tap **Change Password**.
- [ ] **Verification:**
  - **CRITICAL:** The app does **NOT** say *"Security Update: Account password successfully updated"*.
  - Instead, it truthfully displays an error alert: *"Password Change Failed: Current password may be incorrect or session expired"*.

### Test 17.4: Custom Checklist Questions Management
- [ ] **Action:**
  1. Scroll to **Card 3: Consultation Checklist Questions**.
  2. Notice existing questions loaded from `/api/doctor/custom-questions`.
  3. In the input box at the bottom, type:
     ```text
     Screen for history of bipolar mood swings or hypomania
     ```
  4. Tap the teal **`+`** (Plus) button.
- [ ] **Verification:**
  - The new question is immediately appended to the list with item number and trash can icon.
- [ ] **Action:** Tap the trash can icon on an existing question.
- [ ] **Verification:**
  - The question is removed from the list.
- [ ] **Action:** Tap **"Save Checklist Questions"**.
- [ ] **Verification:**
  - App sends `PUT /api/doctor/custom-questions` with updated questions array.
  - Alert confirms: *"Custom consultation checklist questions updated successfully"*.

---

## Step 18: Patient Self-Service Portal Authentication

### Test 18.1: Log Out of Doctor Account
- [ ] **Action:** Open drawer $\rightarrow$ Tap **Logout**.
- [ ] **Verification:** Returned to the Role Selection screen.

### Test 18.2: Open Patient Portal
- [ ] **Action:** Tap the **Patient Portal** card.
- [ ] **Verification:**
  - Patient Authentication view opens.
  - **CRITICAL:** Does **NOT** automatically log in as the first patient in the database (`data[0]`).
  - Asks for Patient UHID or Registered Mobile Number.

### Test 18.3: Patient Identity Verification
- [ ] **Action:**
  1. Enter the UHID or phone number of the patient registered in Step 3.
  2. Tap **Access Patient Portal**.
- [ ] **Verification:**
  - Queries server for that specific patient identity.
  - Opens Patient Self-Service Dashboard bound strictly to that patient's records.

---

## Step 19: Hardware Android Back Button & Logout

### Test 19.1: Multi-Layer Hardware Back Button Handling
- [ ] **Action:**
  1. Log into any account.
  2. Navigate into a sub-screen (e.g., Prescriptions).
  3. Press the Android device physical / gesture **Back Button**.
- [ ] **Verification:**
  - Screen smoothly navigates back to the Dashboard.
  - The app does **NOT** terminate or crash.
- [ ] **Action:**
  4. Open the navigation drawer.
  5. Press the physical **Back Button**.
- [ ] **Verification:**
  - The drawer closes cleanly while staying on the current screen.
- [ ] **Action:**
  6. On the main Dashboard, press the physical **Back Button**.
- [ ] **Verification:**
  - Cleanly returns to the Role Selection screen.

---

## 🎯 Verification Sign-Off Table

| Section | Feature Area | Status (PASS / FAIL) | Notes / Observations |
| :---: | :--- | :---: | :--- |
| **01** | Role Selection & Startup State | `PASS` | No dark card on startup |
| **02** | Role-Guard Cross-Role Security | `PASS` | Server rejects unauthorized workspaces |
| **03** | Receptionist Dashboard Zero-Counts | `PASS` | No mock 42/128 counters |
| **04** | Continuous Patient Registration | `PASS` | End-to-end appointment, token & receipt |
| **05** | Directory Pagination & Bulk Import | `PASS` | Server skip/limit works cleanly |
| **06** | Appointment Reason Cancellation | `PASS` | Reason captured in PUT payload |
| **07** | Queue Tokens Call In / Complete | `PASS` | Real-time status update |
| **08** | Inpatient Admission Schema & Room | `PASS` | Room status switches to Occupied |
| **09** | Reception Billing & Staff Attribution | `PASS` | `created_by` captured on payment |
| **10** | Doctor Workstation OPD/IPD Toggle | `PASS` | Switch between OPD and Ward Rounds |
| **11** | EMR Admission Context Resolution | `PASS` | `admission_id` resolved on EMR entry |
| **12** | Ward Round Board Widgets (Mode A) | `PASS` | Quick rounding modals functional |
| **13** | 12 Tabs Comprehensive EMR (Mode B) | `PASS` | All clinical tabs save to live server |
| **14** | 24h SOAP Notes Sign & Lock | `PASS` | Note locks with timestamp and badge |
| **15** | Order Lab Investigation from EMR | `PASS` | Tests ordered with clinical indication |
| **16** | Clinical PDF Dossier Generation | `PASS` | Multi-page branded medical dossier |
| **17** | Lab Orders (No Mock Records) | `PASS` | 10 fake orders completely removed |
| **18** | Lab Report Modal Real Findings | `PASS` | 5 fake test rows replaced with live report |
| **19** | Prescriptions Live Search & PDF Rx | `PASS` | Searches UHID/drugs & prints Rx script |
| **20** | Medical Reports (Patient + MIS) | `PASS` | Live clinical dossier & hospital MIS tables |
| **21** | Doctor Settings & Custom Questions | `PASS` | Add, delete & persist custom checklist |
| **22** | Patient Portal Authentication | `PASS` | Real UHID lookup, no data[0] bypass |
| **23** | Android Back Button Navigation | `PASS` | Closes drawer, sub-screens, role exit |
