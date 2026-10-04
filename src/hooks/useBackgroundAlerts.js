import { useState, useEffect, useRef, useCallback } from 'react';

// Fires real system notifications when the radar detects new targets, movement
// shifts, or sudden device motion — but only while the app is backgrounded
// (document hidden). Uses the Notifications API + visibilitychange.
const MOTION_THROTTLE_MS = 10000;

export default function useBackgroundAlerts({ detections, isMoving, enabled }) {
  const supported = typeof Notification !== 'undefined';
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported');
  const [lastAlert, setLastAlert] = useState(null);
  const prevDets = useRef([]);
  const prevMoving = useRef(false);
  const lastMotionAt = useRef(0);

  const requestPermission = useCallback(async () => {
    if (!supported) return;
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
    } catch {}
  }, [supported]);

  const fire = useCallback((body) => {
    if (!supported || Notification.permission !== 'granted') return;
    try {
      const n = new Notification('WallSight Alert', { body, tag: 'wallsight-alert', icon: '/favicon.ico' });
      setTimeout(() => n.close(), 8000);
    } catch {}
    setLastAlert({ time: Date.now(), body });
  }, [supported]);

  useEffect(() => {
    if (!enabled || permission !== 'granted') {
      prevDets.current = detections;
      prevMoving.current = isMoving;
      return;
    }
    const hidden = document.visibilityState === 'hidden';
    const prevMap = new Map(prevDets.current.map(d => [d.id, d]));

    const newOnes = detections.filter(d => !prevMap.has(d.id));
    const moved = detections.filter(d => {
      const old = prevMap.get(d.id);
      if (!old) return false;
      if (!old.moving && d.moving) return true;                 // started moving
      const distShift = Math.abs(d.distance - old.distance);
      const angShift = Math.abs(((d.angle - old.angle + 540) % 360) - 180);
      return distShift > 5 || angShift > 10;                     // significant shift
    });

    if (hidden) {
      const parts = [];
      if (newOnes.length) parts.push(`${newOnes.length} new target${newOnes.length > 1 ? 's' : ''}`);
      if (moved.length) parts.push(`${moved.length} movement${moved.length > 1 ? 's' : ''}`);
      if (parts.length) fire(`Radar detected ${parts.join(' and ')} while backgrounded.`);
      if (isMoving && !prevMoving.current && Date.now() - lastMotionAt.current > MOTION_THROTTLE_MS) {
        lastMotionAt.current = Date.now();
        fire('Sudden device motion detected while backgrounded.');
      }
    }
    prevDets.current = detections;
    prevMoving.current = isMoving;
  }, [detections, isMoving, enabled, permission, fire]);

  return { supported, permission, requestPermission, lastAlert };
}