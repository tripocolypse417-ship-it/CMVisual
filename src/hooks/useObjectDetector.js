import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// Real camera-based object detection using COCO-SSD.
// Loads the model once, then runs detection on the <video> element and maps
// detected people/animals/objects into the app's detection shape with simple
// frame-to-frame tracking so moving targets keep a stable id.

const ANIMAL_CLASSES = new Set([
  'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe',
]);

let modelPromise = null;
function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        try { await tf.setBackend('webgl'); } catch {}
        await tf.ready();
        return await cocoSsd.load({ base: 'mobilenet_v2' });
      } catch (e) {
        // Reset the cache so a retry re-fetches instead of returning a rejected promise.
        modelPromise = null;
        throw e;
      }
    })();
  }
  return modelPromise;
}

function mapClass(cls) {
  if (cls === 'person') return 'human';
  if (ANIMAL_CLASSES.has(cls)) return 'animal';
  return 'object';
}

let idSeq = 1;

export default function useObjectDetector(videoRef, { enabled, onDetections }) {
  const [modelStatus, setModelStatus] = useState('idle'); // idle | loading | ready | error
  const tracksRef = useRef([]); // [{ id, cx, cy, lastSeen }]
  const lastDetectRef = useRef(0);
  const onDetRef = useRef(onDetections);
  onDetRef.current = onDetections;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let raf = null;
    let running = false;

    const run = async () => {
      setModelStatus('loading');
      try {
        const model = await loadModel();
        if (cancelled) return;
        setModelStatus('ready');
      } catch (e) {
        setModelStatus('error');
        return;
      }

      const loop = async () => {
        if (cancelled) return;
        const video = videoRef.current;
        const tNow = performance.now();
        if (video && video.readyState >= 2 && video.videoWidth > 0 && !running && tNow - lastDetectRef.current >= 150) {
          lastDetectRef.current = tNow;
          running = true;
          try {
            const preds = await model.detect(video, 20, 0.25);
            if (cancelled) return;
            const vw = video.videoWidth || 1;
            const vh = video.videoHeight || 1;
            const now = performance.now();

            // Match predictions to existing tracks by nearest center
            const newTracks = [];
            const used = new Set();
            const detections = preds.map((p) => {
              const [x, y, w, h] = p.bbox;
              const cx = x + w / 2;
              const cy = y + h / 2;
              // find nearest unused track
              let best = null;
              let bestDist = Infinity;
              tracksRef.current.forEach((t) => {
                if (used.has(t.id)) return;
                const dx = t.cx - cx, dy = t.cy - cy;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < bestDist) { bestDist = d; best = t; }
              });
              let id;
              let prevCenter = null;
              let prevTime = null;
              if (best && bestDist < Math.max(vw, vh) * 0.25) {
                id = best.id;
                used.add(best.id);
                prevCenter = { x: best.cx, y: best.cy };
                prevTime = best.time;
              } else {
                id = idSeq++;
              }
              const type = mapClass(p.class);

              // distance estimate from box height fraction
              const heightFrac = h / vh;
              const distance = Math.max(0.8, Math.min(9.5, 0.8 + (1 - heightFrac) * 9));
              // angle: center=0°, left=90°, right=270°
              const xNorm = cx / vw;
              const angle = Math.round(((0.5 - xNorm) * 90 + 360) % 360);
              const intensity = Math.max(30, Math.min(99, Math.round(p.score * 100)));

              // movement
              let moving = false;
              let speed = 0;
              if (prevCenter && prevTime) {
                const dx = cx - prevCenter.x, dy = cy - prevCenter.y;
                const px = Math.sqrt(dx * dx + dy * dy);
                const secs = Math.max(0.001, (now - prevTime) / 1000);
                const pxPerSec = px / secs;
                const normSpeed = pxPerSec / (Math.max(vw, vh) * 0.15);
                if (normSpeed > 0.15) {
                  moving = true;
                  speed = parseFloat(Math.min(1.6, normSpeed * 1.4).toFixed(2));
                }
              }

              newTracks.push({ id, cx, cy, time: now });

              return {
                id,
                type,
                angle,
                distance: parseFloat(distance.toFixed(1)),
                intensity,
                moving,
                speed,
                _box: { x, y, w, h, vw, vh }, // for AR overlay positioning
              };
            });

            // drop unused tracks
            tracksRef.current = newTracks;
            onDetRef.current(detections);
          } catch (e) {
            // ignore frame errors
          }
          running = false;
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };

    run();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      tracksRef.current = [];
    };
  }, [enabled, videoRef]);

  return { modelStatus };
}