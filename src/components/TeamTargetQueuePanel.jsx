import React, { useState } from 'react';
import { Crosshair, Plus, Radio, ShieldCheck, X, RotateCcw } from 'lucide-react';

export default function TeamTargetQueuePanel({ locks, color = '#00ff88', isAdmin = false, deviceId = null }) {
  const [open, setOpen] = useState(false);
  const [x, setX] = useState('');
  const [z, setZ] = useState('');
  const [radius, setRadius] = useState('2');
  const [assignedDeviceId, setAssignedDeviceId] = useState('');

  const add = () => {
    const wx = Number(x), wz = Number(z);
    if (!Number.isFinite(wx) || !Number.isFinite(wz)) return;
    locks.designate({
      worldPosition: { x: wx, y: 0, z: wz },
      source: isAdmin ? 'ADMIN' : 'OPERATOR',
      acquisitionRadiusM: Number(radius) || 2,
      label: 'TEAM DESIGNATED TARGET',
      assignedDeviceId: assignedDeviceId.trim() || null,
    });
    setX(''); setZ(''); setAssignedDeviceId('');
  };

  return <div className="rounded-xl border border-white/10 bg-black/75 p-2.5 font-mono">
    <div className="flex items-center justify-between">
      <span className="text-[8px] tracking-[0.16em] text-white/70"><Crosshair className="inline w-3 h-3 mr-1"/>TEAM TARGET QUEUE</span>
      <span className="text-[7px]" style={{ color }}>{locks.acquired.length}/{locks.capacity} LOCKS</span>
    </div>
    <div className="mt-1 text-[7px] text-white/40">Designations can precede visual acquisition. A lock becomes active only when a real observation is acquired and associated with the designated track. Device assignment is routing metadata, not target identity.</div>
    <button type="button" onClick={() => setOpen(v => !v)} className="mt-2 min-h-[38px] w-full rounded-md border border-white/10 text-[7px] text-white/65"><Plus className="inline w-3 h-3 mr-1"/>ADD TEAM DESIGNATION</button>
    {open && <div className="mt-2 grid grid-cols-3 gap-1.5">
      <input value={x} onChange={e => setX(e.target.value)} inputMode="decimal" placeholder="X" className="min-h-[34px] rounded border border-white/10 bg-black/40 px-2 text-[7px] text-white"/>
      <input value={z} onChange={e => setZ(e.target.value)} inputMode="decimal" placeholder="Z" className="min-h-[34px] rounded border border-white/10 bg-black/40 px-2 text-[7px] text-white"/>
      <input value={radius} onChange={e => setRadius(e.target.value)} inputMode="decimal" placeholder="R m" className="min-h-[34px] rounded border border-white/10 bg-black/40 px-2 text-[7px] text-white"/>
      <input value={assignedDeviceId} onChange={e => setAssignedDeviceId(e.target.value)} placeholder="DEVICE ID" className="col-span-3 min-h-[34px] rounded border border-white/10 bg-black/40 px-2 text-[7px] text-white"/>
      <button type="button" onClick={add} className="col-span-3 min-h-[38px] rounded border px-2 text-[7px]" style={{ borderColor:`${color}40`, color }}><Radio className="inline w-3 h-3 mr-1"/>PUBLISH DESIGNATION</button>
    </div>}
    <div className="mt-2 space-y-1.5">
      {locks.designations.slice(-8).reverse().map(d => <div key={d.designationId} className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
        <div className="flex items-center justify-between gap-2 text-[7px]"><span className="text-white/70 truncate">{d.label}</span><span className={d.status === 'ACQUIRED' ? 'text-emerald-300' : d.status === 'SEARCHING' ? 'text-amber-300' : d.status === 'STALE' ? 'text-orange-300' : d.status === 'LOST' ? 'text-red-400' : 'text-white/30'}>{d.status}</span></div>
        <div className="mt-1 flex items-center gap-2 text-[6px] text-white/40"><span>{d.source}</span>{d.assignedDeviceId && <span>→ {d.assignedDeviceId}</span>}{d.worldPosition && <span>{Number(d.worldPosition.x).toFixed(1)}, {Number(d.worldPosition.z).toFixed(1)}</span>}{d.acquiredTrackId && <span>TRACK {String(d.acquiredTrackId).slice(0, 10)}</span>}{d.routing?.hops > 0 && <span>· {d.routing.hops}HOP</span>}</div>
        <div className="mt-1 flex gap-1">
          {d.status !== 'CANCELLED' && d.status !== 'EXPIRED' && <button type="button" onClick={() => locks.cancel(d.designationId)} className="min-h-[28px] rounded border border-white/5 px-2 text-[6px] text-white/35"><X className="inline w-3 h-3 mr-1"/>CANCEL</button>}
          {(d.status === 'STALE' || d.status === 'LOST') && <button type="button" onClick={() => locks.reacquire?.(d.designationId)} className="min-h-[28px] rounded border border-emerald-300/20 px-2 text-[6px] text-emerald-300/80"><RotateCcw className="inline w-3 h-3 mr-1"/>REACQUIRE</button>}
        </div>
      </div>)}
    </div>
    <div className="mt-2 flex items-center gap-2 text-[6px] text-white/35"><ShieldCheck className="w-3 h-3"/>CAPACITY IS RUNTIME-DRIVEN · DEVICE {deviceId ? deviceId.slice(0, 12) : 'LOCAL'}</div>
  </div>;
}