# CMVisual — NSF SBIR/STTR Project Pitch Master

## Working title
**CMVisual: An Open Spatial Evidence and World-Model Platform for Real-World Sensor Fusion**

## Core problem
Real-world response and industrial environments generate fragmented observations across cameras, ranging sensors, positioning systems, environmental sensors, and operator reports. Existing tools often isolate these streams, making it difficult to determine what was directly measured, what was derived, what conflicts, and what a model predicts next.

## Proposed innovation
CMVisual is an evidence-first spatial operating layer that ingests authorized real sensor observations, preserves provenance and uncertainty, aligns compatible observations into a shared world frame, reconstructs a time-aware spatial model, forecasts observable physical outcomes, and continuously evaluates prediction error against later measurements.

## Technical pillars
1. Real-sensor ingestion with provenance, timestamps, units, freshness and uncertainty.
2. Quality firewall that quarantines invalid/stale/duplicate measurements.
3. Cross-sensor corroboration and conflict reporting without unsupported identity matching.
4. Shared-coordinate federation for multiple authorized devices.
5. Persistent world timeline and replay for incident reconstruction and validation.
6. Physical trajectory/outcome forecasting at +1/+3/+5 seconds with expanding uncertainty.
7. Prediction calibration against subsequent measured observations.
8. TEVV-oriented validation records, failure cases and regression gates.
9. Human-review workflow for safety assessments and recommendations.
10. Open architecture designed to remain independent of any single sensor vendor or AI provider.

## Initial use case
Emergency response, beginning with fire/rescue training and controlled validation. The system should help command and crews understand where verified observations exist, which sources support them, how fresh/reliable the information is, and how the physical situation is changing.

## Scientific/technical hypothesis
An evidence-centric world model can improve operational understanding when heterogeneous sensor observations are combined only after explicit provenance, quality, uncertainty and coordinate-frame validation, while prediction quality can be improved through continuous calibration against later measurements.

## Validation plan
- Known-distance static tests.
- Known-motion trajectory tests.
- Cross-sensor agreement tests.
- Repeatability tests.
- Occlusion/visibility scenarios where applicable.
- Sensor dropout and latency tests.
- Coordinate-frame alignment tests for federation.
- Prediction calibration at +1/+3/+5 seconds.
- Independent review of failure cases.
- Regression testing before production model changes.

## Commercialization
Open/free core for developers, researchers and pilot users. Paid enterprise deployments can add private federation, administration, persistent history, analytics, validated sensor adapters, compliance/audit tooling, support and deployment services.

## Critical eligibility/administrative checklist
- Confirm U.S. small-business eligibility.
- Confirm company legal structure and ownership.
- Confirm principal investigator eligibility and commitment.
- Determine whether SBIR or STTR is the better route.
- For STTR, identify an eligible research-institution partner.
- Prepare NSF Project Pitch before full proposal.
- Maintain IP ownership/protection documentation.
- Prepare commercialization evidence from controlled pilot discussions.
- Keep claims limited to demonstrated or testable capabilities.

## Current deadline tracked
NSF's current SBIR/STTR schedule lists **November 4, 2026** as the full-proposal deadline. Project Pitch/invitation requirements apply before a full Phase I proposal.

## Phase I planning target
Use the program's current maximum Phase I budget as a ceiling, not an assumption. Build a defensible technical budget around sensor adapters, validation infrastructure, mobile/edge compute, data/evaluation infrastructure, engineering labor, security/privacy work, pilot validation and commercialization.

## Submission rule
This document is a preparation master. No application is represented as submitted until the user/company has completed required legal attestations and authorized the actual submission.