import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const GRAPH = 'https://graph.facebook.com/v25.0';

// Curated rotating promo library. Each entry is posted in turn by the
// auto-campaign so the Page never repeats the same content back-to-back.
const PROMO_POSTS = [
  {
    title: 'WaveRadar — Evidence-Driven Situational Awareness',
    message: `WaveRadar is developing a phone-first situational-awareness platform that brings sensor observations, validation status, and operational context into one workflow. Capabilities are being tested incrementally; experimental and simulated outputs are labeled separately from measured evidence.\n\nOur goal is to help teams understand what is known, what is uncertain, and what still needs verification.\n\n#WaveRadar #SituationalAwareness #ResponsibleAI #PublicSafety`
  },
  {
    title: 'World Information Station — Connected Context',
    message: `The WaveRadar World Information Station concept is designed to connect authorized data sources, preserve provenance, and present information with freshness and uncertainty indicators. A source is not treated as operational until its connection and data quality have been checked.\n\nOpen interfaces and careful evidence handling are central to the project.\n\n#WaveRadar #OpenData #SensorFusion #DataQuality`
  },
  {
    title: 'Research Update — Sensor Fusion',
    message: `Sensor fusion is more than combining signals. Reliable results require aligned timestamps, compatible coordinate systems, independent corroboration, and explicit uncertainty. WaveRadar is building and testing these foundations before making claims about field performance.\n\n#WaveRadar #SensorFusion #Engineering #ResponsibleAI`
  },
  {
    title: 'Training Mode — Practice Before Deployment',
    message: `A useful emergency-response interface should let teams practice decisions in a clearly labeled simulation before any operational use. WaveRadar's demonstration work separates simulated scenarios from measured observations and does not replace established emergency procedures or certified equipment.\n\n#WaveRadar #FirefighterTraining #EmergencyPreparedness`
  },
  {
    title: 'Validation — Evidence Before Claims',
    message: `WaveRadar treats validation as a core feature: record what was measured, identify what was inferred, and make missing or unavailable evidence visible. Performance claims must be supported by repeatable tests against known ground truth.\n\n#WaveRadar #Validation #PublicSafetyTech #EvidenceBased`
  },
  {
    title: 'Open and Portable by Design',
    message: `WaveRadar is working toward documented interfaces and a portable architecture so organizations can evaluate the software, understand data flows, and avoid unnecessary platform lock-in. Sensitive operational data should remain under the control of the organization that owns it.\n\n#WaveRadar #OpenSource #PrivacyByDesign #Interoperability`
  },
  {
    title: 'Admin Dashboard — Operational Clarity',
    message: `An operational dashboard should make system health understandable: source freshness, failed jobs, validation status, access history, and unresolved conflicts. WaveRadar's goal is to make the evidence behind a result easier to inspect—not to hide uncertainty behind a single score.\n\n#WaveRadar #DataGovernance #Observability`
  },
  {
    title: 'Built for Practical Field Feedback',
    message: `WaveRadar is being developed around practical field constraints: readable mobile screens, simple setup, transparent sensor availability, and clear offline or synchronization status. Feedback from qualified responders and independent testers will be important before any safety-critical deployment.\n\n#WaveRadar #HumanFactors #EmergencyResponse #Accessibility`
  }
];

// Resolve the Page access token for a given pageId from the connected user account.
async function resolvePageToken(userToken, pageId) {
  const ar = await fetch(`${GRAPH}/me/accounts?fields=id,access_token&limit=100`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const adata = await ar.json();
  if (!ar.ok) return { error: adata.error?.message || 'Failed to load Pages' };
  const page = (adata.data || []).find(p => p.id === pageId);
  if (!page || !page.access_token) return { error: 'Page not found or not managed by this account' };
  return { accessToken: page.access_token };
}

// Publish a message to a Page's feed.
async function publishToPage(pageId, accessToken, message) {
  const pr = await fetch(`${GRAPH}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: accessToken })
  });
  const pdata = await pr.json();
  if (!pr.ok) return { error: pdata.error?.message || 'Failed to publish post' };
  return { postId: pdata.id };
}

// Automated campaign tick — runs as service role (no user), called by the
// scheduled workflow. Posts the next promo in the library to each due campaign.
async function runCampaignTick(base44) {
  const { accessToken: userToken } = await base44.asServiceRole.connectors.getConnection('facebook_pages');
  if (!userToken) return Response.json({ posted: 0, error: 'Facebook not connected' });

  const campaigns = await base44.asServiceRole.entities.PromoCampaign.filter({ enabled: true });
  const now = Date.now();
  const results = [];

  for (const c of campaigns) {
    const intervalMs = (c.interval_hours || 6) * 3600 * 1000;
    const last = c.last_posted_at ? new Date(c.last_posted_at).getTime() : 0;
    if (now - last < intervalMs) continue; // not due yet

    const nextIndex = ((c.last_index ?? -1) + 1) % PROMO_POSTS.length;
    const message = PROMO_POSTS[nextIndex].message;

    const tok = await resolvePageToken(userToken, c.page_id);
    if (tok.error) { results.push({ page: c.page_name, error: tok.error }); continue; }

    const pub = await publishToPage(c.page_id, tok.accessToken, message);
    if (pub.error) { results.push({ page: c.page_name, error: pub.error }); continue; }

    await base44.asServiceRole.entities.PromoCampaign.update(c.id, {
      last_index: nextIndex,
      last_posted_at: new Date().toISOString(),
      last_post_id: pub.postId,
      post_count: (c.post_count || 0) + 1,
    });
    results.push({ page: c.page_name, index: nextIndex, postId: pub.postId });
  }

  return Response.json({ posted: results.length, results });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';

    // Static library — no auth needed (just the curated post templates).
    if (action === 'listPosts') {
      return Response.json({ posts: PROMO_POSTS });
    }

    // Automated campaign ticks use service-role access and can publish publicly.
    // Require an out-of-band secret; never expose this privileged action anonymously.
    if (action === 'campaignTick') {
      const configuredSecret = Deno.env.get('WAVERADAR_CAMPAIGN_TICK_SECRET');
      const suppliedSecret = req.headers.get('x-waveradar-campaign-secret');
      if (!configuredSecret || suppliedSecret !== configuredSecret) {
        return Response.json({
          error: 'Automated publishing is disabled until WAVERADAR_CAMPAIGN_TICK_SECRET is configured and supplied by the scheduler.',
        }, { status: 503 });
      }
      return await runCampaignTick(base44);
    }

    // User-initiated actions — require a logged-in user.
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken: userToken } = await base44.asServiceRole.connectors.getConnection('facebook_pages');
    if (!userToken) return Response.json({ error: 'Facebook not connected' }, { status: 400 });

    if (action === 'list') {
      const r = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token&limit=100`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: data.error?.message || 'Failed to list Pages' }, { status: r.status });
      const pages = (data.data || []).map(p => ({ id: p.id, name: p.name }));
      return Response.json({ pages });
    }

    if (action === 'post') {
      const pageId = body.pageId;
      const message = (body.message || '').trim();
      if (!pageId || !message) return Response.json({ error: 'Page and message are required' }, { status: 400 });

      const tok = await resolvePageToken(userToken, pageId);
      if (tok.error) return Response.json({ error: tok.error }, { status: 404 });

      const pub = await publishToPage(pageId, tok.accessToken, message);
      if (pub.error) return Response.json({ error: pub.error }, { status: 502 });
      return Response.json({ success: true, postId: pub.postId });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}