# WaveRadar Android debug signing and update compatibility

## What happened

The Android workflow builds a debug APK on a fresh GitHub-hosted runner. Android's default debug keystore is created on that runner if none exists. The runner is discarded after the job, and the workflow did not preserve the generated keystore. As a result, successive builds are not guaranteed to share the same signing certificate.

Android requires an APK update to be signed by the same certificate as the installed app. A different signing key is rejected as an update.

The old runner key was not archived with the earlier APK artifact. A new persistent key cannot retroactively match that missing private key. Therefore, the already-installed debug build may require a one-time uninstall/reinstall to move to a new signing identity. Do not uninstall until any local-only data has been exported or confirmed to exist on the server.

## Persistent key support added to CI

The workflow now checks the GitHub Actions repository secret:

`WAVERADAR_DEBUG_KEYSTORE_BASE64`

When configured, CI restores the same debug keystore to `$HOME/.android/debug.keystore` before Gradle builds the APK. The keystore must use Android's standard debug alias and password:

- Alias: `androiddebugkey`
- Store password: `android`
- Key password: `android`

When the secret is absent, CI still builds an APK but explicitly warns that update compatibility is not guaranteed.

## Configure the secret

1. Create one debug keystore locally. Do not commit it to the repository.
2. Use the standard debug alias and passwords above so Gradle's default debug signing configuration can use it.
3. Base64-encode the complete keystore file as one line.
4. In GitHub, open the CMVisual repository → Settings → Secrets and variables → Actions → New repository secret.
5. Name it `WAVERADAR_DEBUG_KEYSTORE_BASE64` and paste the one-line base64 value.
6. Run the Android workflow again. Confirm the job summary says **persistent WaveRadar debug key**.

Example local commands (run on a trusted computer with Java keytool):

```bash
keytool -genkeypair -v \
  -keystore WaveRadar-debug.keystore \
  -storepass android \
  -alias androiddebugkey \
  -keypass android \
  -dname "CN=Android Debug,O=Android,C=US" \
  -keyalg RSA -keysize 2048 -validity 10000

base64 -w 0 WaveRadar-debug.keystore
```

Keep the keystore private and backed up securely. Anyone who obtains it can sign debug builds that Android will accept as updates to builds signed by that same key.

## Release signing

This workflow still produces a **debug APK**, not a production release. A production release needs a separate release keystore, protected secrets, explicit Gradle release signing configuration, versioning, and a tested backup/recovery process. Do not reuse the debug key as a production signing key.

## Safe update procedure

- If the installed app and new APK have the same signing certificate, install as an update; Android should preserve app data.
- If signatures differ, Android will reject the update. A new persistent key does not fix an already-installed APK signed by a lost key.
- Before any one-time uninstall/reinstall, export local-only data if the app provides it and verify server-side data independently. Uninstalling can remove local app data.
