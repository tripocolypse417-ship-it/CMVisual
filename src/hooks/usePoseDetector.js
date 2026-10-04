import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

// Real human pose estimation using MoveNet (MultiPose Lightning).
// Outputs one detection per person carrying the 17 COCO body keypoints so the
// AR overlay can draw a true skeleton that moves naturally with each person.
// Keypoints are EMA-smoothed per tracked person to reduce frame jitter.

let detectorPromise = null;
function loadDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        try { await tf.setBackend('webgl'); } catch {}
        await tf.ready();
        return await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING }
        );
      } catch (e) {
        // Reset the cache so a retry (camera restart) re-fetches the weights
        // instead of returning the same rejected promise forever.
        detectorPromise = null;
        throw e;
      }
    })();
  }
  return detectorPromise;
}

let idSeq = 1;

export default function usePoseDetector(videoRef, { enabled, onPoses }) {
  const [modelStatus, setModelStatus] = useState('idle'); // idle | loading | ready | error
  const tracksRef = useRef([]); // [{ id, kps, cx, cy, time }]
  const lastRunRef = useRef(0);
  const onPosesRef = useRef(onPoses);
  onPosesRef.current = onPoses;

  // Pre-warm the model on mount so weights download while the camera
  // permission prompt and stream negotiation happen — by the time the
  // camera is live the detector is already hot, eliminating the visible
  // "loading…" gap on first activation.
  useEffect(() => {
    let cancelled = false;
    setModelStatus(s => s === 'idle' ? 'loading' : s);
    loadDetector()
      .then(() => { if (!cancelled) setModelStatus('ready'); })
      .catch(() => { if (!cancelled) setModelStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let raf = null;
    let running = false;

    const run = async () => {
      setModelStatus(s => s === 'ready' ? s : 'loading');
      let detector;
      try {
        detector = await loadDetector();
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
        if (video && video.readyState >= 2 && video.videoWidth > 0 && !running && tNow - lastRunRef.current >= 33) {
          lastRunRef.current = tNow;
          running = true;
          try {
            const poses = await detector.estimatePoses(video, { flipHorizontal: false });
            if (cancelled) return;
            const vw = video.videoWidth || 1;
            const vh = video.videoHeight || 1;
            const now = performance.now();
            const newTracks = [];
            const used = new Set();

            const detections = poses.map((pose) => {
              const kps = pose.keypoints || [];
              let minX = 1, minY = 1, maxX = 0, maxY = 0, count = 0, scoreSum = 0;
              kps.forEach(k => {
                if (k.score >= 0.3) {
                  const nx = k.x / vw, ny = k.y / vh;
                  if (nx < minX) minX = nx;
                  if (ny < minY) minY = ny;
                  if (nx > maxX) maxX = nx;
                  if (ny > maxY) maxY = ny;
                  count++; scoreSum += k.score;
                }
              });
              if (count < 4) return null; // not enough confident joints

              const cx = (minX + maxX) / 2;
              const cy = (minY + maxY) / 2;

              // match to existing track by nearest center
              let best = null, bestDist = Infinity;
              tracksRef.current.forEach(t => {
                if (used.has(t.id)) return;
                const dx = t.cx - cx, dy = t.cy - cy;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < bestDist) { bestDist = d; best = t; }
              });
              let id, prevKps = null, prevTime = null, prevDist = null, prevVel = null, firstSeen = now;
              if (best && bestDist < 0.25) {
                id = best.id; used.add(best.id); prevKps = best.kps; prevTime = best.time; prevDist = best.dist; prevVel = best.vel; firstSeen = best.firstSeen || now;
              } else {
                id = idSeq++;
              }

              // One-Euro-style adaptive smoothing + a short velocity-predicted lead.
              // The filter cutoff frequency rises with joint speed, so slow limbs
              // are smoothed heavily (no jitter) while fast limbs are followed
              // almost 1:1 with no trailing lag. A small, speed-scaled lead
              // extrapolates each joint a fraction of a frame ahead so high-speed
              // limb arcs stay fluid and continuous with the target's real motion
              // instead of lagging behind it. Occluded joints hold their last
              // position so limbs stay connected. (Velocity is stored as the
              // per-frame delta to keep ghost dead-reckoning units unchanged.)
              const dt = prevTime ? Math.max(0.008, (now - prevTime) / 1000) : 1 / 30;
              const MIN_CUTOFF = 1.2; // Hz — smoothness at low speed
              const BETA = 0.7;       // speed→cutoff slope (responsiveness)
              const newVel = [];
              const smoothKps = kps.map((k, i) => {
                const nx = k.x / vw, ny = k.y / vh;
                const prev = prevKps && prevKps[i];
                const pv = prevVel && prevVel[i];
                const confident = k.score >= 0.3;
                const marginal = k.score >= 0.12;
                if (prev && confident) {
                  const dx = nx - prev.x, dy = ny - prev.y;
                  const speed = Math.sqrt(dx * dx + dy * dy);       // per-frame norm
                  const speedPerSec = speed / dt;
                  // One-Euro: cutoff grows with speed ⇒ alpha grows with speed.
                  const fc = MIN_CUTOFF + BETA * speedPerSec;
                  const tau = 1 / (2 * Math.PI * fc);
                  const alpha = 1 / (1 + tau / dt);
                  const sx = prev.x + dx * alpha;
                  const sy = prev.y + dy * alpha;
                  // Velocity-predicted lead: extrapolate by a speed-scaled fraction
                  // of one frame so fast limbs lead naturally without overshoot.
                  const leadF = Math.min(1.3, 0.25 + speed * 1.1);
                  const px = sx + (sx - prev.x) * leadF;
                  const py = sy + (sy - prev.y) * leadF;
                  newVel[i] = { vx: px - prev.x, vy: py - prev.y };
                  return { x: px, y: py, score: k.score, name: k.name, held: false };
                }
                if (prev && marginal) {
                  // Low-confidence but visible: lighter One-Euro keeps the limb
                  // tracking (not frozen) while tolerating noisy keypoints.
                  const dx = nx - prev.x, dy = ny - prev.y;
                  const speedPerSec = Math.sqrt(dx * dx + dy * dy) / dt;
                  const fc = MIN_CUTOFF * 0.6 + BETA * speedPerSec;
                  const tau = 1 / (2 * Math.PI * fc);
                  const alpha = 1 / (1 + tau / dt);
                  const sx = prev.x + dx * alpha;
                  const sy = prev.y + dy * alpha;
                  newVel[i] = { vx: sx - prev.x, vy: sy - prev.y };
                  return { x: sx, y: sy, score: k.score, name: k.name, held: false };
                }
                if (prev) {
                  // Truly missing joint: hold last position so limbs stay continuous.
                  newVel[i] = pv ? { vx: pv.vx * 0.5, vy: pv.vy * 0.5 } : { vx: 0, vy: 0 };
                  return { x: prev.x, y: prev.y, score: k.score, name: k.name, held: true };
                }
                newVel[i] = { vx: 0, vy: 0 };
                return { x: nx, y: ny, score: k.score, name: k.name, held: false };
              });

              // movement from hip-center displacement
              let moving = false, speed = 0;
              if (prevKps && prevTime) {
                const ph = (prevKps[11] && prevKps[12]) ? { x: (prevKps[11].x + prevKps[12].x) / 2, y: (prevKps[11].y + prevKps[12].y) / 2 } : null;
                const ch = (smoothKps[11] && smoothKps[12]) ? { x: (smoothKps[11].x + smoothKps[12].x) / 2, y: (smoothKps[11].y + smoothKps[12].y) / 2 } : null;
                if (ph && ch) {
                  const px = Math.sqrt((ch.x - ph.x) ** 2 + (ch.y - ph.y) ** 2);
                  const secs = Math.max(0.001, (now - prevTime) / 1000);
                  const normSpeed = px / secs;
                  if (normSpeed > 0.12) { moving = true; speed = parseFloat(Math.min(1.6, normSpeed * 1.4).toFixed(2)); }
                }
              }

              const bw = (maxX - minX) * vw;
              const bh = (maxY - minY) * vh;
              const heightFrac = bh / vh;
              const distance = Math.max(0.8, Math.min(9.5, 0.8 + (1 - heightFrac) * 9));
              const angle = Math.round(((0.5 - cx) * 90 + 360) % 360);
              const intensity = Math.max(30, Math.min(99, Math.round((scoreSum / count) * 100)));

              // ── Observable behavior flags only. These are not judgments of intent or character. ──
              const kp = (i) => (smoothKps[i] && smoothKps[i].score >= 0.3) ? smoothKps[i] : null;
              const lSh = kp(5), rSh = kp(6), lW = kp(9), rW = kp(10), lH = kp(11), rH = kp(12), lA = kp(15), rA = kp(16);
              let behaviorPostureFlag = false;
              if (lSh && rSh) {
                const shoulderY = (lSh.y + rSh.y) / 2;
                // both wrists raised above the shoulder line
                const bothRaised = lW && rW && lW.y < shoulderY - 0.04 && rW.y < shoulderY - 0.04;
                // wide stance: ankle span notably wider than hip span
                let wideStance = false, crouch = false;
                if (lH && rH && lA && rA) {
                  const hipW = Math.abs(rH.x - lH.x);
                  const ankleW = Math.abs(rA.x - lA.x);
                  if (hipW > 0.01) wideStance = ankleW > hipW * 1.5;
                  const hipY = (lH.y + rH.y) / 2;
                  const ankleY = (lA.y + rA.y) / 2;
                  const legLen = Math.abs(ankleY - hipY);
                  const torsoLen = Math.abs(shoulderY - hipY);
                  if (torsoLen > 0.02) crouch = legLen < torsoLen * 0.7;
                }
                behaviorPostureFlag = bothRaised || (wideStance && crouch && moving);
              }
              // rapid approach: distance closing quickly while moving fast
              let rapidApproach = false;
              if (prevDist != null && prevTime) {
                const secs = Math.max(0.001, (now - prevTime) / 1000);
                const closeRate = (prevDist - distance) / secs; // m/s of closing
                rapidApproach = closeRate > 0.45 && speed > 0.4;
              }
              // Observable activity flags only. These are intentionally not
              // converted into a person-level threat label.
              const activityFlag = behaviorPostureFlag || rapidApproach;
              const activityReason = rapidApproach ? 'RAPID APPROACH' : (behaviorPostureFlag ? 'POSTURE/MOTION FLAG' : null);

              newTracks.push({ id, kps: smoothKps, vel: newVel, cx, cy, time: now, dist: distance, firstSeen, angle, intensity, box: { x: minX * vw, y: minY * vh, w: bw, h: bh, vw, vh } });

              return {
                id,
                type: 'human',
                angle,
                distance: parseFloat(distance.toFixed(1)),
                intensity,
                moving,
                speed,
                // Legacy threat fields remain false/null so downstream UI cannot
                // mistake a posture or motion observation for dangerous intent.
                threat: false,
                threatReason: null,
                activityFlag,
                activityReason,
                rapidApproach,
                _box: { x: minX * vw, y: minY * vh, w: bw, h: bh, vw, vh },
                _keypoints: smoothKps,
              };
            }).filter(Boolean);

            // A lost camera track is no longer a detection. It must not be
            // extrapolated into a behind-wall person. Only a real non-visual
            // sensor source may create a non-visual detection.
            tracksRef.current = newTracks;
            onPosesRef.current(detections);
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