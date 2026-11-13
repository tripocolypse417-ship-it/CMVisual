import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAdmin } from '../_shared/auth.ts';

function formatEvent(event) {
  const type = (event.event_type || 'alert').toUpperCase();
  const ttype = (event.target_type || 'unknown').toUpperCase();
  const dist = event.distance != null ? `${Number(event.distance).toFixed(1)}m` : '—';
  const brg = event.bearing != null ? `${Math.round(event.bearing)}°` : '—';
  const inten = event.intensity != null ? `${Math.round(event.intensity)}%` : '—';
  const mov = event.moving ? ' · MOVING' : '';
  const spd = event.speed != null ? ` · ${Number(event.speed).toFixed(2)} m/s` : '';
  const mode = event.scan_mode ? ` · ${event.scan_mode.toUpperCase()}` : '';
  const summary = String(event.summary || '').replace(/[&<>]/g, '').slice(0, 800);
  return `🛰️ *WaveRadar Sensor Event*\n*${type}* — ${ttype}${mode}\nDistance: ${dist} · Bearing: ${brg} · Signal: ${inten}${mov}${spd}\n${summary}`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.response) return auth.response;
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
      if (!channel || typeof channel !== 'string' || channel.length > 100 || !event || typeof event !== 'object') {
        return Response.json({ error: 'valid channel and event required' }, { status: 400 });
      }
      const allowedChannels = (Deno.env.get('WAVERADAR_SLACK_ALLOWED_CHANNELS') || '').split(',').map(value => value.trim()).filter(Boolean);
      if (!allowedChannels.length) return Response.json({ error: 'Slack posting is disabled until an allowed-channel list is configured' }, { status: 503 });
      if (!allowedChannels.includes(channel)) return Response.json({ error: 'Channel is not approved for WaveRadar alerts' }, { status: 403 });
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