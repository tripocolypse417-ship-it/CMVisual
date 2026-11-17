import { useEffect, useState } from 'react';

let eventsClientScriptPromise;

function apiBase() {
  const configured = typeof window !== 'undefined' ? window.__HATCHABLE__?.api : null;
  return new URL(String(configured || 'https://waveradar-20.hatchable.site/api').replace(/\/+$/, '') + '/', window.location.origin).toString().replace(/\/$/, '');
}

function loadEventsClient() {
  if (window.hatchable?.events) return Promise.resolve();
  if (eventsClientScriptPromise) return eventsClientScriptPromise;
  const source = new URL('/__hatchable/events.js', new URL(apiBase() + '/').origin).toString();
  eventsClientScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = source;
    script.async = true;
    script.onload = () => window.hatchable?.events ? resolve() : reject(new Error('HATCHABLE_EVENTS_CLIENT_UNAVAILABLE'));
    script.onerror = () => reject(new Error('HATCHABLE_EVENTS_CLIENT_LOAD_FAILED'));
    document.head.appendChild(script);
  }).catch((error) => {
    eventsClientScriptPromise = null;
    throw error;
  });
  return eventsClientScriptPromise;
}

export default function useSharedEventStream(sessionId = null, enabled = true) {
  const [state, setState] = useState({
    status: 'IDLE',
    eventCount: 0,
    lastEventId: null,
    lastEventAt: null,
    channel: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    let active = true;
    let client;
    let channel;

    const refreshSnapshot = async () => {
      const query = new URLSearchParams({ limit: '500' });
      if (sessionId) query.set('sessionId', String(sessionId));
      const response = await fetch(apiBase() + '/events/snapshot?' + query.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(body.error || 'EVENT_SNAPSHOT_HTTP_' + response.status);
        error.status = response.status;
        throw error;
      }
      const rows = Array.isArray(body.events) ? body.events : [];
      const last = rows[rows.length - 1] || null;
      if (active) setState(old => ({
        ...old,
        eventCount: Number(body.count || 0),
        lastEventId: last?.event_id || old.lastEventId,
        lastEventAt: last?.server_received_at || old.lastEventAt,
      }));
    };

    const start = async () => {
      setState(old => ({ ...old, status: 'CONNECTING', error: null }));
      try {
        const tokenResponse = await fetch(apiBase() + '/events-token', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const tokenBody = await tokenResponse.json().catch(() => ({}));
        if (!tokenResponse.ok) {
          const error = new Error(tokenBody.error || 'EVENT_AUTH_HTTP_' + tokenResponse.status);
          error.status = tokenResponse.status;
          throw error;
        }
        if (typeof tokenBody.channel !== 'string' || !tokenBody.channel) {
          throw new Error('EVENT_CHANNEL_MISSING');
        }

        // Snapshot first, then subscribe. The platform client owns reconnect
        // and missed-event replay; no app-level polling loop is added.
        await refreshSnapshot();
        await loadEventsClient();
        if (!active) return;
        client = window.hatchable.events.connect({ authUrl: apiBase() + '/events-token' });
        channel = client.channel(tokenBody.channel);
        channel.on('event-stored', (message) => {
          if (!active) return;
          const data = message?.data || {};
          if (sessionId && data.sessionId && String(data.sessionId) !== String(sessionId)) return;
          setState(old => ({
            ...old,
            status: 'CONNECTED',
            eventCount: old.eventCount + 1,
            lastEventId: data.eventId || old.lastEventId,
            lastEventAt: data.serverReceivedAt || old.lastEventAt,
            error: null,
          }));
          window.dispatchEvent(new CustomEvent('waveradar:shared-event-stored', { detail: data }));
        });
        channel.on('$reset', () => {
          refreshSnapshot().catch(error => {
            if (active) setState(old => ({ ...old, status: 'DEGRADED', error: error.message }));
          });
        });
        setState(old => ({ ...old, status: 'CONNECTED', channel: tokenBody.channel, error: null }));
      } catch (error) {
        if (!active) return;
        setState(old => ({
          ...old,
          status: error?.status === 401 || error?.status === 403 ? 'AUTH_REQUIRED' : 'UNAVAILABLE',
          error: error?.message || 'EVENT_STREAM_UNAVAILABLE',
        }));
      }
    };

    start();
    return () => {
      active = false;
      // The platform client manages its own reconnect lifecycle. The Home
      // workspace remains mounted for the app session; no transport internals
      // are assumed here.
    };
  }, [enabled, sessionId]);

  return state;
}
