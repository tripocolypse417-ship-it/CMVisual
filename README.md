# WaveRadar OS

**WaveRadar OS is the product.** It is an evidence-first emergency situational-awareness and decision-support operating environment for firefighters, incident command, compatible sensors, field devices, and independent research and validation.

This repository is the intended canonical codebase for the WaveRadar OS program. The existing React/Vite + Capacitor application is a prototype/integration surface within the larger OS program; it is not itself the complete operating system. The current migration record still identifies Base44 as the primary working source, so source-of-truth status remains unresolved until the two trees are reconciled.

## Start here
- [WaveRadar OS architecture](docs/WAVERADAR_OS_ARCHITECTURE.md)
- [Model lifecycle and governed continual learning](docs/WAVERADAR_OS_MODEL_GOVERNANCE.md)
- [Current AI/model and self-learning audit](docs/WAVERADAR_OS_MODEL_AUDIT.md)
- [Open PR consolidation register](docs/WAVERADAR_OS_PR_CONSOLIDATION.md)
- [Security and authorization audit](docs/WAVERADAR_OS_SECURITY_AUDIT.md)
- [Privileged-function hardening PR #70](https://github.com/tripocolypse417-ship-it/CMVisual/pull/70)
- [Current-state engineering audit](docs/WAVERADAR_OS_CURRENT_STATE_AND_AUDIT.md)
- [Implementation roadmap](docs/WAVERADAR_OS_IMPLEMENTATION_ROADMAP.md)
- [Migration notes](MIGRATION.md)
- [Android build workflow](.github/workflows/build-android.yml)

## Product subsystems
- **WaveRadar Edge Runtime:** Android/Linux device services, sensor lifecycle, secure local evidence capture, offline queueing, device health and update safety.
- **WaveRadar Core:** provider-neutral evidence, time, spatial, fusion, world-model and model-runtime contracts.
- **WIS Command:** chief/dispatch interface, building intelligence, incident map, evidence-backed alerts and crew/device context.
- **Firefighter Field/HUD:** low-cognitive-load helmet/phone interface with explicit data quality and uncertainty.
- **Guardian X:** integrated firefighter suit and powered full-body exoskeleton program; actuation remains outside the initial OS release until separately engineered and independently validated.
- **Research & Validation Lab:** independent protocols, ground truth, model evaluation, reviewer workflow and audit.
- **Replay & After-Action:** synchronized, reproducible reconstruction of incident evidence and model decisions.

## Source-of-truth boundaries
- **Target canonical code repository:** CMVisual.
- **Current working source per MIGRATION.md:** the Base44 project.
- The connected Base44 app sandbox is a separate working tree with a Base44 S3 origin and a separate private GitHub remote named WaveRadar. Its synchronization with CMVisual has not been proven.
- The current source of truth is therefore unresolved. Preserve both trees and their data; do not blindly overwrite or synchronize either direction. Establish a file/schema/commit parity map before migration.

## Current implementation reality
- The application uses React/Vite and Capacitor for Android packaging.
- Android package ID is com.waveradar.app; inspected configuration reports version 1.0 / version code 1.
- Base44 SDK and Vite plugin dependencies remain in the current application path. Portability is unfinished.
- Existing sensor, spatial, evidence, prediction, replay and validation modules are retained as candidate OS components; their presence does not prove operational readiness.
- Physical sensor accuracy, through-wall sensing, spatial reconstruction and life-safety performance remain unvalidated until supported by independent ground truth and controlled field evaluation.
- Historical evidence is preserved. Never convert unverified records into validation proof.
- The connected Base44 sandbox currently contains multi-gigabyte recovery archives in its public asset directory; this must be corrected in that environment without deleting the protected recovery copies.

## Engineering rules
1. Preserve raw evidence, provenance, timestamps, quality and uncertainty.
2. Keep measured, derived, inferred, predicted, simulated, human-entered and unavailable states distinct.
3. A registered device is not necessarily validated; permission is not sample arrival; sample arrival is not valid timing or spatial pose.
4. Do not train or update models directly from unreviewed live operational data.
5. Model releases require frozen datasets, independent evaluation, staged deployment and rollback.
6. No model receives autonomous incident-command authority or controls Guardian X actuation.
7. No claim of certification, accuracy, lives saved, deployment, grant award, customer or partnership without documentary evidence.
8. Treat public repository content and public artifacts as public. Never commit secrets, personal data, sensitive incident records or signing keys.
9. Preserve the zero-upfront-budget constraint: prioritize free/local tooling, open standards and partner/institutional validation.

## Development
The current package scripts include npm run build, npm run lint and npm run typecheck. There is currently no dedicated test script in the inspected package manifest. A green build or lint result does not establish native sensor correctness, spatial accuracy, model safety or field readiness.

## Standards and assurance references
- NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework
- NIST SSDF: https://csrc.nist.gov/Projects/ssdf/publications
- ISO 22320:2018 incident management: https://www.iso.org/standard/67851.html
- NFPA 1970 (2025 edition): https://www.nfpa.org/codes-and-standards/nfpa-1970-standard-development/1970

These are engineering alignment references, not a claim of compliance or certification. See the architecture and model-governance documents for scope and caveats.