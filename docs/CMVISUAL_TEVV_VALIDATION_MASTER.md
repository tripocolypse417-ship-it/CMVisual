# CMVisual — TEVV Validation Master

## Objective
Create repeatable evidence that CMVisual measurements, derived outputs and physical forecasts behave as documented and fail safely when data are missing or conflicting.

## Test families
1. Static reference — compare sensor measurements against known reference distances/angles/positions.
2. Known motion — compare tracked motion against controlled trajectories.
3. Cross-sensor — compare compatible observations from independently calibrated sensors.
4. Repeatability — repeat identical scenarios and quantify variance.
5. Latency/dropout — measure stale-data behavior, packet loss and recovery.
6. Federation alignment — verify scale, rotation and translation using known shared reference points.
7. Replay regression — replay fixed datasets and compare outputs against approved baselines.
8. Forecast calibration — evaluate +1/+3/+5 second physical predictions against later measured observations.
9. Failure cases — deliberately test invalid timestamps, impossible ranges, duplicate IDs, stale frames and sensor disagreement.
10. Human review — independently review safety/evidence assessments and record overrides or requests for more data.

## Required result fields
Every validation run should retain run ID, dataset/scenario ID, sensor profile, model/method version, start/end times, metrics, uncertainty metrics, failure cases, regression status, independent-review status and limitations.

## Production gate
A model or sensor adapter should not be promoted merely because a demo looks good. Promotion requires documented validation status, calibration status where applicable, known limitations and regression results.

## Safety rule
When evidence is insufficient or contradictory, CMVisual must report **INSUFFICIENT DATA** or **UNRESOLVED** rather than manufacturing a stronger conclusion.

## Person-level inference boundary
Motion, gait, appearance, proximity, ordinary radio signals or camera observations must not be converted into unsupported claims about identity, criminality, intent, hostility, dangerousness, personality, mental state or neural state. Neural evidence requires an actual validated neural sensor.