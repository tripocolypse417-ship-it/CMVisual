import React, { useSyncExternalStore } from 'react';

const formatClock = (milliseconds) => {
  if (!Number.isFinite(milliseconds)) return '--:--:--';
  return new Date(milliseconds).toISOString().slice(11, 19);
};

export default function IncidentReplayControls({ session, viewLabel = 'COMMAND' }) {
  if (!session) return null;
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const events = session.eventsAtPosition();
  const duration = Math.max(0, snapshot.endMs - snapshot.startMs);
  const offset = Math.max(0, snapshot.positionMs - snapshot.startMs);
  const speeds = [0.25, 0.5, 1, 2, 4, 8];

  return (
    <section aria-label={`${viewLabel} incident replay controls`} className="w-full rounded-xl border border-cyan-300/20 bg-slate-950/95 p-3 text-slate-100 shadow-2xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-[10px] tracking-[0.16em] text-cyan-200">
          INCIDENT REPLAY · {viewLabel}
          <span className="ml-2 rounded border border-white/15 px-1.5 py-1 text-[9px] text-white/70">{snapshot.mode.replaceAll('_', ' ')}</span>
        </div>
        <div className="font-mono text-[9px] text-white/55">{events.length} EVENTS AT PLAYHEAD</div>
      </div>
      {snapshot.mode === 'BEST_EVIDENCE_NOW' && (
        <p className="mt-2 rounded-md border border-amber-300/25 bg-amber-300/5 px-2 py-1.5 font-mono text-[9px] leading-relaxed text-amber-100/80">
          HINDSIGHT REVIEW · Later-arriving evidence is included and must not be mistaken for information available to the crew at the time.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => session.setPlaying(!snapshot.playing)} disabled={duration === 0}
          className="min-h-10 rounded-lg border border-cyan-200/30 bg-cyan-200/10 px-4 font-mono text-[10px] tracking-wider text-cyan-100 disabled:opacity-40">
          {snapshot.playing ? 'PAUSE' : 'PLAY'}
        </button>
        <label className="flex items-center gap-2 font-mono text-[9px] text-white/60">
          SPEED
          <select value={snapshot.speed} onChange={(event) => session.setSpeed(Number(event.target.value))}
            className="min-h-10 rounded-lg border border-white/15 bg-slate-900 px-2 text-white">
            {speeds.map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
          </select>
        </label>
        <div className="ml-auto font-mono text-[10px] tabular-nums text-white/80">
          {formatClock(snapshot.positionMs)} / {formatClock(snapshot.endMs)}
        </div>
      </div>
      <input aria-label="Incident replay timeline" type="range" min={snapshot.startMs} max={snapshot.endMs}
        step={1} value={snapshot.positionMs} disabled={duration === 0}
        onChange={(event) => session.seek(Number(event.target.value))}
        className="mt-3 h-2 w-full cursor-pointer accent-cyan-300 disabled:opacity-40" />
      <div className="mt-1 flex justify-between font-mono text-[8px] text-white/35">
        <span>START {formatClock(snapshot.startMs)}</span>
        <span>{duration ? Math.round(offset / duration * 100) : 0}%</span>
        <span>END {formatClock(snapshot.endMs)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 font-mono text-[8px] text-white/45">
        <span>SHARED SESSION · COMMAND / HELMET</span>
        <span>REV {snapshot.revision}</span>
      </div>
    </section>
  );
}
