# WaveRadar Next Build

## Implemented foundation

The next implementation layer adds two production-oriented primitives:

### Physical validation sessions
`src/lib/validationSession.js`
- standardized validation test cases
- measured observations only
- explicit operator ground truth
- pass/fail/in-progress status
- operational-readiness gate
- contract/version provenance

### Graceful degradation
`src/lib/gracefulDegradation.js`
- full multimodal → camera/IMU → camera → sensor/map → 2D → replay
- advanced sensor failure cannot require a blank screen
- mode labels are explicit

## Immediate integration targets

1. Wire the Android sensor collectors into `validationSession`.
2. Add a persistent local capture queue.
3. Add live capability cards to the Field View.
4. Display evidence class and staleness without cluttering the primary view.
5. Add replay controls using captured sessions.
6. Connect Incident Command to the same evidence stream.
7. Run the physical test matrix on real hardware.

## Acceptance metrics

- sensor event loss rate
- timestamp skew
- position error
- track continuity
- update latency
- stale-data detection latency
- conflict detection
- replay determinism
- battery/thermal impact
- UI frame stability

## Truth boundary

No synthetic observation is permitted in the live evidence stream. Demonstration fixtures must remain explicitly marked as simulation/training data.
