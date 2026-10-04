import { useEffect, useRef, useState } from 'react';

// Client-side track bookkeeping only. A track is keyed by the detector's own
// stable trackId/id; no cross-target identity matching is attempted.
const MAX_TRAIL = 24;
const LOST_AFTER_MS = 1200;
const EXPIRE_AFTER_MS = 8000;

function finite(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function polarPosition(d) {
  const angle = finite(d.angle);
  const distance = finite(d.distance);
  if (angle == null || distance == null) return null;
  const r = distance;
  const rad = angle * Math.PI / 180;
  return { x: r * Math.cos(rad), z: r * Math.sin(rad) };
}

export default function useTrackManager(observations) {
  const tracksRef = useRef(new Map());
  const [, forceRefresh] = useState(0);

  useEffect(() => {
    const now = Date.now();
    const seen = new Set();
    const items = Array.isArray(observations) ? observations : [];

    items.forEach((d) => {
      const key = String(d.trackId ?? d.id ?? '');
      if (!key) return;
      seen.add(key);
      const p = polarPosition(d);
      const prior = tracksRef.current.get(key);
      const firstSeen = prior?.firstSeen ?? now;
      const prevPos = prior?.position ?? p;
      const dt = prior?.lastSeen ? Math.max(0.05, (now - prior.lastSeen) / 1000) : null;
      const dx = p && prevPos ? p.x - prevPos.x : 0;
      const dz = p && prevPos ? p.z - prevPos.z : 0;
      const rawSpeed = dt ? Math.hypot(dx, dz) / dt : null;
      const speed = rawSpeed != null ? Math.min(rawSpeed, 20) : finite(d.derivedTrack?.speedMps);
      const heading = speed != null && speed > 0.05 ? ((Math.atan2(dz, dx) * 180 / Math.PI) + 360) % 360 : finite(d.derivedTrack?.headingDeg);
      const trail = p ? [...(prior?.trail ?? []), { x: p.x, z: p.z, t: now }].slice(-MAX_TRAIL) : (prior?.trail ?? []);

      tracksRef.current.set(key, {
        firstSeen,
        lastSeen: now,
        observationCount: (prior?.observationCount ?? 0) + 1,
        position: p ?? prior?.position ?? null,
        previousPosition: prevPos,
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
  return (Array.isArray(observations) ? observations : []).map((d) => {
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
        lastSeenAt: track.lastSeen,
        firstSeenAt: track.firstSeen,
        observationCount: track.observationCount,
        status: ageMs <= LOST_AFTER_MS ? 'LIVE' : 'STALE',
        trail: track.trail,
        position: track.position,
      },
    };
  });
}