# WaveRadar / CMVisual

WaveRadar is an early-stage, evidence-first spatial-awareness prototype. This repository contains the React/Vite application and Capacitor Android build workflow used to create phone-installable debug APKs.

## Current status — 2026-10-30

- **Android CI:** Build 234 succeeded on the research-validation-institute branch and produced a WaveRadar-debug-apk artifact. It is a debug APK, not a production-signed release. The old runner-generated debug signing key was not preserved, so this artifact is not guaranteed to update an APK already installed on a phone. See docs/android/DEBUG_SIGNING_AND_UPDATE.md and PR #33 for persistent-key support.
- **Android device verification:** Installation and update behavior on the target Moto G Play have not yet been verified. Do not uninstall an installed copy until local-only data has been backed up or confirmed server-side.
- **WaveRadar Core:** Hosted separately at https://waveradar-20.hatchable.site.
- **Independent Validation Lab:** Separate hosted service at https://waveradar.hatchable.site. It now has invitation-only tester access, a separate independent-reviewer workspace, server-computed evidence SHA-256 digests, and database-enforced append-only evidence/audit/review records. The project visibility is currently personal; external visitors will see the hosting platform's sign-in wall until the owner changes project visibility to public in project Settings. The application itself remains invitation-only.
- **Initial research protocols:** The Validation Lab contains two draft protocols: KIT Wi-Fi BFI/CSI human-presence feasibility and a fresh Android Native Sensor baseline for the Moto G Play 2024. No testers, reviewers, or assignments have been registered yet.
- **Independent Research & Validation Institute:** The program charter and implementation plan are in docs/research-validation-institute/CHARTER_AND_IMPLEMENTATION_PLAN.md.
- **Backend portability is unfinished:** This repository still uses Base44 SDK integrations for authentication, entities, and backend functions. The hosted WaveRadar Core APIs are not yet a full replacement for those dependencies.
- **Physical validation remains pending:** On 2026-10-30, WaveRadar Core diagnostics reported 4,021 observations, zero integrity-verified observations, eight registered devices, and zero validated devices. These historical observations remain preserved but are not validation proof. A new physical baseline must use new sessions and independent ground truth.
- **No through-wall or life-safety claims:** Do not describe the current phone-only workflow as validated through-wall sensing, radar, or an operational life-safety system. Any such capability requires compatible external sensing hardware and independent ground-truth testing.

## Run locally

Requirements: Node.js 22, Java 21 for Android builds, and Android SDK/Gradle tooling for local APK packaging.

    npm install
    npm run audit:data
    npm run build
    npm run dev

## Build Android

The GitHub Actions workflow .github/workflows/build-android.yml builds the web bundle, generates the Capacitor Android project, installs the repository's native sensor bridge, synchronizes plugins/assets, and runs Gradle to produce a debug APK.

To build locally after configuring Android tooling:

    npm run audit:data
    npm run build
    npx cap add android
    npx cap sync android
    cd android
    ./gradlew assembleDebug --no-daemon

The workflow copies the native sensor bridge from native/android/ and adds the required Android permissions. If regenerating the Android project, follow the workflow so these native files and permissions are included.

For consistent update signatures across CI runs, configure the GitHub Actions secret WAVERADAR_DEBUG_KEYSTORE_BASE64 as described in docs/android/DEBUG_SIGNING_AND_UPDATE.md. Do not commit a keystore to this public repository.

## Download the latest published debug APK

[Latest WaveRadar Android release](https://github.com/tripocolypse417-ship-it/CMVisual/releases/latest)

GitHub Actions artifacts are also available from the workflow run page. Android may require permission to install an APK from the browser. Install only if you understand this is a debug build; do not use it as safety-critical equipment.

## Evidence and safety rules

- Preserve the difference between MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, UNKNOWN, and UNAVAILABLE.
- A MEASURED provenance label is not an integrity verdict or proof of truth.
- Never use synthetic showcase data as physical validation evidence.
- Camera-only detections are not through-wall detections.
- Raw accelerometer/gyroscope data does not by itself establish spatial position.
- Do not claim accuracy, lives saved, certifications, customers, government partnerships, grants, or operational deployments without evidence.
- Keep validation results tied to the specific device, configuration, environment, and test envelope.
- Treat external sensing, spatial reconstruction, prediction, and team-alert reliability as unvalidated until tested.

## Technology and licensing

Open-source dependencies must be reviewed by exact version and license. ORB-SLAM3 is GPLv3; do not include it in a proprietary distributed build without an explicit GPL-compliance or commercial-licensing decision. OpenCV 4.5.0+ is Apache 2.0 according to the official OpenCV license page.

## Ownership and contributions

The project owner retains control of project direction and repository changes. Before accepting external contributions or adding dependencies, record the license, provenance, and any implications for commercial distribution.
