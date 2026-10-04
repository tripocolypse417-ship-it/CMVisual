import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, Send, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const EMAIL_KEY = 'wallsight_team_email';
const AUTO_KEY = 'wallsight_autosend_session';

function buildSummary(snaps) {
  const rows = snaps.map((s, i) => {
    let dets = [];
    try { dets = JSON.parse(s.detections_json || '[]'); } catch {}
    const humans = dets.filter(d => d.type === 'human').length;
    const moving = dets.filter(d => d.moving).length;
    const time = new Date(s.created_date).toLocaleString('en-US');
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #00ff8820">${i + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #00ff8820">${s.label}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #00ff8820">${time}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #00ff8820">${(s.scan_mode || '').toUpperCase()}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #00ff8820">${s.detection_count ?? dets.length}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #00ff8820">${humans}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #00ff8820">${moving}</td>
    </tr>`;
  }).join('');

  return `<div style="font-family:'Share Tech Mono',monospace;background:#031409;color:#00ff88;padding:24px;max-width:680px">
    <h2 style="color:#00ff88;margin:0 0 4px;letter-spacing:2px">WALLSIGHT · SESSION SUMMARY</h2>
    <p style="color:#00ff8899;margin:0 0 16px;font-size:12px">Generated ${new Date().toLocaleString('en-US')}</p>
    <p style="font-size:13px">Total snapshots: <b>${snaps.length}</b></p>
    <table style="border-collapse:collapse;width:100%;font-size:11px;color:#00ff88">
      <thead><tr style="border-bottom:1px solid #00ff8840;color:#00ff88cc">
        <th style="padding:6px 8px;text-align:left">#</th>
        <th style="padding:6px 8px;text-align:left">LABEL</th>
        <th style="padding:6px 8px;text-align:left">TIME</th>
        <th style="padding:6px 8px;text-align:left">MODE</th>
        <th style="padding:6px 8px;text-align:left">TARGETS</th>
        <th style="padding:6px 8px;text-align:left">HUMANS</th>
        <th style="padding:6px 8px;text-align:left">MOVING</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#00ff8866;font-size:10px;margin-top:16px">— WallSight v2.4.1 · WiFi Sonar Array</p>
  </div>`;
}

export default function SessionReport({ isScanning, color }) {
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY) || '');
  const [autoSend, setAutoSend] = useState(() => localStorage.getItem(AUTO_KEY) === '1');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const prevScanning = useRef(isScanning);
  const autoSendRef = useRef(autoSend);

  useEffect(() => { autoSendRef.current = autoSend; }, [autoSend]);
  useEffect(() => { localStorage.setItem(EMAIL_KEY, email); }, [email]);
  useEffect(() => { localStorage.setItem(AUTO_KEY, autoSend ? '1' : '0'); }, [autoSend]);

  const send = async () => {
    const addr = email.trim();
    if (!addr) { setError('Add a team email first'); setStatus('error'); return; }
    setStatus('sending'); setError('');
    try {
      const snaps = await base44.entities.Snapshot.list('-created_date', 50);
      if (snaps.length === 0) { setError('No saved snapshots to summarize'); setStatus('error'); return; }
      await base44.integrations.Core.SendEmail({
        to: addr,
        subject: `WallSight Session Summary — ${snaps.length} scans · ${new Date().toLocaleDateString('en-US')}`,
        body: buildSummary(snaps),
      });
      setStatus('sent');
      setTimeout(() => setStatus('idle'), 4000);
    } catch (e) {
      setError(e?.message || 'Failed to send email'); setStatus('error');
    }
  };

  // Auto-send when a scanning session ends.
  useEffect(() => {
    if (prevScanning.current && !isScanning && autoSendRef.current) {
      send();
    }
    prevScanning.current = isScanning;
  }, [isScanning]);

  const statusColor =
    status === 'sent' ? '#00ff88' :
    status === 'error' ? '#ff4466' : color;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Mail className="w-3.5 h-3.5" style={{ color }} />
        <span className="font-display text-[10px] tracking-wider text-foreground">SESSION REPORT</span>
      </div>

      <div>
        <label className="font-mono text-[8px] text-muted-foreground tracking-wider">TEAM EMAIL</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="team@example.com"
          className="w-full mt-1 px-2 py-1.5 rounded-md bg-black/40 border text-[10px] font-mono outline-none transition-all"
          style={{ borderColor: email ? `${color}40` : '#ffffff15', color: '#ffffffcc' }}
        />
      </div>

      <button
        onClick={() => setAutoSend(v => !v)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-md border transition-all"
        style={{ borderColor: autoSend ? `${color}40` : '#ffffff15', background: autoSend ? `${color}08` : 'transparent' }}>
        <span className="flex items-center gap-1.5 font-mono text-[9px]" style={{ color: autoSend ? color : '#ffffff60' }}>
          <Clock className="w-3 h-3" /> AUTO-SEND ON SESSION END
        </span>
        <span className="w-7 h-3.5 rounded-full relative transition-all" style={{ background: autoSend ? color : '#ffffff20' }}>
          <span className="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-black transition-all"
            style={{ left: autoSend ? '14px' : '2px' }} />
        </span>
      </button>

      <button
        onClick={send}
        disabled={status === 'sending'}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border font-mono text-[10px] tracking-wider transition-all disabled:opacity-60"
        style={{ borderColor: `${statusColor}50`, color: statusColor, background: `${statusColor}12` }}>
        {status === 'sending' ? <Loader2 className="w-3 h-3 animate-spin" /> :
         status === 'sent' ? <CheckCircle2 className="w-3 h-3" /> :
         status === 'error' ? <AlertCircle className="w-3 h-3" /> :
         <Send className="w-3 h-3" />}
        {status === 'sending' ? 'SENDING…' : status === 'sent' ? 'SENT ✓' : status === 'error' ? 'RETRY' : 'SEND SUMMARY'}
      </button>

      {error && <p className="font-mono text-[8px] text-destructive leading-tight">{error}</p>}
      {status === 'sent' && <p className="font-mono text-[8px] leading-tight" style={{ color }}>Email dispatched to your team.</p>}
    </div>
  );
}