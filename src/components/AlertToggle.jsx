import { Bell, BellOff, BellRing, ShieldCheck, Clock } from 'lucide-react';

export default function AlertToggle({ alerts, enabled, onToggle, color }) {
  const { supported, permission, requestPermission, lastAlert } = alerts;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {enabled ? <BellRing className="w-3 h-3" style={{ color }} /> : <Bell className="w-3 h-3 text-muted-foreground" />}
          <h3 className="font-display text-xs tracking-wider text-foreground">BG ALERTS</h3>
        </div>
        {supported && permission === 'granted' && enabled && (
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
        )}
      </div>

      {!supported && (
        <div className="font-mono text-[8px] text-muted-foreground">Notifications unsupported on this device.</div>
      )}

      {supported && permission !== 'granted' && (
        <button onClick={requestPermission}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-display text-[10px] tracking-wider transition-all"
          style={{ background: `${color}14`, color, border: `1px solid ${color}35` }}>
          <Bell className="w-3.5 h-3.5" /> ENABLE NOTIFICATIONS
        </button>
      )}

      {supported && permission === 'granted' && (
        <button onClick={onToggle}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all"
          style={{ borderColor: enabled ? `${color}40` : '#ffffff12', background: enabled ? `${color}10` : 'transparent' }}>
          <span className="flex items-center gap-2 font-mono text-[9px] tracking-wider" style={{ color: enabled ? color : '#ffffff60' }}>
            {enabled ? <BellRing className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            {enabled ? 'ALERTS ARMED' : 'ALERTS OFF'}
          </span>
          <span className="w-8 h-4 rounded-full relative transition-all" style={{ background: enabled ? color : '#ffffff20' }}>
            <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all" style={{ left: enabled ? 18 : 2 }} />
          </span>
        </button>
      )}

      {permission === 'denied' && (
        <div className="flex items-start gap-1.5 font-mono text-[8px] text-destructive">
          <ShieldCheck className="w-2.5 h-2.5 mt-0.5 shrink-0" />
          <span>Blocked — enable notifications in your browser settings to use background alerts.</span>
        </div>
      )}

      {lastAlert && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-white/5">
          <Clock className="w-2.5 h-2.5 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="font-mono text-[8px] text-muted-foreground">
              {new Date(lastAlert.time).toLocaleTimeString('en-US', { hour12: false })}
            </div>
            <div className="font-mono text-[8px] text-foreground/80">{lastAlert.body}</div>
          </div>
        </div>
      )}

      {enabled && (
        <p className="font-mono text-[7px] text-muted-foreground leading-relaxed">
          Fires system notifications for new targets, movement, or sudden motion while the tab is backgrounded.
        </p>
      )}
    </div>
  );
}