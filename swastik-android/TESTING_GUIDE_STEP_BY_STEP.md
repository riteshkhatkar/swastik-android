# 📱 Simple Step-by-Step Testing Guide for Swastik Hospital Android App

Welcome! This guide is written in **plain, simple language**. You don't need any technical knowledge to follow it. Just follow the numbered steps, tap the buttons mentioned, and check the results on your phone screen.

---

## ⚡ Part 1: How to Run the App in Expo (Commands)

Open **PowerShell** or **Command Prompt** on your computer, and follow these exact steps:

### Step 1: Go to the android project folder
Copy and paste this command, then press **Enter**:
```powershell
cd c:\Users\Windows\Downloads\swastik-main\swastik-android
```

### Step 2: Start the Expo server
Choose **Option A** (if your phone and PC use the same Wi-Fi) or **Option B** (if you have connection trouble or use mobile data):

#### Option A: Normal Wi-Fi Mode (Fastest)
```powershell
npx expo start -c
```

#### Option B: Tunnel Mode (Works on any network / mobile data)
```powershell
npx expo start --tunnel -c
```

*(Note: The `-c` means clear cache, so all your newest updates load fresh without old bugs.)*

---

### Step 3: Open the App on Your Android Phone

1. Install the free **Expo Go** app from Google Play Store if you haven't already.
2. Make sure your phone is connected to the same Wi-Fi (if using Option A).
3. Open the **Expo Go** app on your phone.
4. Tap **"Scan QR code"** and point your phone camera at the big square QR code on your computer screen.  
   *(Or tap **"Enter URL manually"** and type: `exp://192.168.1.5:8081` then tap Connect).*
5. Wait a few seconds for the loading bar to reach 100%. The app will open!

---

## 🔑 Login Accounts Cheat-Sheet

Keep this handy. Whenever a test asks you to log in, use these exact words:

| If Testing As... | Type Username: | Type Password: | What This Role Can Do: |
| :--- | :--- | :--- | :--- |
| **Doctor** | `doctor` | `doctor123` | Patient EMR, Prescriptions, Ward Rounds, Lab Orders |
| **Receptionist** | `receptionist` | `receptionist123` | Register Patients, Appointments, Tokens, Admissions, Billing |
| **Admin** | `admin` | `admin123` | System Settings & Staff Management |
| **Billing** | `billing` | `billing123` | Invoices, Cash/UPI Payments, Financial Reports |
| **Lab** | `lab` | `lab123` | Blood/Urine Samples, Enter Test Results, Release Reports |

---

## 🧪 Part 2: Step-by-Step Testing (Tap by Tap)

---

### 🟢 Test 1: Starting the App & Role Selection Screen

1. **Look at the screen:**
   - You should see the Swastik logo at the top.
   - Below it, you see 6 role cards: **Doctor**, **Receptionist**, **Admin**, **Billing**, **Lab**, **Patient Portal**.
   - **What to check:** None of the cards should be dark or selected automatically. All cards must look clean and white.

2. **Security Test (Role Guard):**
   - Tap the **Doctor** card. The card will animate and open the Doctor Login screen.
   - Now deliberately type the wrong role credentials:
     - Username: `receptionist`
     - Password: `receptionist123`
   - Tap the blue-green **Sign In** button.
   - **What to check:** The app must **NOT** let you in. A popup box will appear saying *"Access Denied"* because a receptionist is not allowed into the doctor workstation. This proves security is working!

3. **Return to Home:**
   - Tap the **Back Arrow** at the top left to go back to the 6 cards.

---

### 🟢 Test 2: Receptionist Dashboard & Live Counts

1. **Log in as Receptionist:**
   - Tap the **Receptionist** card.
   - Type Username: `receptionist`
   - Type Password: `receptionist123`
   - Tap **Sign In**.
   - **What to check:** You enter the Receptionist Dashboard smoothly.

2. **Check the numbers:**
   - Look at the 3 big number boxes at the top:
     - Today's Appointments
     - Inpatient Admissions
     - Available Beds
   - **What to check:** The old fake mock numbers (like `42` or `128`) are completely gone! The numbers start from zero and only show real data from the hospital server.

3. **Test Pull-to-Refresh:**
   - Put your finger at the top of the screen, pull down, and let go.
   - **What to check:** A small spinning circle appears and disappears cleanly. Nothing freezes or crashes.

---

### 🟢 Test 3: Register a Brand New Patient

1. **Open registration:**
   - Tap the button that says **"Register New Patient"** (or tap the 3 lines menu icon at the top left $\rightarrow$ tap Patient Registration).

2. **Fill in patient details:**
   - Tap **Full Name** $\rightarrow$ type: `Ramesh Kumar Patil`
   - Tap **Age** $\rightarrow$ type: `38`
   - Tap **Gender** $\rightarrow$ tap **Male**
   - Tap **Phone** $\rightarrow$ type: `9876543210`
   - Tap **Address** $\rightarrow$ type: `Shahupuri, Kolhapur`
   - Tap **Department** $\rightarrow$ select `Psychiatry OPD`

3. **Complete registration:**
   - Tap the big button at the bottom: **"Register Patient & Generate Token"**.
   - **What to check:**
     - The app contacts the real server.
     - A popup box named **"Case Paper & Token Receipt"** appears on your screen!
     - It shows a real official hospital UHID number (like `SWH-2026-0001`).
     - It shows today's token number (like `T-01` or `A-01`).
     - It shows doctor name: *Dr. P. M. Chougule*.
   - Tap **Close** to close the receipt popup.

---

### 🟢 Test 4: Patient Directory & Search

1. **Open Patient Directory:**
   - Tap the menu icon (3 lines) at the top left $\rightarrow$ tap **Patient Directory** (or Patient List).
   - You will see the list of registered patients.

2. **Test Search:**
   - Tap the search bar at the top.
   - Type `Ramesh` (or the patient name you just registered).
   - **What to check:** The list instantly filters and shows only `Ramesh Kumar Patil`.

3. **Test Pages (Pagination):**
   - Clear the search box.
   - Scroll all the way down to the bottom.
   - **What to check:** You will see **"Page 1 of X"** with **Next** and **Previous** buttons. Tap **Next** to load the next batch of patients.

---

### 🟢 Test 5: Queue Tokens & Doctor Call-In

1. **Open Queue Tokens:**
   - Tap the menu icon $\rightarrow$ tap **Appointments**.
   - Tap the tab called **"Queue Tokens"** at the top.
   - **What to check:** You will see today's patient tokens.

2. **Test "Call In" and "Complete":**
   - Find a token that says `ISSUED` or `WAITING`.
   - Tap the button **"Call In"**.
   - **What to check:** The status tag instantly changes color and says **"IN CONSULTATION"**.
   - Now tap **"Complete"**.
   - **What to check:** The status tag turns green and says **"COMPLETED"**.

3. **Test Appointment Cancellation with Reason:**
   - Tap the **"List View"** tab to see appointments.
   - Find any appointment card and tap **Cancel**.
   - A box opens asking: *"Reason for cancellation"*.
   - Type: `Patient rescheduled by phone call`.
   - Tap **Confirm Cancellation**.
   - **What to check:** The appointment card updates to `Cancelled` with your reason recorded.

---

### 🟢 Test 6: Inpatient Admission (IPD)

1. **Open Admissions:**
   - Tap the menu icon $\rightarrow$ tap **Admissions**.
   - Tap **"New IPD Admission"**.

2. **Fill in details:**
   - **Patient UHID:** Type the UHID of the patient you registered.
   - **Doctor:** Select `Dr. P. M. Chougule`.
   - **Room / Bed:** Select any available room (like `Room 101`).
   - **Diagnosis:** Type `Severe Depression with Sleep Disturbance`.
   - **Deposit:** Type `5000`.
   - Tap **Confirm Admission**.

3. **What to check:**
   - The patient is admitted into the hospital ward.
   - The selected room status automatically changes from *Available* to *Occupied*.

---

### 🟢 Test 7: Doctor Workstation (OPD Clinic vs. Ward Rounds)

Now let's switch to the Doctor role!
1. **Logout:** Tap menu icon $\rightarrow$ tap **Logout**.
2. **Login as Doctor:**
   - Tap **Doctor** card.
   - Type Username: `doctor`
   - Type Password: `doctor123`
   - Tap **Sign In**.

3. **Test the OPD vs. Ward Rounds Toggle:**
   - At the top of the Doctor Workstation screen, look at the two tabs:
     - **OPD Clinic**
     - **Ward Rounds (IPD)**
   - Tap **Ward Rounds (IPD)**:
     - **What to check:** You see a list of admitted ward patients, their room numbers, bed badges, and an **"Inpatient EMR"** button on each card.
   - Tap **OPD Clinic**:
     - **What to check:** You see today's OPD Queue Tokens and active sessions.

---

### 🟢 Test 8: Opening the EMR (Electronic Medical Record)

1. **Open EMR:**
   - On any patient card, tap the button that says **"Open EMR"**.

2. **What to check on the screen:**
   - A green badge appears in the top header showing the active admission ID (`ADM-...`).
   - The patient's Name, UHID, and Age/Gender are clearly visible in the top header.
   - You have two view modes: **[Round Board]** and **[Comprehensive EMR]**.

---

### 🟢 Test 9: Ward Round Board (Mode A)

1. **Check Round Board widgets:**
   - Ensure you are on the **Round Board** mode.
   - You will see 5 helpful cards:
     - **Vitals Pulse:** Shows latest Blood Pressure and Pulse.
     - **Clinical Impression:** Shows Risk progress bars.
     - **Latest SOAP Summary:** Clinical session notes.
     - **Active Regimen:** Current medications.
     - **Rounding Log:** Daily round history.

2. **Try the Quick Action buttons:**
   - Tap **"+ Add Round Note"** $\rightarrow$ type: `Patient is alert, slept 7 hours, mood is better.` $\rightarrow$ tap **Save Note**.
   - **What to check:** The note appears in the Rounding Log immediately.
   - Tap **"+ Record Vitals"** $\rightarrow$ enter BP `120/80`, Pulse `72` $\rightarrow$ tap **Save Vitals**.
   - **What to check:** The Vitals card updates right away.

---

### 🟢 Test 10: Comprehensive 12-Tab EMR Workspace (Mode B)

Tap **"Comprehensive EMR"** at the top right. You will see a scrollable bar with 12 tabs. Let's test the most important ones:

#### Tab 1: Symptoms & HPI
- Tap **Symptoms & HPI**.
- In Chief Complaints, type: `Sadness, lack of energy, headache`.
- In HPI Narrative, type: `Patient has felt this way for 4 weeks.`
- Tap **Save Symptoms & HPI**.
- **What to check:** A success alert appears confirming it is saved on the server.

#### Tab 2: Mental Status Examination (MSE) & Red-Flag Detection
- Tap **MSE**.
- Scroll down to **Thought Content** and check the box for **Suicidal Ideation** (or type `Suicidal thoughts present`).
- **What to check:** A bright red alert banner pops up at the top warning: *"Critical Psychiatric Red Flag Detected: Suicidal Ideation"*.
- Tap **Save MSE Findings**.

#### Tab 3: Diagnosis (ICD-11 & DSM-5)
- Tap **Diagnosis**.
- Type `Depress` in the search box.
- Tap on `6A70 - Single episode depressive disorder`.
- Tap **Save Diagnosis**.

#### Tab 4: 3-Axis Risk Assessment
- Tap **Risk Assessment**.
- You will see 3 sliders/selectors: Suicide Risk, Violence Risk, Self-Neglect.
- Set Suicide Risk to `Moderate`.
- Tap **Save Risk Assessment**.

#### Tab 5: Medications Rx & Stop Medication Action
- Tap **Medications Rx**.
- In the drug search box, type `Lithium`.
- Select `Lithium Carbonate 300mg`.
- Frequency: select `1-0-1`.
- Tap **Prescribe Medication**.
- **What to check:** The medicine appears in the Active Prescriptions table below.
- **Test Stopping a Medicine:**
  - On any active medicine row, tap the red **Stop** button.
  - A box asks for reason: type `Patient had mild nausea`.
  - Tap **Confirm Stop**.
  - **What to check:** The medicine status changes to a gray badge saying `Stopped`.

#### Tab 7: SOAP Notes & 24h Sign & Lock
- Tap **SOAP Notes**.
- Type in Subjective: `Patient feels calmer today.`
- Type in Objective: `Normal speech, attentive.`
- Type in Assessment: `Improving on current treatment.`
- Type in Plan: `Continue medicine for 2 weeks.`
- Tap **"Sign & Lock Note (24h)"**.
- **What to check:** A gold badge appears saying **"Locked & Signed"** with today's date and doctor name. The note can no longer be accidentally edited.

#### Tab 10: Lab Monitoring & Lithium Therapeutic Gauge
- Tap **Lab & Monitoring**.
- Look at the **Therapeutic Lithium Monitoring** section.
- **What to check:** A clear reference gauge shows the safe target zone: **`0.60 – 1.20 mEq/L`**.

---

### 🟢 Test 11: Order Lab Tests Directly from EMR

1. Inside the EMR, tap the button called **"Order Lab Investigation"**.
2. A tests catalog opens.
3. Check the boxes for:
   - `Serum Lithium Level`
   - `Complete Blood Count (CBC)`
4. Type in Clinical Notes: `Routine psychiatric monitoring`.
5. Tap **Submit Lab Order**.
6. **What to check:** A green confirmation alert appears saying *"Lab request created successfully"*.

---

### 🟢 Test 12: Print Full Medical PDF Report

1. Look at the very top of the EMR screen header.
2. Tap the **Printer / PDF icon**.
3. **What to check:**
   - A brief loading message says *"Generating official clinical dossier..."*.
   - Your Android phone's print/share screen opens!
   - You can see a clean, official medical report with the Swastik Hospital logo, patient info, diagnosis, MSE findings, active medicines, and doctor signature.
   - Tap **Cancel** or **Save as PDF**.

---

### 🟢 Test 13: Lab Orders & Real Report Viewer

1. Tap the menu icon (3 lines) $\rightarrow$ tap **Lab Orders & Reports**.
2. **What to check:**
   - **CRITICAL:** The 10 fake demo orders (which were named `LAB-DMY-20260309-...`) are **completely gone**!
   - You only see real orders. The order you created in Test 11 will be listed right at the top.
3. **Open Report Viewer:**
   - On any completed order, tap **"View / Download report"**.
   - **What to check:**
     - The 5 old fake test rows are gone.
     - Real test parameters appear with observed values, units, reference intervals, and status badges (Normal, Abnormal, Critical).
     - Tap **Download / Share PDF Report** to view the official PDF.

---

### 🟢 Test 14: Prescriptions & Search Bar

1. Tap the menu icon $\rightarrow$ tap **Prescriptions**.
2. **Test Search:**
   - Tap the search bar at the top.
   - Type `Lithium` (or the patient name).
   - **What to check:** The list filters in real-time to show only prescriptions with that medicine.
3. **Test Print Prescription:**
   - Tap **"Print Official Rx Script"** on any prescription card.
   - **What to check:** Opens a print preview with the official prescription header ($\mathtt{R_x}$ symbol, dosage table, doctor signature).

---

### 🟢 Test 15: Medical Reports & Hospital MIS Analytics

1. Tap the menu icon $\rightarrow$ tap **Medical Reports**.
2. You will see two tabs:
   - **Patient Clinical Reports**
   - **Hospital MIS Reports**

3. **Patient Reports Tab:**
   - Search your patient's name.
   - Tap **"Discharge Summary"** $\rightarrow$ Generates official discharge summary PDF with real diagnosis and vitals.
   - Tap **"Clinical EMR Dossier"** $\rightarrow$ Generates complete medical record PDF.

4. **Hospital MIS Tab:**
   - Tap the **Hospital MIS Reports** tab.
   - You see 4 hospital reports:
     - Daily Hospital Operations
     - Doctor Performance
     - Medication Monitoring
     - Patient Statistics
   - Tap **"Generate & Download Report"** on **Daily Hospital Operations**.
   - **What to check:** The app fetches live hospital stats (today's OPD count, active admissions, appointments, total revenue) and opens a printable PDF table!

---

### 🟢 Test 16: Doctor Settings & Custom Questions

1. Tap the menu icon $\rightarrow$ tap **Settings & Profile**.
2. You will see 3 cards:
   - **Card 1: Profile Information** (Full Name, Phone, Email, Specialization).
   - **Card 2: Security Settings** (Change Password).
   - **Card 3: Consultation Checklist Questions**.

3. **Test Truthful Password Error Handling:**
   - In Card 2, enter Current Password: `wrongpassword123`.
   - Enter New Password: `newpassword123` (twice).
   - Tap **Change Password**.
   - **What to check:** The app does **NOT** say "Password updated successfully"! Instead, it truthfully tells you: *"Password Change Failed: Current password may be incorrect"*.

4. **Test Custom Checklist Questions:**
   - Scroll down to Card 3.
   - In the text box at the bottom, type:
     ```text
     Check for history of panic attacks or phobias
     ```
   - Tap the teal **`+`** (Plus) button.
   - **What to check:** The question is added to the list immediately.
   - Now tap the red trash can icon next to any question $\rightarrow$ It gets removed.
   - Tap **"Save Checklist Questions"** $\rightarrow$ A green alert confirms it is saved on the server!

---

### 🟢 Test 17: Patient Portal Authentication

1. Tap menu icon $\rightarrow$ tap **Logout**.
2. On the Role Selection screen, tap **Patient Portal**.
3. **What to check:**
   - The app does **NOT** automatically log in as a random person (the old `data[0]` bug is fixed).
   - It asks for the Patient's UHID or Mobile Number.
4. Type the patient's phone number or UHID $\rightarrow$ tap **Access Patient Portal** $\rightarrow$ Opens that specific patient's private self-service dashboard.

---

### 🟢 Test 18: Android Hardware Back Button

1. While inside any sub-screen (like Prescriptions or Medical Reports), press your Android phone's **Physical / Gesture Back Button**.
   - **What to check:** It takes you back to the Dashboard. The app does **NOT** close or crash.
2. Open the side menu (drawer), then press the **Back Button**.
   - **What to check:** The side menu closes smoothly while staying on the same screen.
3. On the main Dashboard, press the **Back Button**.
   - **What to check:** It cleanly takes you back to the Role Selection screen.

---

## 🏁 Summary Checklist: Did Everything Pass?

Check each box as you test:

- [ ] **1. Role Cards:** All start clean and white (none preselected dark).
- [ ] **2. Role Guard:** Wrong role credentials are blocked with an Access Denied message.
- [ ] **3. Receptionist Counts:** Real numbers from server (no fake 42 or 128).
- [ ] **4. Patient Registration:** Gives real server UHID and opens token receipt.
- [ ] **5. Queue Tokens:** Can filter by doctor and tap "Call In" / "Complete".
- [ ] **6. Inpatient Admissions:** Real room allocation and discharge.
- [ ] **7. Doctor Workstation:** OPD vs. Ward Rounds toggle works.
- [ ] **8. EMR Admission Context:** Opens with active green `ADM-...` badge.
- [ ] **9. Ward Round Board:** Quick modals (+Add Note, +Record Vitals) work.
- [ ] **10. 12-Tab EMR:** Symptoms, MSE, ICD-11 Diagnosis, Risk, Medications with Stop button, and 24h Sign & Lock all save to server.
- [ ] **11. Order Lab from EMR:** Tests submit to backend.
- [ ] **12. Lab Orders Screen:** All 10 fake orders are gone; only real orders show.
- [ ] **13. Lab Report Viewer:** Real test values and reference intervals show.
- [ ] **14. Prescriptions:** Search bar works and prints signed prescription script.
- [ ] **15. Hospital MIS Reports:** Daily Hospital and Medication analytics download real tables.
- [ ] **16. Settings:** Custom checklist questions can be added, deleted, and saved.
- [ ] **17. Back Button:** Navigates smoothly without crashing.

**Congratulations! Your Swastik Hospital Android App is fully verified and connected end-to-end to the live server!**
