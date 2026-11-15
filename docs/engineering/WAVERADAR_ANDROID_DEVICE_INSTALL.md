# WaveRadar OS — Android Device Installation and Verification

**Current candidate test artifact:** `WaveRadar-debug-apk` from GitHub Actions run [43758503320](https://github.com/tripocolypse417-ship-it/CMVisual/actions/runs/43758503320), head commit `f16b697af41561739aaa862674bca0ce3f1c29f2` on `waveradar/native-sensor-diagnostics`.
**Artifact ID:** `14179057680`. **Created:** 2026-11-15 20:33:18 UTC. **Expiry:** 2027-02-13 20:30:58 UTC.
**Artifact ZIP SHA-256:** `43837199b3a2b461a730794e7b9f622f2782969998b8e636cf9fac0818415554` (the workflow reported the ZIP digest; no separate APK digest was recorded).
**Build type:** Debug APK. This is a test build, not a production release.
**Signing status:** The run log reports that `WAVERADAR_DEBUG_KEYSTORE_BASE64` is not configured. The APK therefore uses a runner-generated ephemeral debug key; update compatibility with an already-installed APK is **not guaranteed**.

## Installation hold — do not replace the existing phone install

Do not install this artifact over the existing WaveRadar app and do not uninstall or clear app data to force an update. The signing identity is not stable. A signature mismatch can cause Android to reject an update, and uninstalling can remove local evidence or app state.

A persistent signing identity or a separate, explicitly isolated test application ID must be established and verified before an in-place update is attempted. No signing key should be committed to the repository. The current workflow and artifact do not establish that continuity.

## Which APK is served by the app download route?

The live `/api/download-waveradar-apk` endpoint redirects to GitHub's **latest release**, not to a pull-request artifact. The last release verified by this document was [WaveRadar build 486](https://github.com/tripocolypse417-ship-it/CMVisual/releases/tag/waveradar-build-486), published 2026-11-14 23:48 UTC from commit `69e29a887fa5e0b465d3b8b4ad9eec6817ef5852`. The release list was not revalidated in this update. Its build log also reported the missing persistent debug-key secret and an ephemeral debug key.

The PR #77 candidate artifact above is not published as a release. A download through the in-app endpoint must not be described as containing PR #77 changes.

## 1. Candidate artifact provenance

1. Open [the exact PR #77 workflow run](https://github.com/tripocolypse417-ship-it/CMVisual/actions/runs/43758503320).
2. Confirm the head commit matches `f16b697af41561739aaa862674bca0ce3f1c29f2`.
3. Confirm the Android job and all required steps are completed successfully.
4. Download `WaveRadar-debug-apk` only for controlled testing after the signing/package identity hold is resolved.
5. Do not substitute a different run's artifact without checking its commit, build result, artifact digest, and signing identity.

## 2. What this native bridge currently provides

The Android bridge exposes SensorManager readings for accelerometer, gyroscope, magnetometer, rotation vector, gravity, pressure, light, and proximity. The separate ranging plugin reports Wi-Fi RTT capability and measurements only when the device, Android version, permissions, and compatible responders support them.

This bridge does **not** implement an ARCore/world-pose provider. Its capability response explicitly reports `arcoreDepth=false` and `arcoreRawDepth=false`; it also does not provide thermal or mmWave sensing. A camera, GPS, motion sensor, or Wi-Fi RTT result is not a world-position pose. Spatial-accuracy capture must remain blocked until a real pose provider is implemented and independently checked against physical ground truth.

## 3. First-device verification protocol

After a correctly signed, isolated test build is available, record the following without altering or deleting historical evidence:

- Physical device model and Android version, recorded separately from browser user-agent text.
- App package/application ID, version, build commit, and signing identity.
- Whether the app launches, remains open, and survives a normal close/reopen.
- Per-sensor support, registration, permission state, sample arrival, sample age, accuracy field, and original timestamp clock domain.
- Whether location permission is requested separately and whether a location fix is actually received.
- Whether native spatial pose / ARCore is exposed. Do not infer spatial pose from camera, GPS, motion, or Wi-Fi RTT availability.
- Any crash, blank screen, permission failure, stale UI, or timestamp discontinuity, with exact steps and timestamp.

A successful install and sensor sample do not establish accuracy. A calibrated reference instrument, surveyed reference points, synchronized clocks, a documented protocol, and independent review are required for spatial validation.

## 4. Interpreting native sensor diagnostics

| State | Meaning |
|---|---|
| `unsupported` | Android returned no default sensor of this type |
| `supported_not_registered` | Sensor exists, but listener registration did not succeed |
| `registered_no_sample` | Listener registered, but no sample has arrived in this process |
| `sample_received` | At least one sample has arrived; inspect its age and timestamp before treating it as current |

The listed accelerometer, gyroscope, magnetometer, rotation-vector, gravity, pressure, light, and proximity sensors do not require a runtime permission on this Android bridge. The explicit `not_required` permission state must not be confused with hardware support or successful registration. A fresh sample is still not an accuracy measurement.

The PR #77 bridge preserves `timestampElapsedRealtimeNs` and `timestampClockDomain: ANDROID_ELAPSED_REALTIME` for each sensor event. The legacy `timestamp` field is an estimated wall-clock value, explicitly marked `timestampWallClockEstimated: true`; it is not the original event timestamp or a synchronized UTC timestamp. Preserve the original monotonic value and compare freshness only within its clock domain.

## 5. Optional USB/ADB route

If Android Platform Tools are already available on a trusted computer, they can be used after the signing and package identity hold is resolved:

```bash
adb devices
adb install WaveRadar-debug.apk
adb logcat -d -t 2000
```

Do not enable USB debugging on a shared or untrusted computer. Review and redact personal information from logs before sharing them. Do not use `adb install -r` to force an update across an unknown signing identity.

## 6. Rollback and evidence preservation

If a test build fails, stop the test and preserve diagnostics. Do not uninstall the existing app, clear app data, or overwrite local evidence as a troubleshooting shortcut. Export and verify any required local evidence first; if the package/signature is incompatible, use a separately identified test package rather than removing the existing installation.

## 7. What CI establishes — and what it does not

The PR #77 workflow completed the Android debug build and its source-contract checks. Runtime-safety and code-quality workflows also completed successfully for the PR head. These are CI/source checks only. They do not establish that the APK was installed on a physical device, that sensors produced fresh samples on a particular phone, that ARCore pose is available, or that any spatial accuracy or life-safety performance has been validated.

The assistant cannot directly install an APK onto the user's physical phone from GitHub Actions. The user must perform any eventual on-device test after the signing and package identity issue is resolved.
