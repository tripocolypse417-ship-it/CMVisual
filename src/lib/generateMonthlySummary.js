import { jsPDF } from 'jspdf';

const TYPE_META = {
  human:   { label: 'Human',   rgb: [0, 200, 110] },
  animal:  { label: 'Animal',  rgb: [0, 140, 210] },
  object:  { label: 'Object',  rgb: [210, 150, 20] },
  unknown: { label: 'Unknown', rgb: [210, 50, 90] },
};
const typeLabel = (t) => (TYPE_META[t] || TYPE_META.unknown).label;
const typeRgb = (t) => (TYPE_META[t] || TYPE_META.unknown).rgb;
const fmtDate = (s) => { try { return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

// Builds a monthly summary PDF from DetectionEvent records.
// Filters to the given month (defaults to the current month), and reports
// total target count, average movement speed, and a per-day + per-type breakdown.
export default function generateMonthlySummary(events, opts = {}) {
  const now = new Date();
  const year = opts.year ?? now.getFullYear();
  const month = opts.month ?? now.getMonth(); // 0-indexed
  const teamName = opts.teamName;

  const inMonth = (events || []).filter((e) => {
    const d = e.created_date ? new Date(e.created_date) : null;
    return d && d.getFullYear() === year && d.getMonth() === month;
  });

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = M;

  const fillBg = () => { doc.setFillColor(6, 16, 10); doc.rect(0, 0, W, H, 'F'); };
  const newPage = () => { doc.addPage(); fillBg(); y = M; };
  const ensure = (h) => { if (y + h > H - M) newPage(); };
  const text = (t, o = {}) => {
    const { size = 10, color = [180, 255, 200], bold = false, gap = 5, x = M } = o;
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
  doc.text('Monthly Detection Summary', M, 112);
  y = 150;
  text(`${MONTHS[month]} ${year}`, { size: 16, color: [0, 255, 136], bold: true, gap: 8 });
  text(`Generated: ${fmtDate(new Date())}`, { color: [150, 210, 180] });
  if (teamName) text(`Team: ${teamName}`, { color: [150, 210, 180] });
  text(`Detection events this month: ${inMonth.length}`, { color: [150, 210, 180] });

  if (!inMonth.length) {
    y += 14;
    text('No detection events recorded for this month.', { color: [180, 200, 190] });
  } else {
    // Aggregate stats
    const moving = inMonth.filter((e) => e.moving).length;
    const humans = inMonth.filter((e) => e.target_type === 'human').length;
    const dists = inMonth.map((e) => e.distance ?? 0).filter((d) => d > 0).sort((a, b) => a - b);
    const avgDist = dists.length ? dists.reduce((a, b) => a + b, 0) / dists.length : 0;
    const speeds = inMonth.map((e) => e.speed ?? 0).filter(Boolean);
    const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const peakSpeed = speeds.length ? Math.max(...speeds) : 0;
    const intensities = inMonth.map((e) => e.intensity ?? 0).filter(Boolean);
    const avgIntensity = intensities.length ? intensities.reduce((a, b) => a + b, 0) / intensities.length : 0;
    const alerts = inMonth.filter((e) => e.event_type === 'alert').length;

    y += 14;
    text('MONTHLY SUMMARY', { size: 14, color: [0, 255, 136], bold: true, gap: 10 });
    drawTable(doc, M, y, W - 2 * M,
      ['Metric', 'Value'],
      [
        ['Total targets', String(inMonth.length)],
        ['Moving targets', String(moving)],
        ['Human contacts', String(humans)],
        ['Alert events', String(alerts)],
        ['Avg movement speed', `${avgSpeed.toFixed(2)} m/s`],
        ['Peak movement speed', `${peakSpeed.toFixed(2)} m/s`],
        ['Avg distance', `${avgDist.toFixed(1)} m`],
        ['Nearest contact', `${dists.length ? dists[0].toFixed(1) : '0'} m`],
        ['Farthest contact', `${dists.length ? dists[dists.length - 1].toFixed(1) : '0'} m`],
        ['Avg signal intensity', `${Math.round(avgIntensity)}%`],
      ],
      (ny) => { y = ny; }
    );
    y += 18;

    // Target-type breakdown
    text('TARGET TYPES', { size: 14, color: [0, 255, 136], bold: true, gap: 10 });
    const typeCounts = {};
    inMonth.forEach((e) => { typeCounts[e.target_type] = (typeCounts[e.target_type] || 0) + 1; });
    drawTable(doc, M, y, W - 2 * M,
      ['Type', 'Count', 'Share'],
      Object.entries(typeCounts).map(([t, c]) => [typeLabel(t), String(c), `${Math.round((c / inMonth.length) * 100)}%`]),
      (ny) => { y = ny; }
    );
    y += 18;

    // Per-day breakdown
    text('DAILY BREAKDOWN', { size: 14, color: [0, 255, 136], bold: true, gap: 10 });
    const dayBuckets = {};
    inMonth.forEach((e) => {
      const d = new Date(e.created_date);
      const key = `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
      if (!dayBuckets[key]) dayBuckets[key] = { count: 0, speedSum: 0, speedN: 0, moving: 0 };
      dayBuckets[key].count += 1;
      if (e.moving) dayBuckets[key].moving += 1;
      if (e.speed) { dayBuckets[key].speedSum += e.speed; dayBuckets[key].speedN += 1; }
    });
    drawTable(doc, M, y, W - 2 * M,
      ['Day', 'Targets', 'Moving', 'Avg speed'],
      Object.entries(dayBuckets).map(([day, b]) => [
        day,
        String(b.count),
        String(b.moving),
        `${b.speedN ? (b.speedSum / b.speedN).toFixed(2) : '0.00'} m/s`,
      ]),
      (ny) => { y = ny; }
    );
  }

  // Page footers
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 160, 130);
    doc.text(`WallSight · monthly summary · ${MONTHS[month]} ${year} · page ${i}/${total}`, M, H - 18);
  }

  doc.save(`wallsight-monthly-summary-${year}-${String(month + 1).padStart(2, '0')}.pdf`);
}