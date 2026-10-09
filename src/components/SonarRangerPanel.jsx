import { useEffect, useRef, useState } from 'react';
import { motion as framerMotion } from 'framer-motion';
import { Waves, Activity, Radar, Power, AlertTriangle, Slack, Loader2, Bell, BellOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Experimental acoustic-band monitor. Relative energy/change values are not
// calibrated range, Doppler, target-motion, or through-wall measurements.
// Slack notifications are explicitly labeled as unverified signal changes.
const HIGH_SIGNAL_CHANGE = 0.4;
const ALERT_COOLDOWN = 10000;  // min ms between Slack posts

export default function SonarRangerPanel({ color = '#00ff88', sonar, onToggle }) {
  const { status, motion, intensity, proximity, echo } = sonar;
  const signalKey = `${status}-${Math.round(echo * 1000)}-${Math.round(intensity * 1000)}-${Math.round(proximity * 1000)}`;
  const on = status !== 'idle';
  const bars = [echo, intensity, proximity];
  const labels = ['BAND ENERGY', 'SIGNAL CHANGE', 'RELATIVE LEVEL'];
  const colors = [color, motion ? '#ff6633' : color, '#00ccff'];

  const [slackOn, setSlackOn] = useState(false);
  const [channels, setChannels] = useState([]);
  const [channel, setChannel] = useState(null);
  const [loadingCh, setLoadingCh] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);
  const lastAlertRef = useRef(0);

  // Load Slack channels when Slack alerts are enabled.
  useEffect(() => {
    if (!slackOn || channels.length) return;
    setLoadingCh(true);
    base44.functions.invoke('slackAlert', { action: 'list' })
      .then((res) => {
        const ch = res.data?.channels || [];
        setChannels(ch);
        if (ch[0]) setChannel(ch[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingCh(false));
  }, [slackOn]);

  // Optional Slack notification for a large acoustic-band change; not a target alert.
  useEffect(() => {
    if (!slackOn || !channel) return;
    if (!motion || intensity < HIGH_SIGNAL_CHANGE) return;
    const now = Date.now();
    if (now - lastAlertRef.current < ALERT_COOLDOWN) return;
    lastAlertRef.current = now;
    setLastSent(now);
    setSending(true);
    base44.functions.invoke('slackAlert', {
      action: 'post',
      channel,
      event: {
        event_type: 'signal_change',
        target_type: 'unknown',
        intensity: Math.round(intensity * 100),
        moving: false,
        scan_mode: 'acoustic_experiment',
        summary: `Experimental acoustic-band change observed — intensity ${Math.round(intensity * 100)}%, relative level ${Math.round(proximity * 100)}%. No target, distance, or motion is confirmed.`,
      },
    })
      .catch(() => {})
      .finally(() => setTimeout(() => setSending(false), 800));
  }, [slackOn, channel, motion, intensity, proximity]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4" style={{ color }} />
          <h3 className="font-display text-xs tracking-wider" style={{ color }}>ACOUSTIC SIGNAL MONITOR</h3>
        </div>
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[9px] tracking-wider transition-all"
          style={{
            border: `1px solid ${on ? color + '60' : 'rgba(255,255,255,0.15)'}`,
            background: on ? color + '14' : 'transparent',
            color: on ? color : 'rgba(255,255,255,0.6)',
          }}
        >
          <Power className="w-3 h-3" /> {on ? 'ACTIVE' : 'STANDBY'}
        </button>
      </div>

      {on && status === 'denied' && (
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: '#ff222210', border: '1px solid #ff222240' }}>
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="font-mono text-[9px] text-red-400">Microphone permission denied — acoustic monitoring is unavailable.</span>
        </div>
      )}
      {on && status === 'unsupported' && (
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: '#ff222210', border: '1px solid #ff222240' }}>
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="font-mono text-[9px] text-red-400">Web Audio / mic not available on this device.</span>
        </div>
      )}

      <div className="flex items-center gap-3 p-3 rounded-xl"
        style={{ background: motion ? '#ff663312' : 'rgba(0,0,0,0.3)', border: `1px solid ${motion ? '#ff663350' : 'rgba(255,255,255,0.08)'}` }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: motion ? '#ff663320' : `${color}12`, border: `1px solid ${motion ? '#ff663340' : `${color}30`}` }}>
          {motion
            ? <Activity className="w-4 h-4 text-orange-400" />
            : <Radar className="w-4 h-4" style={{ color }} />}
        </div>
        <div className="flex-1">
          <div key={signalKey} className="font-display text-sm tracking-widest" style={{ color: motion ? '#ff6633' : color }}>
            {motion ? 'SIGNAL CHANGE FLAGGED' : 'NO CHANGE FLAGGED'}
          </div>
          <div className="font-mono text-[8px] text-muted-foreground">
            Relative audio-band analysis · {on && status === 'active' ? 'listening' : 'off'}
          </div>
        </div>
        <div className="font-mono text-lg font-bold" style={{ color: motion ? '#ff6633' : color }}>
          {Math.round(intensity * 100)}%
        </div>
      </div>

      <div className="space-y-2">
        {bars.map((v, i) => (
          <div key={labels[i]}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[8px] tracking-wider text-muted-foreground">{labels[i]}</span>
              <span className="font-mono text-[8px]" style={{ color: colors[i] }}>{Math.round(v * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <framerMotion.div className="h-full rounded-full"
                style={{ background: colors[i], boxShadow: `0 0 6px ${colors[i]}` }}
                animate={{ width: `${v * 100}%` }}
                transition={{ duration: 0.15 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Optional Slack notification for unverified acoustic signal changes */}
      <div className="p-3 rounded-xl space-y-2.5" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${slackOn ? '#4a154b50' : 'rgba(255,255,255,0.08)'}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Slack className="w-4 h-4" style={{ color: slackOn ? '#4a154b' : '#ffffff60' }} />
            <span className="font-display text-[10px] tracking-wider" style={{ color: slackOn ? '#4a154b' : '#ffffff80' }}>SIGNAL-CHANGE NOTIFICATIONS</span>
          </div>
          <button
            onClick={() => setSlackOn(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px] transition-all"
            style={{
              border: `1px solid ${slackOn ? '#4a154b60' : 'rgba(255,255,255,0.15)'}`,
              background: slackOn ? '#4a154b18' : 'transparent',
              color: slackOn ? '#4a154b' : 'rgba(255,255,255,0.6)',
            }}
          >
            {slackOn ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            {slackOn ? 'ON' : 'OFF'}
          </button>
        </div>

        {slackOn && (
          <>
            {loadingCh ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="font-mono text-[8px]">Loading channels…</span>
              </div>
            ) : channels.length === 0 ? (
              <span className="font-mono text-[8px] text-muted-foreground">No Slack channels found.</span>
            ) : (
              <select
                value={channel || ''}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full bg-black/60 text-foreground font-mono text-[9px] rounded-lg px-2 py-1.5 border border-white/10 outline-none"
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
            )}
            <div className="flex items-center justify-between font-mono text-[8px]">
              <span className="text-muted-foreground">Trigger: signal change ≥ {Math.round(HIGH_SIGNAL_CHANGE * 100)}%</span>
              <span style={{ color: sending ? '#4a154b' : (lastSent ? '#ffffff60' : '#ffffff30') }}>
                {sending ? 'SENDING…' : lastSent ? `last sent ${Math.round((Date.now() - lastSent) / 1000)}s ago` : 'idle'}
              </span>
            </div>
          </>
        )}
      </div>

      <p className="font-mono text-[8px] leading-relaxed text-muted-foreground">
        Experimental acoustic signal monitor only. Values are relative microphone-band features; they do not establish distance, target motion, target identity, or through-wall presence. Validate on-device before using these values for decisions.
      </p>
    </div>
  );
}