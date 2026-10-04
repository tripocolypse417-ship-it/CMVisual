import { useMemo, useRef } from 'react';

/**
 * CMVisual sensor capability + opportunistic derivation layer.
 *
 * This does not invent sensors or measurements. It inventories the signals
 * actually exposed by the device/session, then derives additional features
 * only from observations that are present and time-stamped.
 */
export default function useSensorCapabilityModel({
  sensors,
  sensorBridge,
  cameraActive = false,
  cameraDetections = [],
  acoustic,
  geo,
  battery,
  ambient,
  network,
  cellular,
  spatialStats,
} = {}) {
  const startedAtRef = useRef(Date.now());
  const previousHeadingRef = useRef({ heading: null, at: null });

  return useMemo(() => {
    const now = Date.now();
    const capabilities = [];
    const add = (id, label, available, kind, details = {}) => capabilities.push({ id, label, available: !!available, kind, ...details });

    const motionAvailable = !!sensors?.hasSensors;
    const headingAvailable = motionAvailable && Number.isFinite(Number(sensors?.heading));
    const cameraAvailable = !!cameraActive;
    const externalAvailable = !!sensorBridge?.connected && Array.isArray(sensorBridge?.lastFrame?.detections);
    const acousticAvailable = !!(acoustic?.available || acoustic?.active || acoustic?.status === 'READY' || acoustic?.status === 'LIVE');
    const geoAvailable = !!geo?.pos;
    const batteryAvailable = battery?.level != null || battery?.supported === true;
    const ambientAvailable = ambient?.available || ambient?.status === 'READY' || ambient?.status === 'LIVE' || ambient?.level != null;
    const networkAvailable = !!network;

    add('camera', 'Camera', cameraAvailable, 'visual', { supports: ['object-observation', 'motion-observation', 'scene-change', 'visible-geometry'] });
    add('imu', 'Motion / IMU', motionAvailable, 'inertial', { supports: ['device-motion', 'vibration', 'motion-energy'] });
    add('heading', 'Orientation', headingAvailable, 'orientation', { supports: ['heading', 'relative-rotation'] });
    add('external-range', 'External sensor bridge', externalAvailable, 'external', { supports: ['validated-range', 'bearing', 'external-track-observation'] });
    add('acoustic', 'Acoustic', acousticAvailable, 'acoustic', { supports: ['acoustic-event'] });
    add('geolocation', 'GNSS / Location', geoAvailable, 'position', { supports: ['device-position', 'route-history'] });
    add('battery', 'Battery', batteryAvailable, 'device', { supports: ['power-state'] });
    add('ambient-light', 'Ambient light', ambientAvailable, 'environment', { supports: ['lighting-change'] });
    add('network', 'Network', networkAvailable, 'connectivity', { supports: ['transport-quality', 'latency-context'] });
    add('cellular', 'Cellular fusion', !!cellular, 'connectivity', { supports: ['network-observation'] });

    const activeCapabilities = capabilities.filter(c => c.available);
    const measuredSources = activeCapabilities.length;

    const motion = sensors?.motion || {};
    const motionMagnitude = Number(motion.magnitude);
    const jerk = Number(motion.jerk);
    const heading = Number(sensors?.heading);
    const prevHeadingRef = previousHeadingRef.current;
    const headingRateDegS = prevHeadingRef.at != null && Number.isFinite(heading) && Number.isFinite(prevHeadingRef.heading) && now > prevHeadingRef.at
      ? Math.abs((((heading - prevHeadingRef.heading + 540) % 360) - 180)) / ((now - prevHeadingRef.at) / 1000)
      : null;
    previousHeadingRef.current = { heading, at: now };

    const cameraTrackCount = Array.isArray(cameraDetections) ? cameraDetections.length : 0;
    const externalTrackCount = Array.isArray(sensorBridge?.lastFrame?.detections) ? sensorBridge.lastFrame.detections.length : 0;
    const bridgeLatencyMs = Number(sensorBridge?.bridgeStats?.lastLatencyMs);
    const bridgeHz = Number(sensorBridge?.bridgeStats?.hz);

    // Derived features are explicitly labeled DERIVED. They never claim a
    // physical measurement that wasn't supplied by a real sensor.
    const derived = [];
    if (Number.isFinite(motionMagnitude)) derived.push({ id: 'motion-energy', label: 'Motion energy', value: +motionMagnitude.toFixed(3), unit: 'relative', basis: ['imu'], evidenceClass: 'DERIVED' });
    if (Number.isFinite(jerk)) derived.push({ id: 'motion-jerk', label: 'Motion change rate', value: +jerk.toFixed(3), unit: 'relative', basis: ['imu'], evidenceClass: 'DERIVED' });
    if (Number.isFinite(headingRateDegS)) derived.push({ id: 'heading-rate', label: 'Heading change rate', value: +headingRateDegS.toFixed(1), unit: 'deg/s', basis: ['heading'], evidenceClass: 'DERIVED' });
    if (cameraAvailable) derived.push({ id: 'visual-load', label: 'Visual observation load', value: cameraTrackCount, unit: 'tracks', basis: ['camera'], evidenceClass: 'DERIVED' });
    if (externalAvailable) derived.push({ id: 'external-load', label: 'External observation load', value: externalTrackCount, unit: 'tracks', basis: ['external-range'], evidenceClass: 'DERIVED' });
    if (Number.isFinite(bridgeLatencyMs)) derived.push({ id: 'sensor-latency', label: 'Sensor bridge latency', value: +bridgeLatencyMs.toFixed(0), unit: 'ms', basis: ['external-range', 'network'], evidenceClass: 'MEASURED' });
    if (Number.isFinite(bridgeHz)) derived.push({ id: 'sensor-rate', label: 'Sensor bridge rate', value: +bridgeHz.toFixed(1), unit: 'Hz', basis: ['external-range'], evidenceClass: 'MEASURED' });
    if (geoAvailable && Number.isFinite(Number(geo?.pos?.lat)) && Number.isFinite(Number(geo?.pos?.lng))) {
      derived.push({ id: 'device-position', label: 'Device position', value: { lat: Number(geo.pos.lat), lng: Number(geo.pos.lng) }, unit: 'lat/lng', basis: ['geolocation'], evidenceClass: 'MEASURED' });
    }
    if (Number.isFinite(Number(ambient?.level))) derived.push({ id: 'ambient-light-level', label: 'Ambient light', value: Number(ambient.level), unit: ambient.unit || 'level', basis: ['ambient-light'], evidenceClass: 'MEASURED' });

    const availableSignalCount = activeCapabilities.filter(c => c.kind !== 'device' && c.kind !== 'connectivity').length;
    const capabilityCoverage = capabilities.length ? Math.round((activeCapabilities.length / capabilities.length) * 100) : 0;
    const acquisitionHeadroom = Math.max(0, 100 - Math.min(100,
      (cameraTrackCount * 4) +
      (externalTrackCount * 2) +
      (Number.isFinite(bridgeLatencyMs) ? Math.min(30, bridgeLatencyMs / 10) : 0) +
      (Number.isFinite(spatialStats?.tracked) ? Number(spatialStats.tracked) * 2 : 0)
    ));

    const derivationPaths = [
      { id: 'camera-imu-motion', inputs: ['camera', 'imu'], output: 'stabilized-visual-motion', status: cameraAvailable && motionAvailable ? 'AVAILABLE' : 'INSUFFICIENT DATA' },
      { id: 'camera-heading-world', inputs: ['camera', 'heading'], output: 'heading-referenced-visual-observation', status: cameraAvailable && headingAvailable ? 'AVAILABLE' : 'INSUFFICIENT DATA' },
      { id: 'external-geo-frame', inputs: ['external-range', 'geolocation'], output: 'geo-referenced-external-observation', status: externalAvailable && geoAvailable ? 'AVAILABLE' : 'INSUFFICIENT DATA' },
      { id: 'multi-source-corroboration', inputs: ['camera', 'external-range'], output: 'cross-sensor-corroboration', status: cameraAvailable && externalAvailable ? 'AVAILABLE' : 'INSUFFICIENT DATA' },
      { id: 'temporal-change', inputs: ['camera', 'imu', 'external-range'], output: 'temporal-change-model', status: cameraAvailable || motionAvailable || externalAvailable ? 'AVAILABLE' : 'INSUFFICIENT DATA' },
    ];

    return {
      version: 'cmvisual-sensor-capability-v1',
      observedAt: new Date(now).toISOString(),
      uptimeMs: now - startedAtRef.current,
      capabilities,
      activeCapabilities,
      measuredSources,
      availableSignalCount,
      capabilityCoverage,
      acquisitionHeadroom,
      derived,
      derivationPaths,
      processing: {
        cameraTrackCount,
        externalTrackCount,
        bridgeLatencyMs: Number.isFinite(bridgeLatencyMs) ? bridgeLatencyMs : null,
        bridgeHz: Number.isFinite(bridgeHz) ? bridgeHz : null,
        droppedFrames: Number(sensorBridge?.bridgeStats?.totalDropped || 0),
        spatialTracked: Number(spatialStats?.tracked || 0),
      },
      principle: 'Use available real signals opportunistically; derive only from present evidence; preserve provenance and uncertainty.',
    };
  }, [sensors, sensorBridge, cameraActive, cameraDetections, acoustic, geo, battery, ambient, network, cellular, spatialStats]);
}