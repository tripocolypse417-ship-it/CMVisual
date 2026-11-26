# Universal provider portfolio — research-only extension

The provider planner is an explicit scheduling contract, not an implemented sensor driver or estimator. The existing consensus and range solver remain separate. No sensor is assumed available by model name; runtime probes, permissions and lawful scope must be established. Budget weights are synthetic units, not power measurements.

## Implementation order
1. Native Android SensorManager + Camera2 enumeration and timestamped capture; separate per-channel rates, permissions and calibration. Preserve the existing Android journal and raw evidence. On Moto G Play, check actual gyroscope availability; accelerometer-only is not 6DOF.
2. Known-size visual fiducials with calibrated camera intrinsics, then visual odometry and visual-inertial candidates where the needed hardware exists. Test low-texture, lighting, blur, drift, scale ambiguity and relocalization. ARCore/WebXR are additional providers, not mandatory dependencies.
3. Research comparison of OpenVINS and ORB-SLAM3 against independently measured trajectories, with separate licensing review (both GPLv3; do not import or distribute code in proprietary products without a compatible licensing strategy). Prefer independently implemented baselines or appropriately licensed alternatives where required.
4. Authorized GNSS, Wi-Fi RTT, UWB, BLE signal strength, and CSI adapters; only verified ranging hardware and surveyed anchors can create range constraints. RSSI and CSI features are not absolute positions. Android support, permission and hardware must be probed, not assumed. No unauthorized network/device scanning.
5. External LiDAR, radar, thermal, acoustic, and mapped/surveyed reference providers with verified units, timestamps, transforms, consent and hardware calibration. Thermal pixels are not proof of a person. No through-wall or smoke penetration claims without specific validated hardware.
6. Typed factor graph with robust kernels, source-correlation modeling, clock offsets, frame alignment and observability checks. Compare against simpler estimators, report ablations, reject unsafe disagreement, and abstain if unobservable.
7. Independent lab: common protocols for First Response and Gridiron IQ, separate data stores and release gates, versioned artifacts, matched coverage, error distributions, energy/latency/thermal limits, adverse conditions, blinded holdout evaluation. No automatic production promotion. Football use restricted by applicable competition rules.

## Primary references
- https://developers.google.com/ar/devices
- https://docs.openvins.com/
- https://github.com/SLAMSEA/ORB-SLAM3
- https://developer.android.com/develop/connectivity/wifi/wifi-rtt
- https://developer.android.com/develop/connectivity/uwb

The planner lists 21 candidate providers, selects a bounded set based on declared capability and authorization, prefers different hardware groups and rotates available candidates. Groups do not imply independent statistical evidence. Every output is labeled research only. No actual sensor acquisition, physical accuracy, independent validation, deployment or competitive superiority is established.
