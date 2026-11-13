import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAdmin, requireAdminOrCron } from '../_shared/auth.ts';

const GRAPH = 'https://graph.facebook.com/v25.0';

// Curated rotating promo library. Each entry is posted in turn by the
// auto-campaign so the Page never repeats the same content back-to-back.
const PROMO_POSTS = [
  {
    id: 'os-r-and-d',
    message: `WaveRadar OS is an R&D program for evidence-first emergency situational awareness and decision support. We are building a system that keeps sensor sources, timestamps, uncertainty and operational context visible. Current capabilities remain prototype-stage and require independent validation before operational use.\n\nSee More. Save More. #WaveRadar #EmergencyTechnology #ResearchAndDevelopment`
  },
  {
    id: 'evidence-first',
    message: `Trustworthy decision support starts with trustworthy evidence. WaveRadar's engineering focus is preserving original observations, showing provenance, separating measured from inferred and simulated information, and making results reproducible.\n\nNo unsupported accuracy claims. No invented capability. #WaveRadar #EvidenceFirst #FirefighterSafety`
  },
  {
    id: 'sensor-interoperability',
    message: `A single sensor rarely tells the whole story. WaveRadar OS is being designed around time alignment, source quality, uncertainty and compatible sensor integrations. Actual capability depends on tested hardware, permissions and operating conditions.\n\n#WaveRadar #SensorFusion #EmergencyResponse`
  },
  {
    id: 'human-command',
    message: `WaveRadar is being designed to support chiefs and field personnel with evidence-backed context and replay. Predictions remain advisory; incident command, established procedures, training and protective equipment remain authoritative.\n\n#WaveRadar #IncidentCommand #FirefighterSafety`
  },
  {
    id: 'independent-validation',
    message: `Our Research & Validation Lab direction is built around independent reference measurements, reproducible protocols, preserved failed runs and explicit limitations. We will describe performance only when the evidence supports it.\n\n#WaveRadar #IndependentValidation #RAndD`
  },
  {
    id: 'guardian-x',
    message: `Guardian X is a research program for integrated firefighter protection and powered load assistance. Mechanical safety, PPE compatibility, fail-safe behavior and independent testing are required before any operational claim or use.\n\n#WaveRadar #GuardianX #FirefighterEquipment`
  },
  {
    id: 'spatial-model',
    message: `WaveRadar OS is researching spatial context and building-model reconstruction from available sensor inputs. Reconstruction quality and localization limits must be measured against independent ground truth. We make no through-wall performance claim.\n\n#WaveRadar #SpatialComputing #EmergencyTechnology`
  },
  {
    id: 'research-partners',
    message: `WaveRadar is looking for independent research, fire-service and sensor-technology partners to help evaluate emergency situational-awareness tools with rigorous, reproducible methods. Prototype status and limitations are disclosed; validation comes before operational claims.\n\n#WaveRadar #ResearchPartners #FireService`
  }
];;

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

    // Automated publishing is disabled unless both a cron secret and an explicit
    // server-side enable flag are configured. No client can trigger it anonymously.
    if (action === 'campaignTick') {
      const auth = await requireAdminOrCron(req, base44, 'WAVERADAR_PROMO_CRON_SECRET');
      if (auth.response) return auth.response;
      if (Deno.env.get('WAVERADAR_PROMO_AUTOPUBLISH') !== 'true') {
        return Response.json({ error: 'Automatic publishing is disabled' }, { status: 503 });
      }
      return await runCampaignTick(base44);
    }

    // Page discovery and manual publishing are administrator-only.
    const auth = await requireAdmin(base44);
    if (auth.response) return auth.response;
    const user = auth.user;

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
      const approvedPost = PROMO_POSTS.find(post => post.id === body.postId && post.message === message);
      if (!pageId || !message) return Response.json({ error: 'Page and message are required' }, { status: 400 });
      if (!approvedPost) return Response.json({ error: 'Only approved evidence-gated templates may be published' }, { status: 403 });

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