# WaveRadar Fresh Build — Zero-Trust Data Reset

Date: 2026-10-29
Branch: `fresh-build/zero-trusted-data`
Status: implementation branch; not merged or deployed.

## Objective

The new build starts with **zero trusted observations**. It must not display old captures, legacy imports, demo/mock/fixture data, predictions without traceable fresh inputs, or observations that merely label themselves measured.

## What changed in this branch

- Added `src/lib/freshBuildBoundary.js`, a strict eligibility check for trusted layers.
- Added `scripts/test-fresh-build-boundary.mjs` and the `npm run test:fresh-build-boundary` command.
- Updated `src/hooks/useWorldStateProjection.js` so live, federated, replay, and hazard records enter trusted views only when they belong to the fresh build generation and have explicit source/device/timestamp/evidence metadata plus verified integrity.
- Predictions are separated from measurements and require the fresh build generation, a model version, a timestamp, and explicit source-observation lineage.
- Rejected records are counted and reported with quarantine reasons instead of silently being relabeled or counted as measured.

## Fresh-build trust requirements

A trusted measurement must carry:
1. `buildGeneration = waveradar-fresh-2026-10-29-v1`
2. Explicit source and device identity
3. A valid measurement timestamp (not processing/arrival time)
4. An explicit evidence class
5. `integrityVerified: true` or `integrity.status: VERIFIED`
6. No quarantine flag and no demo/mock/fixture/fake/simulated/sample/seed/legacy/replay/test-only label

A timestamp or schema label alone does not prove that a reading is real. Inferred detections, derived values, and predictions must remain in their own classes.

## Data preservation and reset boundary

This change **does not delete** backend observations, prior runs, device identity, local app storage, upload queues, or audit evidence. Historical records remain available for investigation but are not eligible for the fresh trusted view. Do not clear the installed app or reset its storage as part of this code change.

The active trusted dataset begins empty. Fresh measurements can appear only after the new capture path tags the generation and the integrity verification pipeline verifies their provenance. Until then, the correct result is an empty trusted map/layer with explicit unavailable/awaiting-validation status—not synthetic substitute data.

## Verification required before release

- Run `npm run test:fresh-build-boundary`
- Run `npm run audit:data`
- Run all existing data-contract, array-boundary, queue-safety, evidence-provenance, and native sensor lifecycle tests
- Run `npm run build`
- Review projection callers and ensure the new capture path stamps the build generation without setting integrity to verified by default
- Install the isolated APK beside the existing app and confirm it starts with zero trusted historical observations
- Confirm original app, queues, evidence, and server records remain intact
- Perform fresh physical capture only after native sensor capability is available; do not claim spatial accuracy from motion-only data

CI success is not physical-device validation. This branch must not be described as deployed or production-ready until those gates pass.
