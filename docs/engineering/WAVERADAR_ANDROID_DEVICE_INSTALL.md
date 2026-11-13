# WaveRadar OS — Android Device Installation and Verification

**Current build:** GitHub Actions artifact `WaveRadar-debug-apk` from the successful Android debug build associated with commit `095a2bdb7cf7a69aecb54bf507da0fca8893f35e`.
**Build workflow:** https://github.com/tripocolypse417-ship-it/CMVisual/actions/runs/43481946475
**Artifact retention:** GitHub reported expiry on 2027-02-11.
**Build type:** Debug APK. This is a test build, not a production release.

## 1. Obtain the APK

1. Open the build workflow link above and sign in to GitHub if prompted.
2. Scroll to **Artifacts**.
3. Download `WaveRadar-debug-apk`.
4. Extract the downloaded ZIP on the Android device or on a computer. Locate the `.apk` file.

Do not install an APK from a different run unless its commit, workflow result, and artifact provenance have been checked.

## 2. Install on Android 14

1. Open the APK using the Android Files app.
2. If Android blocks the installation, open the system prompt for **Install unknown apps** and allow the Files app (or the browser used to download the APK) to install this file.
3. Return to the APK and install it.
4. After installation, turn the **Install unknown apps** permission back off.
5. Launch WaveRadar OS.

Only grant runtime permissions when the corresponding feature is being tested and the purpose is clear. Do not grant unrelated accessibility, notification-listener, device-admin, or background permissions merely to make a prompt disappear.

## 3. First-device verification

Record the following without altering or deleting historical evidence:

- Device model and Android version.
- App version/build identifier shown by the app, if available.
- Whether the app launches, remains open, and survives a normal close/reopen.
- Which native sensor permissions are requested and which are granted.
- Whether accelerometer, gyroscope, and magnetometer samples arrive, with timestamps and sensor availability clearly distinguished.
- Whether location permission is requested separately and whether a location fix is actually received.
- Whether the app reports native spatial pose / ARCore availability. Do not infer spatial pose from camera, GPS, or motion-sensor availability.
- Any crash, blank screen, permission failure, or stale UI, with exact steps and timestamp.

Do not conduct accuracy or injury-diagnosis claims from this installation test. Sensor presence and sample arrival are not physical-ground-truth validation. A separate calibrated reference instrument and documented protocol are required.

## 4. Optional USB/ADB route

If Android Platform Tools are already available on a computer:

```bash
adb devices
adb install -r WaveRadar-debug.apk
adb logcat -d -t 2000
```

Confirm the device appears as `device` (not `unauthorized`) before installing. Do not enable USB debugging on a shared or untrusted computer. The final command captures recent logs; review and redact personal information before sharing them.

## 5. Rollback

If the app fails to launch or causes unexpected behavior, uninstall the test build through Android Settings > Apps. This does not validate or invalidate prior sensor records. Preserve any app-generated diagnostic export before uninstalling, if one is available.

## 6. What this test establishes

A successful install and launch establish basic package compatibility on that device only. They do not establish sensor accuracy, spatial tracking accuracy, thermal/radar performance, victim-detection performance, medical diagnostic validity, or field readiness.

The assistant cannot directly install the APK onto the user's physical phone from GitHub Actions. The user must perform the on-device installation steps or connect the device to an authorized computer with ADB.
