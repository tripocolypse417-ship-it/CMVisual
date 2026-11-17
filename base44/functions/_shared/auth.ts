// Shared fail-closed authorization helpers for privileged Base44 functions.
function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

export async function requireAdmin(base44: any) {
  let user: any = null;
  try { user = await base44.auth.me(); } catch { user = null; }
  if (!user) {
    return { user: null, response: Response.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  if (user.role !== 'admin') {
    return { user, response: Response.json({ error: 'Administrator role required' }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function requireAdminOrCron(req: Request, base44: any, secretName: string) {
  let user: any = null;
  try { user = await base44.auth.me(); } catch { user = null; }
  if (user?.role === 'admin') return { user, response: null };

  const expected = Deno.env.get(secretName) || '';
  if (!expected) {
    return {
      user: null,
      response: Response.json({ error: 'Scheduled action is disabled until its server secret is configured' }, { status: 503 }),
    };
  }
  const authorization = req.headers.get('authorization') || '';
  const supplied = req.headers.get('x-waveradar-cron-secret') ||
    authorization.replace(/^Bearer\s+/i, '');
  if (!supplied || !constantTimeEqual(supplied, expected)) {
    return { user: null, response: Response.json({ error: 'Unauthorized scheduled request' }, { status: 401 }) };
  }
  return { user: null, response: null };
}
