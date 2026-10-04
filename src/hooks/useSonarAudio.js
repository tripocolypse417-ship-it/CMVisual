import { useEffect, useRef, useCallback } from 'react';

/**
 * useSonarAudio — Web Audio API sonar soundscape
 *
 * - Continuous low hum that scales with nearest-detection proximity
 * - Periodic ping whose rate & pitch scale with proximity
 * - All sounds are procedurally generated (no audio files needed)
 */
export default function useSonarAudio(detections, isScanning, scanMode) {
  const ctxRef   = useRef(null);
  const humRef   = useRef(null);   // { osc, gain }
  const pingRef  = useRef(null);   // intervalId
  const startedRef = useRef(false);

  // Mode colour → frequency flavour
  const modeFreq = { sonar: 80, thermal: 60, motion: 100 };

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  // Nearest detection proximity 0-1 (1 = very close)
  const getProximity = useCallback((dets) => {
    if (!dets.length) return 0;
    const minDist = Math.min(...dets.map(d => d.distance));
    // distance range ~10-100, invert & normalise
    return Math.max(0, Math.min(1, 1 - (minDist - 10) / 90));
  }, []);

  // Fire a single sonar ping
  const firePing = useCallback((proximity, baseFreq) => {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const pingFreq = baseFreq * 4 + proximity * baseFreq * 6; // 320-800 Hz range

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pingFreq, now);
    osc.frequency.exponentialRampToValueAtTime(pingFreq * 0.5, now + 0.18);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08 + proximity * 0.14, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    // Small reverb-like delay
    const delay = ctx.createDelay(0.3);
    delay.delayTime.value = 0.12;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.18;

    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  }, [getCtx]);

  // Start/update the hum
  const startHum = useCallback((proximity, baseFreq) => {
    const ctx = getCtx();
    const now = ctx.currentTime;

    if (!humRef.current) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';

      const gain = ctx.createGain();
      gain.gain.value = 0;

      // Subtle tremolo
      const tremoloOsc = ctx.createOscillator();
      tremoloOsc.frequency.value = 4;
      tremoloOsc.type = 'sine';
      const tremoloGain = ctx.createGain();
      tremoloGain.gain.value = 0.008;
      tremoloOsc.connect(tremoloGain);
      tremoloGain.connect(gain.gain);
      tremoloOsc.start();

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      humRef.current = { osc, gain };
    }

    const { osc, gain } = humRef.current;
    const humFreq = baseFreq * (1 + proximity * 0.8);
    const humVol  = proximity * 0.035;

    osc.frequency.setTargetAtTime(humFreq, now, 0.4);
    gain.gain.setTargetAtTime(humVol, now, 0.5);
  }, [getCtx]);

  const stopHum = useCallback(() => {
    if (!humRef.current) return;
    const { gain } = humRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  }, []);

  // Schedule periodic pings
  const schedulePings = useCallback((proximity, baseFreq) => {
    if (pingRef.current) clearInterval(pingRef.current);
    // ping interval: 2500ms (far) → 400ms (close)
    const interval = Math.round(2500 - proximity * 2100);
    pingRef.current = setInterval(() => {
      firePing(proximity, baseFreq);
    }, interval);
  }, [firePing]);

  // Main effect — respond to scanning state and detection changes
  useEffect(() => {
    if (!isScanning) {
      stopHum();
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
      return;
    }

    const baseFreq = modeFreq[scanMode] ?? 80;
    const proximity = getProximity(detections);

    startHum(proximity, baseFreq);
    schedulePings(proximity, baseFreq);

    return () => {
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
    };
  }, [isScanning, detections, scanMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pingRef.current) clearInterval(pingRef.current);
      if (humRef.current) {
        try { humRef.current.osc.stop(); } catch {}
      }
      if (ctxRef.current) {
        try { ctxRef.current.close(); } catch {}
      }
    };
  }, []);

  // Return an "activate" fn to call on first user gesture (required by browsers)
  return useCallback(() => {
    if (!startedRef.current) {
      getCtx();
      startedRef.current = true;
    }
  }, [getCtx]);
}