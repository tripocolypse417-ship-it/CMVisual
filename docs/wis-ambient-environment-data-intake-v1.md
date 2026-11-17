# WIS Ambient Environment Data Intake v1

Status: DESIGN CONTRACT — not proof of runtime support or nearby-device detection.

## Decision

Treat every authorized observation from household, building, personal, vehicle, and wireless equipment as a potential WIS data source. A device category in this catalog is a capability target, not evidence that a device is present, reachable, identified, or validated.

## Device and signal families

| Family | Examples | Permitted intake path |
|---|---|---|
| Wi-Fi infrastructure and clients | routers, access points, printers, TVs, speakers, connected appliances | Android platform scan cache; user-authorized router/controller API |
| Bluetooth LE | wearables, beacons, temperature/humidity sensors, asset tags, peripherals | Android BLE scan with runtime permissions and platform limits |
| Matter / Thread | locks, thermostats, lights, leak/door sensors, bridges | User-authorized Matter fabric or border-router integration |
| Zigbee | bulbs, plugs, switches, door/leak sensors | User-authorized hub/coordinator integration |
| Z-Wave | locks, contact sensors, thermostats, alarms | User-authorized hub/controller integration |
| UWB | supported phones, tags, ranging anchors | Explicitly supported UWB APIs and paired/authorized peers |
| Cellular | serving/neighbor cell metadata exposed by Android/carrier | Android Telephony APIs; no carrier-network probing |
| GNSS / satellite navigation | constellation and fix metadata exposed by device | Android location/GNSS APIs; not satellite internet discovery |
| Safety and environment | smoke/CO alarms, gas, temperature, humidity, water, pressure, air quality | Approved sensor API, paired sensor, gateway, or manual/imported record |
| Building systems | HVAC, access control, elevators, fire panels, generators, power meters | Authenticated owner/operator integration only |
| Vehicles and mobile assets | fleet telemetry, vehicle sensors, authorized tags | Owner-authorized telematics/API or paired sensor |
| Network services | service advertisements and protocol metadata | Passive local discovery only where platform and network policy permit; no login attempts or intrusive scans |

## Canonical observation envelope

Every ingested record should preserve:
- immutable observation ID and source/device ID (pseudonymous where possible)
- capability ID and family from the shared vocabulary
- source adapter, protocol, and adapter version
- observed time, received time, clock domain, and age/freshness
- raw value and unit, plus normalized value where applicable
- location and location accuracy only when permissioned and available
- evidence class: MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, UNKNOWN, or UNAVAILABLE
- integrity state, provenance, permission scope, and collection method
- uncertainty, limitations, and any conflicts with other sources

Raw observations are append-only. Normalization and inference create linked records; they never overwrite source evidence.

## Fusion and WIS routing

1. Adapters emit source-native observations.
2. A schema validator checks required fields, units, timestamps, and provenance.
3. The event normalizer maps records to the shared capability vocabulary.
4. The correlation layer links observations by time, place, and compatible identifiers, retaining uncertainty.
5. The fusion engine produces derived situational context with references to every contributing observation.
6. The WIS event bus distributes authorized records to the command view, helmet view, map, replay store, and research/validation workspace according to role and permission.
7. Independent validation records remain separate from operational inference.

## Hard boundaries

- A device type listed here is not necessarily detectable by a phone.
- Wi-Fi scan results may be cached, redacted, or rate-limited; BLE scanning is permission- and OS-limited.
- Zigbee, Z-Wave, Thread, Matter, building controls, and many appliance inventories normally require an authorized hub, gateway, fabric, or vendor API.
- A radio identifier or service advertisement does not prove a human identity, device owner, room location, or physical topology.
- Do not collect credentials, bypass permissions, join networks, control devices, or probe infrastructure without explicit owner authorization and a scoped integration.
- Do not infer people behind walls or claim life-safety accuracy from ordinary wireless observations.
- Missing, blocked, stale, unsupported, or permission-denied data must be represented explicitly, never filled with fabricated values.

## Implementation sequence

P1: stabilize Android Wi-Fi/cellular intake and add permissioned BLE intake; add freshness and source-quality tests.
P2: define authenticated gateway connectors for Matter/Thread, Zigbee, and Z-Wave; begin with read-only inventory and telemetry.
P3: add safety/environment sensors and approved building-system interfaces.
P4: unify replay, spatial/temporal correlation, and independent ground-truth validation.

## Acceptance criteria

- Every event has traceable provenance and a stable schema version.
- Stale, unavailable, denied, and empty results are distinguishable.
- No source can silently upgrade inferred data to measured or validated.
- Correlations preserve source references and uncertainty.
- The WIS consumers receive events through one documented contract, not bespoke undocumented payloads.
- Connector access is least-privilege, owner-authorized, auditable, and read-only by default.
