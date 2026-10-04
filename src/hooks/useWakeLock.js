import { useState, useRef, useCallback, useEffect } from 'react';

// Real screen Wake Lock — keeps the display on while scanning.
export default function useWakeLock() {
  const [locked, setLocked] = useState(false);
  const [supported, setSupported] = useState(false);
  const lockRef = useRef(null);

  useEffect(() => {
    setSupported('wakeLock' in navigator);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && lockRef.current === 'pending') requestLock();
    };
    const requestLock = async () => {
      try {
        lockRef.current = await navigator.wakeLock.request('screen');
        setLocked(true);
        lockRef.current.addEventListener('release', () => setLocked(false));
      } catch {
        setLocked(false);
        lockRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const request = useCallback(async () => {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    lockRef.current = 'pending';
    try {
      lockRef.current = await navigator.wakeLock.request('screen');
      setLocked(true);
      lockRef.current.addEventListener('release', () => setLocked(false));
    } catch {
      setLocked(false);
      lockRef.current = null;
    }
  }, []);

  const release = useCallback(async () => {
    if (lockRef.current && typeof lockRef.current.release === 'function') {
      try { await lockRef.current.release(); } catch {}
    }
    lockRef.current = null;
    setLocked(false);
  }, []);

  return { locked, supported, request, release };
}