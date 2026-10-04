import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// WaveRadar investor outreach engine.
// - research: uses LLM + web search to find best-fit investors and create targets.
// - draft:    drafts a personalized first-touch email for one target.
// - draftAll: drafts emails for every researched target at once.
// - send:     sends the approved drafted email and marks the target emailed.

const WAYERADAR_CONTEXT = `WaveRadar is a software-only through-wall radar vision platform. It turns any smartphone into a real-time occupancy and movement sensor by fusing WiFi signal data, device motion sensors, compass headings, and on-device camera AI (pose estimation + object detection) — no dedicated hardware, no cloud, all on-device. Use cases: first responders, facilities management, security & loss prevention, event security, search & rescue, property management. Differentiators: through-wall vision via compass projection, real-time team sharing, auto-alerts, PDF reports, privacy-first (on-device), no special hardware. Stage: pre-seed/seed, seeking investors in security tech, AR/edge AI, PropTech, computer vision, and public safety.`;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }
    let body = {};
    try { body = await req.json(); } catch {}
    const action = body.action;

    // ── RESEARCH: find best-fit investors via web search ──
    if (action === 'research') {
      const count = Math.min(10, Math.max(3, body.count || 8));
      const existing = await base44.asServiceRole.entities.InvestorTarget.list('-created_date', 200);
      const existingFirms = new Set(existing.map((t) => (t.firm || '').toLowerCase().trim()));

      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        prompt: `You are an expert startup fundraising analyst. Find ${count} real, active venture capital investors and angels who are the BEST fit to invest in WaveRadar — a through-wall radar vision platform for security, first responders, facilities, and public safety.

${WAYERADAR_CONTEXT}

Focus on investors who:
- Actively invest in security technology, AR/edge AI, computer vision, PropTech, or public safety / first responder tech.
- Write checks at the pre-seed / seed stage (roughly $250K–$3M).
- Are currently investing (active in 2025–2026), not retired.

For EACH investor, provide:
- name: the investor's full name (real person, not just the firm)
- firm: the firm they invest from (or "Angel" if independent)
- role: their title (e.g. Partner, Principal, Founder, Managing Director)
- email: their work email if you can find it; otherwise leave empty string
- linkedin: their LinkedIn profile URL if findable; otherwise empty string
- focus_areas: 1-line summary of what they invest in
- check_size: typical check size or fund stage (e.g. "$500K–$2M seed")
- portfolio: 2–3 notable portfolio companies they've backed (comma-separated)
- fit_rationale: 1–2 sentences on WHY they specifically fit WaveRadar (tie to their thesis / portfolio)
- priority: "high" if security/AR/first-responder is core to their thesis, "medium" if adjacent, "low" otherwise

Return ${count} distinct investors from DIFFERENT firms. Do NOT include any of these already-contacted firms: ${[...existingFirms].slice(0, 40).join(', ') || '(none yet)'}.`,
        response_json_schema: {
          type: 'object',
          properties: {
            investors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  firm: { type: 'string' },
                  role: { type: 'string' },
                  email: { type: 'string' },
                  linkedin: { type: 'string' },
                  focus_areas: { type: 'string' },
                  check_size: { type: 'string' },
                  portfolio: { type: 'string' },
                  fit_rationale: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                },
                required: ['name', 'firm', 'fit_rationale', 'priority'],
              },
            },
          },
          required: ['investors'],
        },
      });

      const investors = res.investors || [];
      const created = [];
      for (const inv of investors) {
        if (!inv.name || !inv.firm) continue;
        if (existingFirms.has((inv.firm || '').toLowerCase().trim())) continue;
        const rec = await base44.asServiceRole.entities.InvestorTarget.create({
          name: inv.name,
          firm: inv.firm,
          role: inv.role || '',
          email: inv.email || '',
          linkedin: inv.linkedin || '',
          focus_areas: inv.focus_areas || '',
          check_size: inv.check_size || '',
          portfolio: inv.portfolio || '',
          fit_rationale: inv.fit_rationale || '',
          priority: inv.priority || 'medium',
          stage: 'researched',
          source: 'ai_research',
        });
        created.push(rec.id);
      }
      return Response.json({ found: investors.length, created: created.length, ids: created });
    }

    // ── DRAFT: personalized first-touch email for one target ──
    if (action === 'draft') {
      const { targetId } = body;
      if (!targetId) return Response.json({ error: 'targetId required' }, { status: 400 });
      const t = await base44.asServiceRole.entities.InvestorTarget.get(targetId);
      if (!t) return Response.json({ error: 'Target not found' }, { status: 404 });

      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the founder of WaveRadar, writing a cold first-touch email to an investor. Write a SHORT, high-converting email that gets a reply.

${WAYERADAR_CONTEXT}

INVESTOR:
Name: ${t.name}
Firm: ${t.firm}
Role: ${t.role || 'investor'}
Focus: ${t.focus_areas || 'n/a'}
Portfolio: ${t.portfolio || 'n/a'}
Why they fit: ${t.fit_rationale || 'n/a'}

RULES:
- Subject line: under 60 chars, specific, NOT clickbait. Reference their thesis or a portfolio company if possible.
- Body: 90–130 words max. 3 short paragraphs.
  1) One sentence on what WaveRadar is (through-wall radar vision on a phone, no hardware).
  2) One sentence tying it to THEIR thesis / portfolio (use the fit rationale).
  3) A soft, specific ask: "Open to a 15-min call next week to share traction + a demo?"
- Sign off as the founder. First name only at the end.
- No buzzwords, no "revolutionary", no "disrupt". Plain, confident, founder-to-investor tone.
- Do NOT pretend to have a prior relationship.

Return JSON with subject and body.`,
        response_json_schema: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
          },
          required: ['subject', 'body'],
        },
      });

      await base44.asServiceRole.entities.InvestorTarget.update(targetId, {
        drafted_subject: res.subject || '',
        drafted_body: res.body || '',
        stage: 'drafted',
      });
      return Response.json({ ok: true, subject: res.subject, body: res.body });
    }

    // ── DRAFT ALL: draft emails for every researched target ──
    if (action === 'draftAll') {
      const targets = await base44.asServiceRole.entities.InvestorTarget.filter({ stage: 'researched' });
      let drafted = 0;
      for (const t of targets) {
        try {
          const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are the founder of WaveRadar, writing a cold first-touch email to an investor. Write a SHORT, high-converting email that gets a reply.

${WAYERADAR_CONTEXT}

INVESTOR:
Name: ${t.name}
Firm: ${t.firm}
Role: ${t.role || 'investor'}
Focus: ${t.focus_areas || 'n/a'}
Portfolio: ${t.portfolio || 'n/a'}
Why they fit: ${t.fit_rationale || 'n/a'}

RULES:
- Subject line: under 60 chars, specific. Reference their thesis or portfolio if possible.
- Body: 90–130 words max. 3 short paragraphs: what WaveRadar is, tie to their thesis, soft ask for a 15-min call.
- Sign off as the founder, first name only. No buzzwords. Confident, plain tone.

Return JSON with subject and body.`,
            response_json_schema: {
              type: 'object',
              properties: { subject: { type: 'string' }, body: { type: 'string' } },
              required: ['subject', 'body'],
            },
          });
          await base44.asServiceRole.entities.InvestorTarget.update(t.id, {
            drafted_subject: res.subject || '',
            drafted_body: res.body || '',
            stage: 'drafted',
          });
          drafted++;
        } catch {}
      }
      return Response.json({ ok: true, drafted, total: targets.length });
    }

    // ── SEND: deliver the approved drafted email ──
    if (action === 'send') {
      const { targetId } = body;
      if (!targetId) return Response.json({ error: 'targetId required' }, { status: 400 });
      const t = await base44.asServiceRole.entities.InvestorTarget.get(targetId);
      if (!t) return Response.json({ error: 'Target not found' }, { status: 404 });
      if (!t.email) return Response.json({ error: 'No email on file — add one first' }, { status: 400 });
      if (!t.drafted_subject || !t.drafted_body) return Response.json({ error: 'Draft the email first' }, { status: 400 });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: t.email,
        subject: t.drafted_subject,
        body: t.drafted_body,
      });
      await base44.asServiceRole.entities.InvestorTarget.update(targetId, {
        stage: 'emailed',
        last_contacted_at: new Date().toISOString(),
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}