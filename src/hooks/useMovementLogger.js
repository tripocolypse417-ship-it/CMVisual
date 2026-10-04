import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const SHIFT_DIST = 5;      // meters
const SHIFT_ANG = 10;      // degrees
const THROTTLE_MS = 2000;  // per-target log throttle

function summarize(type, d) {
  const t = (d.type || 'target').toUpperCase();
  const dist = (d.distance ?? 0).toFixed(1);
  const bear = Math.round(d.angle ?? 0);
  if (type === 'new_target') return `${t} acquired · ${dist}m · ${bear}°`;
  if (type === 'movement_start') return `${t} began moving · ${(d.speed ?? 0).toFixed(1)} m/s`;
  return `${t} repositioned · ${dist}m · ${bear}°`;
}

// Watches the detections array and persists timestamped movement events to the
// DetectionEvent entity while scanning is active.
export default function useMovementLogger(detections, scanMode, isScanning, assessment = null) {
  const prevRef = useRef([]);
  const lastLoggedRef = useRef({});

  useEffect(() => {
    if (!isScanning) { prevRef.current = detections; return; }
    const prev = prevRef.current;
    const prevMap = new Map(prev.map(d => [d.id, d]));
    const now = Date.now();
    const events = [];

    detections.forEach(d => {
      const old = prevMap.get(d.id);
      const last = lastLoggedRef.current[d.id] || 0;
      const ok = now - last > THROTTLE_MS;

      if (!old) {
        events.push({ d, type: 'new_target' });
        lastLoggedRef.current[d.id] = now;
      } else if (!old.moving && d.moving && ok) {
        events.push({ d, type: 'movement_start' });
        lastLoggedRef.current[d.id] = now;
      } else if (ok) {
        const distShift = Math.abs(d.distance - old.distance);
        const angShift = Math.abs(((d.angle - old.angle + 540) % 360) - 180);
        if (distShift > SHIFT_DIST || angShift > SHIFT_ANG) {
          events.push({ d, type: 'shift' });
          lastLoggedRef.current[d.id] = now;
        }
      }
    });

    if (events.length) {
      const records = events.map(({ d, type }) => ({
        event_type: type,
        target_type: d.type || 'unknown',
        distance: d.distance ?? 0,
        bearing: d.angle ?? 0,
        intensity: d.intensity ?? 0,
        moving: !!d.moving,
        speed: d.speed ?? 0,
        scan_mode: scanMode,
        summary: summarize(type, d),
        evidence_score: Number.isFinite(Number(assessment?.score)) ? Number(assessment.score) : null,
        validation_score: Number.isFinite(Number(assessment?.validationScore)) ? Number(assessment.validationScore) : null,
        confidence: Number.isFinite(Number(assessment?.confidence)) ? Number(assessment.confidence) / 100 : null,
        corroboration_count: Number.isFinite(Number(d?.sensorSupportCount)) ? Number(d.sensorSupportCount) : (d?.corroborated ? 1 : 0),
        signal_quality: Number.isFinite(Number(d?.signalQuality)) ? Number(d.signalQuality) : null,
        metrics_json: assessment ? JSON.stringify(assessment.metrics) : null,
        limitations_json: assessment ? JSON.stringify(assessment.limitations) : null,
      }));
      base44.entities.DetectionEvent.bulkCreate(records).catch(() => {});
    }
    prevRef.current = detections;
  }, [detections, scanMode, isScanning, assessment]);
}