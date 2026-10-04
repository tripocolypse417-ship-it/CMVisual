import { jsPDF } from 'jspdf';

const TYPE_META = {
  human:   { label: 'Human',   rgb: [0,200,110] },
  animal:  { label: 'Animal',  rgb: [0,140,210] },
  object:  { label: 'Object',  rgb: [210,150,20] },
  unknown: { label: 'Unknown', rgb: [210,50,90] },
};
const typeLabel = t => (TYPE_META[t] || TYPE_META.unknown).label;
const typeRgb   = t => (TYPE_META[t] || TYPE_META.unknown).rgb;
const parseDets = s => { try { return JSON.parse(s.detections_json || '[]'); } catch { return []; } };
const fmtDate = s => { try { return new Date(s).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }); } catch { return ''; } };
const bearingSpan = d => d.length ? Math.round(Math.max(...d.map(x=>x.angle)) - Math.min(...d.map(x=>x.angle))) : 0;

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
      doc.addPage(); doc.setFillColor(6,16,10); doc.rect(0,0,doc.internal.pageSize.getWidth(),H,'F');
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

function drawRadar(doc, cx, cy, r, dets, rgb) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]); doc.setLineWidth(0.5);
  [0.5, 0.75, 1].forEach(f => doc.circle(cx, cy, r * f, 'S'));
  doc.line(cx, cy - r, cx, cy + r); doc.line(cx - r, cy, cx + r, cy);
  dets.forEach(d => {
    const rad = (d.angle * Math.PI) / 180;
    const dist = (d.distance / 100) * r;
    const px = cx + dist * Math.cos(rad - Math.PI / 2);
    const py = cy + dist * Math.sin(rad - Math.PI / 2);
    const c = typeRgb(d.type);
    doc.setFillColor(c[0], c[1], c[2]); doc.circle(px, py, 2.5, 'F');
  });
}

export default function generateReport(snapshots) {
  if (!snapshots || !snapshots.length) return;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = M;

  const fillBg = () => { doc.setFillColor(6, 16, 10); doc.rect(0, 0, W, H, 'F'); };
  const newPage = () => { doc.addPage(); fillBg(); y = M; };
  const ensure = h => { if (y + h > H - M) newPage(); };
  const text = (t, opts = {}) => {
    const { size = 10, color = [180,255,200], bold = false, gap = 5, x = M } = opts;
    ensure(size + gap);
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(String(t), x, y);
    y += size + gap;
  };
  const divider = () => { ensure(12); doc.setDrawColor(0,255,136); doc.setLineWidth(0.5); doc.line(M, y, W - M, y); y += 12; };

  fillBg();

  // Cover
  doc.setFont('helvetica', 'bold'); doc.setFontSize(30); doc.setTextColor(0, 255, 136);
  doc.text('WALLSIGHT', M, 90);
  doc.setFontSize(13); doc.setTextColor(120, 200, 160);
  doc.text('Scan Findings Report', M, 112);
  y = 150;
  text(`Generated: ${fmtDate(new Date())}`, { color: [150,210,180] });
  text(`Snapshots analyzed: ${snapshots.length}`, { color: [150,210,180] });
  const allDets = snapshots.flatMap(parseDets);
  const humans = allDets.filter(d => d.type === 'human').length;
  const moving = allDets.filter(d => d.moving).length;
  text(`Total targets identified: ${allDets.length}`, { color: [150,210,180] });
  text(`Humans detected: ${humans}   ·   Moving targets: ${moving}`, { color: [150,210,180] });

  y += 16;
  text('SUMMARY', { size: 14, color: [0,255,136], bold: true, gap: 10 });
  drawTable(doc, M, y, W - 2 * M,
    ['Snapshot', 'Mode', 'Targets', 'Humans', 'Moving'],
    snapshots.map(s => {
      const d = parseDets(s);
      return [s.label, (s.scan_mode || '').toUpperCase(), String(s.detection_count ?? d.length), String(d.filter(x => x.type === 'human').length), String(d.filter(x => x.moving).length)];
    }),
    ny => { y = ny; }
  );
  y += 18;

  snapshots.forEach((snap, idx) => {
    if (idx > 0) newPage();
    y = M;
    const d = parseDets(snap);
    const modeRgb = { sonar:[0,200,110], thermal:[220,90,40], motion:[0,140,210] }[snap.scan_mode] || [0,200,110];
    text(`#${idx + 1}   ${snap.label}`, { size: 15, color: modeRgb, bold: true, gap: 6 });
    text(`Date: ${fmtDate(snap.created_date)}   ·   Mode: ${(snap.scan_mode || '').toUpperCase()}   ·   Targets: ${d.length}`, { size: 9, color: [140,200,170] });
    y += 6; divider();

    // Mini radar + dimension summary
    const radarR = 70, cx = M + radarR, cy = y + radarR;
    drawRadar(doc, cx, cy, radarR, d, modeRgb);
    const colX = cx + radarR + 24;
    let sy = cy - radarR + 10;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 255, 136);
    doc.text('DIMENSIONS', colX, sy); sy += 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(180, 255, 200);
    const dists = d.map(x => x.distance).sort((a, b) => a - b);
    doc.text(`Range: ${dists.length ? dists[0].toFixed(1) : '0'}m – ${dists.length ? dists[dists.length-1].toFixed(1) : '0'}m`, colX, sy); sy += 14;
    doc.text(`Avg distance: ${dists.length ? (dists.reduce((a,b)=>a+b,0)/dists.length).toFixed(1) : '0'}m`, colX, sy); sy += 14;
    doc.text(`Bearing span: ${bearingSpan(d)}°`, colX, sy); sy += 14;
    const counts = {}; d.forEach(x => { counts[x.type] = (counts[x.type] || 0) + 1; });
    Object.entries(counts).forEach(([t, c]) => {
      const rgb = typeRgb(t);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.circle(colX + 3, sy - 3, 3, 'F');
      doc.text(`${typeLabel(t)}: ${c}`, colX + 12, sy); sy += 14;
    });
    y = Math.max(y + 2 * radarR + 16, sy + 4);

    text('IDENTIFIED OBJECTS', { size: 11, color: [0,255,136], bold: true, gap: 8 });
    const rows = d.map((x, i) => [String(i+1), typeLabel(x.type), `${x.distance.toFixed(1)}m`, `${Math.round(x.angle)}°`, `${Math.round(x.intensity || 0)}%`, x.moving ? 'YES' : 'no', `${(x.speed || 0).toFixed(1)} m/s`]);
    if (rows.length) {
      drawTable(doc, M, y, W - 2 * M, ['#','Type','Distance','Bearing','Signal','Moving','Speed'], rows, ny => { y = ny; });
    } else {
      text('No detections recorded.', { size: 9, color: [120,180,150] });
    }
    y += 10;

    const withWalls = d.filter(x => x.wallLayers && x.wallLayers.length);
    if (withWalls.length) {
      text('WALL COMPOSITION', { size: 11, color: [0,255,136], bold: true, gap: 8 });
      withWalls.forEach(x => {
        const layers = x.wallLayers.map(l => `${l.material} ${l.thickness} (${l.density}%)`).join('  ·  ');
        const wrapped = doc.splitTextToSize(`${typeLabel(x.type)} @ ${x.distance.toFixed(1)}m: ${layers}`, W - 2 * M);
        ensure(wrapped.length * 12 + 4);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(170, 230, 190);
        doc.text(wrapped, M, y);
        y += wrapped.length * 12 + 4;
      });
      y += 8;
    }

    if (snap.notes) {
      text('NOTES', { size: 10, color: [0,255,136], bold: true, gap: 6 });
      const wrapped = doc.splitTextToSize(snap.notes, W - 2 * M);
      ensure(wrapped.length * 12 + 4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(170, 230, 190);
      doc.text(wrapped, M, y);
      y += wrapped.length * 12 + 4;
    }
  });

  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 160, 130);
    doc.text(`WallSight · page ${i}/${total}`, M, H - 18);
  }

  doc.save(`wallsight-report-${Date.now()}.pdf`);
}