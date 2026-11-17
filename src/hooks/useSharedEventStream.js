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
  const [retrySignal, setRetrySignal] = useState(0);
  const [state, setState] = useState({
    status: 'IDLE',
    eventCount: 0,
    events: [],
    lastEventId: null,
    lastEventAt: null,
    channel: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    const retryAfterDevicePairing = () => {
      if (state.status === 'AUTH_REQUIRED' || state.status === 'UNAVAILABLE') {
        setRetrySignal(value => value + 1);
      }
    };
    window.addEventListener('waveradar:remote-evidence-status', retryAfterDevicePairing);
    return () => window.removeEventListener('waveradar:remote-evidence-status', retryAfterDevicePairing);
  }, [enabled, state.status]);

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
        events: rows,
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
        channel.on('event-stored', async (message) => {
          if (!active) return;
          const data = message?.data || {};
          if (sessionId && data.sessionId && String(data.sessionId) !== String(sessionId)) return;
          try {
            const oneResponse = await fetch(apiBase() + '/events/snapshot?eventId=' + encodeURIComponent(data.eventId || ''), {
              method: 'GET',
              credentials: 'include',
              headers: { Accept: 'application/json' },
              cache: 'no-store',
            });
            const oneBody = await oneResponse.json().catch(() => ({}));
            const row = Array.isArray(oneBody.events) ? oneBody.events[0] : null;
            if (!oneResponse.ok) throw new Error(oneBody.error || 'EVENT_DETAIL_HTTP_' + oneResponse.status);
            if (!row || (sessionId && String(row.session_id || '') !== String(sessionId))) return;
            setState(old => {
              const existing = old.events.some(item => item.event_id === row.event_id);
              const rows = existing ? old.events : [...old.events, row].sort((a, b) =>
                String(a.server_received_at).localeCompare(String(b.server_received_at))
              ).slice(-500);
              return {
                ...old,
                status: 'CONNECTED',
                eventCount: existing ? old.eventCount : old.eventCount + 1,
                events: rows,
                lastEventId: row.event_id || old.lastEventId,
                lastEventAt: row.server_received_at || old.lastEventAt,
                error: null,
              };
            });
            window.dispatchEvent(new CustomEvent('waveradar:shared-event-stored', { detail: data }));
          } catch (error) {
            if (active) setState(old => ({ ...old, status: 'DEGRADED', error: error.message }));
          }
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
  }, [enabled, sessionId, retrySignal]);

  return state;
}
