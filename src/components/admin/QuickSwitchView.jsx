import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, History, Repeat } from 'lucide-react';
import CameraARView from '@/components/CameraARView';
import SnapshotArchive from '@/components/admin/SnapshotArchive';

export default function QuickSwitchView({ teams, me, color = '#00ff88' }) {
  const [view, setView] = useState('live');
  const [detections, setDetections] = useState([]);
  const [isScanning, setIsScanning] = useState(true);

  const tabs = [
    { id: 'live', label: 'LIVE CAMERA', icon: Camera },
    { id: 'snapshots', label: 'LATEST SNAPSHOTS', icon: History },
  ];

  return (
    <div className="space-y-4">
      {/* segmented quick-switch toggle */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl"
        style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${color}25` }}>
        {tabs.map((t) => {
          const active = view === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setView(t.id)}
              className="relative flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[10px] tracking-wider transition-colors"
              style={{ color: active ? color : 'rgba(255,255,255,0.55)' }}>
              {active && (
                <motion.div layoutId="quickswitch-pill" className="absolute inset-0 rounded-lg"
                  style={{ background: `${color}18`, border: `1px solid ${color}50` }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
              )}
              <span className="relative flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </span>
            </button>
          );
        })}
        <div className="flex items-center gap-1.5 pl-3 pr-2 ml-1 border-l" style={{ borderColor: `${color}20` }}>
          <Repeat className="w-3 h-3" style={{ color: `${color}90` }} />
          <span className="font-mono text-[8px] tracking-wider text-muted-foreground">QUICK SWITCH</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'live' ? (
          <motion.div key="live"
            initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: `${color}30`, height: '72vh', minHeight: 460 }}>
            <CameraARView
              detections={detections}
              scanMode="sonar"
              isScanning={isScanning}
              onDetections={setDetections}
              onCameraActive={setIsScanning}
            />
          </motion.div>
        ) : (
          <motion.div key="snapshots"
            initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.2 }}>
            <SnapshotArchive teams={teams} me={me} color={color} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}