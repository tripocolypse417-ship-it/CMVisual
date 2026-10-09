# WaveRadar / CMVisual

WaveRadar is an early-stage, evidence-first spatial-awareness prototype. This repository contains the React/Vite application and Capacitor Android build workflow used to create the phone-installable debug APK.

## Current status
- Latest Android workflow known at this revision: build 93 succeeded on 2026-10-08.
- The APK is a **debug build**, not a production-signed Play Store release.
- The hosted WaveRadar Core workspace is a separate deployment at https://waveradar-20.hatchable.site.
- Backend portability is unfinished: this repository still uses Base44 SDK integrations for authentication, entities, and backend functions. The hosted WaveRadar Core APIs are not yet a full replacement for those dependencies.
- Physical validation is still pending: the hosted readiness API currently reports zero observations and zero validated devices.
- Do not describe the current phone-only workflow as validated through-wall sensing, radar, or a life-safety system. Any such capability requires compatible external sensing hardware and independent ground-truth tests.

## Run locally
Requirements: Node.js 22, Java 21 for Android builds, and Android SDK/Gradle tooling for local APK packaging.

```bash
npm install
npm run audit:data
npm run build
npm run dev
```

## Build Android
The GitHub Actions workflow `.github/workflows/build-android.yml` builds the web bundle, generates the Capacitor Android project, installs the repository's native sensor bridge, synchronizes plugins/assets, and runs Gradle to produce a debug APK.

To build locally after configuring Android tooling:

```bash
npm run audit:data
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug --no-daemon
```

The workflow also copies the native sensor bridge from `native/android/` and adds the required Android permissions. If regenerating the Android project, follow the workflow so these native files and permissions are included.

## Download the latest published debug APK
[Latest WaveRadar Android release](https://github.com/tripocolypse417-ship-it/CMVisual/releases/latest)

Android may require permission to install an APK from the browser. Install only if you understand this is a debug build; do not use it as safety-critical equipment.

## Evidence and safety rules
- Preserve the difference between MEASURED, DERIVED, INFERRED, PREDICTED, UNKNOWN, and UNAVAILABLE.
- Never use synthetic showcase data as validation evidence.
- Camera-only detections are not through-wall detections.
- Raw accelerometer/gyroscope data does not by itself establish spatial position.
- Do not claim accuracy, lives saved, certifications, customers, government partnerships, grants, or operational deployments without evidence.
- Keep validation results tied to the specific device, configuration, environment, and test envelope.
- Treat external sensing, spatial reconstruction, prediction, and team-alert reliability as unvalidated until tested.

## Technology and licensing
Open-source dependencies must be reviewed by exact version and license. ORB-SLAM3 is GPLv3; do not include it in a proprietary distributed build without an explicit GPL-compliance or commercial-licensing decision. OpenCV 4.5.0+ is Apache 2.0 according to the official OpenCV license page.

## Ownership and contributions
The project owner retains control of project direction and repository changes. Before accepting external contributions or adding dependencies, record the license, provenance, and any implications for commercial distribution.
