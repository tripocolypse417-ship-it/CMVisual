import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, User, Dog, Box, HelpCircle, Compass, Eraser } from 'lucide-react';

const TYPES = [
  { id: 'human',   label: 'Human',   icon: User,       color: '#00ff88' },
  { id: 'animal',  label: 'Animal',  icon: Dog,        color: '#00ccff' },
  { id: 'object',  label: 'Object',  icon: Box,        color: '#ffaa00' },
  { id: 'unknown', label: 'Unknown', icon: HelpCircle, color: '#ff4466' },
];

function Field({ label, value, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[8px] text-muted-foreground tracking-wider">{label}</span>
        <span className="font-mono text-[9px] font-bold" style={{ color: '#ffffffcc' }}>{value}</span>
      </div>
      {children}
    </div>
  );
}

export default function ManualEntryPanel({ detections, onAdd, onDelete, onClear, color, sensors }) {
  const [type, setType] = useState('human');
  const [angle, setAngle] = useState(0);
  const [distance, setDistance] = useState(40);
  const [intensity, setIntensity] = useState(70);
  const [moving, setMoving] = useState(false);

  const submit = () => {
    onAdd({
      id: Date.now(),
      type,
      angle: Number(angle),
      distance: Number(distance),
      intensity: Number(intensity),
      moving,
      speed: moving ? '1.0' : '0',
      heading: moving ? 'N' : 'STAT',
      wallLayers: [],
    });
  };

  const sliderCls = 'w-full h-1.5 rounded-full appearance-none cursor-pointer accent-current';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs tracking-wider text-foreground">REAL ENTRIES</h3>
        {detections.length > 0 && (
          <button onClick={onClear}
            className="flex items-center gap-1 font-mono text-[8px] text-muted-foreground hover:text-destructive transition-colors">
            <Eraser className="w-2.5 h-2.5" /> CLEAR
          </button>
        )}
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-4 gap-1.5">
        {TYPES.map(t => {
          const Icon = t.icon;
          const sel = type === t.id;
          return (
            <button key={t.id} onClick={() => setType(t.id)}
              className="flex flex-col items-center gap-1 py-2 rounded-lg border transition-all"
              style={{
                borderColor: sel ? `${t.color}60` : '#ffffff12',
                background: sel ? `${t.color}14` : 'transparent',
              }}>
              <Icon className="w-4 h-4" style={{ color: sel ? t.color : '#ffffff50' }} />
              <span className="font-mono text-[7px]" style={{ color: sel ? t.color : '#ffffff50' }}>{t.label.toUpperCase()}</span>
            </button>
          );
        })}
      </div>

      <Field label="BEARING" value={`${angle}°`}>
        <div className="flex items-center gap-1.5">
          <input type="range" min="0" max="359" value={angle}
            onChange={e => setAngle(Number(e.target.value))}
            className={sliderCls} style={{ color }} />
          {sensors?.heading != null && (
            <button onClick={() => setAngle(sensors.heading)}
              title="Use live compass heading"
              className="shrink-0 flex items-center gap-1 px-1.5 py-1 rounded-md border"
              style={{ borderColor: `${color}40`, color }}>
              <Compass className="w-3 h-3" />
              <span className="font-mono text-[7px]">HDG</span>
            </button>
          )}
        </div>
      </Field>

      <Field label="DISTANCE" value={`${distance}m`}>
        <input type="range" min="5" max="95" value={distance}
          onChange={e => setDistance(Number(e.target.value))}
          className={sliderCls} style={{ color }} />
      </Field>

      <Field label="CONFIDENCE" value={`${intensity}%`}>
        <input type="range" min="10" max="100" value={intensity}
          onChange={e => setIntensity(Number(e.target.value))}
          className={sliderCls} style={{ color }} />
      </Field>

      <button onClick={() => setMoving(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all"
        style={{ borderColor: moving ? `${color}40` : '#ffffff12', background: moving ? `${color}10` : 'transparent' }}>
        <span className="font-mono text-[9px] tracking-wider" style={{ color: moving ? color : '#ffffff60' }}>MOVING TARGET</span>
        <span className="w-8 h-4 rounded-full relative transition-all" style={{ background: moving ? color : '#ffffff20' }}>
          <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
            style={{ left: moving ? 18 : 2 }} />
        </span>
      </button>

      <button onClick={submit}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-display text-[10px] tracking-wider transition-all"
        style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
        <Plus className="w-3.5 h-3.5" /> ADD TARGET
      </button>

      {/* Current entries */}
      <div className="space-y-1 max-h-32 overflow-y-auto">
        <AnimatePresence>
          {detections.map(d => {
            const tc = TYPES.find(t => t.id === d.type)?.color || '#fff';
            return (
              <motion.div key={d.id} layout
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: tc }} />
                <span className="font-mono text-[9px]" style={{ color: tc }}>{d.type.toUpperCase()}</span>
                <span className="font-mono text-[8px] text-muted-foreground ml-auto">
                  {d.distance.toFixed(0)}m · {Math.round(d.angle)}° · {d.intensity}%
                </span>
                <button onClick={() => onDelete(d.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}