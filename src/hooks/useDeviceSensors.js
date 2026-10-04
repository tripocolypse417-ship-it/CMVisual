import { useState, useEffect, useRef, useCallback } from 'react';

// Reads real device orientation (compass heading) and motion activity.
// No through-wall radar data is available from a browser — this surfaces
// the real sensors the phone actually exposes.
export default function useDeviceSensors(active = true) {
  const [heading, setHeading] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [motion, setMotion] = useState({ x: 0, y: 0, z: 0, magnitude: 0, jerk: 0, timestamp: null });
  const [hasSensors, setHasSensors] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [denied, setDenied] = useState(false);
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });
  const movingDecay = useRef(0);
  const lastMagnitude = useRef(0);

  const requestPermission = useCallback(async () => {
    const orientNeedsReq = typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function';
    const motionNeedsReq = typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function';
    try {
      let op = 'granted';
      if (orientNeedsReq) op = await DeviceOrientationEvent.requestPermission();
      let mp = 'granted';
      if (motionNeedsReq) mp = await DeviceMotionEvent.requestPermission();
      if (op === 'granted' && mp === 'granted') {
        setNeedsPermission(false);
        setHasSensors(true);
      } else {
        setDenied(true);
      }
    } catch {
      setDenied(true);
    }
  }, []);

  // Detect the APIs independently. Android browsers normally expose these
  // without a permission prompt; iOS may require an explicit user gesture.
  useEffect(() => {
    const hasOrient = typeof DeviceOrientationEvent !== 'undefined';
    const hasMotion = typeof DeviceMotionEvent !== 'undefined';
    const needsReq =
      (hasOrient && typeof DeviceOrientationEvent.requestPermission === 'function') ||
      (hasMotion && typeof DeviceMotionEvent.requestPermission === 'function');

    if (needsReq) {
      setNeedsPermission(true);
    } else {
      setHasSensors(hasOrient || hasMotion);
      setNeedsPermission(false);
    }
  }, []);

  useEffect(() => {
    if (!active || !hasSensors) return;
    const onOrient = (e) => {
      const h = (typeof e.webkitCompassHeading === 'number')
        ? e.webkitCompassHeading
        : (e.alpha != null ? (360 - e.alpha) % 360 : null);
      if (h != null) setHeading(Math.round(h));
    };
    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a) return;
      const ax = a.x ?? 0, ay = a.y ?? 0, az = a.z ?? 0;
      const dx = ax - lastAccel.current.x;
      const dy = ay - lastAccel.current.y;
      const dz = az - lastAccel.current.z;
      lastAccel.current = { x: ax, y: ay, z: az };
      const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const jerk = Math.abs(mag - lastMagnitude.current);
      lastMagnitude.current = mag;
      setMotion({ x: ax, y: ay, z: az, magnitude: mag, jerk, timestamp: Date.now() });
      if (mag > 1.5) movingDecay.current = 6; // ~6 frames of "moving" after a shake
      else if (movingDecay.current > 0) movingDecay.current -= 1;
      setIsMoving(movingDecay.current > 0);
    };
    if (typeof DeviceOrientationEvent !== 'undefined') {
      window.addEventListener('deviceorientation', onOrient, true);
    }
    if (typeof DeviceMotionEvent !== 'undefined') {
      window.addEventListener('devicemotion', onMotion, true);
    }
    return () => {
      if (typeof DeviceOrientationEvent !== 'undefined') {
        window.removeEventListener('deviceorientation', onOrient, true);
      }
      if (typeof DeviceMotionEvent !== 'undefined') {
        window.removeEventListener('devicemotion', onMotion, true);
      }
    };
  }, [active, hasSensors]);

  return { heading, isMoving, motion, hasSensors, needsPermission, denied, requestPermission };
}