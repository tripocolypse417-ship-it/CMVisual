import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Dog, Box, HelpCircle, Info, X } from 'lucide-react';

const TYPES = [
  { type: 'human', color: '#00ff88', label: 'HUMAN', Icon: User, desc: 'Person detected in view' },
  { type: 'animal', color: '#00ccff', label: 'ANIMAL', Icon: Dog, desc: 'Pet or wildlife' },
  { type: 'object', color: '#ffaa00', label: 'OBJECT', Icon: Box, desc: 'Inanimate item' },
  { type: 'unknown', color: '#ff4466', label: 'UNKNOWN', Icon: HelpCircle, desc: 'Unclassified target' },
];

export default function ArLegend({ color = '#00ff88' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute z-20" style={{ top: 52, left: 12 }}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg font-mono text-[9px] transition-colors"
        style={{ color, border: `1px solid ${color}40`, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
        <Info className="w-3 h-3" /> LEGEND
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute mt-1.5 p-2.5 rounded-xl"
            style={{ background: 'rgba(0,0,0,0.82)', border: `1px solid ${color}35`, backdropFilter: 'blur(10px)', minWidth: 175 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-[9px] tracking-widest" style={{ color, textShadow: `0 0 6px ${color}, 0 1px 2px rgba(0,0,0,0.9)` }}>DETECTION KEY</span>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white"><X className="w-3 h-3" /></button>
            </div>
            <div className="space-y-1.5">
              {TYPES.map(t => (
                <div key={t.type} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: `${t.color}18`, border: `1px solid ${t.color}50` }}>
                    <t.Icon className="w-3 h-3" style={{ color: t.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-[9px] font-bold" style={{ color: t.color, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>{t.label}</div>
                    <div className="font-mono text-[8px] text-white/55">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 font-mono text-[8px] text-white/60">
                <span className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}` }} /> MOVING (pulse ring)
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[8px] text-white/60">
                <span className="w-2 h-2 rounded-full border" style={{ borderColor: color }} /> SELECTED (corner brackets)
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}