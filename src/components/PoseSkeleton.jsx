import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const GREEN = '#00ff88';
const RED = '#ff2222';
// Render marginal joints (score >= 0.12) so they fade out smoothly instead of
// popping off when confidence dips — eliminates limb flicker during tracking.
const RENDER_THRESHOLD = 0.12;
// Per-frame lerp toward the latest keypoints. Detections arrive ~30fps but the
// overlay renders every animation frame, so easing the displayed joint
// positions toward each new target makes limbs flow smoothly and mirror the
// person's real movement in real time instead of stepping at the model rate.
const LERP = 0.5;

// MoveNet 17-keypoint skeleton connections (COCO topology)
// 0 nose 1 lEye 2 rEye 3 lEar 4 rEar 5 lShoulder 6 rShoulder
// 7 lElbow 8 rElbow 9 lWrist 10 rWrist 11 lHip 12 rHip
// 13 lKnee 14 rKnee 15 lAnkle 16 rAnkle
const SKELETON = [
  [5, 7], [7, 9],      // left arm
  [6, 8], [8, 10],     // right arm
  [5, 6],              // shoulders
  [5, 11], [6, 12],    // torso sides
  [11, 12],            // hips
  [11, 13], [13, 15],  // left leg
  [12, 14], [14, 16],  // right leg
  [0, 5], [0, 6],      // neck / head
];

export default function PoseSkeleton({ detection, screenW, screenH, onClick, isSelected, sonar }) {
  const kps = detection._keypoints || [];
  const box = detection._box || { x: 0, y: 0, w: 0, h: 0, vw: 1, vh: 1 };
  const boxX = (box.x / box.vw) * screenW;
  const boxY = (box.y / box.vh) * screenH;
  const boxW = (box.w / box.vw) * screenW;
  const boxH = (box.h / box.vh) * screenH;

  // Visual color communicates tracking state, not a judgment about the person.
  const color = detection.ghost ? '#66aaff' : GREEN;
  // Scale limb/joint size with the detected bounding box so a close, large
  // person renders with bold limbs and a distant one stays proportionate.
  const strokeW = Math.max(3, Math.min(10, Math.min(boxW, boxH) * 0.045));
  const jointBase = Math.max(2, Math.min(6, Math.min(boxW, boxH) * 0.014));
  const headR = Math.max(7, Math.min(boxW, boxH) * 0.12);
  const visibleJoints = kps.filter(k => k && (k.held || k.score >= RENDER_THRESHOLD)).length;
  const measuredJoints = kps.filter(k => k && !k.held && k.score >= RENDER_THRESHOLD);
  const poseConfidence = measuredJoints.length ? Math.round((measuredJoints.reduce((s, k) => s + k.score, 0) / measuredJoints.length) * 100) : 0;
  const motionLabel = detection.ghost ? 'LAST-SEEN / ESTIMATED' : detection.moving ? 'MOVING' : 'STATIONARY';

  // Target joint positions in screen pixels (from the latest detection).
  const target = kps.map((k) =>
    !k || (k.score < RENDER_THRESHOLD && !k.held)
      ? null
      : { x: k.x * screenW, y: k.y * screenH, conf: k.held ? 0.4 : Math.min(1, k.score) }
  );

  // Latest keypoints ref — the RAF loop reads this so it always eases toward
  // the most recent detection instead of a stale first-frame capture.
  const targetRef = useRef(target);
  targetRef.current = target;

  // Displayed (eased) joint positions + confidence — lerped toward `target`
  // each animation frame and written straight to the DOM via refs, bypassing
  // React reconciliation so the skeleton tracks at 60fps with no flicker.
  const dispRef = useRef(null);
  if (!dispRef.current && target.length) {
    dispRef.current = target.map((p) => (p ? { x: p.x, y: p.y, conf: p.conf } : null));
  }

  // Per-frame DOM refs (owned by the RAF loop — React never rewrites these).
  const outlineRefs = useRef([]);   // 14 dark-outline lines
  const colorRefs = useRef([]);      // 14 color lines
  const jointRefs = useRef([]);      // 17 joint <g> groups
  const headRef = useRef(null);      // head <g>
  const torsoRef = useRef(null);     // torso polygon

  useEffect(() => {
    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const disp = dispRef.current;
      if (!disp) return;
      const tgt = targetRef.current;
      const pt = (i) => (disp[i] ? disp[i] : null);

      // Ease displayed positions + confidence toward the latest target.
      for (let i = 0; i < tgt.length; i++) {
        const t = tgt[i];
        if (!t) continue;
        if (!disp[i]) { disp[i] = { x: t.x, y: t.y, conf: t.conf }; continue; }
        const dx = t.x - disp[i].x, dy = t.y - disp[i].y;
        if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
          // Velocity-adaptive easing: fast motion tracks tighter (less lag),
          // slow motion eases more (fluid, jitter-free).
          const lerp = Math.min(0.85, LERP + Math.hypot(dx, dy) * 0.0009);
          disp[i].x += dx * lerp;
          disp[i].y += dy * lerp;
        } else {
          disp[i].x = t.x; disp[i].y = t.y;
        }
        // Fade confidence smoothly so joints/limbs dim instead of vanishing.
        disp[i].conf += (t.conf - disp[i].conf) * 0.2;
      }

      // Update skeleton segments (both passes) directly in the DOM.
      for (let s = 0; s < SKELETON.length; s++) {
        const [a, b] = SKELETON[s];
        const pa = pt(a), pb = pt(b);
        const oLine = outlineRefs.current[s];
        const cLine = colorRefs.current[s];
        if (pa && pb) {
          const op = Math.min(pa.conf, pb.conf);
          if (oLine) { oLine.setAttribute('x1', pa.x); oLine.setAttribute('y1', pa.y); oLine.setAttribute('x2', pb.x); oLine.setAttribute('y2', pb.y); oLine.style.opacity = op; }
          if (cLine) { cLine.setAttribute('x1', pa.x); cLine.setAttribute('y1', pa.y); cLine.setAttribute('x2', pb.x); cLine.setAttribute('y2', pb.y); cLine.style.opacity = op; }
        } else {
          if (oLine) oLine.style.opacity = 0;
          if (cLine) cLine.style.opacity = 0;
        }
      }

      // Update joint dots via group transform + opacity.
      for (let i = 0; i < 17; i++) {
        const g = jointRefs.current[i];
        const p = pt(i);
        if (!g) continue;
        if (p) { g.setAttribute('transform', `translate(${p.x} ${p.y})`); g.style.opacity = p.conf; }
        else g.style.opacity = 0;
      }

      // Head (nose, or midpoint of eyes).
      const nose = pt(0), lEye = pt(1), rEye = pt(2);
      const head = nose || (lEye && rEye ? { x: (lEye.x + rEye.x) / 2, y: (lEye.y + rEye.y) / 2 } : null);
      if (headRef.current) {
        if (head) { headRef.current.setAttribute('transform', `translate(${head.x} ${head.y})`); headRef.current.style.opacity = 1; }
        else headRef.current.style.opacity = 0;
      }

      // Torso volume.
      if (torsoRef.current) {
        const ls = pt(5), rs = pt(6), lh = pt(11), rh = pt(12);
        if (ls && rs && lh && rh) {
          torsoRef.current.setAttribute('points', `${ls.x},${ls.y} ${rs.x},${rs.y} ${rh.x},${rh.y} ${lh.x},${lh.y}`);
          torsoRef.current.style.opacity = 0.14;
        } else {
          torsoRef.current.style.opacity = 0;
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <motion.div
      className="absolute inset-0"
      style={{ pointerEvents: 'none' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <svg width={screenW} height={screenH} className="absolute inset-0"
        opacity={detection.ghost ? (sonar?.motion ? 0.78 : 0.4) : 1}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
        {/* bounding box */}
        <rect x={boxX} y={boxY} width={boxW} height={boxH}
          fill={`${color}08`} stroke={color} strokeOpacity={isSelected ? 0.9 : 0.4}
          strokeWidth={isSelected ? 2 : 1} strokeDasharray="6 4" rx="4" />

        {/* torso volume — reads as a moving body, not just sticks */}
        <polygon ref={torsoRef} fill={color} fillOpacity="0.14" stroke="none" />

        {/* dark outline pass for contrast against the camera feed */}
        <g stroke="#000" strokeOpacity="0.85" strokeWidth={strokeW * 1.8} strokeLinecap="round" fill="none">
          {SKELETON.map((_, i) => (
            <line key={`o-${i}`} ref={el => (outlineRefs.current[i] = el)} />
          ))}
        </g>
        {/* color pass */}
        <g stroke={color} strokeWidth={strokeW} strokeLinecap="round" fill="none">
          {SKELETON.map((_, i) => (
            <line key={`c-${i}`} ref={el => (colorRefs.current[i] = el)} />
          ))}
        </g>

        {/* head */}
        <g ref={headRef}>
          <circle r={headR} fill="none" stroke="#000" strokeOpacity="0.85" strokeWidth="7" />
          <circle r={headR} fill={`${color}22`} stroke={color} strokeWidth="3.5" />
        </g>

        {/* joint dots — positioned + faded per frame via RAF */}
        {Array.from({ length: 17 }).map((_, i) => (
          <g key={`j-${i}`} ref={el => (jointRefs.current[i] = el)}>
            <circle r={jointBase + 3} fill={color} opacity={0.2} />
            <circle r={jointBase + 1.2} fill="#000" fillOpacity={0.65} />
            <circle r={jointBase} fill={color} />
          </g>
        ))}
      </svg>

      {/* ID tag */}
      <div className="absolute -translate-x-1/2 px-1.5 py-0.5 rounded-sm whitespace-nowrap"
        style={{ left: boxX + boxW / 2, top: Math.max(0, boxY - 16), background: color, color: detection.threat ? '#fff' : '#001a0d', boxShadow: '0 1px 4px rgba(0,0,0,0.65)' }}>
        <span className="font-mono text-[8px] font-bold tracking-wider">{detection.ghost ? 'GHOST · ' : 'PERSON · '}{Math.round(detection.intensity)}%</span>
      </div>

      {/* Detailed live person telemetry — measurements and model state only. */}
      <div
        className="absolute rounded-lg px-2.5 py-2 min-w-[150px] max-w-[210px]"
        style={{
          left: Math.min(screenW - 210, Math.max(6, boxX + boxW + 8)),
          top: Math.min(screenH - 118, Math.max(8, boxY)),
          background: 'rgba(0,0,0,0.82)',
          border: `1px solid ${color}45`,
          boxShadow: `0 0 18px ${color}15`,
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="font-display text-[9px] tracking-widest" style={{ color }}>
            {detection.ghost ? 'TRACK CONTINUITY' : 'PERSON TRACK'}
          </span>
          <span className="font-mono text-[8px] text-white/50">{detection.id}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[8px]">
          <span className="text-white/45">VISIBILITY</span><span className="text-right" style={{color}}>{detection.ghost ? 'LOST' : 'DIRECT'}</span>
          <span className="text-white/45">POSE POINTS</span><span className="text-right text-white/80">{visibleJoints}/17</span>
          <span className="text-white/45">POSE CONF.</span><span className="text-right text-white/80">{poseConfidence}%</span>
          <span className="text-white/45">MOTION</span><span className="text-right text-white/80">{motionLabel}</span>
          <span className="text-white/45">DISTANCE</span><span className="text-right text-white/80">{Number.isFinite(detection.distance) ? `${detection.distance.toFixed(1)} m` : 'N/A'}</span>
          <span className="text-white/45">BEARING</span><span className="text-right text-white/80">{Number.isFinite(detection.angle) ? `${Math.round(detection.angle)}°` : 'N/A'}</span>
        </div>
        <div className="mt-1.5 pt-1 border-t border-white/10 font-mono text-[7px] tracking-wide text-white/40">
          {detection.ghost ? 'No current visual measurement' : 'Direct camera + pose measurement'}
        </div>
      </div>

      {/* External-sensor measurement readout when a validated non-visual observation is supplied. */}
      {detection.ghost && sonar?.motion && (
        <div className="absolute -translate-x-1/2 px-1.5 py-0.5 rounded-sm whitespace-nowrap"
          style={{ left: boxX + boxW / 2, top: Math.max(0, boxY + boxH + 4), background: 'rgba(0,0,0,0.85)', border: '1px solid #ff663355' }}>
          <span className="font-mono text-[7px] tracking-wider" style={{ color: '#ff6633', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
            ◎ SONAR {((1 - (sonar.proximity || 0)) * 6).toFixed(1)}m
          </span>
        </div>
      )}

      {/* Behavioral observations are shown as evidence elsewhere; this overlay does not classify a person as dangerous. */}
      {/* moving pulse ring (CSS) */}
      {detection.moving && (
        <div className="absolute rounded-md ar-box-pulse"
          style={{ left: boxX, top: boxY, width: boxW, height: boxH, border: `1px solid ${color}` }} />
      )}
      {/* sonar-enhanced ghost pulse — radar refresh when sonar detects motion */}
      {detection.ghost && sonar?.motion && (
        <div className="absolute rounded-md ar-ring"
          style={{ left: boxX, top: boxY, width: boxW, height: boxH, border: '1.5px solid #ff6633', boxShadow: '0 0 14px #ff663380', animationDuration: '1s' }} />
      )}

      {/* selection brackets */}
      {isSelected && (
        <>
          <div className="absolute" style={{ left: boxX, top: boxY, width: 10, height: 10, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
          <div className="absolute" style={{ left: boxX + boxW - 10, top: boxY, width: 10, height: 10, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
          <div className="absolute" style={{ left: boxX, top: boxY + boxH - 10, width: 10, height: 10, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
          <div className="absolute" style={{ left: boxX + boxW - 10, top: boxY + boxH - 10, width: 10, height: 10, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
        </>
      )}

      {/* click target */}
      <div className="absolute cursor-pointer"
        style={{ left: boxX, top: boxY, width: boxW, height: boxH, pointerEvents: 'auto' }}
        onClick={onClick} />
    </motion.div>
  );
}