import { useMemo } from 'react';

// Change-point detector for observable track behavior. This describes changes
// in measured/derived motion; it does not infer intent, identity, psychology,
// or dangerousness.
function finite(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function angleDelta(a, b) {
  const x = Math.abs(((Number(a) - Number(b) + 540) % 360) - 180);
  return Math.abs(x);
}

export default function useTrackAnomalies(tracks) {
  return useMemo(() => {
    if (!Array.isArray(tracks)) return [];
    const now = Date.now();
    const results = [];

    tracks.forEach((track) => {
      const history = Array.isArray(track?.derivedTrack?.trail) ? track.derivedTrack.trail : [];
      if (history.length < 4) return;
      const recent = history[history.length - 1];
      const prior = history[history.length - 2];
      const earlier = history[Math.max(0, history.length - 5)];
      const recentDt = Math.max(0.05, (Number(recent.t) - Number(prior.t)) / 1000);
      const baselineDt = Math.max(0.05, (Number(recent.t) - Number(earlier.t)) / 1000);
      const recentSpeed = Math.hypot(recent.x - prior.x, recent.z - prior.z) / recentDt;
      const baselineSpeed = Math.hypot(recent.x - earlier.x, recent.z - earlier.z) / baselineDt;
      const speedRatio = baselineSpeed > 0.05 ? recentSpeed / baselineSpeed : recentSpeed > 0.5 ? 3 : 1;

      const recentHeading = (Math.atan2(recent.z - prior.z, recent.x - prior.x) * 180 / Math.PI + 360) % 360;
      const baselineHeading = (Math.atan2(recent.z - earlier.z, recent.x - earlier.x) * 180 / Math.PI + 360) % 360;
      const turnDeg = angleDelta(recentHeading, baselineHeading);

      const changes = [];
      if (speedRatio >= 2.2 && recentSpeed >= 0.75) changes.push('SPEED_CHANGE');
      if (turnDeg >= 55 && recentSpeed >= 0.4) changes.push('DIRECTION_CHANGE');
      if (recentSpeed <= 0.15 && baselineSpeed >= 0.6) changes.push('STOP_CHANGE');
      if (recentSpeed >= 0.75 && baselineSpeed <= 0.15) changes.push('START_CHANGE');
      if (!changes.length) return;

      results.push({
        trackId: String(track.trackId ?? track.id ?? 'track'),
        changes,
        recentSpeedMps: Math.min(20, recentSpeed),
        baselineSpeedMps: Math.min(20, baselineSpeed),
        speedRatio: Number(speedRatio.toFixed(2)),
        turnDeg: Number(turnDeg.toFixed(1)),
        observedAt: finite(recent.t) ?? now,
        methodVersion: 'change-point-v1',
      });
    });

    return results.slice(0, 24);
  }, [tracks]);
}