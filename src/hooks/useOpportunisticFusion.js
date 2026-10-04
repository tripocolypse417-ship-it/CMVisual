import { useMemo } from 'react';

/**
 * Turns currently available real device/sensor context into additional
 * track metadata. It never creates detections and never changes track identity.
 * All additions are explicitly DERIVED or CONTEXTUAL.
 */
export default function useOpportunisticFusion(observations = [], { sensors, geo, capabilityModel, sensorBridge } = {}) {
  return useMemo(() => {
    const items = Array.isArray(observations) ? observations : [];
    const heading = Number(sensors?.heading);
    const motion = sensors?.motion || {};
    const motionEnergy = Number(motion.magnitude);
    const jerk = Number(motion.jerk);
    const hasHeading = Number.isFinite(heading);
    const hasGeo = Number.isFinite(Number(geo?.pos?.lat)) && Number.isFinite(Number(geo?.pos?.lng));
    const bridgeLatencyMs = Number(sensorBridge?.bridgeStats?.lastLatencyMs);

    return items.map((d) => {
      const angle = Number(d?.angle);
      const relativeBearing = Number.isFinite(angle) ? ((angle % 360) + 360) % 360 : null;
      const worldBearing = hasHeading && relativeBearing != null
        ? (heading + relativeBearing) % 360
        : null;
      const existing = d?.opportunisticFusion || {};
      return {
        ...d,
        opportunisticFusion: {
          ...existing,
          version: 'cmvisual-opportunistic-fusion-v1',
          evidenceClass: 'DERIVED',
          deviceHeadingDeg: hasHeading ? heading : null,
          relativeBearingDeg: relativeBearing,
          worldBearingDeg: worldBearing,
          deviceMotionEnergy: Number.isFinite(motionEnergy) ? +motionEnergy.toFixed(3) : null,
          deviceMotionJerk: Number.isFinite(jerk) ? +jerk.toFixed(3) : null,
          deviceGeo: hasGeo ? { lat: Number(geo.pos.lat), lng: Number(geo.pos.lng) } : null,
          sensorBridgeLatencyMs: Number.isFinite(bridgeLatencyMs) ? bridgeLatencyMs : null,
          capabilityCoverage: Number(capabilityModel?.capabilityCoverage ?? 0),
          availableSignalCount: Number(capabilityModel?.availableSignalCount ?? 0),
          derivationsAvailable: (capabilityModel?.derivationPaths || []).filter(p => p.status === 'AVAILABLE').map(p => p.id),
        },
      };
    });
  }, [observations, sensors?.heading, sensors?.motion, geo?.pos, capabilityModel, sensorBridge?.bridgeStats]);
}