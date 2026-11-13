# Independent Ground-Truth Partner Shortlist — 2026-11-12

**Purpose:** identify the smallest defensible external path for a fresh Android Native Sensor baseline and later WIS pose/motion evaluation, with a no-cost or low-cost first step. This is a research shortlist, not a claim of partnership, endorsement, accreditation, or availability.

## 1. Test question and scope

The immediate measurands are:

1. Android accelerometer and gyroscope output timing, sample gaps, bias, repeatability, and response under controlled movement.
2. Phone rigid-body position and orientation compared with an independent optical reference.
3. Clock offset and drift between Android monotonic timestamps and the independent reference system.
4. Repeatability across devices and controlled mounting/orientation conditions.

A motion-capture laboratory can provide independent pose ground truth, but it does **not automatically calibrate the phone's integrated IMU**. For direct accelerometer sensitivity/phase testing, the lab must also provide or accept a calibrated reference accelerometer, shaker/rotary fixture, and a traceable uncertainty budget. Do not derive accelerometer accuracy from motion-capture trajectories without a validated differentiation/noise model.

## 2. Ranked candidate matrix

| Candidate | Verified capability / scope | Fit to WaveRadar test | Access, cost, and limits | Disposition |
|---|---|---|---|---|
| **Mizzou Motion Analysis Center (University of Missouri, Columbia)** | University pages identify the center, director, and research-collaboration model. Facility information lists a 12-camera Vicon system, five AMTI force platforms, two Bonita reference cameras, EMG, load cells, and accelerometers. | **Best first candidate for independent human/phone rigid-body pose and controlled movement ground truth.** Could compare phone orientation/position with Vicon markers; force platforms can characterize foot-contact events. | Access is through faculty/research collaboration; public pages do not publish external-project fees, turnaround, reference-IMU calibration certificates, clock-trigger capability, or data-custody terms. A no-cost student/research collaboration is possible but unconfirmed. Not ISO/IEC 17025 accreditation. | **Priority A — request a feasibility discussion; do not assume acceptance or free access.** |
| **UMKC Human Motion Laboratory (Kansas City)** | Official UMKC page lists seven Vicon MX-T40 cameras, four AMTI OR6-6 force platforms, Delsys EMG, Basler reference video, and Vicon Nexus. | Suitable secondary optical pose/motion reference and movement-event comparison. | No public external-access price, turnaround, current calibration certificates, or data-custody terms found. Requires an institutional research collaboration; not an accredited calibration scope. | **Priority B — backup university partner.** |
| **NIST vibration calibration service 24110C / 24130S** | NIST states 24110C calibrates accelerometer sensitivity from 10 Hz–20 kHz; 24130S is a special test for below 10 Hz, above 20 kHz, or phase information. | Strong national-metrology route for calibrating a separate reference accelerometer. It does not, by itself, validate an Android phone's complete sensor stack, orientation estimate, or WIS output. | Instrument must be submitted for calibration; current price and turnaround were not established from the current service page. This is a paid service unless a sponsor covers it. NIST is a national metrology institute, not a substitute for an ISO/IEC 17025 lab certificate. | **Priority C — use only if a suitable reference accelerometer is borrowed and funding/sponsorship is found.** |
| **Techmaster Electronics, Santa Clara vibration scope (ANAB AC-1736)** | The linked ANAB scope PDF (version 023, updated 2026-06-18) lists vibration at Santa Clara: 0.2–36 gpk, 1 Hz–10 kHz; expanded uncertainty 3.1% of reading + 0.04 g through 2.5 kHz and 3.4% + 0.04 g from 2.5–10 kHz; reference: vibration calibrator system. Vendor vibration page advertises piezoelectric, MEMS, and IEPE accelerometer calibration. | Potential reference-accelerometer calibration route, subject to the exact device, mounting, frequency, method, and accreditation scope. Not proof that a phone's integrated MEMS sensor can be calibrated as a complete system. | **Accreditation status conflict:** the vendor's current scope page claims validity to 2028-10-29, but the linked ANAB certificate PDF still states expiry 2026-10-29. The authoritative current ANAB directory renewal was not independently confirmed in this review. Quote, current certificate, exact instrument acceptance, and turnaround are unknown. | **Conditional — do not represent as currently accredited until ANAB confirms the renewed certificate and scope.** |
| **Applied Technical Services, Lee's Summit, Missouri (A2LA 3103.01)** | A2LA directory and scope PDF show ISO/IEC 17025:2017 calibration accreditation valid to 2027-06-30. The published scope covers pneumatic pressure measuring equipment; it does not list accelerometers or vibration calibration. | Not suitable for the immediate phone IMU baseline. Could be relevant later for a pressure sensor if the exact pressure range and method match. | Commercially available calibration service; local contact is listed in the A2LA directory. Price/turnaround not checked. | **Exclude from IMU shortlist; retain for future pressure-sensor work only.** |
| **IIA Lab Services, St. Louis (A2LA 397.03)** | A2LA directory/scope valid to 2027-07-31; scope lists dimensional, pressure, and torque calibration, not accelerometers. | Not suitable for the immediate phone IMU baseline. | Commercial service; no accelerometer method in the verified scope. | **Exclude from IMU shortlist; retain only if future measurands match.** |
| **ATF Fire Research Laboratory** | ATF describes an ISO/IEC 17025:2017 and AR 3125-accredited fire research facility for fire-scene reconstruction and electro-mechanical evidence examinations, with large-scale fire testing. | Potential future fire-environment research context, not a phone IMU/pose calibration lab. | The facility is oriented to fire/arson investigations and forensic work; external startup test eligibility, access, cost, and turnaround are not established. | **Future fire-science candidate only; not an immediate test provider.** |
| **WPI Center for First Responder Technology** | WPI describes wearable toxic-gas sensor research tested in its Fire Protection Engineering Laboratory and at the Massachusetts Firefighting Academy, including field testing with firefighters. | Relevant future firefighter-wearable usability and environmental-sensor evaluation, not current Android pose ground truth. | Research collaboration required; cost, availability, and current test capacity are not published on the reviewed page. | **Future first-responder sensor partner; not an immediate IMU reference.** |

## 3. Recommended remote-first path

### Phase A — zero-cost readiness (no external partner required)

- Identify and register the actual handset model/build; do not reuse a historical device fingerprint.
- Back up app data before any installation or signing change.
- Run only an instrumentation inventory/lifecycle session: native sensor availability, permission state, listener registration, sample arrival, Android SensorEvent monotonic timestamps, callback-entry timestamps, wall-clock receive time, sequence numbers, and provider state.
- Preserve original raw exports and hashes. No accuracy claim or spatial-pose promotion.

### Phase B — university optical ground truth

Approach Mizzou MAC first, with UMKC HML as the backup. Request a short feasibility review, not a product endorsement.

Minimum proposed setup:

1. Rigidly mount the phone in a fixture carrying a non-symmetric optical marker cluster.
2. Record the Vicon volume calibration and marker/rigid-body reconstruction quality.
3. Capture phone IMU events and optical reference frames simultaneously.
4. Use a documented hardware trigger, TTL pulse, or common visible timing event; collect at least three synchronization pairs and estimate offset/drift. Do not assume wall-clock timestamps are synchronized.
5. Define world, phone, and optical-camera coordinate frames and document axis handedness, units, transform chain, and uncertainty.
6. Begin with static orientations and slow controlled rotations/translations; then repeat a fixed movement pattern. Use force-plate events only where relevant.
7. Export raw marker trajectories, calibration records, reference video, phone sensor events, sync events, device/software versions, and deviations. Hash originals before any transformation.
8. If the lab cannot provide a calibrated reference IMU or suitable dynamic reference, limit the result to optical pose comparison and timing—not accelerometer sensitivity/phase or full inertial accuracy.

No human-subject firefighter data is required for this first test. A phone-on-fixture study should be evaluated for any institutional safety/ethics requirements before proceeding.

### Phase C — calibrated inertial reference

If a borrowed reference accelerometer/IMU is available, ask NIST or a verified in-scope commercial laboratory to calibrate that reference. Require the exact model, calibration method, range, frequency points, axis, mounting, certificate, uncertainty, as-found/as-left data, and traceability statement. A generic ISO/IEC 17025 certificate is insufficient unless the specific measurand, method, range, and location appear on the scope.

### Phase D — independent review

The lab/research collaborator may witness or generate reference data, but must not automatically approve its own work. WaveRadar's independent reviewer must be separately appointed, conflict-checked, scoped to the protocol, and able to reproduce the analysis from preserved raw inputs. The final report must state whether the work is internal verification, independent witnessed evaluation, or an accredited test within the provider's exact scope.

## 4. Mizzou feasibility request — draft only, not sent

**Intended recipient:** Dr. Trent M. Guess, Director, Mizzou Motion Analysis Center  
**Official contact:** guesstr@missouri.edu · 573-882-1734

**Subject:** Research collaboration feasibility — independent smartphone IMU and pose ground-truth pilot

Hello Dr. Guess,

I am developing WaveRadar, an early-stage research project focused on firefighter situational awareness and emergency navigation. We are trying to establish a defensible Android native-sensor baseline and need independent physical ground truth rather than relying on our own application measurements.

I reviewed the Mizzou Motion Analysis Center's published motion-capture and measurement capabilities and wanted to ask whether a small research-collaboration or student-project feasibility discussion might be possible.

The proposed first study is deliberately narrow: a phone rigidly mounted with an optical marker cluster, simultaneous Android accelerometer/gyroscope capture and Vicon pose tracking, documented coordinate frames, and a defensible timestamp-synchronization procedure. We would initially use a non-human fixture and controlled static/slow movements. We would not ask the Center to endorse WaveRadar or certify the product.

The key feasibility questions are whether the Center can provide calibrated volume/rigid-body tracking records, raw marker and reference-video exports, a documented synchronization method, and whether a suitable calibrated reference IMU or dynamic reference fixture is available. If not, we would limit the work to optical pose and timing comparison and would not claim inertial accuracy.

We currently have no testing budget, so we would need to understand whether a student-led, faculty-supervised, grant-supported, or otherwise low-cost collaboration path exists. We can provide a draft protocol, a test-build manifest, data-handling plan, and the exact evidence requirements before any equipment or data are shared.

If this is outside the Center's scope, a referral to an appropriate motion-capture or metrology group would still be useful.

Thank you for considering the feasibility request.

WaveRadar Research & Validation

**Approval gate:** this draft is not authorized to send. No contact has been made. Confirm the recipient, collaboration terms, cost, data ownership, confidentiality, publication rights, and any required institutional review before proceeding.

## 5. Evidence and limitations

- Mizzou research and facility: https://healthsciences.missouri.edu/physical-therapy/research/ and https://mizzoumotioncenter.com/facilities.html
- Mizzou director/contact: https://healthsciences.missouri.edu/directory/personnel/trent-m-guess/
- UMKC Human Motion Laboratory: https://info.umkc.edu/sse-faculty/index.php/human-motion-laboratory/
- UMKC faculty/contact: https://info.umkc.edu/sse-faculty/index.php/kinggr/
- NIST accelerometer calibration services: https://www.nist.gov/programs-projects/dynamic-mechanical-metrology-acceleration-force-and-acoustics/vibration
- Techmaster current scope page: https://techmaster.us/our-scope/ ; linked ANAB scope PDF: https://techmaster.us/wp-content/uploads/2026/06/TechmasterElectronicsIncCertScopeV-023-new.pdf
- A2LA Applied Technical Services directory/scope: https://customer.a2la.org/index.cfm?event=directory.detail&labPID=8C17A391-7911-45E7-BD41-5D5DF8A840CD
- A2LA IIA Lab Services directory/scope: https://customer.a2la.org/index.cfm?event=directory.detail&labPID=409EDEE8-3A5B-421A-B43F-E45787901AC2
- ATF Fire Research Laboratory: https://www.atf.gov/laboratories/fire-research-laboratory
- WPI first-responder sensor research: https://wpiedudev.wpi.edu/research/areas/centers/center-first-responder-technology/toxic-gas-detection

**Not established:** partner availability, free access, quote, turnaround, external reviewer acceptance, current Techmaster certificate renewal, or any institutional endorsement. No outreach, booking, purchase, data transfer, or agreement has occurred.
