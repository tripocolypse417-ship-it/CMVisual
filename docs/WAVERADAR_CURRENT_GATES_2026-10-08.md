# WaveRadar Current Gates — 2026-10-08

## The single real blocker

Physical validation on a real Android device is the gating item. The software architecture is substantially ahead of the evidence base.

### Required next evidence
1. Real phone sensor capture.
2. Camera + IMU + persistent device identity verification.
3. Known-motion and known-distance ground truth.
4. Track continuity and localization error.
5. Latency and stale-input measurements.
6. Sensor conflict/loss tests.
7. Replay determinism.
8. Multi-device alignment.

## After the first validated capture

- strengthen locked-target skeleton/keypoint presentation
- refine compact radar + 3D view
- enable mapped-geometry route visualization
- add adaptive rendering/performance modes
- expand Incident Command shared views
- add capability negotiation
- add offline/store-and-forward capture
- integrate validated external sensors behind adapters

## Research queue

ARCore depth, UWB, Bluetooth ranging, thermal, mmWave, acoustic localization, RF/CSI research, wearable physiology, ROS 2 integration boundary, OpenXR display boundary.

## Truth rule

No simulated sensor reading is allowed into the live evidence stream. Experimental capability remains experimental until independently validated.
