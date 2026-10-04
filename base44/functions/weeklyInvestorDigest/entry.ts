import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const b64url = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Recipient = the app admin (the builder who connected Gmail). The connected
    // Gmail account is the authenticated sender, so it delivers to that mailbox.
    const users = await base44.asServiceRole.entities.User.list();
    const admin = users.find((u) => u.role === 'admin') || users[0];
    const myEmail = admin?.email;
    if (!myEmail) return Response.json({ error: 'No admin user found to address the digest' }, { status: 500 });

    // Leads from the last 7 days.
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const leads = await base44.asServiceRole.entities.InvestorLead.list('-created_date', 500);
    const recent = leads.filter((l) => new Date(l.created_date) >= since);
    const newLeads = recent.filter((l) => l.status === 'new');

    const subject = `Weekly Investor Leads Digest — ${newLeads.length} new this week`;
    const lines = [
      'WEEKLY INVESTOR LEADS DIGEST',
      '=============================',
      '',
      'Period: last 7 days',
      `Total leads this week: ${recent.length}`,
      `New (uncontacted): ${newLeads.length}`,
      '',
    ];
    if (recent.length === 0) {
      lines.push('No new investor leads this week. Share your /investors link to grow the pipeline.');
    } else {
      lines.push('--- LEADS ---');
      recent.forEach((l, i) => {
        lines.push(`${i + 1}. ${l.name} <${l.email}>  [${l.status}]`);
        if (l.firm) lines.push(`   Firm: ${l.firm}`);
        if (l.role) lines.push(`   Role: ${l.role}`);
        if (l.check_size) lines.push(`   Check: ${l.check_size}`);
        if (l.message) lines.push(`   Message: ${l.message}`);
        lines.push('');
      });
      lines.push('Review and follow up in the Team Console -> Investors.');
    }
    const body = lines.join('\n');

    const rawMsg = [
      `From: ${myEmail}`,
      `To: ${myEmail}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      body,
    ].join('\r\n');

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: b64url(rawMsg) }),
    });
    const sendData = await sendRes.json();
    if (!sendRes.ok) return Response.json({ error: sendData.error?.message || 'Gmail send failed' }, { status: 500 });

    return Response.json({ ok: true, sentTo: myEmail, newThisWeek: newLeads.length, totalThisWeek: recent.length, messageId: sendData.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}