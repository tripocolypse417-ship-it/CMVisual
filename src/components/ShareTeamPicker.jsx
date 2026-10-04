import { useState, useRef, useEffect } from 'react';
import { Share2, Lock, ChevronDown, Check } from 'lucide-react';

export default function ShareTeamPicker({ teams, value, onChange, color }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = teams.find((t) => t.id === value);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md border font-mono text-[9px] transition-all"
        style={{
          borderColor: selected ? `${color}40` : '#ffffff15',
          color: selected ? color : '#ffffff60',
          background: selected ? `${color}10` : 'transparent',
        }}
        title={selected ? `Sharing snapshots with ${selected.name}` : 'Snapshots private to you'}
      >
        {selected ? <Share2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
        <span className="max-w-[80px] truncate">{selected ? selected.name.toUpperCase() : 'PRIVATE'}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div
          className="absolute bottom-full mb-1 right-0 w-48 rounded-lg border border-border p-1 z-50 max-h-60 overflow-y-auto"
          style={{ background: 'rgba(3,14,9,0.97)', backdropFilter: 'blur(12px)' }}
        >
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 font-mono text-[9px] text-left transition-colors"
            style={{ color: !value ? color : '#ffffff80' }}
          >
            <Lock className="w-3 h-3" /> <span>PRIVATE (just me)</span>
            {!value && <Check className="w-3 h-3 ml-auto" />}
          </button>
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => { onChange(t.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 font-mono text-[9px] text-left transition-colors"
              style={{ color: value === t.id ? color : '#ffffff80' }}
            >
              <Share2 className="w-3 h-3" /> <span className="truncate flex-1">{t.name}</span>
              {value === t.id && <Check className="w-3 h-3" />}
            </button>
          ))}
          {teams.length === 0 && (
            <div className="px-2 py-2 font-mono text-[8px] text-muted-foreground leading-relaxed">
              No teams yet — create one in the Team Console to share live.
            </div>
          )}
        </div>
      )}
    </div>
  );
}