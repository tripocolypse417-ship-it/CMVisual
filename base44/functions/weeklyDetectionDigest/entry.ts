import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { jsPDF } from 'npm:jspdf@4.2.1';

const b64url = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const chunkB64 = (b64) => (b64.match(/.{1,76}/g) || []).join('\r\n');

const TYPE_META = {
  human:   { label: 'Human',   rgb: [0, 200, 110] },
  animal:  { label: 'Animal',  rgb: [0, 140, 210] },
  object:  { label: 'Object',  rgb: [210, 150, 20] },
  unknown: { label: 'Unknown', rgb: [210, 50, 90] },
};
const typeLabel = (t) => (TYPE_META[t] || TYPE_META.unknown).label;
const fmtTime = (s) => { try { return new Date(s).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
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

function buildPdf(events, periodStart, periodEnd) {
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
  doc.setFont('helvetica', 'bold'); doc.setFontSize(30); doc.setTextColor(0, 255, 136);
  doc.text('WALLSIGHT', M, 90);
  doc.setFontSize(13); doc.setTextColor(120, 200, 160);
  doc.text('Weekly Detection Summary', M, 112);
  y = 150;
  text(`Period: ${fmtDate(periodStart)}  →  ${fmtDate(periodEnd)}`, { color: [150, 210, 180] });
  text(`Generated: ${fmtDate(new Date())}`, { color: [150, 210, 180] });
  text(`Detection events this week: ${events.length}`, { color: [150, 210, 180] });

  const moving = events.filter((e) => e.moving).length;
  const humans = events.filter((e) => e.target_type === 'human').length;
  const dists = events.map((e) => e.distance ?? 0).filter((d) => d > 0).sort((a, b) => a - b);
  const avgDist = dists.length ? dists.reduce((a, b) => a + b, 0) / dists.length : 0;
  const speeds = events.map((e) => e.speed ?? 0).filter(Boolean);
  const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const intensities = events.map((e) => e.intensity ?? 0).filter(Boolean);
  const avgIntensity = intensities.length ? intensities.reduce((a, b) => a + b, 0) / intensities.length : 0;

  y += 14;
  text('WEEKLY SUMMARY', { size: 14, color: [0, 255, 136], bold: true, gap: 10 });
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

  text('TARGET TYPES', { size: 14, color: [0, 255, 136], bold: true, gap: 10 });
  const typeCounts = {};
  events.forEach((e) => { typeCounts[e.target_type] = (typeCounts[e.target_type] || 0) + 1; });
  const typeRows = Object.entries(typeCounts).map(([t, c]) => [
    typeLabel(t), String(c), `${Math.round((c / (events.length || 1)) * 100)}%`,
  ]);
  drawTable(doc, M, y, W - 2 * M, ['Type', 'Count', 'Share'], typeRows, (ny) => { y = ny; });
  y += 18;

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

  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 160, 130);
    doc.text(`WallSight · weekly detection summary · page ${i}/${total}`, M, H - 18);
  }

  const ab = doc.output('arraybuffer');
  const bytes = new Uint8Array(ab);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // The team = all registered app users. The connected Gmail account is the
    // builder/admin, so their address is both the authenticated sender and the
    // fallback recipient. (gmail.send alone cannot read the Gmail profile API.)
    const users = await base44.asServiceRole.entities.User.list();
    const admin = (users || []).find((u) => u.role === 'admin') || (users || [])[0];
    const senderEmail = admin?.email;
    if (!senderEmail) return Response.json({ error: 'No admin user found to send the digest' }, { status: 500 });

    // Recipients = the team (all registered users), unless a test address is supplied.
    let recipients;
    if (body.test_to) {
      recipients = [body.test_to];
    } else {
      recipients = (users || []).map((u) => u.email).filter(Boolean);
      if (recipients.length === 0) recipients = [senderEmail];
    }

    // Detection events from the last 7 days.
    const now = new Date();
    const since = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const events = await base44.asServiceRole.entities.DetectionEvent.list('-created_date', 1000);
    const recent = (events || []).filter((e) => new Date(e.created_date) >= since);

    const pdfB64 = buildPdf(recent, since, now);
    const filename = `wallsight-weekly-detection-summary-${now.toISOString().slice(0, 10)}.pdf`;

    const subject = `WallSight Weekly Detection Summary — ${recent.length} event${recent.length === 1 ? '' : 's'} · ${now.toLocaleDateString('en-US')}`;
    const bodyLines = [
      'WALLSIGHT — WEEKLY DETECTION SUMMARY',
      '====================================',
      '',
      `Period: ${fmtDate(since)} → ${fmtDate(now)}`,
      `Total detection events this week: ${recent.length}`,
      `Moving targets: ${recent.filter((e) => e.moving).length}`,
      `Human contacts: ${recent.filter((e) => e.target_type === 'human').length}`,
      '',
      'The full report with timestamps and per-event details is attached as a PDF.',
      '',
      '— WallSight v2.4.1 · automated weekly digest',
    ];
    const bodyText = bodyLines.join('\r\n');

    const boundary = 'wallsight_boundary_' + Math.random().toString(36).slice(2);
    const rawMsg = [
      `From: ${senderEmail}`,
      `To: ${recipients.join(', ')}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      bodyText,
      '',
      `--${boundary}`,
      'Content-Type: application/pdf',
      `Content-Disposition: attachment; filename="${filename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      chunkB64(pdfB64),
      '',
      `--${boundary}--`,
    ].join('\r\n');

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: b64url(rawMsg) }),
    });
    const sendData = await sendRes.json();
    if (!sendRes.ok) return Response.json({ error: sendData.error?.message || 'Gmail send failed' }, { status: 500 });

    return Response.json({ ok: true, sentTo: recipients, eventCount: recent.length, messageId: sendData.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}