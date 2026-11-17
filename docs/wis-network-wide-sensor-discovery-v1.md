# WIS Network-Wide Sensor Discovery and Classification v1

Status: DESIGN CONTRACT — discovery behavior is not yet a claim of runtime implementation.

## Objective

WIS should actively search authorized network and radio environments for known and previously unknown sensor-capable devices. Discovery must not depend solely on devices voluntarily pushing telemetry. A discovery result is a candidate inventory record; it is not proof that the device is a sensor, that its measurements are accessible, or that it is trustworthy.

## Discovery planes

| Plane | Discovery method | What it can reveal | Constraints |
|---|---|---|---|
| Wi-Fi / IP LAN | mDNS / DNS-SD, SSDP / UPnP, authorized router or controller inventory, DHCP lease inventory, scoped service discovery | Advertised devices, hostnames, service types, vendor hints, network presence | VLANs, firewalls, client isolation, disabled advertisements, and router permissions limit visibility |
| Managed network infrastructure | Authorized SNMP, LLDP, controller APIs, switch/AP client tables | Connected endpoints, ports/AP associations, infrastructure topology hints | Requires network-owner credentials and explicit scope; read-only by default |
| Bluetooth LE | Passive advertisement scan and supported GATT service discovery after permission / connection | Beacons, sensor advertisements, service UUIDs, supported characteristics | Range, Android scan throttling, privacy addresses, pairing and permissions |
| Matter / Thread | Authorized Matter fabric and border-router discovery | Commissioned devices, endpoints, clusters, device types | Fabric access and compatible controller / border router required |
| Zigbee / Z-Wave | Authorized coordinator or hub inventory and device interview | Paired endpoints, clusters / command classes, exposed attributes | Cannot enumerate an independent mesh without its coordinator or authorized radio interface |
| Cellular / GNSS | Platform-exposed serving / neighboring cell metadata and GNSS constellation metadata | Radio environment and positioning context | Not a general method for enumerating arbitrary nearby sensors |
| Vendor / building APIs | Authenticated, owner-approved integrations | Device inventory, telemetry, health and alarm states | Vendor API scopes, licensing, network reachability, and data model differences |

## Discovery workflow

1. Establish an authorized scope: owner, site, network segments, radio interfaces, time window, permitted methods, and rate limits.
2. Run passive discovery first: platform caches, BLE advertisements, mDNS / DNS-SD, SSDP advertisements, and approved controller inventory.
3. Run scoped, non-intrusive active discovery only where explicitly authorized. Do not attempt login, exploit, bypass, or configuration changes.
4. Normalize every response into a DeviceCandidate record with source, timestamp, scope, protocol, observed identifiers, and raw evidence reference.
5. Classify using protocol/service signatures and known device profiles. Preserve unknown service UUIDs, vendor IDs, cluster IDs, and endpoint descriptors as unknown capabilities for research.
6. If permitted, perform a read-only capability interview through the relevant authorized gateway or API to learn which measurements are actually exposed.
7. Map exposed measurements to the shared WIS capability vocabulary. If no mapping exists, create a proposed vocabulary entry instead of silently dropping the data.
8. Publish candidate inventory and observations to the WIS event stream with confidence, freshness, provenance, and limitations.
9. Reconcile repeated discoveries over time without treating rotating MAC addresses or reused names as stable identity.

## Candidate record fields

- candidate_id, first_seen, last_seen, discovery_method, network_scope, radio / protocol
- observed identifiers: hostname, service type, UUID, vendor / product hints, endpoint / cluster descriptors
- address data only where legitimately exposed and necessary; redact or pseudonymize identifiers in shared views
- classification: KNOWN_PROFILE, PROBABLE_SENSOR, POSSIBLE_SENSOR, UNKNOWN_DEVICE, NON_SENSOR, or UNCLASSIFIED
- capability list: EXPOSED, ADVERTISED_ONLY, INFERRED, or UNAVAILABLE
- measurement access: READABLE, ADVERTISEMENT_ONLY, AUTHORIZATION_REQUIRED, UNSUPPORTED, or NOT_TESTED
- confidence and evidence references; do not convert a vendor hint into a confirmed identity
- permission / authorization scope, adapter version, collection timestamp, and retention policy

## Unknown-sensor discovery

Unknown devices must remain first-class records. WIS should compare protocol descriptors, service UUIDs, manufacturer data, Matter device types and clusters, Zigbee clusters, Z-Wave command classes, mDNS service types, and vendor API schemas against its registry. Unmatched descriptors enter a research queue with the raw descriptor preserved. A proposed sensor capability is not enabled for operational decisions until its semantics, units, calibration, timestamp behavior, and failure modes are understood.

## Cross-network and site-wide search

WIS cannot see through network boundaries automatically. Site-wide discovery requires authorized collectors or gateways in each relevant VLAN, building segment, radio zone, or protocol mesh. Each collector reports to the WIS ingestion service; the central inventory merges candidate records using cautious correlation and retains source-specific observations. A phone alone cannot enumerate every device on every network, especially remote, segmented, sleeping, encrypted, or coordinator-managed networks.

## Safety and privacy controls

- Passive-first, least-privilege, read-only default.
- Active discovery must be explicitly scoped and rate-limited by the network owner.
- No credential harvesting, password guessing, exploit attempts, stealth, unauthorized association, or control commands.
- Do not infer a person's identity, occupancy, or location from a device identifier alone.
- Keep raw evidence immutable; keep derived classification separate.
- Unknown, stale, blocked, permission-denied, and unreachable are distinct states.
- A detected device is not automatically a sensor; an advertised capability is not proof of accessible measurement; an accessible measurement is not proof of accuracy.

## Implementation order

P1: add a discovery-adapter interface and candidate inventory schema; connect Android BLE and Wi-Fi passive observations to WIS.
P2: add read-only mDNS / DNS-SD and SSDP discovery on an explicitly authorized LAN collector, plus router/controller inventory connectors.
P3: add Matter / Thread, Zigbee, and Z-Wave hub adapters; classify unknown endpoints and clusters.
P4: add authorized SNMP / LLDP and building / vendor connectors for multi-VLAN and site-wide coverage.
P5: add unknown-descriptor research workflow, repeat-discovery reconciliation, and independent validation.

## Acceptance criteria

- Discovery can find candidates even when they have not sent telemetry to WIS.
- Each discovery result records method, scope, timestamp, provenance, and permission state.
- The system preserves unknown descriptors rather than requiring a pre-existing sensor catalog.
- The system distinguishes discovered, classified, capability-advertised, measurement-readable, and independently validated.
- Cross-network coverage is reported by collector and segment; no global completeness claim is made without evidence.
- The central WIS pipeline receives normalized candidate and measurement events through versioned contracts.