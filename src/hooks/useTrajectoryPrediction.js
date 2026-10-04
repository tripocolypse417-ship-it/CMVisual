import { useMemo } from 'react';

// Prediction is strictly downstream of repeated measured/derived track history.
// It never creates or inserts a target into the measured observation stream.
const HORIZONS_MS = [1000, 3000, 5000];
const MAX_SPEED_MPS = 20;

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function predictTrack(track, now) {
  const trail = Array.isArray(track?.derivedTrack?.trail) ? track.derivedTrack.trail : [];
  if (trail.length < 2) return null;

  const last = trail[trail.length - 1];
  const previous = trail[trail.length - 2];
  const dt = Math.max(0.05, (Number(last.t) - Number(previous.t)) / 1000);
  const dx = finite(last.x) != null && finite(previous.x) != null ? last.x - previous.x : null;
  const dz = finite(last.z) != null && finite(previous.z) != null ? last.z - previous.z : null;
  if (dx == null || dz == null) return null;

  const speed = Math.min(MAX_SPEED_MPS, Math.hypot(dx, dz) / dt);
  if (!Number.isFinite(speed)) return null;

  const vx = dx / dt;
  const vz = dz / dt;
  const samples = Math.min(trail.length, 6);
  const first = trail[trail.length - samples];
  const longDt = Math.max(0.05, (Number(last.t) - Number(first.t)) / 1000);
  const longVx = (finite(last.x) - finite(first.x)) / longDt;
  const longVz = (finite(last.z) - finite(first.z)) / longDt;
  // Blend short- and longer-window velocity to reduce jitter without hiding
  // genuine direction changes.
  const blendedVx = 0.65 * vx + 0.35 * longVx;
  const blendedVz = 0.65 * vz + 0.35 * longVz;
  const acceleration = Math.min(10, Math.hypot(vx - longVx, vz - longVz) / Math.max(0.1, longDt));

  const ageMs = Math.max(0, now - Number(last.t));
  const sourceTrackVersion = `${track.trackId ?? track.id ?? 'track'}:${track.derivedTrack.observationCount ?? trail.length}:${Number(last.t)}`;

  return {
    trackId: String(track.trackId ?? track.id),
    generatedAt: now,
    sourceTrackVersion,
    modelVersion: 'cv-blend-v1',
    currentPosition: { x: last.x, z: last.z },
    predictedVelocity: { x: blendedVx, z: blendedVz },
    speedMps: Math.min(MAX_SPEED_MPS, Math.hypot(blendedVx, blendedVz)),
    accelerationMps2: acceleration,
    trackAgeMs: ageMs,
    horizons: HORIZONS_MS.map((horizonMs) => {
      const seconds = horizonMs / 1000;
      const x = last.x + blendedVx * seconds;
      const z = last.z + blendedVz * seconds;
      // Uncertainty expands with horizon and recent velocity disagreement.
      const sigmaM = Math.max(0.15, 0.12 + speed * 0.06 + acceleration * 0.08) * Math.sqrt(seconds);
      return {
        horizonMs,
        position: { x, z },
        uncertaintyM: Math.min(10, sigmaM),
      };
    }),
  };
}

export default function useTrajectoryPrediction(tracks) {
  return useMemo(() => {
    const now = Date.now();
    if (!Array.isArray(tracks)) return [];
    return tracks
      .map((track) => predictTrack(track, now))
      .filter(Boolean)
      .filter((prediction) => prediction.trackAgeMs <= 1500 && prediction.speedMps >= 0.05);
  }, [tracks]);
}