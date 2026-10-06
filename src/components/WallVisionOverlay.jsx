import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Non-visual sensor view: renders only targets supplied by a real external sensor by their compass bearing
// relative to where the phone is actually pointing, so each figure appears at
// the spot you'd see it if the wall were glass. Distance drives perspective
// (closer = bigger / lower in frame). Motion is what makes a figure resolve
// sharply — stationary targets stay ghostly, moving ones punch through.

const FOV_HALF = 38;            // degrees of horizontal camera FOV rendered per side
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const TYPE_CONFIG = {
  human:   { color: '#00ff88', label: 'PERSON' },
  animal:  { color: '#00ccff', label: 'ANIMAL' },
  object:  { color: '#ffaa00', label: 'OBJECT' },
  unknown: { color: '#ff4466', label: 'UNKNOWN' },
};

const norm = (a) => ((a % 360) + 360) % 360;
const relBearing = (angle, heading) => {
  let r = norm(angle - heading);
  if (r > 180) r -= 360;
  return r;
};
const compass = (a) => COMPASS[Math.round(norm(a) / 45) % 8];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Detailed human visualization for real external-sensor observations ──
const HumanXray = memo(function HumanXray({ id, c, moving }) {
  const gid = `xray-${id}`;
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 220" preserveAspectRatio="meet"
      style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,1)) drop-shadow(0 0 ${moving ? 9 : 5}px ${c})` }}>
      <defs>
        <radialGradient id={gid} cx="50%" cy="45%" r="58%">
          <stop offset="0%" stopColor={c} stopOpacity={moving ? 0.5 : 0.36} />
          <stop offset="60%" stopColor={c} stopOpacity={moving ? 0.24 : 0.18} />
          <stop offset="100%" stopColor={c} stopOpacity="0.06" />
        </radialGradient>
      </defs>
      <g fill={`url(#${gid})`}>
        <circle cx="50" cy="24" r="13" />
        <path d="M30,46 L70,46 L64,100 L36,100 Z" />
        <path d="M28,47 L36,49 L33,116 L25,114 Z" />
        <path d="M72,47 L64,49 L67,116 L75,114 Z" />
        <path d="M38,100 L49,100 L46,210 L40,210 Z" />
        <path d="M51,100 L62,100 L60,210 L54,210 Z" />
      </g>
      <g stroke="#000" strokeOpacity="0.92" strokeWidth="8" fill="none" strokeLinejoin="round" strokeLinecap="round">
        <circle cx="50" cy="24" r="13" />
        <path d="M30,46 L70,46 L64,100 L36,100 Z" />
        <path d="M28,47 L36,49 L33,116 L25,114 Z" />
        <path d="M72,47 L64,49 L67,116 L75,114 Z" />
        <path d="M38,100 L49,100 L46,210 L40,210 Z" />
        <path d="M51,100 L62,100 L60,210 L54,210 Z" />
      </g>
      <g stroke={c} strokeWidth="3.4" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={moving ? 1 : 0.88}>
        <circle cx="50" cy="24" r="13" />
        <path d="M30,46 L70,46 L64,100 L36,100 Z" />
        <path d="M28,47 L36,49 L33,116 L25,114 Z" />
        <path d="M72,47 L64,49 L67,116 L75,114 Z" />
        <path d="M38,100 L49,100 L46,210 L40,210 Z" />
        <path d="M51,100 L62,100 L60,210 L54,210 Z" />
      </g>
      <g stroke={c} strokeWidth="2.2" fill="none" strokeDasharray="5 3" strokeLinejoin="round" strokeLinecap="round" opacity={moving ? 0.95 : 0.65}>
        <circle cx="50" cy="24" r="13" />
        <path d="M30,46 L70,46 L64,100 L36,100 Z" />
        <path d="M28,47 L36,49 L33,116 L25,114 Z" />
        <path d="M72,47 L64,49 L67,116 L75,114 Z" />
        <path d="M38,100 L49,100 L46,210 L40,210 Z" />
        <path d="M51,100 L62,100 L60,210 L54,210 Z" />
      </g>
      <g stroke={c} strokeWidth="1.4" fill="none" opacity={moving ? 0.95 : 0.5}>
        <line x1="50" y1="40" x2="50" y2="104" />
        <line x1="34" y1="50" x2="66" y2="50" />
        <path d="M40,58 Q50,64 60,58" /><path d="M39,66 Q50,72 61,66" /><path d="M39,74 Q50,80 61,74" />
        <path d="M40,98 Q50,106 60,98" />
        <line x1="32" y1="48" x2="29" y2="115" /><line x1="68" y1="48" x2="71" y2="115" />
        <line x1="43" y1="102" x2="43" y2="208" /><line x1="57" y1="102" x2="57" y2="208" />
      </g>
      {[[30, 46], [70, 46], [29, 80], [71, 80], [29, 115], [71, 115], [40, 100], [60, 100], [43, 150], [57, 150], [43, 208], [57, 208]].map(([jx, jy], i) => (
        <g key={i}>
          <circle cx={jx} cy={jy} r="4" fill={c} opacity="0.25" />
          <circle cx={jx} cy={jy} r="2.4" fill={c} stroke="#000" strokeOpacity="0.7" strokeWidth="1" />
        </g>
      ))}
      <circle cx="50" cy="24" r="13" fill={c} opacity={moving ? 0.3 : 0.18} />
      <circle cx="50" cy="24" r="6" fill="none" stroke={c} strokeWidth="1" opacity="0.6" />
    </svg>
  );
});

const AnimalXray = memo(function AnimalXray({ id, c, moving }) {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 80" preserveAspectRatio="meet"
      style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,1)) drop-shadow(0 0 ${moving ? 8 : 4}px ${c})` }}>
      <g fill={c} fillOpacity={moving ? 0.2 : 0.12}>
        <ellipse cx="56" cy="40" rx="38" ry="20" />
        <circle cx="98" cy="34" r="12" />
        <path d="M26,54 L34,54 L36,78 L28,78 Z" /><path d="M44,58 L52,58 L54,78 L46,78 Z" />
        <path d="M64,58 L72,58 L74,78 L66,78 Z" /><path d="M82,54 L90,54 L92,78 L84,78 Z" />
        <path d="M20,40 Q12,32 16,24" />
      </g>
      <g stroke="#000" strokeOpacity="0.9" strokeWidth="5" fill="none" strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="56" cy="40" rx="38" ry="20" /><circle cx="98" cy="34" r="12" />
        <path d="M26,54 L34,54 L36,78 L28,78 Z" /><path d="M44,58 L52,58 L54,78 L46,78 Z" />
        <path d="M64,58 L72,58 L74,78 L66,78 Z" /><path d="M82,54 L90,54 L92,78 L84,78 Z" />
        <path d="M20,40 Q12,32 16,24" />
      </g>
      <g stroke={c} strokeWidth="2" fill="none" strokeDasharray="5 3" strokeLinejoin="round" strokeLinecap="round" opacity={moving ? 0.9 : 0.5}>
        <ellipse cx="56" cy="40" rx="38" ry="20" /><circle cx="98" cy="34" r="12" />
        <line x1="22" y1="40" x2="96" y2="34" />
      </g>
      <circle cx="100" cy="32" r="1.8" fill={c} />
    </svg>
  );
});

const ObjectXray = memo(function ObjectXray({ c, moving }) {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="meet"
      style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,1)) drop-shadow(0 0 ${moving ? 8 : 4}px ${c})` }}>
      <g fill={c} fillOpacity={moving ? 0.16 : 0.10}>
        <rect x="18" y="18" width="64" height="64" rx="4" />
        <rect x="30" y="30" width="40" height="40" rx="2" />
      </g>
      <g stroke="#000" strokeOpacity="0.9" strokeWidth="5" fill="none">
        <rect x="18" y="18" width="64" height="64" rx="4" />
        <rect x="30" y="30" width="40" height="40" rx="2" />
      </g>
      <g stroke={c} strokeWidth="2" fill="none" strokeDasharray="5 3" opacity={moving ? 0.9 : 0.5}>
        <rect x="18" y="18" width="64" height="64" rx="4" />
        <rect x="30" y="30" width="40" height="40" rx="2" />
        <line x1="18" y1="18" x2="82" y2="82" /><line x1="82" y1="18" x2="18" y2="82" />
        <line x1="50" y1="18" x2="50" y2="82" /><line x1="18" y1="50" x2="82" y2="50" />
      </g>
    </svg>
  );
});

const UnknownXray = memo(function UnknownXray({ c, moving }) {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="meet"
      style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,1)) drop-shadow(0 0 ${moving ? 8 : 4}px ${c})` }}>
      <g fill={c} fillOpacity={moving ? 0.16 : 0.10}>
        <rect x="30" y="30" width="40" height="40" transform="rotate(45 50 50)" />
      </g>
      <g stroke="#000" strokeOpacity="0.9" strokeWidth="5" fill="none">
        <rect x="30" y="30" width="40" height="40" transform="rotate(45 50 50)" />
      </g>
      <g stroke={c} strokeWidth="2" fill="none" strokeDasharray="5 3" opacity={moving ? 0.9 : 0.5}>
        <rect x="30" y="30" width="40" height="40" transform="rotate(45 50 50)" />
        <line x1="50" y1="22" x2="50" y2="78" /><line x1="22" y1="50" x2="78" y2="50" />
      </g>
    </svg>
  );
});

function Figure({ d, heading, W, H, seeThrough, sonar, onSelect, isSelected }) {
  const cfg = TYPE_CONFIG[d.type] || TYPE_CONFIG.unknown;
  const c = cfg.color;
  const rel = relBearing(d.angle, heading ?? 0);
  if (Math.abs(rel) > FOV_HALF + 3) return null;

  const edgeFade = clamp((FOV_HALF - Math.abs(rel)) / 8, 0, 1);
  const dist = Math.max(0.8, d.distance);
  const heightPx = clamp((H * 0.58) * (3.0 / dist), H * 0.10, H * 0.64);
  const widthRatio = d.type === 'human' ? 0.42 : d.type === 'animal' ? 0.62 : 0.5;
  const widthPx = heightPx * widthRatio;
  const feetY = clamp(H * (0.88 - dist * 0.03), H * 0.52, H * 0.92);
  const topY = feetY - heightPx;
  const cx = W / 2 + (rel / FOV_HALF) * (W * 0.46);
  const left = cx - widthPx / 2;

  const moving = !!d.moving;
  // Clarity: stationary figures render sharper now (was 0.6) so people behind
  // walls read clearly even at rest; moving figures stay near-full opacity.
  const baseOp = (moving ? 0.96 : 0.78) * seeThrough * edgeFade;
  const op = clamp(baseOp + (sonar?.motion ? 0.12 : 0), 0, 1);
  // Depth sharpness — closer figures get a stronger glow & crisper edge so
  // near targets resolve to a clearer image than distant ones.
  const depthSharp = clamp(1 - (dist - 1) / 8, 0.35, 1);
  const glowPx = (moving ? 11 : 7) * depthSharp;

  return (
    <motion.div
      key={d.id}
      className="absolute"
      role="button"
      tabIndex={0}
      aria-label={`${cfg.label} observation ${d.id || ''}`}
      onClick={() => onSelect?.(d)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(d); } }}
      style={{ left: 0, top: 0, width: widthPx, height: heightPx, transform: `translate3d(${left}px, ${topY}px, 0)`, willChange: 'transform', opacity: op, transition: 'transform 0.2s linear, opacity 0.3s ease', filter: `drop-shadow(0 0 ${glowPx}px ${c})`, pointerEvents: 'auto', cursor: 'pointer' }}
      initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: op, scale: 1 }} exit={{ opacity: 0 }}
      transition={{ scale: { duration: 0.25, ease: 'easeOut' } }}
    >
      {/* Acquisition ping — fires once on first render for an instant "found" feel */}
      <div className="absolute inset-0 rounded-md pointer-events-none ar-box-pulse" style={{ border: `${isSelected ? 3 : 2}px solid ${c}`, boxShadow: isSelected ? `0 0 18px ${c}` : undefined }} />
      {/* dark backdrop so the X-ray pops against any camera feed */}
      <div className="absolute inset-0 rounded-md" style={{ background: 'rgba(0,0,0,0.5)', boxShadow: 'inset 0 0 24px rgba(0,0,0,0.7)' }} />

      {d.type === 'human' ? <HumanXray id={d.id} c={c} moving={moving} />
        : d.type === 'animal' ? <AnimalXray id={d.id} c={c} moving={moving} />
        : d.type === 'object' ? <ObjectXray c={c} moving={moving} />
        : <UnknownXray c={c} moving={moving} />}

      {/* per-figure X-ray scan sweep — brighter & faster for moving targets */}
      <motion.div className="absolute left-0 right-0 pointer-events-none"
        style={{ height: 2, background: `linear-gradient(90deg, transparent, ${c}, #ffffff, ${c}, transparent)`, boxShadow: `0 0 ${moving ? 12 : 7}px ${c}` }}
        animate={{ top: ['8%', '92%', '8%'] }}
        transition={{ duration: moving ? 1.5 : 2.6, repeat: Infinity, ease: 'easeInOut' }} />

      {/* measurement shimmer — indicates an external-sensor observation, not optical visibility */}
      <div className="absolute inset-0 rounded-md ar-shimmer" style={{ border: `1px solid ${c}40` }} />

      {/* moving pulse */}
      {moving && (
        <div className="absolute inset-0 rounded-md ar-ring" style={{ border: `1.5px solid ${c}`, animationDuration: '1.4s' }} />
      )}

      {/* bearing + distance tag */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-sm whitespace-nowrap"
        style={{ background: 'rgba(0,0,0,0.82)', border: `1px solid ${c}55` }}>
        <span className="font-mono text-[7px] tracking-wider" style={{ color: c, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
          {cfg.label} · {compass(d.angle)} · {dist.toFixed(1)}m
        </span>
      </div>

      {/* motion tag */}
      {moving && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-sm whitespace-nowrap"
          style={{ background: 'rgba(0,0,0,0.82)', border: `1px solid ${c}60` }}>
          <span className="font-mono text-[7px] tracking-wider" style={{ color: c, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
            ◉ MOVING · {(d.speed ?? 0).toFixed(2)} m/s
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default function WallVisionOverlay({ detections, heading, W, H, wallOpacity, color, isScanning, sonar, onSelectDetection, selectedDetection }) {
  const safeDetections = Array.isArray(detections) ? detections : [];
  const seeThrough = (100 - (wallOpacity ?? 65)) / 100;
  if (seeThrough <= 0.02 || W === 0) return null;

  const h = heading ?? 0;
  const movingCount = safeDetections.filter(d => d.moving).length;
  const inView = safeDetections.filter(d => Math.abs(relBearing(d.angle, h)) <= FOV_HALF + 3);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ opacity: Math.min(1, seeThrough + (movingCount ? 0.15 : 0)) }}>
      {/* Wall plane — vertical studs + concrete grain in front of the figures,
          so it reads as looking *through* a real wall surface. */}
      <div className="absolute inset-0" style={{ opacity: (wallOpacity / 100) * 0.45 }}>
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${color}10 0px, ${color}10 2px, transparent 2px, transparent 22%)`,
        }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,30,24,0.35), rgba(6,12,9,0.5) 50%, rgba(20,30,24,0.35))' }} />
      </div>

      {/* Real external-sensor observations */}
      <AnimatePresence>
        {safeDetections.map(d => (
          <Figure
            key={d.id}
            d={d}
            heading={h}
            W={W}
            H={H}
            seeThrough={seeThrough}
            sonar={sonar}
            onSelect={onSelectDetection}
            isSelected={String(selectedDetection?.id) === String(d.id) || String(selectedDetection?.trackId) === String(d.trackId)}
          />
        ))}
      </AnimatePresence>

      {/* Full-frame measurement sweep — visualizes the live external-sensor update cycle */}
      {isScanning && (
        <motion.div className="absolute left-0 right-0 pointer-events-none"
          style={{ height: 4, background: `linear-gradient(90deg, transparent, ${color}, #ffffff, ${color}, transparent)`, boxShadow: `0 0 18px ${color}, 0 0 30px ${color}80`, opacity: 0.5 }}
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} />
      )}

      {/* Compass FOV strip — shows which bearings are currently in view */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-3 px-3 py-1 rounded-lg"
        style={{ background: 'rgba(0,0,0,0.78)', border: `1px solid ${color}40`, backdropFilter: 'blur(6px)' }}>
        <span className="font-mono text-[8px] tracking-wider" style={{ color: `${color}99`, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
          {compass(h - FOV_HALF)}
        </span>
        <span className="font-mono text-[9px] tracking-widest" style={{ color, textShadow: `0 0 6px ${color}, 0 1px 2px rgba(0,0,0,0.9)` }}>
          ◉ {Math.round(h)}°
        </span>
        <span className="font-mono text-[8px] tracking-wider" style={{ color: `${color}99`, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
          {compass(h + FOV_HALF)}
        </span>
      </div>

      {/* Non-visual sensor readout */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg"
        style={{ background: 'rgba(0,0,0,0.78)', border: `1px solid ${color}30`, backdropFilter: 'blur(6px)' }}>
        <div className="font-mono text-[9px] tracking-widest text-center" style={{ color, textShadow: `0 0 6px ${color}, 0 1px 2px rgba(0,0,0,0.9)` }}>
          NON-VISUAL · SENSOR VIEW
        </div>
        <div className="font-mono text-[8px] tracking-wider text-center mt-0.5" style={{ color: `${color}cc`, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
          {movingCount} MOVING · {inView.length} IN VIEW · {safeDetections.length} SENSOR OBSERVATIONS
        </div>
      </div>
    </div>
  );
}