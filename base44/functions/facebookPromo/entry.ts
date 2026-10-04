import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const GRAPH = 'https://graph.facebook.com/v25.0';

// Curated rotating promo library. Each entry is posted in turn by the
// auto-campaign so the Page never repeats the same content back-to-back.
const PROMO_POSTS = [
  // ── BRAND / HERO ──────────────────────────────────────────────
  {
    title: 'Hero — Vision Through Walls',
    message: `📡 See what others can't.

WaveRadar turns your phone into a real-time through-wall radar command center — fusing WiFi signals, motion sensors, and on-device camera AI to detect and track people, animals, and objects around you, even behind walls.

Built for security teams, first responders, and facilities managers who need to know what's moving — right now. No cloud, no simulation, all on-device.

👁️ Turn signals into shared sight.

#WaveRadar #ThroughWallVision #SecurityTech #TeamSafety #AR`
  },
  {
    title: 'Brand Promise',
    message: `At WaveRadar, we believe awareness shouldn't stop at a wall.

Our mission: give every team the power to see movement in real time — through the surfaces that used to hide it. No special hardware. No cloud dependency. Just your phone, your sensors, and our engine.

We don't simulate. We don't guess. We show you what's actually there.

👁️ See what others can't.

#WaveRadar #OurMission #SecurityTech #Innovation #Awareness`
  },

  // ── PROBLEM / AGITATION ───────────────────────────────────────
  {
    title: 'Problem — Blind Spots',
    message: `Every wall is a blind spot. Every blind spot is a risk.

You walk into a room. You clear a hallway. You assume it's clear — because you can't see through the drywall.

What if you could?

WaveRadar turns the signals already in the air into a live picture of movement around you — so the wall stops being an excuse and starts being a window.

🧱 Walls end here.

#WaveRadar #BlindSpots #SecurityTech #SituationalAwareness #RiskReduction`
  },
  {
    title: 'Problem — Cost of Not Knowing',
    message: `The most expensive thing in security is the thing you didn't see coming.

A motion you missed. A door you assumed was clear. A restricted zone no one was watching.

WaveRadar was built to close that gap — real-time movement intelligence that runs on the device already in your pocket.

Because "I didn't know" should never be the reason.

⚠️ #SecurityOps #RiskManagement #WaveRadar #Awareness #LossPrevention`
  },
  {
    title: 'Problem — Old Tools',
    message: `Thermal cameras cost thousands. Drone sweeps need a pilot. Fixed camera systems need wiring, servers, and a full IT stack.

WaveRadar needs one phone.

Same mission — real-time awareness of what's moving around you — at a fraction of the cost, with zero install.

Smart teams don't buy more gear. They use what they already carry.

📲 #DoMoreWithLess #SecurityTech #WaveRadar #CostSavings #FieldOps`
  },

  // ── USE CASES ─────────────────────────────────────────────────
  {
    title: 'Use Case — First Responders',
    message: `🚨 When seconds matter, awareness is everything.

WaveRadar gives first responders real-time movement intelligence through walls — no special hardware, just your phone. Detect, track, and share live target positions with your whole team instantly.

See around corners before you step into them.

👁️‍🗨️ #FirstResponders #TacticalAwareness #WaveRadar #PublicSafety #TechForGood`
  },
  {
    title: 'Use Case — Facilities Management',
    message: `🏢 Know your building's pulse in real time.

WaveRadar maps movement across your facility — live floor-plan tracking, occupancy heat maps, and automatic event logs. Spot motion in restricted zones the moment it happens, and export PDF site reports for your records.

Smart buildings start with smart awareness.

📊 #FacilitiesManagement #SmartBuilding #WaveRadar #PropTech #Security`
  },
  {
    title: 'Use Case — Security & Loss Prevention',
    message: `🛡️ Stop shrink before it starts.

WaveRadar detects and logs movement in restricted stockrooms, loading docks, and after-hours zones — with timestamped PDF reports you can hand to law enforcement or insurance.

Live awareness today. Documented evidence tomorrow.

📦 #LossPrevention #RetailSecurity #WaveRadar #AssetProtection #SecurityOps`
  },
  {
    title: 'Use Case — Event Security',
    message: `🎪 Crowds move fast. You need to move faster.

WaveRadar gives event security teams a live radar view of movement density across the venue — spot surges, gaps, and restricted-zone breaches the instant they form.

Awareness that scales with the crowd.

🎟️ #EventSecurity #CrowdSafety #WaveRadar #VenueManagement #PublicSafety`
  },
  {
    title: 'Use Case — Search & Rescue',
    message: `🆘 Every minute in a search is a minute that matters.

WaveRadar helps search teams sweep structures fast — detecting motion and presence through walls, debris, and partitions where visual search is impossible.

Find them faster. Bring them home.

🔦 #SearchAndRescue #SAR #WaveRadar #EmergencyResponse #TechForGood`
  },
  {
    title: 'Use Case — Property Management',
    message: `🏠 Know who's moving — even when no one should be.

WaveRadar lets property managers sweep vacant units, basements, and common areas for unexpected motion in seconds — right from the phone they already carry.

No cameras to install. No wiring to run. Just answers.

🔑 #PropertyManagement #RealEstate #WaveRadar #SmartProperty #Security`
  },

  // ── FEATURES ─────────────────────────────────────────────────
  {
    title: 'Feature — Through-Wall Vision',
    message: `🧱 Walls end here.

WaveRadar projects behind-wall targets onto your live camera using real compass headings — so the figures you see line up with the actual wall in front of you, not a random spread.

Physics-aware through-wall vision, in your pocket.

👁️ #ThroughWallVision #AR #WaveRadar #SecurityTech #Innovation`
  },
  {
    title: 'Feature — Real-Time Radar Minimap',
    message: `📡 Every human and animal, by position — at a glance.

WaveRadar's radar minimap shows all detected targets around you in real time, regardless of camera field-of-view. Look one way, see everything.

Because threats don't wait for you to turn around.

🎯 #Radar #SituationalAwareness #WaveRadar #SecurityTech #AR`
  },
  {
    title: 'Feature — On-Device AI',
    message: `🤖 Real AI, running right on your phone.

WaveRadar uses on-device pose estimation and object detection to draw live skeletal overlays and track real movement — no cloud, no latency, no simulation. Your camera sees a person; WaveRadar renders their moving skeleton in real time.

This is what on-device AR looks like.

⚡ #OnDeviceAI #EdgeAI #ComputerVision #WaveRadar #AR`
  },
  {
    title: 'Feature — Ghost Mode',
    message: `👻 Replay the past.

WaveRadar's Ghost Mode overlays historical movement paths on your live camera feed — see where targets came from and where they went. Motion history, visualized in AR.

Because the past tells you what's coming next.

🕰️ #GhostMode #MotionTracking #AR #WaveRadar #SecurityTech`
  },
  {
    title: 'Feature — Auto-Zoom',
    message: `🔍 Targets get closer — WaveRadar gets clearer.

Auto-zoom intelligently magnifies approaching targets as they enter your range, so you see finer detail without lifting a finger.

Close-up awareness, hands-free.

🎯 #AutoZoom #SituationalAwareness #WaveRadar #AR #Tech`
  },
  {
    title: 'Feature — Proximity Safety Alerts',
    message: `🚨 The instant a target enters your safety zone — you know.

WaveRadar fires proximity alerts the moment any detected target crosses your configured range, with urgency that scales with closeness. Pulse, sound, and on-screen warning — all automatic.

Set the line. We watch it for you.

⚠️ #SafetyAlerts #Proximity #WaveRadar #SecurityOps #Automation`
  },
  {
    title: 'Feature — Slack Auto-Alerts',
    message: `💬 Critical events, auto-posted to your team's Slack.

WaveRadar watches for proximity breaches and high-speed motion — then alerts your channels automatically so no one misses a threat.

Awareness that reaches everyone, even when they're not watching the screen.

📡 #Slack #TeamAlerts #Automation #WaveRadar #SecurityOps`
  },
  {
    title: 'Feature — Floor Plans & PDF Reports',
    message: `🗺️ Map your space. Track your targets. Export your evidence.

WaveRadar plots live detections on your custom floor plan and generates PDF site-analysis reports for every scan.

From real-time awareness to documented accountability — one app.

📑 #FloorPlan #SiteReport #PDF #WaveRadar #FacilitiesManagement`
  },
  {
    title: 'Feature — Auto-Built Floorplan',
    message: `🏗️ No floor plan to upload? WaveRadar builds one for you — live.

Our scan-built floorplan constructs a real-time map from your sensor data as you move. No blueprints, no uploads, no setup.

Just walk. We map.

📐 #AutoMapping #SmartBuilding #WaveRadar #PropTech #Innovation`
  },
  {
    title: 'Feature — Snapshot Sharing',
    message: `📸 One scan. Your whole team sees it.

WaveRadar snapshots capture the full detection state and sync to your team in real time — with shared notes, comments, and side-by-side comparison.

Because a picture that only you can see isn't awareness.

🤝 #TeamSharing #Snapshots #WaveRadar #Collaboration #SecurityOps`
  },
  {
    title: 'Feature — HUD / Headset Mount',
    message: `🥽 Built for the field, tuned for the mount.

WaveRadar's heads-up display works on your phone screen AND inside VR/AR headset mounts — reticles, status rails, and high-contrast telemetry, all in a central safe zone.

Awareness that goes wherever you go.

📡 #HUD #WearableTech #AR #WaveRadar #FieldOps`
  },
  {
    title: 'Feature — Real Sensor Telemetry',
    message: `📈 No fake data. Ever.

WaveRadar pulls real telemetry from your device — Network Information API, battery, geolocation, ambient light, acoustic probes, and motion sensors — and shows you the raw numbers live.

We believe in sensor honesty. What you see is what's real.

🔬 #SensorData #Transparency #WaveRadar #EdgeAI #Tech`
  },

  // ── OBJECTION HANDLING ────────────────────────────────────────
  {
    title: 'Objection — Privacy',
    message: `🔒 Your data never leaves your phone.

WaveRadar runs entirely on-device. No cloud uploads. No remote servers processing your scans. No selling your movement data to anyone.

The same privacy you expect from a flashlight app — now with radar-grade awareness.

Because security shouldn't come at the cost of privacy.

🛡️ #PrivacyFirst #OnDevice #DataProtection #WaveRadar #SecurityTech`
  },
  {
    title: 'Objection — Special Hardware',
    message: `No drones. No fixed cameras. No $5,000 thermal rigs.

WaveRadar runs on the phone you already carry. Your sensors, your camera, your compass — all of it, already in your pocket.

If you have a phone, you have a radar command center.

📲 #NoSpecialHardware #AccessibleTech #WaveRadar #SecurityTech #CostSavings`
  },
  {
    title: 'Objection — Real or Simulated',
    message: `We get this question a lot. So let's be clear:

WaveRadar does not simulate detections. We do not fabricate targets. Every figure you see is driven by real sensor input — real camera AI, real motion data, real compass headings.

If there's nothing moving, we show you nothing. That's the promise.

✅ #NoSimulation #HonestTech #WaveRadar #Transparency #RealAI`
  },
  {
    title: 'Objection — Team Scale',
    message: `From a solo night watchman to a 50-person response team — WaveRadar scales.

Real-time snapshot sharing, team notes, and role-based access mean everyone sees what they need to see, and nothing they shouldn't.

One operator scans. The whole crew knows.

👥 #TeamOps #Scalability #WaveRadar #Collaboration #SecurityOps`
  },

  // ── SOCIAL PROOF / TRUST ──────────────────────────────────────
  {
    title: 'Trust — Real Physics',
    message: `WaveRadar isn't a toy demo. It's built on real signal physics, real computer vision, and real device sensors — fused into one coherent picture of movement.

We chose the hard path because the easy one — simulating detections — would be a lie.

Built for teams who need the truth.

🔬 #RealTech #SignalProcessing #WaveRadar #HonestAI #Engineering`
  },
  {
    title: 'Trust — Documented Accountability',
    message: `Every scan can become a PDF. Every movement becomes a log entry. Every alert becomes a timestamp.

WaveRadar doesn't just show you what's happening — it records it, so you can prove it later.

Awareness today. Evidence tomorrow.

📑 #Accountability #Documentation #WaveRadar #SecurityOps #Compliance`
  },
  {
    title: 'Trust — Made for the Field',
    message: `High-contrast HUD. Battery-aware. Wake-locked. Compass-calibrated.

WaveRadar was designed by people who've actually worked in the field — where screens are hard to read, batteries die fast, and gloves don't tap well.

Built rough, on purpose.

🛠️ #FieldReady #RuggedTech #WaveRadar #FieldOps #Engineering`
  },

  // ── COMPARISON ────────────────────────────────────────────────
  {
    title: 'Compare — vs Thermal Cameras',
    message: `Thermal sees heat. WaveRadar sees movement — through walls, in real time, with team sharing built in.

And it costs less than the case you'd carry a thermal camera in.

Different job. Better tool.

🌡️ #ThermalVision #Comparison #WaveRadar #SecurityTech #CostSavings`
  },
  {
    title: 'Compare — vs Fixed Cameras',
    message: `Fixed cameras see one spot. WaveRadar sees everywhere you point it.

No wiring. No NVR. No monthly cloud subscription. No blind spots between lenses.

Your awareness moves with you — because threats do too.

🎥 #SecurityCameras #Comparison #WaveRadar #MobileSecurity #Flexibility`
  },

  // ── URGENCY / CTA ─────────────────────────────────────────────
  {
    title: 'CTA — See The Unseen',
    message: `👁️ Turn signals into shared sight.

WaveRadar fuses WiFi, motion, and camera AI into one real-time radar command center — through-wall vision, live team sharing, auto-alerts, and PDF reports.

Built for teams that can't afford blind spots. See what others can't — today.

⚡ #WaveRadar #VisionThroughWalls #SecurityTech #TeamSafety #AR`
  },
  {
    title: 'CTA — Stop Guessing',
    message: `You're already walking into rooms you can't fully see.

Stop guessing. Start knowing.

WaveRadar gives you real-time movement intelligence on the device already in your pocket — no new gear, no cloud, no simulation.

See it. Track it. Share it. Prove it.

🎯 #StopGuessing #StartKnowing #WaveRadar #SecurityTech #Awareness`
  },
  {
    title: 'CTA — Your Team Is Waiting',
    message: `The wall in front of you isn't the limit. It's the next thing WaveRadar sees through.

Your team is ready for real-time awareness. Your phone is ready to give it to them.

One scan changes how your whole crew sees the field.

👁️ #TeamOps #RealTimeSharing #WaveRadar #SecurityTech #GetStarted`
  },
  {
    title: 'CTA — Try It Now',
    message: `📡 Through-wall vision. Live team sharing. Auto-alerts. PDF reports. All on your phone.

No special hardware. No cloud. No simulation.

Just real signals, turned into shared sight.

See what others can't — today.

⚡ #WaveRadar #TryItNow #SecurityTech #AR #TeamSafety`
  },
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

    // Automated campaign tick — service role, no user session.
    if (action === 'campaignTick') {
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