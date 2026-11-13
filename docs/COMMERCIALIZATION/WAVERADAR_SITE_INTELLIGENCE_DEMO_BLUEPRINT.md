# WaveRadar Site Intelligence — Reusable Commercial Demonstration Blueprint

**Status:** Draft specification; not an implemented or validated product  
**Program:** WaveRadar OS  
**Flagship alignment:** Emergency-response situational awareness  
**Commercial reuse:** Building/site intelligence, drone inspection analytics, evidence reconstruction, industrial monitoring and training  
**Budget constraint:** $0 upfront; use only rights-cleared sample data, existing software and partner-provided assets  
**Evidence rule:** Every displayed item carries an explicit source, timestamp, evidence class and validation state

## 1. Demonstration objective

Build one portable, repeatable demonstration that shows how WaveRadar OS can organize a site, ingest authorized records and sensor/media samples, display spatial context, preserve provenance, and replay an event timeline. The same core demonstration should be adaptable to several buyer workflows without maintaining separate product codebases.

The demonstration is successful when a reviewer can:
1. Open a clearly identified sample site and navigate site/building/floor/room/asset records.
2. Inspect a floorplan or model with its source, version, coordinate reference (if known), and known limitations.
3. View sample sensor observations and drone imagery with timestamps, source identity, permissions/rights status, and evidence classification.
4. Replay a bounded event timeline and trace each displayed claim to its underlying record.
5. Export a review package and verify that the export lists included files, hashes, timestamps and provenance.
6. Distinguish measured source data from derived overlays, human-entered notes, simulated events and unavailable capabilities.

This is a software workflow demonstration. It is not a live fire simulation, a certified digital twin, a validated inspection system, an indoor positioning demonstration or an operational emergency-response tool.

## 2. One scenario, multiple buyer narratives

Use a generic, fictional two-storey training/industrial building. Do not use a real address, real occupant information, sensitive floorplans or identifiable responder data without explicit rights and authorization.

**Base scenario:** A site manager has a building plan, a small equipment/asset register, several timestamped environmental sensor records, and a rights-cleared aerial/roof imagery set. A simulated incident marker is introduced for replay. The reviewer explores the site, checks the source records, reviews changes and exports a provenance package.

The same dataset can support these carefully separated narratives:

- **Facility operator:** maintain a versioned site record, locate assets, inspect stale/missing records and review environmental history.
- **Drone inspection provider:** attach authorized aerial images to roof/asset locations, compare image sets and prepare a human-reviewed inspection package. Do not claim automatic defect detection.
- **Fire investigator / safety team:** assemble a timeline from supplied records, identify gaps/conflicts and export an evidence index. Do not imply admissibility or prove the cause of an incident.
- **Industrial operator:** view sample sensor trends against known assets and flag data-quality issues. Do not claim predictive maintenance or structural-health diagnosis.
- **Training organization:** replay an explicitly simulated event and discuss command information flow. Do not present simulation output as measured field performance.

## 3. Demo screens and workflow

### Screen A — Site selection and provenance
- Sample-site name and fictional/demo status.
- Data package version, creation time, license/rights notes and checksum manifest.
- Available buildings, floors, assets, sensors and media sources.
- Permission and source availability states: available, unavailable, not authorized, stale, unsupported.
- No network discovery or ambient device scanning is required.

### Screen B — Spatial site explorer
- Site/building/floor/room hierarchy.
- 2D floorplan first; optional 3D only when a source model or reproducible geometry exists.
- Each geometry item shows source file/version, coordinate reference, import date and confidence/quality state.
- Unknown dimensions and coordinate transforms remain unknown; do not silently snap or invent geometry.
- Asset markers are linked to asset records, not inferred occupant locations.

### Screen C — Source and sensor inspector
- Source ID, source type, device/model where known, capture time, receive/import time, clock domain and uncertainty where known.
- Units, calibration metadata, sampling interval, missing values and quality flags.
- Separate permission, hardware support, adapter initialization, sample arrival, timestamp validity, calibration and validation states.
- Show raw observation separately from any normalized/derived value.
- Missing or malformed values are displayed as unavailable, not zero.

### Screen D — Drone/media review
- Rights-cleared sample images/video only.
- Capture metadata and source provenance.
- Manual asset/area association with author and time.
- Optional image comparison for human review; no automated defect score unless a separately validated model is later introduced.
- Do not infer interior access, people, occupancy, structural integrity or hidden conditions from imagery.

### Screen E — Timeline and replay
- Event timeline with explicit event type and source.
- Filters by source, asset, room, time and evidence class.
- Simulated event is visually and textually labelled SIMULATED throughout the interface and export.
- Conflicting timestamps remain visible; do not force a false global order when clock uncertainty prevents it.
- Replay is a reconstruction of supplied records, not a live scene or ground-truth reconstruction.

### Screen F — Evidence/export review
- Included record manifest, source IDs, hashes, capture/import timestamps and evidence classes.
- Export integrity verification result, with limitations.
- Human-entered annotations visibly attributed and time-stamped.
- Export package includes a readme describing data origin, licensing, known gaps, transformations and simulation status.
- A valid hash proves byte-level consistency against the manifest, not that the underlying observation is true or authentic.

## 4. Minimum data package

Create a small, deterministic fixture with:
- One fictional site, one building, two floors and a few rooms.
- One clearly labelled sample floorplan (original or openly licensed) and source metadata.
- 10–20 fictional assets with stable IDs and manually entered locations.
- A small set of synthetic environmental observations (temperature/humidity or other non-life-safety data), with generated timestamps and an explicit SIMULATED label.
- A separate optional rights-cleared public aerial image set, with license and capture metadata.
- A short event list containing normal events, one simulated event, a missing timestamp, a stale source and one conflicting record.
- A manifest with SHA-256 hashes, package version, license notes and generation procedure.

Do not mix generated sensor data with public measured data in the same unlabeled series. If public measured data is added later, preserve its original source and license and keep it in a separate evidence class.

## 5. Technical architecture and implementation boundaries

Prefer existing WaveRadar OS services and schemas; do not introduce a second identity system or separate database for the demo.

1. **Data package adapter:** imports a versioned, rights-cleared sample package.
2. **Site model:** maps site/building/floor/room/asset entities and source geometry.
3. **Source registry:** records source identity, type, permission/rights, capability and freshness.
4. **Observation envelope:** records event ID, source ID, capture/import time, clock metadata, units, quality and evidence class.
5. **Media index:** references media bytes or authorized object storage and stores cryptographic hashes.
6. **Timeline service:** orders by explicit time semantics, preserving uncertainty and conflicts.
7. **Replay UI:** renders spatial and temporal context without upgrading evidence.
8. **Evidence export:** produces a deterministic manifest and integrity-check report.

Use an adapter boundary for future building-management systems, Wi-Fi RTT/UWB/BLE, thermal sensors, drone vendors and robotics. The demo itself must not claim those integrations exist unless the relevant adapter is implemented and tested with actual authorized hardware/data.

## 6. Acceptance tests

A demo build is not accepted until all of the following are demonstrated on the same tagged sample package:

- Package identity and version are visible.
- Every displayed observation resolves to a source record.
- Evidence class is visible in detail views and exports.
- SIMULATED data remains labelled in charts, timeline, replay and export.
- Unknown/unavailable timestamps, coordinates and units are never silently filled.
- Conflicting or stale records remain inspectable.
- Floorplan source/version and known coordinate limitations are visible.
- Unauthorized/unlicensed sources are rejected or quarantined.
- Export manifest hashes match exported files; a deliberately altered file fails verification.
- Reimporting the same package is idempotent and does not duplicate records.
- Tenant/user permissions are tested before any multi-user pilot.
- No claim of real-time sensing, accuracy, indoor localization, victim detection, fire prediction, defect detection or life-safety readiness is made.

## 7. Pilot-ready definition

A controlled customer pilot requires, in addition to demo acceptance:
- A named customer sponsor and documented workflow.
- Customer-approved data rights and access permissions.
- A written scope, success criteria, exclusions, retention and deletion plan.
- Security and privacy review appropriate to the data.
- Tested backup, export, recovery and rollback.
- Defined support owner and incident escalation.
- Independent reference measurements if the pilot evaluates accuracy or physical performance.
- Clear statement that the pilot is not certified life-safety equipment and does not replace approved procedures.

## 8. Customer discovery guide (draft only; no outreach authorized)

Ask each interviewee:
1. What site, asset or incident information is hardest to locate during a normal workday or incident?
2. Which systems currently hold floorplans, asset registers, inspection images, sensor data and incident records?
3. How often are those records stale, incomplete, duplicated or inaccessible?
4. What work is repeated manually to combine them?
5. What decision or workflow would improve if the records were searchable by site, location, source and time?
6. What is the cost of the current process (time, contractor expense, delay, rework or audit burden)?
7. Who owns the budget and who approves data/security access?
8. What standards, retention rules, procurement steps or insurance requirements apply?
9. What data could be shared for a no-cost, non-sensitive demonstration, and under what license/terms?
10. What measurable result would justify a paid pilot?
11. What existing product or internal tool already solves part of this problem?
12. What would make you reject this solution?

Do not lead interviewees toward a desired answer. Record verbatim evidence with permission, distinguish opinion from procurement intent, and do not represent informal interest as a customer commitment.

## 9. First customer segments to investigate

1. Small-to-mid-sized facility operators with multiple buildings and fragmented floorplan/asset records.
2. Drone inspection firms that need a vendor-neutral way to organize authorized imagery and reports.
3. Fire investigators or industrial safety teams with a documented evidence-timeline/export problem.
4. University or public-sector research groups willing to provide rights-cleared sample data and independent review.

Selection criteria: accessible workflow owner, no-cost sample data path, short procurement path, bounded risk, clear measurable pain and reusable software value.

## 10. Pilot scorecard

For each pilot candidate, score 0–5 with evidence:
- Problem severity and frequency.
- Buyer access and budget ownership.
- Data availability and rights clarity.
- Technical fit with existing modules.
- Security/privacy burden.
- Integration effort and ongoing support.
- Measurable value and success criteria.
- Repeatability across customers.
- Time to a no-cost proof of workflow.
- Risk of distracting from the emergency-response flagship.

Do not total scores when a critical disqualifier exists (no data rights, no sponsor, unsafe intended use, or unsupported performance claim). Record evidence and confidence for each score.

## 11. Immediate no-cost execution sequence

1. Inventory existing site/world-model, media, event, evidence-ledger and export components before writing new code.
2. Select one rights-cleared public or wholly synthetic dataset package; document licenses and generation steps.
3. Map its fields to existing WaveRadar contracts and list gaps before changing schemas.
4. Build the narrow import → site explorer → source inspector → timeline → export path.
5. Add negative tests for missing timestamps, conflicts, stale sources, simulation-label leakage, hash tampering and unauthorized data.
6. Capture a short demo only after the behavior exists; label all simulated content and avoid visual claims unsupported by the running product.
7. Prepare buyer-specific one-page pilot briefs and interview scripts; keep drafts internal until founder approves outreach.

## 12. Known exclusions

This blueprint does not authorize purchases, subscriptions, paid datasets, vendor contact, customer outreach, publication, legal commitments, deployment, merging, production data changes, medical/occupant analytics, drone control, RF transmission or operational use. It does not establish a customer, revenue, validated capability, independent certification or production-ready product.
