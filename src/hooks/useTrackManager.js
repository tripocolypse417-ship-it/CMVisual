import { useEffect, useRef, useState } from 'react';
import { classifySpatialMeasurement, normalizeFrameTimestamp, finiteMeasurement } from '../lib/sensorFrameContract.js';

// Client-side track bookkeeping only. A track is keyed by the detector's own
// stable trackId/id; no cross-target identity matching is attempted.
const MAX_TRAIL = 24;
const LOST_AFTER_MS = 1200;
const EXPIRE_AFTER_MS = 8000;

function polarPosition(d) {
  const spatial = classifySpatialMeasurement(d);
  if (spatial.status !== 'SPATIALLY_ALIGNED') return null;
  const rad = spatial.angle * Math.PI / 180;
  return { x: spatial.distance * Math.cos(rad), z: spatial.distance * Math.sin(rad) };
}

export default function useTrackManager(observations) {
  const tracksRef = useRef(new Map());
  const [, forceRefresh] = useState(0);

  useEffect(() => {
    const now = Date.now();
    const seen = new Set();
    const items = Array.isArray(observations)
      ? observations.filter(d => d && typeof d === 'object' && !Array.isArray(d))
      : [];

    items.forEach((d) => {
      const key = String(d.trackId ?? d.id ?? '');
      if (!key) return;
      seen.add(key);
      const position = polarPosition(d);
      const prior = tracksRef.current.get(key);
      const firstSeen = prior?.firstSeen ?? now;
      const previousPosition = prior?.position ?? position;
      const observedAt = normalizeFrameTimestamp(
        d.observedAt ?? d.measuredAt ?? d.timestamp
      );
      // A source timestamp is required for time-based trails. Arrival time is
      // tracked separately for liveness and is never substituted for capture time.
      const captureTime = observedAt != null && observedAt <= now + 1000
        ? observedAt
        : null;
      const previousCaptureTime = prior?.lastObservedAt ?? null;
      const captureDeltaMs = captureTime != null && previousCaptureTime != null
        ? captureTime - previousCaptureTime
        : null;
      const dt = captureDeltaMs != null && captureDeltaMs > 0
        ? captureDeltaMs / 1000
        : null;
      const dx = position && previousPosition ? position.x - previousPosition.x : null;
      const dz = position && previousPosition ? position.z - previousPosition.z : null;
      const rawSpeed = dt != null && dx != null && dz != null
        ? Math.hypot(dx, dz) / dt
        : null;
      const speed = rawSpeed != null
        ? Math.min(rawSpeed, 20)
        : finiteMeasurement(d.derivedTrack?.speedMps) ?? prior?.speedMps ?? null;
      const heading = rawSpeed != null && rawSpeed > 0.05 && dx != null && dz != null
        ? ((Math.atan2(dz, dx) * 180 / Math.PI) + 360) % 360
        : finiteMeasurement(d.derivedTrack?.headingDeg) ?? prior?.headingDeg ?? null;

      const appendTimedPoint = Boolean(
        position &&
        captureTime != null &&
        (previousCaptureTime == null || captureTime > previousCaptureTime)
      );
      const trail = appendTimedPoint
        ? [...(prior?.trail ?? []), { x: position.x, z: position.z, t: captureTime }].slice(-MAX_TRAIL)
        : (prior?.trail ?? []);
      const lastObservedAt = appendTimedPoint ? captureTime : previousCaptureTime;
      const firstObservedAt = prior?.firstObservedAt ?? (captureTime != null ? captureTime : null);

      tracksRef.current.set(key, {
        firstSeen,
        lastSeen: now,
        firstObservedAt,
        lastObservedAt,
        observationCount: (prior?.observationCount ?? 0) + 1,
        timedObservationCount: (prior?.timedObservationCount ?? 0) + (appendTimedPoint ? 1 : 0),
        position: position ?? prior?.position ?? null,
        previousPosition,
        speedMps: speed,
        headingDeg: heading,
        trail,
        status: 'LIVE',
        source: d.source ?? prior?.source ?? 'LOCAL INPUT',
      });
    });

    tracksRef.current.forEach((track, key) => {
      if (seen.has(key)) return;
      const age = now - track.lastSeen;
      track.status = age <= EXPIRE_AFTER_MS ? 'LOST' : 'EXPIRED';
      if (age > EXPIRE_AFTER_MS) tracksRef.current.delete(key);
    });

    forceRefresh(v => v + 1);
  }, [observations]);

  const now = Date.now();
  return (Array.isArray(observations)
    ? observations.filter(d => d && typeof d === 'object' && !Array.isArray(d))
    : []
  ).map((d) => {
    const key = String(d.trackId ?? d.id ?? '');
    const track = tracksRef.current.get(key);
    if (!track) return d;
    const ageMs = Math.max(0, now - track.lastSeen);
    return {
      ...d,
      derivedTrack: {
        speedMps: track.speedMps,
        headingDeg: track.headingDeg,
        ageMs,
        lastSeenAt: track.lastObservedAt,
        lastReceivedAt: track.lastSeen,
        firstSeenAt: track.firstSeen,
        firstObservedAt: track.firstObservedAt,
        observationCount: track.observationCount,
        timedObservationCount: track.timedObservationCount,
        status: ageMs <= LOST_AFTER_MS ? 'LIVE' : 'STALE',
        trail: track.trail,
        position: track.position,
        timeBasis: 'SOURCE_CAPTURE_TIME_ONLY',
      },
    };
  });
}
