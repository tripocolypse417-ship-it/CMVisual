# WaveRadar OS — Implementation Roadmap and Acceptance Gates

**Status:** Proposed execution order. Work is incremental, reversible and evidence-gated.
**Constraint:** no paid infrastructure or services are required to start; no deployment or purchase is authorized by this plan.

## Phase 0 — Protect and reconcile the baseline
- Preserve CMVisual, the Base44 working source, private WaveRadar repository, hosted Core/Lab, all open PRs, data, model artifacts, public archives and recovery points.
- Reconcile source identity and parity: CMVisual is the target canonical repository; MIGRATION.md currently identifies Base44 as the primary working source; the private WaveRadar GitHub remote is a third tree.
- Inventory every live entity, repository schema, deployed backend function, SDK import, API route, sensor adapter, native permission and data write. Current Base44 app reports 15 live schemas and zero deployed backend functions; CMVisual contains 108 schema files.
- Verify live RLS, especially open PinComment read/create rules, DetectionEvent create policy, and User role-field protections.
- Establish a read-only data export and verified restore procedure.
- Move the 2.25 GB recovery archives out of public build assets only after independent private/offline recovery and complete content/privacy review; never delete the original during migration.
- Refresh stale security findings when a scan is confirmed included at no cost.
- Triage the 33 open PRs by dependency, evidence and conflict; do not merge blindly.
**Exit:** source/data inventory, recoverable backup, PR dependency map and confirmed baseline.

## Phase 1 — Define WaveRadar OS contracts
- Freeze versioned observation, source-capture-time, receipt-time, provenance, coordinate-frame, range-only/spatially-aligned, device capability, evidence, inference, alert and model-output contracts.
- Define service interfaces and failure semantics.
- Establish a shared event/evidence envelope and schema compatibility policy.
- Add contract tests and sample fixtures.
- Define the role/tenant/incident permission model.
**Exit:** schemas and APIs reviewed; contract tests pass; no existing historical evidence rewritten.

## Phase 2 — Build portable WaveRadar Core
- Extract domain logic from React pages and Base44-specific calls.
- Introduce ports/adapters for identity, persistence, events, storage, model runtime and integrations.
- Preserve Base44 adapter while implementing a local/test adapter.
- Add offline evidence spool, durable sync and idempotent replay.
- Keep modular monolith boundaries until measured needs justify service decomposition.
**Exit:** core logic runs in tests without Base44; adapter parity and recovery are demonstrated.

## Phase 3 — Build WaveRadar Edge Runtime
- Implement Android-native sensor and device lifecycle services.
- Separate capability discovery, enrollment, permission, initialization, sample delivery, time integrity, calibration and pose availability.
- Add encrypted local queue, battery/thermal controls, foreground/background lifecycle and connectivity-aware sync.
- Validate on supported physical Android devices using independent reference equipment.
- Do not assume phone-only sensors provide radar, through-wall imaging or reliable indoor positioning.
**Exit:** device matrix, repeatable native baseline, recovery tests and independent ground truth.

## Phase 4 — Rebuild the OS experience
- Create a single OS shell with role-aware Chief Command, Field/HUD, Research Lab, Replay and Administration workspaces.
- Each panel reads shared services and evidence projections, not its own ad hoc data path.
- Use consistent source-quality labels, timestamps, uncertainty, stale/missing states and operator acknowledgment.
- Optimize for low bandwidth, offline use, glove interaction, glanceability, readability and cognitive load.
- Keep demo/simulated data visibly segregated.
**Exit:** task-based human-factors tests with chiefs/firefighters; degraded-mode scenarios pass.

## Phase 5 — Model and intelligence platform
- Establish model registry, dataset manifests, model cards, training/evaluation jobs and signed artifact promotion.
- Reproduce published baselines before claiming improvement.
- Build separate perception, localization, fusion, world-state and prediction pipelines.
- Separate same-stream self-supervised adaptation from independent ground-truth evaluation; no live operational stream may update production models automatically.
- Add calibration, OOD detection, abstention, subgroup analysis, drift monitoring and resource budgets.
- Keep candidate models in offline evaluation and shadow mode before limited pilots.
**Exit:** independent validation reports for each intended use and operating envelope.

## Phase 6 — Independent validation and partner pilots
- Recruit independent labs, universities, fire departments and equipment partners.
- Pre-register protocols, ground truth, sample sizes, exclusion criteria and success/failure thresholds.
- Test in controlled, instrumented environments before any operational exposure.
- Keep independent reviewers separate from development and training authority.
- Publish negative and inconclusive results alongside positive results.
**Exit:** external review, safety case, human-factors evidence and approved pilot envelope.

## Phase 7 — Guardian X integration
- Treat the powered full-body exoskeleton as a core integrated Guardian X configuration.
- Design load assistance, mobility, thermal management, fail-safe disengagement, protected power and sensor integration.
- Keep all actuation safety independent from predictive AI.
- Conduct separate mechanical, electrical, thermal, ergonomics, PPE compatibility and certification reviews.
- Map applicable NFPA/NIOSH/OSHA and other standards with qualified specialists.
**Exit:** engineering verification, hazard analysis, independent lab testing and applicable approvals.

## Continuous gates
- Reproducible builds and tests.
- Security and privacy review.
- Data lineage and rollback.
- Explicit owner and acceptance evidence.
- No unsupported operational or marketing claims.
- Documented budget impact and free/low-cost alternatives.

A phase may be partially complete; do not promote it based on UI completion alone.