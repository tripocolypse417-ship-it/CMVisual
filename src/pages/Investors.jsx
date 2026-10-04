import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Radio, Send, Loader2, CheckCircle2, TrendingUp, Eye, Cpu, ShieldCheck,
  Waves, Radar, Layers, Smartphone, Zap, Globe, Lock, Activity, ScanLine,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const COLOR = '#00ff88';

const PITCH = [
  {
    icon: Radio,
    title: 'THE PROBLEM',
    body: 'Teams need faster spatial awareness, but sensing, camera, ranging, and telemetry are fragmented across separate tools. Dedicated sensing hardware can be costly and specialized, while software-only claims often blur the line between measurement and inference.',
  },
  {
    icon: Cpu,
    title: 'THE SOLUTION',
    body: 'WaveRadar is a sensor-fusion interface that brings camera vision, supported depth/ranging measurements, device telemetry, and live sensor streams into one radar-style operational view. Every observation carries source, timing, and quality context so measured data stays distinct from inference.',
  },
  {
    icon: Eye,
    title: 'PRODUCT',
    body: 'The platform combines live object and human tracking, spatial visualization, scan history, sensor diagnostics, target metadata, team sharing, reporting, replay, prediction calibration, and evidence workflows in one mobile-first experience. Native Android ranging can be added where compatible hardware exposes it.',
  },
  {
    icon: TrendingUp,
    title: 'MARKET',
    body: 'Initial applications include site awareness, inspection, facilities operations, field teams, training, research, safety operations, and post-incident review where portable spatial telemetry can reduce tool switching and preserve an auditable evidence timeline. Expansion depends on validated sensor performance, external testing, customer evidence, and deployment-specific privacy controls.'
  },
];

const STATS = [
  { label: 'SENSOR LAYERS', value: 'MULTI' },
  { label: 'EXPERIENCE', value: 'MOBILE-FIRST' },
  { label: 'DATA MODEL', value: 'SOURCE-AWARE' },
  { label: 'STATUS', value: 'EARLY VALIDATION' },
];

// How the sonar works — the honest, sensor-first pipeline.
const SONAR_STEPS = [
  {
    icon: Waves,
    title: 'EMIT',
    body: 'Supported devices can emit and analyze acoustic signals. The interface reports the resulting measurements as sensor evidence rather than treating acoustic activity as automatic room-ranging.'
  },
  {
    icon: Activity,
    title: 'ANALYZE',
    body: 'Signal features are analyzed in real time for changes and motion-related evidence, with measurement quality and provenance retained.'
  },
  {
    icon: Radar,
    title: 'PLOT',
    body: 'Validated measurements and tracked observations are plotted into a persistent spatial view; inferred or occluded positions remain explicitly labeled.'
  },
  {
    icon: ScanLine,
    title: 'ALERT',
    body: 'Configurable proximity and movement events can trigger on-device feedback and connected alerts when supported by the live data stream.'
  },
];

const CAPABILITIES = [
  { icon: Smartphone, label: 'MOBILE-FIRST', body: 'Designed around the sensors available on the device.' },
  { icon: Layers, label: 'SENSOR FUSION', body: 'Camera, depth, ranging, motion, and signal layers in one view.' },
  { icon: Lock, label: 'DATA PROVENANCE', body: 'Source, timing, quality, and confidence stay attached to observations.' },
  { icon: Globe, label: 'EXTENSIBLE', body: 'Native sensor bridges can feed the same live visualization.' },
  { icon: Zap, label: 'LIVE', body: 'Streaming measurements, tracking, diagnostics, and alerts.' },
  { icon: ShieldCheck, label: 'MEASUREMENT-FIRST', body: 'Never present an unsupported inference as a measured fact.' }
];

export default function Investors() {
  const [form, setForm] = useState({ name: '', email: '', firm: '', role: '', check_size: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { setError('Name and email are required.'); return; }
    setStatus('sending'); setError('');
    try {
      await base44.functions.invoke('investorLead', { action: 'submit', ...form });
      setStatus('done');
      setForm({ name: '', email: '', firm: '', role: '', check_size: '', message: '' });
    } catch (err) {
      setStatus('error');
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 hud-grid-bg opacity-100 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 25%, transparent 40%, rgba(0,0,0,0.75) 100%)' }} />
      <div className="scanline" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* header */}
        <div className="flex items-center gap-3">
          <Link to="/" className="w-9 h-9 rounded-lg flex items-center justify-center border border-border hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-4 h-4" style={{ color: COLOR }} />
          </Link>
          <div>
            <h1 className="font-display text-2xl tracking-widest" style={{ color: COLOR, textShadow: `0 0 14px ${COLOR}` }}>Waveradar</h1>
            <p className="font-mono text-[10px] text-muted-foreground">Evidence-driven multimodal spatial intelligence · early product · validation-first</p>
          </div>
        </div>

        {/* hero */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-6 md:p-8 corner-decoration relative overflow-hidden">
          {/* animated radar sweep accent */}
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${COLOR}14 0%, transparent 70%)` }} />
          <div className="flex items-center gap-2 mb-3">
            <Radar className="w-5 h-5" style={{ color: COLOR }} />
            <span className="font-display text-xs tracking-widest" style={{ color: COLOR }}>THE PITCH</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl tracking-wide text-foreground leading-tight mb-4">
            One live spatial view for the sensors you already have.
          </h2>
          <p className="font-mono text-[12px] text-muted-foreground leading-relaxed max-w-2xl">
            WaveRadar turns supported device and external sensors into a real-time, replayable spatial evidence interface with provenance, uncertainty, tracking, prediction calibration, and human-review controls.
            It combines human vision, available depth and ranging measurements, motion/orientation,
            acoustic observations, and external sensor streams while keeping measured data separate from
            inference. The result is a fast operational view of people, motion, coverage, and sensor quality
            — with capability determined by the hardware actually connected.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${COLOR}20` }}>
                <div className="font-display text-sm tracking-wider" style={{ color: COLOR }}>{s.value}</div>
                <div className="font-mono text-[7px] text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* how the sonar works */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Waves className="w-4 h-4" style={{ color: COLOR }} />
            <h2 className="font-display text-sm tracking-widest" style={{ color: COLOR }}>HOW THE SONAR WORKS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {SONAR_STEPS.map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="glass-panel rounded-2xl p-4 corner-decoration relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `${COLOR}12`, border: `1px solid ${COLOR}30` }}>
                    <s.icon className="w-4 h-4" style={{ color: COLOR }} />
                  </div>
                  <span className="font-display text-2xl tracking-widest" style={{ color: `${COLOR}30` }}>{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="font-display text-[11px] tracking-widest mb-1.5" style={{ color: COLOR }}>{s.title}</div>
                <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* pitch pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PITCH.map((p, i) => (
            <motion.div key={p.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-panel rounded-2xl p-4 corner-decoration relative">
              <div className="flex items-center gap-2 mb-2">
                <p.icon className="w-4 h-4" style={{ color: COLOR }} />
                <span className="font-display text-[11px] tracking-widest" style={{ color: COLOR }}>{p.title}</span>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">{p.body}</p>
            </motion.div>
          ))}
        </div>

        {/* capabilities grid */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Layers className="w-4 h-4" style={{ color: COLOR }} />
            <h2 className="font-display text-sm tracking-widest" style={{ color: COLOR }}>CAPABILITIES</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CAPABILITIES.map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-panel rounded-xl p-3.5 flex items-start gap-2.5">
                <c.icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: COLOR }} />
                <div>
                  <div className="font-display text-[10px] tracking-widest" style={{ color: COLOR }}>{c.label}</div>
                  <p className="font-mono text-[8px] text-muted-foreground leading-relaxed mt-1">{c.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* contact / lead form */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-6 md:p-8 corner-decoration relative">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5" style={{ color: COLOR }} />
            <h2 className="font-display text-sm tracking-widest" style={{ color: COLOR }}>REQUEST A CONVERSATION</h2>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground mb-4">
            Tell us what you want to deploy, measure, or integrate. We&rsquo;ll use the conversation to validate the use case, sensor requirements, and product fit.
          </p>

          <AnimatePresence mode="wait">
            {status === 'done' ? (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <CheckCircle2 className="w-10 h-10" style={{ color: COLOR }} />
                <div className="font-display text-sm tracking-wider" style={{ color: COLOR }}>REQUEST RECEIVED</div>
                <p className="font-mono text-[10px] text-muted-foreground max-w-xs">
                  Thank you. Our team will reach out shortly to schedule a deeper conversation.
                </p>
                <button onClick={() => setStatus('idle')}
                  className="mt-2 font-mono text-[9px] text-muted-foreground hover:text-foreground underline">
                  SUBMIT ANOTHER
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="NAME *">
                    <input value={form.name} onChange={update('name')} required
                      className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:border-primary" />
                  </Field>
                  <Field label="EMAIL *">
                    <input type="email" value={form.email} onChange={update('email')} required
                      className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:border-primary" />
                  </Field>
                  <Field label="FIRM">
                    <input value={form.firm} onChange={update('firm')}
                      className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:border-primary" />
                  </Field>
                  <Field label="ROLE">
                    <input value={form.role} onChange={update('role')} placeholder="e.g. Partner, Principal"
                      className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:border-primary" />
                  </Field>
                  <Field label="CHECK SIZE">
                    <input value={form.check_size} onChange={update('check_size')} placeholder="e.g. $250K–$1M"
                      className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:border-primary" />
                  </Field>
                  <Field label="MESSAGE">
                    <input value={form.message} onChange={update('message')} placeholder="optional"
                      className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:border-primary" />
                  </Field>
                </div>

                {error && <div className="font-mono text-[9px] text-destructive">{error}</div>}

                <button type="submit" disabled={status === 'sending'}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-display text-xs tracking-widest transition-all hover:scale-[1.02] disabled:opacity-60"
                  style={{ background: `${COLOR}18`, border: `1px solid ${COLOR}40`, color: COLOR }}>
                  {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {status === 'sending' ? 'SENDING…' : 'REQUEST INTRO'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="text-center font-mono text-[8px] text-muted-foreground pb-4">
          WaveRadar · sensor-fusion spatial awareness · <Link to="/" className="hover:text-primary">open product</Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="font-mono text-[8px] text-muted-foreground tracking-wider block mb-1">{label}</span>
      {children}
    </label>
  );
}