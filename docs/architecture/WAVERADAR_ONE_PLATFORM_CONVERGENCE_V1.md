# WaveRadar OS — ONE PLATFORM convergence blueprint v1

**State:** implementation contract and tested read-only software slice, NOT a merged/deployed, validated all-in-one platform.
**Date:** 2026-11-22.
**Existing requirements remain:** `docs/architecture/ONE_WORKSPACE_RELEASE_CONTRACT.md`, `docs/WAVERADAR_SHARED_EVENT_CONTRACT_V1.md`, `docs/WAVERADAR_INTEGRATED_PROGRAM_OPERATING_SYSTEM.md`, private Guardian X PHOENIX research PR #6, CMVisual integration issue #99, and draft PRs #109, #113, #114.

## Product decision: ONE product, multiple independently safe components

WaveRadar OS is a **single user-facing platform**, not one giant firmware program or a cloud dependency for breathing and rescue. One program identity and navigation structure coordinate incident mission functions, evidence, lab validation and operations. Every component uses **existing** versioned contracts and role-scoped APIs, not a new disconnected database.

```
                            PHONE-FRIENDLY WAVERADAR OS
     ┌─────────────────────────────────────────────────────────┐
     │ Incident | Field | Command | Replay | Lab | Operations │
     └───────────────────┬─────────────────────────────────────┘
                         │ explicit role / incident scope
           ┌─────────────┴─────────────────────────┐
           │ WIS / CORE EVENT & MISSION SERVICES    │
           │ canonical incidents, enrollment, auth │
           │ immutable evidence + server timestamps│
           │ spatial projections + uncertainty     │
           └───────┬───────────────────┬────────────┘
                   │                   │
      SAFETY-ISOLATED FIELD       RESEARCH / BUSINESS CONTROL PLANE
    ┌─────────────┴──────────┐  ┌────────────┴──────────────────┐
    │ Android field capture  │  │ Independent validation Lab   │
    │ Guardian X / helmet    │  │ Engineering / release gates  │
    │ approved sensors, SCBA │  │ Partners / funding / outreach│
    │ vehicle / drone inputs │  │ Media scripts / edits / demos│
    └────────────────────────┘  └───────────────────────────────┘
        SAFE WITHOUT CLOUD          NEVER WRITE INTO RAW EVIDENCE
```

### The six platform boundaries

| System | Exactly one responsibility | Real source of truth | Safety/security boundary | Status to prove |
|---|---|---|---|---|
| **WaveRadar Core** | Incident/event identity, device enrolment, authenticated owner-scoped ingestion, quarantine, server time, event projection | Core append-only event envelope tables and immutable record references | No unauthenticated or out-of-scope access | Core v437 deployed for envelope ingestion according to existing contract; real Android upload unverified |
| **Guardian X / PHOENIX** | Sensor capture, protected actuator control, emergency independent alarms, mechanical release | Local sensor original events and safety-controller states | SCBA, certified PASS and mechanical egress independent of OS/AI/network; exoskeleton prototypes unvalidated | Private design PR #6, physical PPE and life support NOT verified |
| **Field + Helmet HUD** | Local incident capture/visibility, evidence-gated overlays, wearable task guidance where validated | Durable **native SQLite** on production Android, outbox to Core; WebView IndexedDB only browser/test cache | Offline first; no invented pose, patient vitals, certainty or life-safety wayfinding | PR #114 separately installed research app compiled; not proof of native SQLite or actual helmet parity |
| **WIS / Command** | Authorized incident coordination, team and hazard status, scene revision, verified source attribution | Read-only scoped Core event/snapshot streams | Replays cannot alter raw evidence or remotely force unsafe actuator control | Needs real multi-client same-incident test |
| **Replay + Independent Lab** | Exact incident reconstruction, experiment, blind ground truth and independent validation | Immutable event/digest chains plus separately reviewed experiment records | Simulation, measured, inferred, predicted and independently verified must remain separate | PR #113 software test passed; independent lab testing outstanding |
| **Operations + Media** | Unified engineering queue, validation gate tracking, partnerships, grants, product BOM, Guardian variants, media campaign and outreach | Own administrative database with references to Core test manifests, GitHub issues/PRs, partner correspondence, media provider assets | Never combine donor records, private grants, passwords, addresses, marketing footage or prospect lists into emergency incident event ledger | Planned portal; integrations require authorization and validated connectors |

**Important:** one portal does not imply one universal data store. Incident evidence, authentication credentials, classified/consent-controlled personal data, funding/accounting information and media artwork have different legal obligations and security domains. **Use linked IDs, access controls and source references**, not indiscriminate database merges.

### First-class identities (no collisions)
- `organization_id`: founder business/lab owner namespace. No representation that a legal entity is already registered.
- `user_id` + role grants: admin/researcher/incident commander/firefighter/independent reviewer, verified through actual auth; one user can hold multiple roles but each view is least-privilege.
- `device_id` plus enrollment/authorization scope: phone, helmet, suit, truck gateway, approved external sensor. Device presence != authorization != calibrated measurement.
- `incident_id`, `session_id`, `event_id`: canonical operational ID stack. **No duplicate competing ledgers for the same original event**.
- `work_package_id`, `experiment_id`, `evidence_bundle_id`, `approval_id`: administrative and lab objects link to incidents/evidence only via explicit secure references, not embedded private program files.
- `media_asset_id`: generated video, voiceover or illustration references live in Marketing, marked CONCEPT / SIMULATED / DEMONSTRATED / INDEPENDENTLY_VALIDATED where relevant. No promotional demo is proof of field operation.

### Role-specific phone-first home screen

**One entry point and one navigation family** with five persistent modes:
- **Incident / Field:** offline capability indicators, true local record count, permission state, last original checksum, incident export, available map, manual notes, responder warnings.
- **WIS / Command:** same incident/scene ID and event-stream revision, last actual Core acceptance, link freshness, source/uncertainty, team and rescue assignments. Never invent current coordinates when only stale last-known data exists.
- **Replay:** shared event IDs, event time vs **trusted Core acceptance time**, delayed arrival, conflict/quarantine, reproducible exports; same read model as Field and Command with different role filtering.
- **Research & Validation Lab:** runs, devices, calibrations, sample missingness, independent protocol/reviewer, hardware tests, Guardian X physical research, lab revenue prospects. Lab reviewers cannot mutate raw incidents.
- **Founder Operations:** priorities, open engineering PRs/CI, blockers, funding/grants/verified recipients, unsent/approved/sent outreach, supplier quote/BOM, marketing/video assets, program execution reports and approval gates.

Use progressive disclosure: a firefighter never sees donor budgets; a funder never sees live unredacted personal incident data; a Command user does not control a firefighter's powered suit.

### Safety and remote operation

Remote desktop/assistance, drone data ingestion, volunteer testers, mobile device sync, engineering agents and marketing connectors are **optional adapters**, not dependencies. Remote operations require explicit per-session authorization, on-device visibility, scoped allowed commands, expiry and audit trail. **Remote access cannot override PASS, SCBA, physical exoskeleton release or safety controller**. A system can collect drone/robot telemetry lawfully without assuming the right to control the vehicle.

### Critical server-time rule

The existing WaveRadar Shared Event Contract documents **separate Core server receive time** from source/client receive time. The remaining integration defect is that some local temporal projections rely on client envelope `timing.received_at` for replay. Do **not** backdate what the incident commander knew when an offline record is uploaded late.

This branch adds `src/lib/unifiedIncidentReadModel.js` as a **read-only adapter** over the existing `nativeEnvelopeLedgerAdapter.js`. It:
- accepts locally captured ORIGINAL envelopes in `localEnvelopes`;
- accepts `coreEvents` only as data obtained by an authenticated Core snapshot API, each with a separate `serverAcceptedAt` from the actual backend;
- rejects missing/malformed server time and wrong incident IDs;
- shows local-only records in Field but **not** as already received by Command;
- projects accepted records from one canonical source into Field, Command and Replay and uses genuine server time for 'as known then';
- preserves source evidence and quarantine conflicts instead of selecting a fabricated winner.

**This is a pure read-model test. It does not fetch Core, check a network token, enroll a device, authenticate a caller, implement native SQLite, wire a real helmet or connect the five UI tabs.** Upstream API authorization remains mandatory. The Core response's actual timestamp field must be mapped by a reviewed connector; never use a device-supplied field and merely call it trusted.

## Merge strategy — avoid duplicating unfinished integrations

1. **G0:** reconcile draft PR #96's native SQLite authority with #97's browser cache/outbox and current branches #108 -> #109 -> #113 -> #114. Review changes and cross-branch base dependencies; no forced merge.
2. **G1:** secure Android install/update signing; prove local native durable capture and process death with the installed phone while preserving historical evidence. Separate field test APK is not a substitute.
3. **G2:** map actual Core snapshot acceptance time and authenticated incident scopes into the unified read model; prove offline delayed upload, event-id/digest conflict, replay as-known-then and unauthorized access rejection.
4. **G3:** wire Field, WIS, Replay to one Core revision + incident subscription. Connect a second real viewer and test disconnect/resume; then add helmet as an independently tested read-only client. A passing **synthetic** parity test does not pass this.
5. **G4:** integrate Guardian X sensor and safety status read-only, then only permitted low-risk control interfaces, after certified PPE/SCBA compatibility, battery safety and physical release bench tests. Maintain separate aerospace 72h research stream.
6. **G5:** add Lab and Founder Operations portal adapters with independent role/security domains and linked artifacts. Connect Descript/VEED/Higgsfield as media production providers with explicit user permissions and budget controls; no unapproved spending or sending.
7. **G6:** independently reproduce measured sensor/positioning tests, wearer ergonomics and safety cases; conduct qualified partner pilots before promising operational navigation, through-wall detection, life support or certified rescue function.

### Acceptance criteria for ONE SYSTEM

A demonstration must show the **same incident ID and original event IDs** from phone capture to WIS to Replay after airplane mode, restart, authenticated upload and reconnection, with old evidence recoverable; exactly which view knew which facts at which real time; no fabricated calibrated positioning; and independent alarms surviving failure of the main OS. Separately, Founder Operations must show actual PR/CI, grant, lab and media statuses with verifiable links and explicit 'draft vs sent vs verified' states.

The smallest shippable slice is an offline-first real Android incident journal + authenticated upload + WIS/Replay parity. **Do not postpone this for Guardian X 72-hour space survival, virtual desktops or marketing video polish.**

### Rollout / risk
- All changes on a separate draft PR; existing live app, native recorded evidence, deployed Core and private hardware designs remain untouched.
- No direct API calls or storage mutation by the new adapter.
- Run `node scripts/test-unified-incident-read-model.mjs` and verify its isolated GitHub Actions workflow.
- G0 is software test only. Device, server, helmet and human physical safety acceptance remain unverified.

**Product statement:** WaveRadar is ONE evidence-governed emergency-intelligence ecosystem with modular, independently safe hardware and clearly separated administrative services.
