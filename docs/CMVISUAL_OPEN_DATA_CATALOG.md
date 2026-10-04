# CMVisual Open Data Catalog

CMVisual should consume public datasets through adapters rather than embedding large datasets into the application. Each adapter converts source records into the CMVisual observation contract while preserving source attribution and license terms.

## Adapter contract

Each dataset adapter should expose:

- `datasetId`
- `version`
- `sourceUrl`
- `license`
- `commercialUse`
- `modalities`
- `coordinateFrame`
- `timestampModel`
- `trackIdentityModel`
- `groundTruthAvailable`
- `downloadInstructions`
- `normalizer(record)`
- `validationNotes`

The adapter must never silently upgrade an unknown source field into a measured CMVisual fact.

## Priority datasets

### Zenseact Open Dataset

Useful for camera + support-sensor spatiotemporal learning, localization, mapping, and multimodal fusion experiments. Verify the current dataset license and attribution requirements before commercial redistribution or bundling.

### CMHT Autonomous Dataset

Useful for multimodal tracking experiments because it includes combinations of LiDAR, GPS/IMU, mmWave radar, RGB/IR, and 3D tracklets. Verify the exact current license before commercial use.

### aiMotive

Useful for synchronized LiDAR/camera/radar and 3D tracking research. Current access terms should be checked before any commercial use; do not treat a research-only license as a commercial-use license.

### MARS

Useful for multimodal LiDAR + surround-RGB research. Current licensing and noncommercial restrictions must be respected.

### Waymo Open Dataset

Useful for perception, motion, trajectory, and mapping benchmarks. Use the current Waymo dataset terms and attribution requirements.

### OpenMPD

Useful for synchronized multi-camera + LiDAR perception and tracking experiments.

### OctoSense

Useful for broad multimodal experiments spanning RGB/event/LiDAR/thermal/IMU/RTK-GPS/CAN.

### KITScenes

Useful as a newer multimodal benchmark source for evaluating cross-modal scene understanding and fusion.

## Rules for use

1. Never download or bundle a large dataset into the mobile application.
2. Store only manifests, adapter code, hashes, and small regression fixtures in the repository.
3. Keep license and commercial-use status beside every dataset manifest.
4. Pin dataset versions for reproducibility.
5. Record source observation IDs and timestamps in replay fixtures.
6. Do not train or evaluate on a dataset while claiming real-world validation unless the dataset's provenance supports that claim.
7. Keep simulation-derived data explicitly labeled as simulation.
8. Keep research-only datasets isolated from commercial training/evaluation pipelines unless licensing permits the intended use.

## Why this matters

A dataset adapter architecture lets CMVisual expand its evidence base without locking the product to one sensor vendor or one provider. It also gives grant and customer evaluators a reproducible path from source data to normalized observation to world-model result.