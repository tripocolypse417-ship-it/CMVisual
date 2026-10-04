import { jsPDF } from 'jspdf';

const TYPE_META = {
  human:   { label: 'Human',   rgb: [0, 200, 110] },
  animal:  { label: 'Animal',  rgb: [0, 140, 210] },
  object:  { label: 'Object',  rgb: [210, 150, 20] },
  unknown: { label: 'Unknown', rgb: [210, 50, 90] },
};
const typeLabel = (t) => (TYPE_META[t] || TYPE_META.unknown).label;
const typeRgb = (t) => (TYPE_META[t] || TYPE_META.unknown).rgb;
const fmtTime = (s) => { try { return new Date(s).toLocaleString('en-US', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }); } catch { return ''; } };
const fmtDate = (s) => { try { return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

function drawTable(doc, x, yTop, width, headers, rows, onDone) {
  const colW = width / headers.length;
  const rowH = 16;
  const H = doc.internal.pageSize.getHeight();
  const head = () => {
    doc.setFillColor(0, 40, 24); doc.rect(x, yTop, width, rowH, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 255, 136);
    headers.forEach((h, i) => doc.text(h, x + i * colW + 4, yTop + 11));
  };
  head();
  let y = yTop + rowH;
  rows.forEach((r, ri) => {
    if (y + rowH > H - 40) {
      doc.addPage(); doc.setFillColor(6, 16, 10); doc.rect(0, 0, doc.internal.pageSize.getWidth(), H, 'F');
      y = 40; head(); doc.rect(x, y - rowH, width, rowH, 'F');
      headers.forEach((h, i) => doc.text(h, x + i * colW + 4, y - rowH + 11));
      y = 40 + rowH;
    }
    if (ri % 2 === 0) { doc.setFillColor(10, 26, 16); doc.rect(x, y, width, rowH, 'F'); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 255, 200);
    r.forEach((c, i) => doc.text(String(c), x + i * colW + 4, y + 11));
    y += rowH;
  });
  onDone(y);
}

// Builds a site-analysis PDF from DetectionEvent records.
// Includes target-type breakdown, distance, and movement intensity.
export default function generateDetectionReport(events, evidenceState) {
  if (!events || !events.length) return;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = M;

  const fillBg = () => { doc.setFillColor(6, 16, 10); doc.rect(0, 0, W, H, 'F'); };
  const newPage = () => { doc.addPage(); fillBg(); y = M; };
  const ensure = (h) => { if (y + h > H - M) newPage(); };
  const text = (t, opts = {}) => {
    const { size = 10, color = [180, 255, 200], bold = false, gap = 5, x = M } = opts;
    ensure(size + gap);
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(String(t), x, y);
    y += size + gap;
  };

  fillBg();

  // Cover
  doc.setFont('helvetica', 'bold'); doc.setFontSize(30); doc.setTextColor(0, 255, 136);
  doc.text('WALLSIGHT', M, 90);
  doc.setFontSize(13); doc.setTextColor(120, 200, 160);
  doc.text('Site Analysis Report', M, 112);
  y = 150;
  text(`Generated: ${fmtDate(new Date())}`, { color: [150, 210, 180] });
  text(`Detection events analyzed: ${events.length}`, { color: [150, 210, 180] });
  if (evidenceState) text(`Overall evidence state: ${evidenceState}`, { color: [150, 210, 180] });

  // Aggregate stats
  const moving = events.filter((e) => e.moving).length;
  const humans = events.filter((e) => e.target_type === 'human').length;
  const dists = events.map((e) => e.distance ?? 0).filter((d) => d > 0).sort((a, b) => a - b);
  const avgDist = dists.length ? dists.reduce((a, b) => a + b, 0) / dists.length : 0;
  const speeds = events.map((e) => e.speed ?? 0).filter(Boolean);
  const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const intensities = events.map((e) => e.intensity ?? 0).filter(Boolean);
  const avgIntensity = intensities.length ? intensities.reduce((a, b) => a + b, 0) / intensities.length : 0;

  y += 14;
  text('SITE SUMMARY', { size: 14, color: [0, 255, 136], bold: true, gap: 10 });
  drawTable(doc, M, y, W - 2 * M,
    ['Metric', 'Value'],
    [
      ['Total events', String(events.length)],
      ['Moving targets', String(moving)],
      ['Human contacts', String(humans)],
      ['Nearest contact', `${dists.length ? dists[0].toFixed(1) : '0'} m`],
      ['Farthest contact', `${dists.length ? dists[dists.length - 1].toFixed(1) : '0'} m`],
      ['Avg distance', `${avgDist.toFixed(1)} m`],
      ['Avg speed', `${avgSpeed.toFixed(2)} m/s`],
      ['Avg signal intensity', `${Math.round(avgIntensity)}%`],
    ],
    (ny) => { y = ny; }
  );
  y += 18;

  // Target-type breakdown
  text('TARGET TYPES', { size: 14, color: [0, 255, 136], bold: true, gap: 10 });
  const typeCounts = {};
  events.forEach((e) => { typeCounts[e.target_type] = (typeCounts[e.target_type] || 0) + 1; });
  drawTable(doc, M, y, W - 2 * M,
    ['Type', 'Count', 'Share'],
    Object.entries(typeCounts).map(([t, c]) => {
      const rgb = typeRgb(t);
      return [typeLabel(t), String(c), `${Math.round((c / events.length) * 100)}%`];
    }),
    (ny) => { y = ny; }
  );
  y += 18;

  // Event log
  text('DETECTION EVENT LOG', { size: 14, color: [0, 255, 136], bold: true, gap: 10 });
  const rows = events.map((e) => [
    fmtTime(e.created_date),
    typeLabel(e.target_type),
    (e.event_type || '').replace(/_/g, ' '),
    `${(e.distance ?? 0).toFixed(1)}m`,
    `${Math.round(e.bearing ?? 0)}°`,
    e.moving ? 'YES' : 'no',
    `${(e.speed ?? 0).toFixed(2)} m/s`,
    `${Math.round(e.intensity ?? 0)}%`,
  ]);
  drawTable(doc, M, y, W - 2 * M,
    ['Time', 'Target', 'Event', 'Distance', 'Bearing', 'Moving', 'Speed', 'Intensity'],
    rows,
    (ny) => { y = ny; }
  );

  // Page footers
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 160, 130);
    doc.text(`WallSight · site analysis · page ${i}/${total}`, M, H - 18);
  }

  doc.save(`wallsight-site-analysis-${Date.now()}.pdf`);
}