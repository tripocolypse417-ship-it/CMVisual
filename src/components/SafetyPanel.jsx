import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Radar, Clock, Slack, Bell, BellOff, Loader2 } from 'lucide-react';

// Dedicated safety panel — logs every proximity breach detected by the radar
// pulse warning, showing the target distance and timestamp for each event.
export default function SafetyPanel({ events = [], color = '#00ff88', slackOn, onSlackToggle, channels = [], channel, onChannelChange, loadingChannels, sending, lastSent }) {
  const count = events.length;

  const urgencyColor = (distance) => {
    const u = Math.max(0, Math.min(1, 1 - distance / 6));
    if (u > 0.66) return '#ff2222';
    if (u > 0.33) return '#ff8833';
    return '#ffcc33';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <h3 className="font-display text-xs tracking-wider text-red-400">PROXIMITY WARNINGS</h3>
        </div>
        <span className="font-mono text-[9px] text-muted-foreground">{count} EVENT{count !== 1 ? 'S' : ''}</span>
      </div>

      {/* Slack breach alerts — posts to a chosen channel on every zone breach */}
      <div className="p-3 rounded-xl space-y-2.5" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${slackOn ? '#4a154b50' : 'rgba(255,255,255,0.08)'}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Slack className="w-4 h-4" style={{ color: slackOn ? '#4a154b' : '#ffffff60' }} />
            <span className="font-display text-[10px] tracking-wider" style={{ color: slackOn ? '#4a154b' : '#ffffff80' }}>SLACK BREACH ALERTS</span>
          </div>
          <button onClick={onSlackToggle}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px] transition-all"
            style={{ border: `1px solid ${slackOn ? '#4a154b60' : 'rgba(255,255,255,0.15)'}`, background: slackOn ? '#4a154b18' : 'transparent', color: slackOn ? '#4a154b' : 'rgba(255,255,255,0.6)' }}>
            {slackOn ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            {slackOn ? 'ON' : 'OFF'}
          </button>
        </div>
        {slackOn && (
          <>
            {loadingChannels ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="font-mono text-[8px]">Loading channels…</span>
              </div>
            ) : channels.length === 0 ? (
              <span className="font-mono text-[8px] text-muted-foreground">No Slack channels found.</span>
            ) : (
              <select value={channel || ''} onChange={(e) => onChannelChange(e.target.value)}
                className="w-full bg-black/60 text-foreground font-mono text-[9px] rounded-lg px-2 py-1.5 border border-white/10 outline-none">
                {channels.map((c) => (<option key={c.id} value={c.id}>#{c.name}</option>))}
              </select>
            )}
            <div className="flex items-center justify-between font-mono text-[8px]">
              <span className="text-muted-foreground">Posts on every zone breach</span>
              <span style={{ color: sending ? '#4a154b' : (lastSent ? '#ffffff60' : '#ffffff30') }}>
                {sending ? 'SENDING…' : lastSent ? `last sent ${Math.round((Date.now() - lastSent) / 1000)}s ago` : 'idle'}
              </span>
            </div>
          </>
        )}
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Radar className="w-8 h-8 mb-2 opacity-30" style={{ color }} />
          <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
            No proximity breaches detected.<br />Targets entering the safety range will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {events.map((ev) => {
              const ringColor = urgencyColor(ev.distance);
              const date = new Date(ev.timestamp);
              const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              return (
                <motion.div key={ev.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 p-2 rounded-lg"
                  style={{ background: `${ringColor}10`, border: `1px solid ${ringColor}40` }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${ringColor}20`, border: `1px solid ${ringColor}60` }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: ringColor, boxShadow: `0 0 6px ${ringColor}` }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-sm font-bold" style={{ color: ringColor }}>{ev.distance.toFixed(1)}m</span>
                      <span className="font-mono text-[8px] text-muted-foreground uppercase tracking-wider">target breach</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                      <span className="font-mono text-[8px] text-muted-foreground">{time}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}