import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Twitter, Github, Linkedin } from 'lucide-react';

export default function Contact() {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="hud-grid-bg fixed inset-0 opacity-100 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 font-mono text-[10px] tracking-widest text-primary/70 hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> BACK TO APP
        </Link>
        <h1 className="font-display text-2xl tracking-wider text-primary mb-6">Contact the WaveRadar Team</h1>
        <p className="font-mono text-sm leading-relaxed text-foreground/80 mb-8">
          Questions, feedback, or deployment inquiries? We would love to hear from you. Reach out through any of the channels below and a member of the WaveRadar team will get back to you.
        </p>
        <div className="space-y-4">
          <a href="mailto:hello@waveradar.app" className="flex items-center gap-3 p-4 rounded-xl glass-panel hover:scale-[1.01] transition-transform">
            <Mail className="w-5 h-5" style={{ color: '#00ff88' }} />
            <div>
              <div className="font-display text-xs tracking-wider text-primary">EMAIL</div>
              <div className="font-mono text-sm text-foreground/80">hello@waveradar.app</div>
            </div>
          </a>
          <div className="flex flex-wrap gap-3">
            <a href="https://twitter.com/waveradar" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-xl glass-panel hover:scale-[1.01] transition-transform">
              <Twitter className="w-4 h-4" style={{ color: '#00ff88' }} />
              <span className="font-mono text-xs text-foreground/80">X / Twitter</span>
            </a>
            <a href="https://github.com/waveradar" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-xl glass-panel hover:scale-[1.01] transition-transform">
              <Github className="w-4 h-4" style={{ color: '#00ff88' }} />
              <span className="font-mono text-xs text-foreground/80">GitHub</span>
            </a>
            <a href="https://linkedin.com/company/waveradar" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-xl glass-panel hover:scale-[1.01] transition-transform">
              <Linkedin className="w-4 h-4" style={{ color: '#00ff88' }} />
              <span className="font-mono text-xs text-foreground/80">LinkedIn</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}