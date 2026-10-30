# WaveRadar Competitive and Adjacent-Technology Landscape

**Research date:** 2026-10-30  
**Purpose:** Identify existing products and research directions that overlap WaveRadar's emergency-response vision. This is a public-source desk review, not a procurement evaluation, performance benchmark, or claim that WaveRadar is superior.

## 1. Executive assessment

WaveRadar is not entering an empty market. Existing products already address firefighter AR vision, thermal imaging, indoor personnel tracking, firefighter accountability, wearable environmental monitoring, command-center visibility, and radar-based human-presence detection.

The strongest strategic opportunity is not to claim that WaveRadar invented any one sensor technique. It is to build an evidence-governed, sensor-agnostic system that can combine heterogeneous sources, preserve their provenance and uncertainty, and independently test new capabilities before they enter safety-critical workflows.

## 2. Competitor and adjacent-product matrix

| Company / project | Publicly described capability | Overlap with WaveRadar | Important distinction / diligence question |
|---|---|---|---|
| Qwake Technologies — C-THRU Navigator | Helmet-mounted AR vision, thermal/edge-enhanced modes, live firefighter POV streaming to command, post-incident review, modular hardware | Helmet interface, low-visibility awareness, command sharing, replay | Strong direct overlap in field HUD and command visibility. Assess available sensor interfaces, indoor mapping, navigation/backtracking, and third-party integration. |
| Taber Innovations — OverWatch Locator | UWB-based personnel tracking, movement/altitude/location awareness, path history, incident-command view, coverage without cellular dependence | Firefighter tracking and command situational awareness | Direct overlap in personnel localization and accountability. Compare infrastructure, positioning accuracy under fireground conditions, battery, interoperability, and evidence export. |
| Pure Engineering — FireBeacon | Truck-mounted four-antenna UWB base station; wearable UWB sensors; thermal array, CO2, motion/orientation and pressure/elevation sensing; local server and commander view | Multi-sensor firefighter tracking and hazard monitoring | Direct overlap in sensor fusion and vehicle/crew infrastructure. Validate actual field deployment, hardware availability, operating envelope, and API access. |
| Somewear Labs | Body-worn/vehicle networking, personnel location information, tracking and messaging, interagency common network, APIs/webhooks | Communications, resource tracking, command common operating picture | Strong adjacent network/integration capability. WaveRadar should integrate rather than recreate resilient communications if licensing and interoperability allow. |
| Dräger UCF FireCore | Helmet-mounted thermal camera with wireless image stream to in-mask HUD; detachable camera | Thermal field awareness and helmet integration | Established safety-equipment vendor and mature hardware. WaveRadar should not compete by making unsubstantiated thermal claims; assess interoperability and potential integration. |
| Grace Industries — MicroCELL / Cloud Connect | Firefighter accountability, check-ins, GPS where available, SOS, man-down alerts, cloud/mobile monitoring | Accountability, alerts, command monitoring | Adjacent accountability product. Compare indoor performance, communications dependencies, integration options, and lifecycle costs. |
| 3M Scott — SEMS II | SCBA-based identification/accountability, RFID tagging, PASS status, alarms, mesh/repeater components, incident data logging | Crew accountability and incident records | Established SCBA ecosystem. Integration with existing equipment and workflow may be more valuable than replacing it. |
| DHS S&T / MaXentric — DePLife | Radar-based presence/life-motion detection behind certain common wall materials; tested in operational field assessments; metal/foil walls are a limitation | Human-presence sensing and search support | Adjacent research/prototype, not proof of universal through-wall imaging. Further work identified for moving-device operation, robot mounting, multi-user feeds, and additional field testing. |
| NIST / Indiana University — FRST Challenge | Research program for indoor first-responder tracking; many prototype approaches | Indoor localization, test methods, responder safety | Important validation ecosystem and potential research partner. NIST noted the lack of reliable indoor tracking methods in large buildings, making independent test standards a major opportunity. |
| Longan FVS | Helmet-mounted thermal/AR fusion device with edge, fusion and hotspot modes, Wi-Fi/Bluetooth streaming | Helmet vision and command sharing | Direct product overlap. Verify commercial availability, regional support, certifications, integration APIs, and independent field evidence. |
| Ignis XR — Ember | Prototype camera/compute/HUD module mounted to SCBA mask; public material describes a working prototype and iterative fitting | Helmet/mask-mounted sensing and display | Emerging prototype. Track its engineering approach and user-testing evidence; do not assume commercial certification. |
| 2026 student/research concepts (ResQ Vision, Sentinel, Firekin) | Thermal/AI helmet HUD, HAZMAT wearable camera/environmental sensors with command dashboard, and wildland wearable sensor networks | Helmet interfaces, sensor fusion, environmental monitoring, command displays | Treat as emerging concepts/prototypes unless independently verified. They signal continued convergence of wearable sensing and command software. |

## 3. Primary source register

- Qwake C-THRU Navigator: https://www.qwake.tech/navigator
- DHS / USFA overview of C-THRU: https://www.usfa.fema.gov/blog/c-thru-new-system-for-situational-awareness-in-low-visibility/
- OverWatch Locator: https://www.overwatchlocator.com/
- FireBeacon: https://www.pureengineering.com/projects/firebeacon
- Somewear Labs wildland fire: https://somewearlabs.com/wildland-fire/
- Dräger UCF FireCore design overview: https://ifdesign.com/en/winner-ranking/project/ucf-firecore/646652
- Grace Industries firefighter accountability: https://graceindustries.com/industries/firefighter-accountability-systems/
- DHS / USFA DePLife: https://www.usfa.fema.gov/blog/help-responders-see-through-walls-with-deplife/
- NIST FRST Challenge context: https://www.nist.gov/blogs/taking-measure/how-thousands-tiny-dots-can-save-first-responders-lives
- Longan FVS: https://ctssb.com/portfolio/longan-fvs/
- Ignis XR: https://www.ignisxr.com/
- ResQ Vision: https://www.jamesdysonaward.org/en-US/2026/project/resq-vision
- Sentinel: https://www.jamesdysonaward.org/en-US/2026/project/sentinel
- Firekin: https://www.jamesdysonaward.org/en-US/2026/project/firekin

## 4. Strategic implications for WaveRadar

### 4.1 Do not compete by duplicating every sensor

Use established and certified equipment where appropriate. Prioritize standards-based or documented interfaces for:
- Thermal cameras and existing TICs.
- UWB positioning systems.
- SCBA/PASS/accountability telemetry.
- Gas, temperature, pressure, and environmental sensors.
- Radio, mesh, cellular, Wi-Fi, satellite, and vehicle systems.
- Building plans, pre-incident plans, and incident-command systems.

Before integrating a source, verify data rights, API availability, timing, coordinate frames, units, error bounds, licensing, and whether its vendor permits commercial redistribution.

### 4.2 Potential WaveRadar differentiation

These are strategic opportunities, not capabilities already proven:

1. **Evidence provenance across every sensor.** Every observation retains source, device, time, calibration, coordinate frame, uncertainty, and evidence class. Never let an inferred result masquerade as a measurement.
2. **Independent validation as a core service.** The Institute can test external technologies, reproduce claims, preserve failures, and issue bounded results. This could create credibility and a research pipeline if genuinely independent reviewers and repeatable protocols are used.
3. **Sensor-agnostic common operating picture.** Fuse existing vendor systems rather than forcing departments to replace all equipment. Provide a normalized data layer with explicit source health and uncertainty.
4. **Shared field/command review.** Synchronize firefighter POV, maps, sensor context, command annotations, and after-action replay while keeping role-specific displays uncluttered.
5. **AI recommendation auditability.** Show inputs, evidence class, confidence calibration, alternative hypotheses, reasons for abstention, and the effect of missing or stale sources.
6. **Graceful degradation.** When GPS, Wi-Fi, cellular, satellite, camera, pose, or external hardware is unavailable, clearly show the degraded mode and never fabricate a route or location.
7. **Research-to-integration pipeline.** Keep experimental sensor adapters isolated and disabled by default; promote only after independent testing and a safety review.

### 4.3 Near-term product priorities

1. Complete a reliable Android native-sensor baseline and determine what the current phone can actually measure.
2. Integrate one existing, documented sensor source before attempting complex new RF sensing.
3. Establish a building-relative coordinate model with independent ground truth and explicit uncertainty.
4. Validate data exchange and command playback with a real fire department or university partner under a controlled, non-operational test.
5. Conduct firefighter usability tests for glove interaction, cognitive load, display legibility, heat/impact constraints, and fail-safe behavior.
6. Benchmark any claimed capability against an existing product using the same test envelope and independent references.

## 5. Research opportunities

- Compare Wi-Fi BFI/CSI feasibility with UWB, mmWave radar, thermal, and inertial methods. Do not assume these are interchangeable.
- Investigate sensor fusion at the edge so loss of cloud connectivity does not disable essential local functions.
- Study uncertainty-aware indoor localization, loop closure, map alignment, and coordinate-frame consistency.
- Explore common data models and standards for incident command, responder location, telemetry, and post-incident evidence.
- Partner with NIST/FRST-style test efforts rather than claiming a proprietary benchmark without independent review.

## 6. Limitations of this review

- Public marketing pages describe vendor claims, not independent proof.
- Some projects are student concepts or prototypes, not commercial competitors.
- Product availability, pricing, certification, field performance, and integration terms require direct verification.
- This review does not establish freedom to operate, patent clearance, or licensing permission.
- WaveRadar has not been benchmarked head-to-head against these systems.

**Bottom line:** WaveRadar's strongest credible path is to become the interoperability, evidence, and validation layer that works with existing responder equipment—then add only those new sensing capabilities that survive independent testing.
