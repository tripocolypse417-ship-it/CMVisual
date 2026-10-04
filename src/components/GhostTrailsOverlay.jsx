import { motion } from 'framer-motion';

// Renders past movement paths (from the event log) as fading trails over the
// live AR feed. Each segment fades from faint (old) to bright (new), with a
// direction arrowhead at the newest point of every trail.
export default function GhostTrailsOverlay({ groups }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 6 }}>
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        {groups.map(g => {
          if (g.points.length < 1) return null;
          const last = g.points[g.points.length - 1];
          const prev = g.points[g.points.length - 2];

          let arrow = null;
          if (prev) {
            const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
            const len = 11;
            const ax = last.x, ay = last.y;
            const x2 = ax - len * Math.cos(ang - 0.42);
            const y2 = ay - len * Math.sin(ang - 0.42);
            const x3 = ax - len * Math.cos(ang + 0.42);
            const y3 = ay - len * Math.sin(ang + 0.42);
            arrow = (
              <polygon points={`${ax},${ay} ${x2},${y2} ${x3},${y3}`}
                fill={g.color} opacity="0.95"
                style={{ filter: `drop-shadow(0 0 5px ${g.color})` }} />
            );
          }

          return (
            <g key={g.type}>
              {/* fading trail segments — each segment's opacity follows the
                  newer endpoint so the path brightens toward the latest move */}
              {g.points.map((p, i) => i === 0 ? null : (
                <line key={i}
                  x1={g.points[i - 1].x} y1={g.points[i - 1].y}
                  x2={p.x} y2={p.y}
                  stroke={g.color} strokeWidth="2" strokeLinecap="round"
                  opacity={0.08 + 0.72 * p.age} />
              ))}

              {/* waypoint dots */}
              {g.points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={p.moving ? 3 : 2.2}
                  fill={g.color} opacity={0.18 + 0.7 * p.age}
                  style={p.age > 0.75 ? { filter: `drop-shadow(0 0 5px ${g.color})` } : undefined} />
              ))}

              {/* newest-point pulse ring */}
              {last && (
                <motion.circle cx={last.x} cy={last.y} r="6" fill="none"
                  stroke={g.color} strokeWidth="1.5"
                  animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                  style={{ transformOrigin: `${last.x}px ${last.y}px` }} />
              )}

              {arrow}
            </g>
          );
        })}
      </svg>

      {/* mode label */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg"
        style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid #b388ff55', backdropFilter: 'blur(6px)' }}>
        <span className="font-mono text-[9px] tracking-widest"
          style={{ color: '#b388ff', textShadow: '0 0 6px #b388ff, 0 1px 2px rgba(0,0,0,0.9)' }}>
          ◈ GHOST MODE · PAST PATHS
        </span>
      </div>
    </div>
  );
}