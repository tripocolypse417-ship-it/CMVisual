import { Link } from 'react-router-dom';
import { Radar, ArrowLeft } from 'lucide-react';

export default function About() {
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
          <h1 className="font-display text-2xl tracking-wider text-primary">About WaveRadar</h1>
        </div>
        <div className="space-y-4 font-mono text-sm leading-relaxed text-foreground/80">
          <p>WaveRadar is a real-time spatial visualization system. It combines actual camera detections with supported device and external sensor telemetry and presents those observations in a unified radar-style workspace.</p>
          <p>Camera detections are generated from live video on the device. Non-visual detections are accepted only from supported external ranging sources that provide measurements. Ordinary phone WiFi, cellular, microphone, or motion sensors are not treated as proof of a person behind a wall.</p>
          <p>The interface keeps measured observations, derived estimates, and unavailable capabilities distinct. It does not generate synthetic human targets or claim identity, gender, intent, psychology, heartbeat, or other biometrics without validated supporting data.</p>
          <p>This prototype does not currently establish validated through-wall detection. Ordinary phone camera, Wi-Fi, cellular, microphone, or motion sensors are not proof of a person behind a wall. Any future non-line-of-sight capability must use appropriate external sensing hardware and be tested against independent ground truth. WaveRadar is not a substitute for established emergency procedures or safety equipment.</p>
        </div>
      </div>
    </div>
  );
}