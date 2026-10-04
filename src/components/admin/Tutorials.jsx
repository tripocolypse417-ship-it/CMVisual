import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Camera, Waves, Flame, Eye, Layers, ZoomIn, Share2, MessageSquare, Wind,
  Users, UserPlus, Link2, Shield, Radio, Trash2, ShieldAlert, FileText, Repeat, History,
  Megaphone, BookOpen,
} from 'lucide-react';

const ROLES = [
  {
    id: 'operator',
    label: 'OPERATOR',
    icon: Eye,
    blurb: 'Running the scanner on the main radar view.',
    steps: [
      { icon: Camera, title: 'Activate Camera', body: 'Tap ACTIVATE CAMERA to start the rear-facing AI vision — real people, animals, and objects are tracked live.' },
      { icon: Waves, title: 'Scan Modes', body: 'Switch Sonar / Thermal / Motion to restyle detection colors and tint for the situation.' },
      { icon: Eye, title: 'Read Targets', body: 'Green = human, blue = animal, amber = object, red = unknown. Tap any target for distance, bearing, and confidence.' },
      { icon: Layers, title: 'Spatial Overlay', body: 'Use the overlay controls to compare live camera observations with connected-sensor observations. Unverified spatial estimates are clearly separated from camera detections.' },
      { icon: ZoomIn, title: 'Auto-Zoom', body: 'Enable auto-zoom to lock onto near targets, or zoom manually to inspect a contact.' },
      { icon: Flame, title: 'Heat Map', body: 'Toggle HEAT to visualize where movement intensity builds up over time.' },
      { icon: Camera, title: 'Take Snapshot', body: 'Tap TAKE SNAPSHOT to save the current scan for later comparison and reporting.' },
      { icon: Share2, title: 'Share Snapshot', body: 'Pick a team when saving to share the snapshot with teammates in real time.' },
      { icon: MessageSquare, title: 'Snapshot Notes', body: 'Open any snapshot and add notes so the team can discuss what was seen.' },
      { icon: Wind, title: 'Ghost Trails', body: 'Toggle ghost mode to overlay past movement paths on the live feed.' },
    ],
  },
  {
    id: 'teamadmin',
    label: 'TEAM ADMIN / OWNER',
    icon: Shield,
    blurb: 'Managing a team, its members, and shared scans.',
    steps: [
      { icon: Users, title: 'Create Team', body: 'Name it and add a description — a share code is generated automatically.' },
      { icon: UserPlus, title: 'Invite Members', body: 'Paste emails (comma, space, or newline separated) to bulk-add the whole roster at once.' },
      { icon: Link2, title: 'Share Code', body: 'Copy the invite link, or regenerate the code if it leaks.' },
      { icon: Shield, title: 'Roles', body: 'Promote members to admin or demote them; the owner role is fixed.' },
      { icon: Radio, title: 'Member Feeds', body: 'LIVE FEEDS shows each member’s snapshot activity, live.' },
      { icon: Trash2, title: 'Manage Snapshots', body: 'Delete any shared snapshot from the feed to keep things clean.' },
      { icon: ShieldAlert, title: 'Evidence Assessment', body: 'EVIDENCE summarizes validated activity, proximity, corroboration, and signal quality. It is an operational evidence state, not an identification or prediction of intent.' },
      { icon: FileText, title: 'PDF Report', body: 'Export a site-analysis PDF (target types, distance, intensity) from the Evidence tab.' },
      { icon: Repeat, title: 'Quick Switch', body: 'Flip between the live camera and the latest snapshots without reloading.' },
      { icon: History, title: 'Archive', body: 'Browse all historical snapshots filtered by team and scan mode.' },
    ],
  },
  {
    id: 'appadmin',
    label: 'APP ADMIN',
    icon: ShieldAlert,
    blurb: 'Platform-wide oversight across every team.',
    steps: [
      { icon: Shield, title: 'All Teams', body: 'Everything a team admin can do, across every team in the system.' },
      { icon: History, title: 'All-Team Archive', body: 'See snapshots from every team in one centralized archive.' },
      { icon: ShieldAlert, title: 'Threat Console', body: 'Full situational intelligence plus an AI situational brief with prioritized options.' },
      { icon: Megaphone, title: 'Slack Alerts', body: 'Critical radar events auto-post to the team Slack channel for instant awareness.' },
      { icon: Share2, title: 'Facebook Promo', body: 'Publish scan highlights to your linked Facebook Pages.' },
      { icon: FileText, title: 'Site Analysis PDF', body: 'Generate shareable site-analysis reports for any location.' },
      { icon: Repeat, title: 'Quick Switch', body: 'Jump between the live camera feed and latest snapshots in one tap.' },
      { icon: GraduationCap, title: 'Train the Team', body: 'Use this Tutorials tab to walk operators and team admins through every feature.' },
    ],
  },
];

export default function Tutorials({ color = '#00ff88' }) {
  const [role, setRole] = useState('operator');
  const active = ROLES.find((r) => r.id === role);

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center gap-2">
        <GraduationCap className="w-4 h-4" style={{ color }} />
        <h2 className="font-display text-xs tracking-wider" style={{ color }}>ROLE TUTORIALS</h2>
        <span className="font-mono text-[8px] text-muted-foreground">short · covers every feature</span>
      </div>

      {/* role selector */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl flex-wrap"
        style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${color}25` }}>
        {ROLES.map((r) => {
          const on = role === r.id;
          const Icon = r.icon;
          return (
            <button key={r.id} onClick={() => setRole(r.id)}
              className="relative flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[10px] tracking-wider transition-colors"
              style={{ color: on ? color : 'rgba(255,255,255,0.55)' }}>
              {on && (
                <motion.div layoutId="tutorial-pill" className="absolute inset-0 rounded-lg"
                  style={{ background: `${color}18`, border: `1px solid ${color}50` }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
              )}
              <span className="relative flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" /> {r.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
        <BookOpen className="w-3.5 h-3.5" style={{ color: `${color}90` }} />
        {active.blurb}
      </div>

      {/* step grid */}
      <AnimatePresence mode="wait">
        <motion.div key={role}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {active.steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}20` }}>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${color}14`, border: `1px solid ${color}35` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <span className="font-mono text-[8px] text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="min-w-0">
                  <div className="font-display text-[11px] tracking-wider mb-0.5" style={{ color }}>{s.title}</div>
                  <div className="font-mono text-[9px] text-foreground/80 leading-relaxed">{s.body}</div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}