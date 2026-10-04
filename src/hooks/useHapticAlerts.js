import { useEffect, useRef } from 'react';
import { vibrate } from '../lib/haptics';

// Vibrates the phone when a target is flagged as a threat or when a target
// starts moving — so you can keep your eyes off the screen. Throttled so it
// never buzzes continuously. No-op on devices without the Vibration API.
const THREAT_THROTTLE_MS = 4000;
const MOVE_THROTTLE_MS = 3000;

export default function useHapticAlerts({ detections, cameraDetections, threatAlertsEnabled, enabled }) {
  const prevThreats = useRef(new Set());
  const prevMoving = useRef(new Set());
  const lastThreatAt = useRef(0);
  const lastMoveAt = useRef(0);

  useEffect(() => {
    if (!enabled) {
      prevThreats.current = new Set();
      prevMoving.current = new Set();
      return;
    }

    const all = [...(detections || []), ...(cameraDetections || [])];

    // Threat detected — strong double buzz
    const threatIds = new Set(all.filter(d => d.threat).map(d => d.id));
    const newThreats = [...threatIds].filter(id => !prevThreats.current.has(id));
    if (threatAlertsEnabled && newThreats.length && Date.now() - lastThreatAt.current > THREAT_THROTTLE_MS) {
      lastThreatAt.current = Date.now();
      vibrate([80, 50, 140]);
    }
    prevThreats.current = threatIds;

    // Significant movement started — short pulse
    const movingIds = new Set(all.filter(d => d.moving).map(d => d.id));
    const startedMoving = [...movingIds].filter(id => !prevMoving.current.has(id));
    if (startedMoving.length && Date.now() - lastMoveAt.current > MOVE_THROTTLE_MS) {
      lastMoveAt.current = Date.now();
      vibrate(45);
    }
    prevMoving.current = movingIds;
  }, [detections, cameraDetections, threatAlertsEnabled, enabled]);
}