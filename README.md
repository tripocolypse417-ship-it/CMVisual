# WaveRadar / CMVisual

WaveRadar is an early-stage, evidence-first spatial-awareness prototype. This repository contains the React/Vite application and Capacitor Android build workflow used to create phone-installable debug APKs.

## Current status — 2026-11-11

The [canonical prioritized engineering and validation backlog](docs/engineering/WAVERADAR_PRIORITIZED_BACKLOG_2026-11-11.md) records task owners, dependencies, acceptance criteria, evidence links, and next actions. It references existing issues/PRs rather than creating duplicate tickets.

- **Android device verification:** No fresh physical handset session has been completed. The current handset's manufacturer, model, Android release/build, and hardware revision are unknown. The previously used Motorola Moto G Play XT2413V fingerprint is historical only; do not assume it is the current device. Keep the two native paths separate: the canonical GitHub Capacitor CI APK uses package `com.waveradar.app.safetest`; the separate Hatchable Kotlin source uses package `com.waveradar.android.safetest` and contains optional ARCore session-local pose/depth capture. The Kotlin folder is source scaffolding, not a compiled APK. Its ARCore capture emits only while tracking and labels `calibrationState=UNKNOWN`, `independentGroundTruth=false`, and `validated=false`; the emitter checks a positive frame timestamp but does not currently enforce timestamp progression or age. It serializes ARCore `Frame.getTimestamp()` under a `monotonicTimestampNs` field, but [Google's ARCore API documentation](https://developers.google.com/ar/reference/java/com/google/ar/core/Frame#getTimestamp) says the time base is specifically undefined (only likely similar to `System.nanoTime()`); treat that field as `ARCORE_UNSPECIFIED`, not verified monotonic time, until the source is corrected and clock mapping is measured. PR #65 adds a separate JavaScript freshness guard using ISO wall-clock timestamps and a 5-second window; it does not establish clock synchronization or consume the ARCore frame timestamp. Neither path has been physically tested on the current handset.
- **Android CI:** The PR #68 pull-request build [43070079760](https://github.com/tripocolypse417-ship-it/CMVisual/actions/runs/43070079760) completed successfully on 2026-11-11; Runtime Safety [43070080005](https://github.com/tripocolypse417-ship-it/CMVisual/actions/runs/43070080005) and Code Quality [43070079874](https://github.com/tripocolypse417-ship-it/CMVisual/actions/runs/43070079874) also passed for head `4963be63c6afe587e210850818d9422805a7b087`. The APK artifact uploaded, but its build log showed `WAVERADAR_DEBUG_KEYSTORE_BASE64` empty and the explicit ephemeral-key warning; it is not guaranteed to update an existing installation. The same build emitted `VITE_BASE44_APP_ID is not set`. The workflow does not define that variable, while `src/lib/app-params.js` uses it as the default app ID (although a URL parameter or local storage can override it). Runtime Base44 authentication in this CI APK is therefore **unverified**, not proven broken or working. Do not install over an existing app or clear data. Earlier main-branch and isolated-test builds also succeeded without establishing persistent-signature continuity or physical sensor behavior.
- **Code-quality gate limitation:** The Code Quality workflow runs data-contract audit, lint, and web build successfully, but its legacy `npm run typecheck` step is configured `continue-on-error: true`. The latest inspected successful run (43068062631) logged 1,034 TypeScript diagnostics: 298 across 53 project source files and 736 in the Leaflet dependency. The step/job still reports success, so a green Code Quality check does not establish full type safety.
- **WaveRadar Core — live read-only diagnostics at 2026-11-11:** 4,021 observations, all labeled MEASURED by ingestion metadata; 0 integrity-verified and 4,021 integrity-UNKNOWN; 8 device records, 0 validated; 78 validation runs, 0 passed, 8 failed; the current aggregate endpoint does not expose the remaining status split, so the prior 70-indeterminate breakdown is not re-asserted. No observations arrived in the last 24 hours; the latest observation is 2026-10-24T19:41:16.142Z. The channels remain 3,806 browser IMU motion observations and 215 Android SensorManager snapshots. Seven device records contain capability metadata, but this is not proof of physical capability. There are 0 training-eligible observations, 0 predictions, and 0 outcome-feedback records. Only the motion family is represented; camera, location, environment, radio, and external-sensor families have no observed evidence. **Release state: NOT_AUTHORIZED.**
- **Independent Validation Lab:** Separate hosted service at https://waveradar.hatchable.site, live at version 18 (deployed 2026-11-10). It contains 9 retired QA templates and 2 draft scientific protocols (KIT Wi-Fi BFI/CSI feasibility and Android native baseline), 4 suspended testers, 1 suspended reviewer, 23 assignments (18 rejected, 3 needs-revision, 2 submitted), 4 withdrawn submissions, and 152 audit events. Read-only role checks returned 401 for public admin access, 403 for a project member on the admin route, and 200 for admin access; reviewer archive access was denied to an unregistered user. No active independent reviewer is available, so the positive reviewer-scoped export path has not been re-established. The two protocols remain drafts, not preregistered or approved for confirmatory testing.
- **AI provider dependency:** WaveRadar 2.0 is live at version 421 (deployed 2026-11-10). Its current AI gate reports that no Anthropic provider key is configured; the last reported provider failure was 2026-11-11T06:25:14Z. The scheduled research-content job catches this failure and retains its deterministic evidence-only brief. The predictive-analysis handler calls `ai.generateText` without a local provider-error fallback, so that AI-dependent route remains blocked while the provider is unavailable. Do not add a paid provider, API key, or secret without explicit approval.
- **Source-of-truth gap:** The active WaveRadar 2.0 application source is in the Hatchable project, not mirrored as current API source in the private GitHub `waveradar` repository. That repository currently contains dated project records, a 2026-10-25 source snapshot, and a separate Kotlin native test path. This CMVisual repository contains the React/Vite/Capacitor build and native sensor bridge. Base44 authentication/entity/backend dependencies remain; the hosted Core API is not yet a full backend replacement. Do not copy or migrate code between these surfaces without a versioned ownership and compatibility plan.
- **World Data Commons:** No World Data Commons source or adapter was found in the live WaveRadar 2.0 file search. The three separate Hatchable projects named CMVisual World Data Commons, v2, and v3 are at version 0 with no deployments. CMVisual Open Spatial Perception is a separate live project (version 10, last deployed 2026-09-04); it is not evidence of an integrated World Data Commons pipeline.
- **WIS / spatial pose linkage:** The live WaveRadar 2.0 world scene/model API is source-linked and append-only but does not consume the separate Kotlin ARCore pose capture or expose an integrated pose-provider field. The 3D model therefore has no verified current ARCore/camera-pose feed; do not describe it as live spatial localization.
- **Drone and aerial sensing:** WaveRadar 2.0 has a documentation-only connector catalog and a read-only, owner-scoped query for already stored DFR/drone observations. No DJI, Skydio, Autel, MAVLink, or Remote ID adapter, live vendor feed, aircraft connection, camera projection, or independently validated aerial capability is established. See the [Drone interoperability source register](docs/research-validation-institute/DRONE_INTEROPERABILITY_SOURCE_REGISTER_2026-11-11.md).
- **Cinematic Showcase and Studio:** Separate Hatchable projects remain live at Showcase version 13 and Studio version 4 (both last deployed 2026-10-27). A five-minute chief-facing script exists, but only one 6.08-second concept clip is recorded; no full five-minute assembly exists. The Showcase asset manifest records a U.S. Air Force public-domain training photo, a Fort Rucker CC BY 2.0 photo with attribution, and original CC0 SVG illustrations. All interface overlays, routes, sensor-fusion visuals, and target indicators are explicitly simulated concepts, not live measurements. Studio is a planning/prompt/asset-registry workspace with browser-local storage and JSON export; it does not render video or run image/video models. These are separate projects; current deployment metadata does not establish an integrated Showcase/Studio workflow with WaveRadar 2.0.
- **Automation health:** The WaveRadar 2.0 evidence-cycle and autonomous-research jobs are active. The hourly source-metadata ingestion job reported 1 error in 49 runs over the last 7 days; its current `last_error` is null, and the specific failed-run detail is not available in the current summary. The live source file currently contains 58 metadata sources but processes only 1 per hourly run (`SOURCE_BATCH_SIZE=1`), implying roughly a 58-hour full refresh cycle. A previously discussed 4-source/2-hour batching change is not present in the current source or live schedule; do not treat it as implemented. A bounded batching improvement still needs a reproducible dry-run and review before deployment.
- **No through-wall or life-safety claims:** Do not describe the current phone-only workflow as validated through-wall sensing, radar, victim localization, or an operational life-safety system. Any such capability requires compatible external sensing hardware and independent ground-truth testing.

## Run locally

Requirements: Node.js 22, Java 21 for Android builds, and Android SDK/Gradle tooling for local APK packaging.

    npm install
    npm run audit:data
    npm run build
    npm run dev

## Build Android

The GitHub Actions workflow `.github/workflows/build-android.yml` builds the web bundle, generates the Capacitor Android project, installs the repository's native sensor bridge, synchronizes plugins/assets, and runs Gradle to produce a debug APK.

To build locally after configuring Android tooling:

    npm run audit:data
    npm run build
    npx cap add android
    npx cap sync android
    cd android
    ./gradlew assembleDebug --no-daemon

The workflow copies the native sensor bridge from `native/android/` and adds the required Android permissions. If regenerating the Android project, follow the workflow so these native files and permissions are included.

For consistent update signatures across CI runs, configure the GitHub Actions secret `WAVERADAR_DEBUG_KEYSTORE_BASE64` as described in `docs/android/DEBUG_SIGNING_AND_UPDATE.md`. Do not commit a keystore to this public repository. A successful build alone does not prove that the persistent key was used or that an APK can update an installed app.

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
