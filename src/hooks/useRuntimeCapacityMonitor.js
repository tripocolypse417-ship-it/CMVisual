import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Measures the runtime budget actually available to the live spatial pipeline.
 * Uses frame cadence, long-task pressure, JS heap when exposed, sensor latency,
 * and active observation load to estimate a conservative safe acquisition count
 * and adaptive throttling inputs for the rendering / acquisition layers.
 */
export default function useRuntimeCapacityMonitor({ activeTargets = 0, sensorLatencyMs = null, acquisitionHeadroom = 100, enabled = true } = {}) {
  const [frameMs, setFrameMs] = useState(null);
  const [longTaskMs, setLongTaskMs] = useState(0);
  const [heapUsedMb, setHeapUsedMb] = useState(null);
  const [samples, setSamples] = useState(0);
  const lastFrameRef = useRef(null);
  const longTaskRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    let raf = 0;
    let cancelled = false;
    const tick = (now) => {
      if (cancelled) return;
      if (lastFrameRef.current != null) {
        const delta = now - lastFrameRef.current;
        if (delta > 0 && delta < 250) setFrameMs(v => v == null ? delta : v * 0.8 + delta * 0.2);
      }
      lastFrameRef.current = now;
      setSamples(v => v + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof PerformanceObserver === 'undefined') return undefined;
    let observer;
    try {
      observer = new PerformanceObserver(list => {
        const recent = list.getEntries().reduce((sum, e) => sum + Math.max(0, Number(e.duration) || 0), 0);
        longTaskRef.current = Math.min(2000, longTaskRef.current * 0.7 + recent * 0.3);
        setLongTaskMs(longTaskRef.current);
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {}
    return () => observer?.disconnect?.();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const read = () => {
      const memory = performance?.memory;
      if (memory?.usedJSHeapSize) setHeapUsedMb(memory.usedJSHeapSize / 1024 / 1024);
    };
    read();
    const id = setInterval(read, 2000);
    return () => clearInterval(id);
  }, [enabled]);

  const metrics = useMemo(() => {
    const framePressure = frameMs == null ? 0 : Math.max(0, Math.min(100, ((frameMs - 16.7) / 25) * 100));
    const taskPressure = Math.max(0, Math.min(100, (longTaskMs / 100) * 100));
    const latencyPressure = sensorLatencyMs == null ? 0 : Math.max(0, Math.min(100, (Number(sensorLatencyMs) / 250) * 100));
    const sensorPressure = Math.max(0, 100 - Number(acquisitionHeadroom || 0));
    const pressure = Math.max(framePressure, taskPressure, latencyPressure, sensorPressure);
    const headroom = Math.max(0, Math.min(100, 100 - pressure));
    const baseCapacity = Math.max(1, Math.floor(2 + headroom / 8));
    const safeCapacity = Math.max(activeTargets || 0, baseCapacity);

    // Adaptive throttling inputs consumed by the rendering / acquisition layers.
    const recommendedMaxFps = pressure > 75 ? 24 : pressure > 50 ? 30 : pressure > 25 ? 45 : 60;
    const recommendedMaxTargets = Math.max(1, Math.floor(safeCapacity * 0.85));
    const shouldThrottle = pressure > 50;
    const throttleAdvice = pressure > 75
      ? 'SEVERE — reduce target capacity, disable decorative shaders'
      : pressure > 50
        ? 'MODERATE — lower particle density, cap acquisition'
        : pressure > 25
          ? 'LIGHT — monitor frame cadence'
          : 'NOMINAL';

    return {
      frameMs,
      fps: frameMs && frameMs > 0 ? 1000 / frameMs : null,
      longTaskMs,
      heapUsedMb,
      pressurePct: Math.round(pressure),
      headroomPct: Math.round(headroom),
      activeTargets: Number(activeTargets) || 0,
      safeCapacity,
      recommendedMaxFps,
      recommendedMaxTargets,
      shouldThrottle,
      throttleAdvice,
      samples,
      method: 'runtime-budget-v2',
    };
  }, [frameMs, longTaskMs, heapUsedMb, sensorLatencyMs, acquisitionHeadroom, activeTargets, samples]);

  return metrics;
}