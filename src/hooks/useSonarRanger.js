import { useState, useRef, useCallback, useEffect } from 'react';

// Real ultrasonic motion sonar using the Web Audio API (open standard, no
// proprietary libs). The speaker emits a near-ultrasonic carrier and the mic
// listens for the Doppler-shifted echo that moving bodies produce. Moving
// objects near the phone shift the reflected wave and change its echo
// amplitude — we detect that as real motion and estimate proximity from
// echo strength.
//
// HONEST LIMIT: ultrasound reflects off solid surfaces, so this senses
// movement in the SAME room as the phone. No phone sensor can see through
// solid walls — that would require fabricated data. This is the real,
// physics-honest "sonar for movement."

const CARRIER = 20000; // Hz — near-ultrasonic, mostly inaudible
const FFT = 2048;

export default function useSonarRanger({ enabled }) {
  const [status, setStatus] = useState('idle'); // idle | active | denied | unsupported
  const [motion, setMotion] = useState(false);
  const [intensity, setIntensity] = useState(0); // 0-1 Doppler sideband energy
  const [proximity, setProximity] = useState(0); // 0-1 echo strength (closer = higher)
  const [echo, setEcho] = useState(0);           // 0-1 raw ultrasonic band energy
  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const oscRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const baseRef = useRef(0);
  const motionEMA = useRef(0);
  const sampleCountRef = useRef(0);
  const lastUiRef = useRef(0);
  const startedAtRef = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    try { oscRef.current?.stop(); } catch {}
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (ctxRef.current) ctxRef.current.close().catch(() => {});
    ctxRef.current = null; streamRef.current = null; oscRef.current = null;
    analyserRef.current = null;
    setStatus('idle'); setMotion(false); setIntensity(0); setProximity(0); setEcho(0);
    baseRef.current = 0; motionEMA.current = 0;
  }, []);

  const start = useCallback(async () => {
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      setStatus('unsupported'); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;

      // Emit the near-ultrasonic carrier through the speaker.
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = CARRIER;
      const gain = ctx.createGain();
      gain.gain.value = 0.08;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      oscRef.current = osc;

      // Analyse the mic for the carrier + Doppler sidebands.
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT;
      src.connect(analyser);
      analyserRef.current = analyser;

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const binHz = ctx.sampleRate / FFT;
      const cBin = Math.round(CARRIER / binHz);
      const lo = Math.max(1, cBin - 30);
      const hi = Math.min(buf.length - 1, cBin + 30);

      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        analyser.getByteFrequencyData(buf);
        // Carrier band energy (the reflected echo).
        let carrier = 0, cn = 0;
        for (let i = cBin - 3; i <= cBin + 3; i++) { carrier += buf[i] || 0; cn++; }
        carrier /= cn;
        // Sideband energy = Doppler-shifted reflections from moving objects.
        let side = 0, sn = 0;
        for (let i = lo; i <= hi; i++) {
          if (i >= cBin - 4 && i <= cBin + 4) continue;
          side += buf[i] || 0; sn++;
        }
        side /= sn;
        const echoNow = carrier / 255;
        sampleCountRef.current += 1;
        // Rolling baseline of the echo so a change = movement in the field.
        baseRef.current = baseRef.current === 0 ? echoNow : baseRef.current * 0.97 + echoNow * 0.03;
        const delta = Math.abs(echoNow - baseRef.current);
        const motionRaw = Math.min(1, (side / 255) * 1.4 + delta * 6);
        motionEMA.current = motionEMA.current * 0.8 + motionRaw * 0.2;
        // The analyser runs at audio-rate; throttle React state updates while
        // retaining every FFT frame for the signal calculation. This prevents
        // a stale-looking UI caused by render pressure on Android.
        const nowMs = performance.now();
        if (nowMs - lastUiRef.current >= 80) {
          lastUiRef.current = nowMs;
          setEcho(+echoNow.toFixed(3));
          setIntensity(+motionEMA.current.toFixed(3));
          setProximity(+Math.min(1, echoNow * 1.2).toFixed(3));
          setMotion(motionEMA.current > 0.12);
        }
      };
      startedAtRef.current = performance.now();
      setStatus('active');
      tick();
    } catch (e) {
      setStatus(e.name === 'NotAllowedError' ? 'denied' : 'unsupported');
    }
  }, []);

  useEffect(() => {
    if (enabled) start();
    else stop();
  }, [enabled, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { status, motion, intensity, proximity, echo, start, stop };
}