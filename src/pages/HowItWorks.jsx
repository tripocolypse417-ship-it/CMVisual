import { Link } from 'react-router-dom';
import { Radar, ArrowLeft } from 'lucide-react';

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="hud-grid-bg fixed inset-0 opacity-100 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 font-mono text-[10px] tracking-widest text-primary/70 hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> BACK TO APP
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#00ff8815', border: '1px solid #00ff8840' }}>
            <Radar className="w-5 h-5" style={{ color: '#00ff88' }} />
          </div>
          <h1 className="font-display text-2xl tracking-wider text-primary">How WaveRadar Builds a Spatial View</h1>
        </div>
        <div className="space-y-4 font-mono text-sm leading-relaxed text-foreground/80">
          <p>WaveRadar combines measurements that the device or a connected sensor can actually provide. Phone camera AI uses COCO-SSD object detection and MoveNet pose estimation for people, animals, and objects that are visible to the camera. Accelerometer, gyroscope, magnetometer, battery, ambient-light, network, and location APIs provide device context when the browser grants access.</p>
          <p>External ranging or RF hardware can supply additional observations such as bearing, range, motion, signal quality, and uncertainty. Those observations are kept separate from camera observations and are never fabricated when the hardware is absent or a measurement is stale. The live workspace labels the source so an estimate is not mistaken for a direct camera observation.</p>
          <p>The 2D and 3D views are measurement-oriented rather than pre-filled with an invented room. Geometry is added only when supported by available observations. Camera depth estimates, sensor-derived positions, and uncertainty are presented as estimates with their limitations rather than as proof that a person or object is physically located behind a wall.</p>
          <p>Team sharing and connected-alert integrations are configuration-dependent and must be tested end-to-end for delivery, latency, access control, and failure handling. Until those tests are complete, treat them as prototype/integration workflows—not emergency-grade communications or guaranteed real-time alerts.</p>
        </div>
      </div>
    </div>
  );
}