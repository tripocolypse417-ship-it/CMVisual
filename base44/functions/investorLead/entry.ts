import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch {}
    const action = body.action;

    // Public: an investor expresses interest via the pitch page.
    if (action === 'submit') {
      const { name, email, firm, role, check_size, message } = body;
      if (!name || !email) {
        return Response.json({ error: 'Name and email are required' }, { status: 400 });
      }
      const lead = await base44.asServiceRole.entities.InvestorLead.create({
        name,
        email,
        firm: firm || '',
        role: role || '',
        check_size: check_size || '',
        message: message || '',
        status: 'new',
        source: 'pitch_page',
      });
      // Notify the first admin (a registered user, so SendEmail delivers).
      try {
        const users = await base44.asServiceRole.entities.User.list();
        const admin = users.find((u) => u.role === 'admin') || users[0];
        if (admin?.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: `New investor lead: ${name}`,
            body: [
              'A new investor expressed interest via the pitch page.',
              '',
              `Name: ${name}`,
              `Email: ${email}`,
              `Firm: ${firm || '—'}`,
              `Role: ${role || '—'}`,
              `Check size: ${check_size || '—'}`,
              '',
              'Message:',
              message || '—',
              '',
              'Review in the Team Console → Investors.',
            ].join('\n'),
          });
        }
      } catch {}
      return Response.json({ ok: true, id: lead.id });
    }

    // Admin only: send an outreach email to an investor contact they supply.
    if (action === 'outreach') {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Admin only' }, { status: 403 });
      }
      const { to, subject, body: mailBody, leadId } = body;
      if (!to || !subject || !mailBody) {
        return Response.json({ error: 'to, subject, and body are required' }, { status: 400 });
      }
      await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body: mailBody });
      if (leadId) {
        await base44.asServiceRole.entities.InvestorLead.update(leadId, { status: 'contacted' });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}