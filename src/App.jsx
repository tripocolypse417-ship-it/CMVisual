import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import PhysicalValidation from './pages/PhysicalValidation';

const CMVISUAL_BOOT_SAFE_MODE = false;
import Admin from './pages/Admin';
import About from './pages/About';
import Contact from './pages/Contact';
import HowItWorks from './pages/HowItWorks';
import Investors from './pages/Investors';
// Add page imports here

class CMVisualErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[CMVisual] runtime failure', error, info); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-mono"><div className="max-w-3xl mx-auto mt-8 rounded-2xl border border-amber-400/30 bg-slate-900 p-5"><div className="text-amber-300 text-sm tracking-[0.2em]">CMVISUAL · RUNTIME RECOVERY</div><h1 className="mt-3 text-xl font-semibold">The interface hit a rendering error.</h1><p className="mt-2 text-sm text-slate-400">The project is intact. This recovery shell prevents a WebGL or component failure from becoming a blank screen.</p><div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-500 break-words">{this.state.error?.message || 'Unknown runtime error'}</div><div className="mt-4 flex gap-2"><button onClick={() => window.location.reload()} className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-300">RELOAD APP</button><button onClick={() => this.setState({ hasError: false, error: null })} className="rounded-lg border border-white/15 px-4 py-2 text-xs text-slate-300">RETRY UI</button></div></div></div>;
  }
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/physical-validation" element={<PhysicalValidation />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  if (CMVISUAL_BOOT_SAFE_MODE) {
    return (
      <div style={{minHeight:'100vh',background:'#020617',color:'#e2e8f0',fontFamily:'system-ui',padding:'24px'}}>
        <div style={{maxWidth:900,margin:'0 auto',border:'1px solid #334155',borderRadius:16,padding:24,background:'#0f172a'}}>
          <h1 style={{margin:0,color:'#6ee7b7'}}>CMVisual</h1>
          <p style={{color:'#94a3b8'}}>Boot-safe recovery mode</p>
          <div style={{padding:20,border:'1px solid #334155',borderRadius:12}}>Application shell is rendering. Advanced modules are temporarily isolated.</div>
        </div>
      </div>
    )
  }

  return (
    <CMVisualErrorBoundary>
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <Routes>
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/investors" element={<Investors />} />
            <Route path="*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
    </CMVisualErrorBoundary>
  )
}

export default App