import { motion } from 'framer-motion';

// Around-you radar: plots human/animal observations supplied by the live
// detection pipeline using relative bearing and distance. A non-visual target is
// only valid when a supported external ranging source supplied that observation;
// this component does not infer people behind walls from ordinary phone sensors.

const FOV_HALF = 38;
const MAX_DIST = 10;
const R = 54;
const TARGET_TTL_MS = 1500;

const norm = (a) => ((a % 360) + 360) % 360;
const relBearing = (angle, heading) => {
  let r = norm(angle - heading);
  if (r > 180) r -= 360;
  return r;
};

export default function ThroughWallMinimap({ detections, heading, color, sonar = null }) {
  const h = heading ?? 0;
  const now = Date.now();
  const targets = detections.filter((d) => {
    if (d.type !== 'human' && d.type !== 'animal') return false;
    const ts = Number(d.timestamp ?? d.time ?? d.updatedAt ?? 0);
    return !ts || now - ts <= TARGET_TTL_MS;
  });
  const humans = targets.filter((d) => d.type === 'human');
  const animals = targets.filter((d) => d.type === 'animal');
  const humanCount = humans.length;
  const animalCount = animals.length;

  // FOV cone wedge (±FOV_HALF from top = the direction the phone faces)
  const a1 = (-FOV_HALF * Math.PI) / 180;
  const a2 = (FOV_HALF * Math.PI) / 180;
  const x1 = Math.sin(a1) * R, y1 = -Math.cos(a1) * R;
  const x2 = Math.sin(a2) * R, y2 = -Math.cos(a2) * R;
  const conePath = `M0,0 L${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2} Z`;

  return (
    <div className="absolute z-10 pointer-events-none" style={{ top: 'clamp(110px, 20%, 190px)', right: 10, width: 124, height: 124 }}>
      <div className="relative w-full h-full rounded-full"
        style={{ background: 'rgba(0,0,0,0.74)', border: `1px solid ${color}45`, backdropFilter: 'blur(8px)', boxShadow: '0 0 20px rgba(0,0,0,0.6)' }}>
        <svg viewBox="-62 -62 124 124" className="absolute inset-0 w-full h-full">
          {/* range rings (3m / 6m / 9m) */}
          {[18, 36, 54].map((r) => (
            <circle key={r} cx="0" cy="0" r={r} fill="none" stroke={color} strokeOpacity="0.18" strokeWidth="1" />
          ))}
          {/* crosshair */}
          <line x1="-58" y1="0" x2="58" y2="0" stroke={color} strokeOpacity="0.14" strokeWidth="1" />
          <line x1="0" y1="-58" x2="0" y2="58" stroke={color} strokeOpacity="0.14" strokeWidth="1" />
          {/* FOV cone — what the camera currently sees */}
          <path d={conePath} fill={color} fillOpacity="0.13" stroke={color} strokeOpacity="0.45" strokeWidth="1" />
          {/* device at center */}
          <circle cx="0" cy="0" r="3" fill={color} />
          {/* targets — humans receive the strongest visual priority */}
          {targets.map((d) => {
            const rel = relBearing(d.angle, h);
            const rpx = Math.min(R, (Math.max(0.8, d.distance) / MAX_DIST) * R);
            const x = Math.sin((rel * Math.PI) / 180) * rpx;
            const y = -Math.cos((rel * Math.PI) / 180) * rpx;
            const isHuman = d.type === 'human';
            const c = isHuman ? '#00ff88' : '#00ccff';
            const inView = Math.abs(rel) <= FOV_HALF;
            const behaviorFlag = Boolean(d.threat || d.rapidApproach || d.threatReason);
            return (
              <g key={d.id}>
                {isHuman && (
                  <circle cx={x} cy={y} r={behaviorFlag ? 9 : 7.5} fill="none" stroke={behaviorFlag ? '#ffb000' : c} strokeOpacity={behaviorFlag ? 0.9 : 0.55} strokeWidth={behaviorFlag ? 1.5 : 1} className={d.moving || behaviorFlag ? 'ar-ring' : ''} />
                )}
                {d.moving && (
                  <circle cx={x} cy={y} r="6.5" fill="none" stroke={c} strokeOpacity="0.5" strokeWidth="1" className="ar-ring" />
                )}
                <circle cx={x} cy={y} r={isHuman ? 4.8 : 3.4} fill={behaviorFlag ? '#ffb000' : c} opacity={inView ? 1 : 0.55} stroke="#000" strokeOpacity="0.8" strokeWidth="1" />
                {isHuman && d.source && (
                  <text x={x + 7} y={y + 2} fill="#ffffffaa" fontSize="4.5" fontFamily="monospace">{String(d.source).toUpperCase()}</text>
                )}
                {isHuman && (
                  <text x={x + 7} y={y - 7} fill={behaviorFlag ? '#ffb000' : c} fontSize="6" fontFamily="monospace" fontWeight="700">
                    H{String((d.id ?? '').toString().replace(/\D/g, '').slice(-2) || '1')}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* rotating radar sweep */}
        <motion.div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: `conic-gradient(from 0deg, ${color}00 0deg, ${color}55 30deg, ${color}00 60deg)`, transformOrigin: 'center' }}
          animate={{ rotate: 360 }} transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }} />

        {/* FRONT label */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-sm"
          style={{ background: 'rgba(0,0,0,0.82)', border: `1px solid ${color}30` }}>
          <span className="font-mono text-[7px] tracking-wider" style={{ color }}>▲ FRONT</span>
        </div>

        {/* live human-priority status */}
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(0,0,0,0.78)', border: '1px solid #00ff8840' }}>
          <span className="font-mono text-[7px] font-bold tracking-wider" style={{ color: '#00ff88' }}>
            HUMAN PRIORITY {humanCount ? `· ${humanCount}` : '· 0'}
          </span>
        </div>
        {sonar?.motion && (
          <div className="absolute top-7 left-1 px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(60,30,0,0.84)', border: '1px solid #ffb00055' }}>
            <span className="font-mono text-[6px] tracking-wider" style={{ color: '#ffb000' }}>ACOUSTIC MOTION · UNASSIGNED</span>
          </div>
        )}

        {/* counts */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-1.5 py-0.5 rounded-sm whitespace-nowrap"
          style={{ background: 'rgba(0,0,0,0.82)', border: `1px solid ${color}30` }}>
          <span className="font-mono text-[7px]" style={{ color: '#00ff88' }}>● {humanCount} HUMAN{humanCount === 1 ? '' : 'S'}</span>
          <span className="font-mono text-[7px]" style={{ color: '#00ccff' }}>● {animalCount} ANIMAL{animalCount === 1 ? '' : 'S'}</span>
        </div>
      </div>
    </div>
  );
}