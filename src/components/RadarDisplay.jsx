import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const RING_COUNT = 5;

const sameTrack = (a, b) => {
  if (!a || !b) return false;
  const idsA = [a.trackId, a.id].filter((v) => v != null).map(String);
  const idsB = [b.trackId, b.id].filter((v) => v != null).map(String);
  return idsA.some((id) => idsB.includes(id));
};

function DetectionBlip({ detection, onSelect, isSelected }) {
  const { angle, distance, type, intensity } = detection;
  const r = (distance / 100) * 42;
  const x = 50 + r * Math.cos((angle * Math.PI) / 180);
  const y = 50 + r * Math.sin((angle * Math.PI) / 180);
  
  const colorMap = {
    human: '#00ff88',
    animal: '#00ccff',
    object: '#ffaa00',
    unknown: '#ff4466',
  };
  const color = colorMap[type] || colorMap.unknown;

  return (
    <g 
      onClick={() => onSelect(detection)}
      className="cursor-pointer"
    >
      <motion.circle
        cx={`${x}%`} cy={`${y}%`} r="6"
        fill={color} opacity={0.15}
        animate={{ r: [6, 12, 6], opacity: [0.15, 0.05, 0.15] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle
        cx={`${x}%`} cy={`${y}%`} r="3"
        fill={color} opacity={0.6}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <circle
        cx={`${x}%`} cy={`${y}%`} r="1.5"
        fill={color}
        stroke={isSelected ? '#fff' : 'none'}
        strokeWidth="0.5"
      />
    </g>
  );
}

export default function RadarDisplay({ detections, scanMode, onSelectDetection, selectedDetection, isScanning }) {
  const [sweepAngle, setSweepAngle] = useState(0);
  const animRef = useRef(null);
  const lastTime = useRef(Date.now());

  const animate = useCallback(() => {
    const now = Date.now();
    const delta = now - lastTime.current;
    lastTime.current = now;
    if (isScanning) {
      setSweepAngle(prev => (prev + delta * 0.06) % 360);
    }
    animRef.current = requestAnimationFrame(animate);
  }, [isScanning]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [animate]);

  const sweepX = 50 + 44 * Math.cos((sweepAngle * Math.PI) / 180);
  const sweepY = 50 + 44 * Math.sin((sweepAngle * Math.PI) / 180);

  const modeColors = {
    sonar: { glow: '#00ff88', sweep: '#00ff8840', bg: '#00ff8808' },
    thermal: { glow: '#ff6633', sweep: '#ff663340', bg: '#ff663308' },
    motion: { glow: '#00ccff', sweep: '#00ccff40', bg: '#00ccff08' },
  };
  const colors = modeColors[scanMode] || modeColors.sonar;

  return (
    <div className="relative w-full aspect-square max-w-[500px] mx-auto">
      {/* Outer glow */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{ 
          boxShadow: `0 0 60px ${colors.glow}15, 0 0 120px ${colors.glow}08`,
        }}
      />
      
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.glow} stopOpacity="0.05" />
            <stop offset="70%" stopColor={colors.glow} stopOpacity="0.02" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.8" />
          </radialGradient>
          <radialGradient id="sweepGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.glow} stopOpacity="0" />
            <stop offset="60%" stopColor={colors.glow} stopOpacity="0.08" />
            <stop offset="100%" stopColor={colors.glow} stopOpacity="0.25" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <circle cx="50" cy="50" r="46" fill="url(#radarBg)" stroke={colors.glow} strokeOpacity="0.3" strokeWidth="0.3" />

        {/* Range rings */}
        {Array.from({ length: RING_COUNT }).map((_, i) => {
          const r = ((i + 1) / RING_COUNT) * 42;
          return (
            <circle
              key={i} cx="50" cy="50" r={r}
              fill="none" stroke={colors.glow} strokeOpacity={0.12}
              strokeWidth="0.2" strokeDasharray="1,2"
            />
          );
        })}

        {/* Cross lines */}
        <line x1="50" y1="8" x2="50" y2="92" stroke={colors.glow} strokeOpacity="0.1" strokeWidth="0.15" />
        <line x1="8" y1="50" x2="92" y2="50" stroke={colors.glow} strokeOpacity="0.1" strokeWidth="0.15" />
        <line x1="20" y1="20" x2="80" y2="80" stroke={colors.glow} strokeOpacity="0.06" strokeWidth="0.15" />
        <line x1="80" y1="20" x2="20" y2="80" stroke={colors.glow} strokeOpacity="0.06" strokeWidth="0.15" />

        {/* Sweep cone */}
        {isScanning && (
          <path
            d={`M 50 50 L ${sweepX} ${sweepY} A 44 44 0 0 0 ${50 + 44 * Math.cos(((sweepAngle - 30) * Math.PI) / 180)} ${50 + 44 * Math.sin(((sweepAngle - 30) * Math.PI) / 180)} Z`}
            fill={colors.sweep}
            filter="url(#glow)"
          />
        )}

        {/* Sweep line */}
        {isScanning && (
          <line
            x1="50" y1="50" x2={sweepX} y2={sweepY}
            stroke={colors.glow} strokeWidth="0.4" strokeOpacity="0.9"
            filter="url(#glow)"
          />
        )}

        {/* Center dot */}
        <circle cx="50" cy="50" r="1.2" fill={colors.glow} opacity="0.8" />
        <circle cx="50" cy="50" r="2.5" fill="none" stroke={colors.glow} strokeWidth="0.2" opacity="0.4" />

        {/* Detection blips */}
        {detections.map((d) => (
          <DetectionBlip
            key={d.id}
            detection={d}
            onSelect={onSelectDetection}
            isSelected={sameTrack(selectedDetection, d)}
          />
        ))}

        {/* Range labels */}
        {Array.from({ length: RING_COUNT }).map((_, i) => {
          const r = ((i + 1) / RING_COUNT) * 42;
          return (
            <text
              key={i} x={51} y={50 - r + 1.5}
              fill={colors.glow} opacity="0.4" fontSize="1.8"
              fontFamily="var(--font-mono)"
            >
              {((i + 1) * 2)}m
            </text>
          );
        })}

        {/* Cardinal labels */}
        <text x="50" y="6" fill={colors.glow} opacity="0.5" fontSize="2" textAnchor="middle" fontFamily="var(--font-display)">N</text>
        <text x="50" y="96" fill={colors.glow} opacity="0.5" fontSize="2" textAnchor="middle" fontFamily="var(--font-display)">S</text>
        <text x="5" y="50.5" fill={colors.glow} opacity="0.5" fontSize="2" textAnchor="middle" fontFamily="var(--font-display)">W</text>
        <text x="95" y="50.5" fill={colors.glow} opacity="0.5" fontSize="2" textAnchor="middle" fontFamily="var(--font-display)">E</text>
      </svg>

      {/* Scan mode indicator */}
      <div className="absolute top-3 left-3 font-mono text-[10px] uppercase tracking-widest opacity-60" style={{ color: colors.glow }}>
        {scanMode} scan
      </div>
      <div className="absolute top-3 right-3 font-mono text-[10px] opacity-60 flex items-center gap-1.5" style={{ color: colors.glow }}>
        {isScanning && (
          <motion.span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: colors.glow }}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
        {isScanning ? 'ACTIVE' : 'STANDBY'}
      </div>
    </div>
  );
}