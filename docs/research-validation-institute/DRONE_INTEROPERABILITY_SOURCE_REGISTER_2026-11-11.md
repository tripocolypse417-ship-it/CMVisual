# WaveRadar Drone & Aerial Sensor Interoperability Register

**Snapshot date:** 2026-11-11  
**Owner:** WaveRadar engineering / Research & Validation Institute  
**Status:** Research and documentation register only. No vendor adapter, live aircraft feed, operator authorization, or independently validated aerial measurement is established.

## 1. Executive disposition

The live WaveRadar 2.0 project contains a documentation-only connector catalog at `api/integrations/drone/catalog.js`, a read-only owner-scoped query at `api/integrations/drone/area-intelligence.js`, and the DFR intake path at `api/integrations/dfr/ingest.js`. The query searches only observations already stored for the signed-in owner. It does not scan for aircraft, connect to vendor clouds, or discover nearby radios. Existing intake records remain UNKNOWN for integrity/validation unless separately verified.

The current maturity by integration layer is:

| Layer | Current state | Evidence / limitation |
|---|---|---|
| Documentation catalog | IMPLEMENTED | Vendor/protocol metadata and explicit prohibited scopes exist in the live WaveRadar 2.0 source. |
| Owner-scoped stored-observation query | IMPLEMENTED | Read-only query returns only the signed-in owner's stored DFR/drone records with source, timestamps, coordinates, frame, calibration, uncertainty, and evidence labels. |
| DFR intake | IMPLEMENTED, NOT VALIDATED | Existing intake accepts records but does not establish source authenticity, calibration, or physical accuracy. |
| Vendor SDK/API adapters | NOT IMPLEMENTED / NOT TESTED | No verified DJI, Skydio, or Autel adapter was found. |
| MAVLink/MAVSDK telemetry subscriber | NOT IMPLEMENTED / NOT TESTED | Candidate architecture only; transport/signing and read-only enforcement remain prerequisites. |
| Remote ID receiver | NOT IMPLEMENTED / NOT TESTED | No receiver or authorized broadcast capture established. Remote ID is not video or private sensor access. |
| Live vendor feed | NOT CONNECTED | No operator-authorized credentials, active subscription, controller, aircraft, or successful live test. |
| Camera/gimbal pose and calibrated projection | NOT IMPLEMENTED / NOT VALIDATED | No verified intrinsics, extrinsics, pose stream, calibration, or transform package. |
| 3D scene linkage | EXPERIMENTAL DESIGN ONLY | No validated camera footprint or object projection is established. |
| Independent aerial validation | NOT STARTED | Requires a partner-owned aircraft/controller, reference measurements, preregistered protocol, and independent review. |

A catalog entry is not a connection. A received packet is not an authenticated aircraft. A geotag is not a calibrated camera pose. A predicted scene object is never a measured observation.

## 2. Vendor and standards source register

### 2.1 DJI

- **Official source:** [DJI Mobile SDK V5 documentation and release notes](https://developer.dji.com/doc/mobile-sdk-tutorial/en/).
- **Latest version surfaced in the official public tutorial page during this review:** Android MSDK V5.15.0, released 2025-06-10. The page lists support additions including Matrice 400 and Manifold 3, and identifies specific aircraft/controller/firmware combinations in its compatibility tables.
- **Access / compatibility:** Developer SDK access, supported controller/aircraft family, exact firmware, and SDK-to-device compatibility must be confirmed before implementation. Do not infer compatibility from a vendor family name.
- **WaveRadar status:** Documentation target only; no SDK installed, developer account verified, adapter implemented, operator consent, aircraft, or live test.
- **Safe integration candidate:** Start with explicitly authorized telemetry and camera/gimbal metadata read scopes. Reject virtual-stick, flight, mission, camera-control, gimbal-control, and other actuator/write paths at the adapter boundary. Do not embed DJI credentials in the public repository or a client-side bundle.
- **Licensing:** Review the current DJI SDK agreement and per-version distribution terms before including SDK binaries or redistributing any derived package. No commercial-use conclusion is made here.

### 2.2 Skydio

- **Official source:** [Skydio Developer Tools](https://www.skydio.com/developer-tools).
- **Published compatibility shown on the official page:** Cloud API for X10, X10D, X2, and S2+ when used with the listed Skydio software products; Control & Telemetry ICD for X10D using MAVLink/RAS-A; Android API for X10D running on the X10D Controller. The Attachment ICD is separately access-controlled.
- **Access / compatibility:** Cloud API documentation and product/service entitlements are access-dependent. The controller-side Android API is specific to X10D. Exact API scopes, customer account, software version, firmware, and operator authorization must be confirmed.
- **WaveRadar status:** Documentation target only; no API credentials, entitlement, controller, aircraft, or successful feed test.
- **Safe integration candidate:** Read-only fleet/flight metadata, telemetry, authorized video receive, and media metadata only where the contract and account scope permit. Exclude flight initiation, mission changes, vehicle control, attachment actuation, camera control, and gimbal control.
- **Partner path:** The official page lists a Tech Partnerships & Integrations contact path. This is a verified contact route, not an existing relationship. No outreach has been sent and no partnership is implied.

### 2.3 Autel Robotics

- **Official source:** [Autel Developer Technologies](https://developer.autelrobotics.com/download).
- **Published SDK families visible on the portal:** Mobile SDK V1, V1.5, V2.0, V2.5, and V2.6 (DragonFish). The portal's V2.5 release entry is dated 2025-08-20 and describes DragonFish Standard/Pro support with compatibility references including EVO Lite Enterprise, EVO MAX, and EVO Alpha. The portal also lists a Cloud API for EVO Max Series, published 2024-12-12, with live-streaming, media, health-management, and other functions.
- **Access / compatibility:** The developer portal requires account access for some downloads and references corresponding firmware from Autel's official site. Model, controller, region, SDK generation, and firmware compatibility must be verified from the relevant release notes before coding.
- **WaveRadar status:** Research target only; no developer account, credentials, aircraft, adapter, or live feed.
- **Safe integration candidate:** Restrict any eventual adapter to approved telemetry, flight-log, video-receive, and payload-metadata read scopes. The vendor SDK exposes control functions; WaveRadar must not call flight, mission, camera, gimbal, or payload write operations.

### 2.4 MAVLink / MAVSDK

- **Official sources:** [MAVSDK releases](https://github.com/mavlink/MAVSDK/releases), [MAVSDK repository](https://github.com/mavlink/MAVSDK), and [MAVLink protocol documentation](https://mavlink.io/en/).
- **Current release observed:** MAVSDK v4.1.0, released 2026-10-27. Release notes include the MavlinkDirect server/wrapper work and updates across the C++, C, Python, and Kotlin bindings. The repository identifies the library as BSD-3-Clause licensed.
- **Integration implication:** Kotlin bindings make an Android-side bridge a plausible research path, but MAVSDK includes command-capable plugins and the v4.1.0 MavlinkDirect work includes command send/receive functionality. The presence of a read-oriented WaveRadar adapter must not be treated as a security boundary by itself.
- **Required controls:** Use an operator-provisioned telemetry-only transport, authenticated/isolated link, message-signing policy where supported, sender/system/component allowlists, replay/sequence checks, and a strict allowlist of read-only message types. Reject command, mission, parameter-write, arming, actuator, camera, gimbal, and tasking messages before they reach any application handler. Treat unsigned or otherwise untrusted packets as untrusted evidence.
- **WaveRadar status:** Protocol/library candidate only; no MAVSDK version pinned, transport, signing policy, or aircraft integration test established.

### 2.5 FAA Remote ID / OpenDroneID / ASTM

- **FAA source:** [FAA Remote Identification of Drones](https://www.faa.gov/uas/getting_started/remote_id).
- **Regulatory data boundary:** The FAA describes Remote ID as a broadcast signal carrying identification and location information. Standard Remote ID broadcasts aircraft and control-station information; a broadcast module provides aircraft and take-off-location information. This is broadcast awareness, not a camera feed, private fleet API, payload data, or unrestricted telemetry.
- **OpenDroneID source:** [OpenDroneID specification repository](https://github.com/opendroneid/specs). Its README states that the repository contains early drafts and that these are not compliant with the final ASTM Remote ID standard.
- **Normative standard:** [ASTM F3411-22a — Standard Specification for Remote ID and Tracking](https://store.astm.org/standards/f3411). ASTM currently lists F3411-22a as active. The full standard is paid access; do not substitute an early OpenDroneID draft for the final standard or claim compliance from using an open-source decoder.
- **Open-source implementation:** [OpenDroneID core C library](https://github.com/opendroneid/opendroneid-core-c) identifies Apache-2.0 licensing in its source. Review the exact pinned revision and all transitive dependencies before inclusion.
- **WaveRadar status:** Research target only; no receiver, radio scan, broadcast capture, decoder, operator authorization, or test. No scanning or connection to nearby aircraft is permitted without explicit operator authorization and a lawful test plan.
- **Safe integration candidate:** A passive, authorized broadcast-awareness input only. Store receiver identity, channel, capture/receive time, packet bytes/hash, decoder version, field-level validity, and confidence/uncertainty. Do not use Remote ID as proof of aircraft ownership, video access, sensor calibration, or private operator consent.

### 2.6 OGC SensorThings API

- **Official standard:** [OGC SensorThings API 2.0, document 23-019](https://docs.ogc.org/is/23-019/23-019.html).
- **Current status:** Approved 2026-09-14 and published 2026-11-04 as an OGC Member-approved international standard. The document states that it is available on a royalty-free, non-discriminatory basis subject to the OGC license agreement.
- **Important v2.0 changes for WaveRadar:**
  - The data model, API specification, and protocol bindings are separated so implementations can use HTTP and/or MQTT bindings.
  - The API aligns with OData 4.01 and adds a `$metadata` document that exposes the server's actual model and extensions.
  - Updating a navigation-property relationship list replaces the related-entity collection in v2.0; v1.1 appended the specified entities. Do not reuse v1.1 PATCH/PUT behavior without version-aware tests.
  - Datastreams use SWE-Common `resultType` and `resultEncoding`; the former `unitOfMeasurement` attribute is removed and units are represented in the result structure.
  - Feature-of-interest modeling changes to `Feature` with proximate/ultimate feature relationships.
  - Location entities can use OGC GeoPose encoded as `application/geopose+json`.
- **Integration implication:** OGC SensorThings 2.0 should become the preferred vendor-neutral observation interchange target, with a versioned v1.1 compatibility adapter where a provider has not upgraded. Treat GeoPose as a serialization format for a stated pose and frame, not proof that the pose was measured, calibrated, or independently validated.
- **WaveRadar status:** The current drone catalog links to the generic SensorThings standard page; no v2.0 adapter or conformance test exists. No SensorThings endpoint or dataset is connected.
- **License / access:** The standard document is royalty-free/non-discriminatory under the OGC license agreement. Each provider's API access, dataset license, authentication, and terms still require separate review.

## 3. Canonical WaveRadar data contract for aerial observations

Every incoming observation should be normalized into a versioned envelope without overwriting the original source packet or file. Preserve, where available:

- Source organization, system, device, aircraft, controller, sensor, and datastream identifiers. Do not infer ownership from a broadcast identifier.
- Exact model, firmware, SDK/API version, controller software, adapter version, and granted scope.
- Raw packet/file reference, content type, source checksum, decoder version, and immutable intake timestamp.
- Capture/event timestamp, source clock basis, receive timestamp, monotonic timestamp if available, sequence number, clock-synchronization pairs, and uncertainty.
- Aircraft position, controller/control-station position, camera/gimbal pose, observation location, and estimated object location as separate typed records.
- Coordinate reference system, coordinate frame, axis convention, altitude datum, units, transformation provenance, and transformation uncertainty.
- Camera intrinsics, lens/focal metadata, gimbal/aircraft extrinsics, calibration certificate or method, and validity interval before any camera projection is attempted.
- Evidence class, integrity state, calibration state, authorization basis, privacy/retention class, and independent-review reference.
- For OGC SensorThings, preserve service root, API version, `$metadata` digest, entity IDs, Datastream `resultType` / `resultEncoding`, Feature links, and protocol binding.

Never collapse the following locations into one coordinate:

1. Aircraft position.
2. Controller/control-station position.
3. Camera optical-center position and orientation.
4. Sensor observation's stated location/feature.
5. Estimated object location.

A camera footprint or map projection is prohibited until camera intrinsics, camera/gimbal pose, calibration, coordinate transform, altitude datum, and uncertainty are all present and the projection method has been independently checked. A GeoPose object or aircraft GPS fix alone is insufficient.

## 4. Read-only integration boundary

The integration layer is for observation ingestion and retrieval only. The following operations are prohibited:

- Flight/vehicle commands, arming/disarming, takeoff, landing, return-to-home, or emergency control.
- Waypoint, route, mission, geofence, or parameter writes.
- Camera, gimbal, payload, attachment, or sensor tasking/control writes.
- Scanning for or connecting to nearby aircraft, controller networks, or private vendor accounts without explicit operator authorization.
- Bypassing SDK permissions, firmware checks, account entitlements, encryption, signing, or rate limits.

Implement the read-only boundary in the transport/adapter layer, not only in the UI. Reject disallowed message types and scopes before data reaches WaveRadar's observation pipeline. Record denied operations in security/audit logs without storing secrets.

## 5. Validation gates before a connector can be promoted

| Gate | Acceptance evidence |
|---|---|
| G0 — Documentation | Official docs, publication date, supported models, firmware, SDK version, access path, and license/terms recorded. |
| G1 — Authorized access | Named operator, device ownership/authority, approved account/scopes, and documented consent. No credentials stored in source. |
| G2 — Protocol security | Read-only allowlist, transport authentication/signing, system/component allowlist, replay protection, network isolation, and negative tests for every prohibited write. |
| G3 — Parser/normalizer | Versioned schemas; malformed, truncated, duplicate, stale, future-dated, and unknown-field tests; raw bytes retained. |
| G4 — Time/coordinate integrity | Source/capture/receive timestamps, clock basis, frame, units, altitude datum, uncertainty, and transformation provenance are preserved. |
| G5 — Bench integration | Partner-provided or public sample dataset with license, reproducible adapter run, logs, and exact hardware/software matrix. Synthetic fixtures remain SIMULATED. |
| G6 — Physical evaluation | Partner-owned aircraft/controller, calibrated reference, controlled scene, independent ground truth, preregistered protocol, and independent review. |
| G7 — Operational consideration | Separate hazard analysis, privacy/security review, human-factors evaluation, rollback plan, and explicit release authorization. A research pass is not life-safety authorization. |

Each adapter status must be one of: DOCUMENTATION_ONLY, ACCESS_PENDING, IMPLEMENTED_UNTESTED, INTERNALLY_TESTED, LIVE_AUTHORIZED_FEED, INDEPENDENTLY_EVALUATED, or DISABLED. Never jump directly from catalog entry to connected or validated.

## 6. External dependencies and no-cost path

Required before a real vendor integration:

- A partner-owned aircraft and controller, with operator permission and a safe test location.
- Exact aircraft/controller model, firmware, SDK/API version, and compatibility matrix.
- Vendor developer account, approved credentials/scopes, and applicable service entitlement where required.
- Representative sample telemetry, logs, media metadata, and license/consent documentation.
- A calibrated independent reference for the measurand being evaluated (position, attitude, camera pose, timing, or mapping accuracy).
- Independent protocol review and a controlled ground-truth plan.

No equipment purchase, paid subscription, vendor-account change, credential request, outreach, or partnership commitment is authorized by this register. The immediate no-cost work is documentation review, schema design, parser/normalizer tests using properly licensed public samples, and read-only security tests. Physical integration remains blocked until a partner supplies authorized hardware and ground truth.

## 7. Recommended implementation sequence

1. Update the live Hatchable connector catalog and `public/drone-data-integration.md` to reference the approved OGC SensorThings 2.0 standard while preserving v1.1 compatibility. Keep this as a staged source change until the active application source is version-controlled and reviewable.
2. Define a versioned WaveRadar aerial observation envelope with distinct aircraft, controller, camera, sensor, and object-location fields.
3. Implement a read-only OGC SensorThings v2.0 client against a controlled public or partner test endpoint; verify `$metadata`, `resultType`, `resultEncoding`, Feature relationships, and GeoPose serialization.
4. Add strict parser and authorization tests for Remote ID and MAVLink/MAVSDK only after a lawful test capture or partner sample is available.
5. Add DJI, Skydio, or Autel adapters only after a specific partner-owned model/controller/firmware and account scope are identified. Do not build generic adapters against unverified assumptions.
6. Freeze the adapter and protocol before any physical accuracy evaluation; return raw logs, calibration artifacts, deviations, and independently reviewed results as an append-only evidence package.

## 8. Sources reviewed on 2026-11-11

- DJI Mobile SDK V5: https://developer.dji.com/doc/mobile-sdk-tutorial/en/
- Skydio Developer Tools: https://www.skydio.com/developer-tools
- Autel Developer Technologies: https://developer.autelrobotics.com/download
- MAVSDK releases: https://github.com/mavlink/MAVSDK/releases
- MAVSDK source and BSD-3-Clause license: https://github.com/mavlink/MAVSDK
- MAVLink protocol: https://mavlink.io/en/
- FAA Remote ID: https://www.faa.gov/uas/getting_started/remote_id
- OpenDroneID specification repository and final-standard caveat: https://github.com/opendroneid/specs
- ASTM F3411-22a: https://store.astm.org/standards/f3411
- OpenDroneID core C library: https://github.com/opendroneid/opendroneid-core-c
- OGC SensorThings API 2.0, OGC 23-019: https://docs.ogc.org/is/23-019/23-019.html
