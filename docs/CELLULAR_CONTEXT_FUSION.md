# WaveRadar Cellular Context and Multi-Radio Fusion

Status: proposed extension to SENSOR_INTELLIGENCE_FEDERATION_ROADMAP.md. Not implemented; device/network capabilities and permissions require testing.

## Purpose
Treat cellular radio as an additional source of coarse location context, coverage state, mobility hints, and—only where explicitly available—network-provided timing/ranging measurements. Cellular observations are a supporting modality, not a substitute for calibrated Wi-Fi RTT, visual/depth sensing, or ground truth.

## Data that may be available
- Android TelephonyManager cell information: radio technology, registered/neighboring cell status, signal-strength fields and limited cell identity fields depending on OS, carrier, modem, permissions, and device.
- GNSS/network location supplied by Android location providers, with its own provider, timestamp, accuracy radius, and permission provenance.
- Carrier/network timing or positioning results only through supported APIs, authorized operator integration, or dedicated infrastructure; do not assume a normal app can access raw tower-side measurements.
- Coverage transitions and signal trends can provide contextual clues, but signal strength alone does not provide reliable distance, bearing, indoor position, or human presence.

## Cellular observation envelope
Record radio technology, registered/neighbor status, timestamp and sample age, signal metric and unit, optional coarse/pseudonymous cell reference, permission/availability state, device/API/carrier limitations, location-provider provenance, uncertainty, and collection-policy version. Separate direct modem observations from OS-derived location and from model inferences.

Never upload IMSI, IMEI, phone number, subscriber identity, or precise persistent cell identifiers by default. Prefer local processing and coarse/pseudonymous cell references; rotate pseudonyms where appropriate. Explicit consent, access controls, retention limits, and revocation are required.

## Fusion policy
1. Keep cellular signal/context separate from cellular-derived location and network-provided ranging; each has different accuracy and evidence class.
2. Fuse cellular context with Wi-Fi RTT, GNSS, camera/visual-inertial odometry, barometer, and IMU only after time alignment and coordinate-frame checks.
3. Use uncertainty-aware filters and robust outlier rejection. Cell changes or signal swings may be caused by network load, antenna direction, walls, multipath, handover, or power control; do not interpret them as object movement without corroboration.
4. Do not treat two signals from the same modem/network as independent evidence. Track shared failure modes and correlated measurements.
5. In poor coverage, preserve the last trusted estimate with growing uncertainty, mark it stale, and never imply cellular sensing has located a person inside a building.

## Implementation stages
1. Capability audit: identify supported radio technologies and Android permission/API availability on each target phone; show 'unsupported', 'permission needed', 'available', 'stale', or 'unavailable'.
2. Add an opt-in native TelephonyManager adapter. Test Android version/target SDK behavior and avoid continuous polling that drains battery.
3. Normalize cell context into the canonical evidence contract; add privacy filtering before storage or transmission.
4. Replay controlled walking/indoor/outdoor trials with GNSS and surveyed reference points; report errors and coverage limitations by environment and carrier.
5. Only consider operator-provided timing/ranging integration after access, legal authorization, documented APIs, and calibration are confirmed.

## Current code findings to resolve
- Existing native sensor plugin collects accelerometer, gyroscope, magnetometer, rotation vector, gravity, pressure, light, and proximity data.
- Existing Wi-Fi RTT plugin uses Android WifiRttManager and reports distance plus standard deviation when a range succeeds. It includes responder MAC address in the returned payload; pseudonymize/minimize before persistent storage or federation.
- The currently inspected native sensor plugin capability report has no cellular adapter. Cellular sensing is therefore a proposal, not a verified current capability.
- The native sensor plugin registers listeners in load() and unregisters on destroy; lifecycle behavior, sample age, throttling, battery impact, and bridge invocation need device tests.
- Existing cross-device agreement logic compares timestamps rather than measurement values/positions and uncertainty; do not use it as a fusion quality metric.

## Acceptance criteria
- No collection until user permission and app policy allow it; no subscriber identifiers in uploaded packets.
- Unit tests for redaction, pseudonymization, malformed/stale observations, unsupported radio types, and permission denial.
- End-to-end proof that cell observations are labelled as cellular context and do not masquerade as distance/radar detections.
- Ground-truth trials report error distributions and failure rates by environment; no accuracy claim until thresholds are agreed and met.
- Battery, upload volume, and privacy retention tested on target Android phones.

## Decision
Implement the capability and privacy audit first, then optional coarse cellular context. Defer any claims of tower-based precise ranging or through-wall person detection unless a supported, authorized network interface and independent validation demonstrate those capabilities.