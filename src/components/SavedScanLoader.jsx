import { useState } from 'react';
import { FolderOpen, Loader2, ChevronDown, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SavedScanLoader({ onLoad, color }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [loadedId, setLoadedId] = useState(null);

  const fetchList = async () => {
    if (open) { setOpen(false); return; }
    setLoading(true);
    try {
      const list = await base44.entities.Snapshot.list('-created_date', 50);
      setSnapshots(list);
      setOpen(true);
    } finally { setLoading(false); }
  };

  const handleLoad = (snap) => {
    onLoad(snap);
    setLoadedId(snap.id);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs tracking-wider text-foreground">DATA SOURCE</h3>
        <span className="font-mono text-[8px] text-muted-foreground">SAVED SCANS</span>
      </div>

      <button onClick={fetchList}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-display text-[10px] tracking-wider transition-all"
        style={{ background: `${color}14`, color, border: `1px solid ${color}35` }}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
        {loading ? 'LOADING…' : 'LOAD SAVED SCAN'}
      </button>

      {loadedId && !open && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-white/5">
          <Check className="w-3 h-3" style={{ color }} />
          <span className="font-mono text-[8px] text-muted-foreground truncate">
            {snapshots.find(s => s.id === loadedId)?.label || 'Loaded'}
          </span>
        </div>
      )}

      {open && (
        <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
          {snapshots.length === 0 && (
            <div className="text-center py-3 font-mono text-[9px] text-muted-foreground">No saved scans</div>
          )}
          {snapshots.map(s => (
            <button key={s.id} onClick={() => handleLoad(s)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-left">
              <ChevronDown className="w-3 h-3 text-muted-foreground rotate-[-90deg]" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[9px] text-foreground truncate">{s.label}</div>
                <div className="font-mono text-[7px] text-muted-foreground">
                  {new Date(s.created_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span className="font-mono text-[8px] shrink-0" style={{ color }}>
                {s.detection_count ?? 0} tgt
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}