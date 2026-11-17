# WIS Data Access Engineering Register v1

Status: engineering plan; not evidence of deployed integrations.

## Objective

Build the broadest lawful, reliable, and reproducible data intake available to WIS. Prefer direct sensor interfaces and owner-authorized integrations over inference from fragments. Every source must declare its access boundary, permission basis, fidelity, freshness, provenance, and known blind spots.

## Access acquisition model

For each source, WIS maintains a source-adapter record with:
- owner/operator and authorized scope;
- interface type (OS API, SDK, documented API, gateway, driver, hardware bus, export, or partner feed);
- required permission, role, credential scope, and consent/authorization record;
- supported data fields, units, clock domain, sampling rate, and retention;
- access status: DISCOVERED, ADVERTISED, AUTHORIZED, CONNECTED, READABLE, INGESTING, INDEPENDENTLY_VALIDATED, BLOCKED, or UNAVAILABLE;
- adapter version, test evidence, failure modes, and coverage gaps.

Never collapse these states into a single "connected" flag.

## Initial source and access matrix

| Source family | Preferred acquisition path | What can be acquired | Main boundary / gap |
|---|---|---|---|
| Android motion/environment sensors | SensorManager through native app | Accelerometer, gyroscope, rotation vector, gravity, pressure, light, proximity when fitted | Device-dependent sensor inventory; permissions/lifecycle; no guarantee of calibration |
| Android GNSS/location | LocationManager/Fused Location Provider with user permission | Fixes, accuracy, speed, bearing, provider and timestamps | OS permission, background limits, GNSS reception and multipath |
| Wi-Fi | WifiManager scan cache; authorized AP/controller APIs; site collectors | Visible BSSID/SSID, channel/frequency, RSSI, cached scan age; AP inventory where authorized | Android throttling/permission; client isolation/VLAN boundaries; no general browser LAN scan |
| Cellular | TelephonyManager platform APIs; carrier/enterprise APIs where contractually available | Exposed serving/neighbor cell metadata and signal metrics | Carrier/OS restrictions, redaction, rate limits, modem/device variation |
| Bluetooth LE | Android BluetoothLeScanner with runtime scan/connect permissions | Advertisements, service UUIDs, manufacturer data; GATT characteristics only with authorized connection | Radio range, scan permission, privacy-randomized addresses, encrypted characteristics |
| Matter / Thread | Authorized Matter controller or border-router APIs | Commissioned node inventory, endpoints, clusters and permitted attributes | Fabric credentials and controller authorization required |
| Zigbee / Z-Wave | Authorized coordinator/hub APIs | Paired device inventory, exposed clusters/command classes, telemetry | Must be paired/authorized; proprietary hub APIs and mesh coverage |
| mDNS / DNS-SD / SSDP | Local collector on each authorized LAN segment | Advertised services, endpoints, device descriptors | Multicast scope, firewalls, client isolation, non-advertising devices |
| Managed IP networks | Owner-authorized router/controller APIs, SNMPv3, LLDP, DHCP inventory | Managed device and port inventory, topology hints, service status | Network-admin role, credential scope, segmentation, SNMP/LLDP coverage |
| Building systems | Owner/vendor BMS APIs, BACnet/IP or approved gateway | HVAC, alarms, access-control states, environmental and equipment telemetry | Site authorization, safety change-control, vendor licensing; read-only first |
| Cameras / thermal / depth | Documented camera SDKs, RTSP/ONVIF, device APIs | Images, video, thermal frames, depth where supported | Explicit access, privacy policy, bandwidth, calibration and synchronization |
| UWB / Wi-Fi RTT | Android UWB/Wi-Fi RTT APIs and compatible anchors | Ranging observations and uncertainty | Both endpoint capability and permissions; range is not identity |
| Drones / robots | Operator-approved telemetry and payload SDK/API | Position, pose, imagery, thermal, lidar and status if exposed | Operator authorization, airspace/site rules, vendor interfaces; discovery does not imply control |
| Vehicles / apparatus | OEM/fleet APIs, approved OBD/CAN gateway | Vehicle state and equipment telemetry | Owner authorization, safety isolation, OEM data scope |
| External sensors | Vendor SDK/API, serial/USB/BLE, approved gateway | Sensor-specific measurements and health | Driver, electrical, calibration and environmental validation |

## Network-wide discovery architecture

1. **Phone collector:** only OS-exposed local radios and sensors. No claim of complete network visibility.
2. **Segment collectors:** owner-installed, read-only agents/gateways in each authorized VLAN, radio zone, or protocol mesh. Each reports its own coverage and blind spots.
3. **Controller connectors:** router, AP, Matter, Zigbee, Z-Wave, BMS, fleet and drone integrations using documented owner-authorized APIs.
4. **WIS intake gateway:** validates schema, provenance, source clock, units, authorization scope, and duplicate/replay behavior before appending raw observations.
5. **World-model fusion:** aligns observations by time and space, retains raw evidence, creates separately labeled derived relationships, and carries uncertainty forward.

A discovery candidate is not a sensor measurement. A service advertisement is not proof that its data is readable. A readable value is not independently validated.

## Machine-level access

Use machine-level interfaces where they are officially exposed: OS sensor APIs, documented SDKs, drivers, serial/USB interfaces, protocol gateways, controller APIs, and vendor firmware interfaces supplied for the device. If a required field is not exposed, record it as unavailable and pursue a supported driver, vendor partnership, owner-approved firmware, or a purpose-built sensor.

Do not bypass access controls, extract credentials, exploit firmware, defeat encryption, or silently access third-party devices. Such methods produce unreliable provenance and create unacceptable safety and legal risk.

## Data quality and world-model contract

Every observation carries:
- unique observation ID and source/device/adapter IDs;
- observed timestamp and clock domain, received timestamp, age and synchronization uncertainty;
- capability ID, raw value/payload, unit and schema version;
- source location/pose and uncertainty, if available;
- evidence class: MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, UNKNOWN, or UNAVAILABLE;
- integrity state and validation references;
- authorization scope, permission state, collection method and limitations.

Preserve original payloads append-only. Derived fusion products must link back to source observation IDs. Never fill missing fields with invented values. Report coverage by site, segment, protocol, source and time interval.

## Build order

- **P0 — Contract:** source registry, access-state machine, canonical envelope, provenance and retention policy.
- **P1 — Android:** wire existing sensor, network and ranging plugins; add user-triggered BLE scan; test on actual supported devices and record permission outcomes.
- **P2 — Local discovery:** implement mDNS/DNS-SD and SSDP in a separate authorized LAN collector, not in browser JavaScript.
- **P3 — Site-wide:** add router/AP, DHCP, SNMPv3 and LLDP connectors with scoped credentials and per-segment coverage.
- **P4 — Building/radio meshes:** Matter/Thread, Zigbee, Z-Wave, BMS and vendor gateways.
- **P5 — Specialist systems:** cameras/thermal/depth, UWB anchors, drones, apparatus and external instruments.
- **P6 — Independent validation:** reference instruments, repeatable test protocols, held-out scenarios and external reviewers.

## Current implementation boundary

The Android network adapter currently reads platform-provided Wi-Fi scan cache and cellular cell information. It does not scan every LAN device, perform mDNS/SSDP discovery, read BLE sensors, cross VLANs, or persist observations to the remote WIS world model. Those require separate, explicitly authorized collectors and connectors.
