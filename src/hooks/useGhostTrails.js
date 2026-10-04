import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const TYPE_COLORS = { human: '#00ff88', animal: '#00ccff', object: '#ffaa00', unknown: '#ff4466' };

// Map a logged event's bearing + distance to the same screen space the live
// AR detections use, so past paths line up with the current camera overlay.
function toScreen(angle, distance, w, h) {
  const norm = angle / 360;
  const distNorm = Math.min(1, distance / 10);
  const x = w * 0.12 + norm * w * 0.76;
  const y = h * 0.30 + distNorm * h * 0.55;
  return { x, y };
}

// Loads recent movement-bearing DetectionEvents and groups them by target
// type into chronological trails (oldest → newest) for the ghost overlay.
export default function useGhostTrails(enabled, containerSize, limit = 40) {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    if (!enabled) { setGroups([]); return; }
    let active = true;

    const load = async () => {
      try {
        const events = await base44.entities.DetectionEvent.list('-created_date', limit);
        const pts = events
          .filter(e =>
            (e.event_type === 'movement_start' || e.event_type === 'shift' || e.event_type === 'new_target') &&
            typeof e.distance === 'number' && typeof e.bearing === 'number'
          )
          .reverse(); // oldest → newest

        const byType = {};
        pts.forEach(e => {
          const t = e.target_type || 'unknown';
          (byType[t] = byType[t] || []).push(e);
        });

        const result = Object.entries(byType).map(([type, evs]) => {
          const n = evs.length;
          const points = evs.map((e, i) => ({
            ...toScreen(e.bearing, e.distance, containerSize.w, containerSize.h),
            age: n <= 1 ? 1 : i / (n - 1), // 0 oldest → 1 newest
            speed: e.speed ?? 0,
            moving: !!e.moving,
          }));
          return { type, color: TYPE_COLORS[type] || TYPE_COLORS.unknown, points };
        });

        if (active) setGroups(result);
      } catch {
        if (active) setGroups([]);
      }
    };

    load();
    const unsub = base44.entities.DetectionEvent.subscribe(() => { load(); });
    return () => { active = false; unsub(); };
  }, [enabled, containerSize.w, containerSize.h, limit]);

  return groups;
}