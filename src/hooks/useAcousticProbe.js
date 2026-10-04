import { useState, useRef, useCallback, useEffect } from 'react';

// Real acoustic input from the microphone via Web Audio API.
// Produces a live RMS-ish level (0-100) and a 16-band frequency spectrum.
// Requires a user gesture (the mic permission prompt).
export default function useAcousticProbe() {
  const [level, setLevel] = useState(0);
  const [bands, setBands] = useState(new Array(16).fill(0));
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [features, setFeatures] = useState({ dominantBand: null, spectralCentroid: null, transient: false });
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const uiRef = useRef({ level: 0, lastCommit: 0 });

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (ctxRef.current) ctxRef.current.close().catch(() => {});
    ctxRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    setActive(false);
    setLevel(0);
    setBands(new Array(16).fill(0));
    setFeatures({ dominantBand: null, spectralCentroid: null, transient: false });
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyserRef.current = analyser;
      setActive(true);

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const avg = sum / buf.length;
        const nextLevel = Math.min(100, Math.round((avg / 255) * 140));
        // Sample the microphone at animation-frame rate, but commit React state
        // at a bounded UI cadence. This preserves signal sampling while avoiding
        // 60+ React renders/sec on Android.
        const now = performance.now();
        const previousLevel = uiRef.current.level;
        uiRef.current.level = nextLevel;
        if (now - uiRef.current.lastCommit < 80) return;
        uiRef.current.lastCommit = now;
        setLevel(nextLevel);
        const peakIndex = buf.reduce((best, v, i) => v > buf[best] ? i : best, 0);
        let weighted = 0, weightSum = 0;
        for (let i = 0; i < buf.length; i++) { weighted += i * buf[i]; weightSum += buf[i]; }
        const centroid = weightSum ? weighted / weightSum : 0;
        setFeatures({ dominantBand: peakIndex, spectralCentroid: Number(centroid.toFixed(2)), transient: nextLevel > previousLevel + 18 });
        const next = new Array(16).fill(0);
        const step = Math.max(1, Math.floor(buf.length / 16));
        for (let b = 0; b < 16; b++) {
          let s = 0;
          for (let j = 0; j < step; j++) s += buf[b * step + j] || 0;
          next[b] = Math.round((s / step / 255) * 100);
        }
        setBands(next);
      };
      tick();
    } catch (e) {
      setError(e.message || 'microphone denied');
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { level, bands, features, active, error, start, stop };
}