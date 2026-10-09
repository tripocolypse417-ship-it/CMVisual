import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function formatEvent(event) {
  const type = (event.event_type || 'alert').toUpperCase();
  const ttype = (event.target_type || 'unknown').toUpperCase();
  const dist = event.distance != null ? `${Number(event.distance).toFixed(1)}m` : '—';
  const brg = event.bearing != null ? `${Math.round(event.bearing)}°` : '—';
  const inten = event.intensity != null ? `${Math.round(event.intensity)}%` : '—';
  const mov = event.moving ? ' · MOVING' : '';
  const spd = event.speed != null ? ` · ${Number(event.speed).toFixed(2)} m/s` : '';
  const mode = event.scan_mode ? ` · ${event.scan_mode.toUpperCase()}` : '';
  return `🛰️ *WaveRadar Sensor Event*\n*${type}* — ${ttype}${mode}\nDistance: ${dist} · Bearing: ${brg} · Signal: ${inten}${mov}${spd}\n${event.summary || ''}`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, channel, event } = body;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("slackbot");

    if (action === 'list') {
      const res = await fetch('https://slack.com/api/conversations.list?types=public_channel&limit=200', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!data.ok) return Response.json({ error: data.error }, { status: 502 });
      const channels = (data.channels || []).map(c => ({ id: c.id, name: c.name }));
      return Response.json({ channels });
    }

    if (action === 'post') {
      if (!channel || !event) return Response.json({ error: 'channel and event required' }, { status: 400 });
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          text: formatEvent(event),
          username: 'WaveRadar',
          icon_emoji: ':satellite:',
        }),
      });
      const data = await res.json();
      if (!data.ok) return Response.json({ error: data.error }, { status: 502 });
      return Response.json({ success: true, ts: data.ts });
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}