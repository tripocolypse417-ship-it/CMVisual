import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import generateDetectionReport from '@/lib/generateDetectionReport';
import { FileText, Download, Loader2, AlertCircle } from 'lucide-react';

const RANGES = [
  { label: 'Last 50', value: 50 },
  { label: 'Last 100', value: 100 },
  { label: 'Last 200', value: 200 },
];

export default function DetectionReportExport({ color = '#00ff88' }) {
  const [limit, setLimit] = useState(100);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [error, setError] = useState('');
  const [count, setCount] = useState(null);

  const exportPdf = useCallback(async () => {
    setStatus('loading'); setError('');
    try {
      const events = await base44.entities.DetectionEvent.list('-created_date', limit);
      if (!events || events.length === 0) {
        setError('No detection logs to export yet — run a scan first.');
        setStatus('error');
        return;
      }
      setCount(events.length);
      generateDetectionReport(events);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 4000);
    } catch (e) {
      setError(e?.message || 'Failed to generate report.');
      setStatus('error');
    }
  }, [limit]);

  const statusColor = status === 'done' ? '#00ff88' : status === 'error' ? '#ff4466' : color;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <FileText className="w-3.5 h-3.5" style={{ color }} />
        <span className="font-display text-[10px] tracking-wider text-foreground">DETECTION REPORT</span>
      </div>

      <p className="font-mono text-[8px] text-muted-foreground leading-relaxed">
        Export your detection logs into a professional PDF — site summary, target breakdown, and full event log — ready to share with your team or investors.
      </p>

      <div>
        <label className="font-mono text-[8px] text-muted-foreground tracking-wider">SCOPE</label>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}
          className="w-full mt-1 px-2 py-1.5 rounded-md bg-black/40 border font-mono text-[10px] outline-none"
          style={{ borderColor: `${color}30`, color: '#ffffffcc' }}>
          {RANGES.map((r) => <option key={r.value} value={r.value} className="bg-black">{r.label} events</option>)}
        </select>
      </div>

      <button onClick={exportPdf} disabled={status === 'loading'}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border font-mono text-[10px] tracking-wider transition-all disabled:opacity-60"
        style={{ borderColor: `${statusColor}50`, color: statusColor, background: `${statusColor}12` }}>
        {status === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> :
         status === 'done' ? <FileText className="w-3 h-3" /> :
         status === 'error' ? <AlertCircle className="w-3 h-3" /> :
         <Download className="w-3 h-3" />}
        {status === 'loading' ? 'GENERATING…' : status === 'done' ? 'PDF DOWNLOADED ✓' : status === 'error' ? 'RETRY' : 'EXPORT PDF'}
      </button>

      {error && <p className="font-mono text-[8px] text-destructive leading-tight">{error}</p>}
      {status === 'done' && <p className="font-mono text-[8px] leading-tight" style={{ color }}>Report with {count} events saved to your downloads.</p>}
    </div>
  );
}