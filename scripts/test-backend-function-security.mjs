import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [exportSnapshot, slack, facebook, detectionDigest, investorDigest, investorLead, auth] = await Promise.all([
  read('../base44/functions/exportSnapshotToDrive/entry.ts'),
  read('../base44/functions/slackAlert/entry.ts'),
  read('../base44/functions/facebookPromo/entry.ts'),
  read('../base44/functions/weeklyDetectionDigest/entry.ts'),
  read('../base44/functions/weeklyInvestorDigest/entry.ts'),
  read('../base44/functions/investorLead/entry.ts'),
  read('../base44/functions/_shared/auth.ts'),
]);

assert.match(exportSnapshot, /base44\.auth\.me\(\)/, 'snapshot export must authenticate');
assert.match(exportSnapshot, /snapshot\.created_by_id === user\.id/, 'snapshot export must verify ownership');
assert.match(exportSnapshot, /sharedEmails\.includes\(String\(user\.email\)\.toLowerCase\(\)\)/, 'snapshot export must honor case-insensitive explicit sharing');
assert.match(slack, /requireAdmin\(base44\)/, 'Slack actions must require admin');
assert.match(slack, /WAVERADAR_SLACK_ALLOWED_CHANNELS/, 'Slack posting must use an allowlist');
assert.match(facebook, /requireAdminOrCron\(req, base44, 'WAVERADAR_PROMO_CRON_SECRET'\)/, 'campaign tick must authenticate cron/admin');
assert.match(facebook, /WAVERADAR_PROMO_AUTOPUBLISH/, 'automatic publishing must be explicitly disabled by default');
assert.match(facebook, /requireAdmin\(base44\)/, 'manual page actions must require admin');
assert.match(facebook, /approvedPost/, 'manual publishing must use an approved template');
assert.doesNotMatch(facebook, /Through-wall vision|No special hardware\. No cloud\. No simulation\.|runs entirely on-device/i, 'unsupported marketing claims must be absent');
assert.match(detectionDigest, /requireAdminOrCron\(req, base44, 'WAVERADAR_DIGEST_CRON_SECRET'\)/, 'detection digest must require admin/cron');
assert.doesNotMatch(detectionDigest, /body\.test_to/, 'public caller must not choose telemetry digest recipient');
assert.match(investorDigest, /requireAdminOrCron\(req, base44, 'WAVERADAR_DIGEST_CRON_SECRET'\)/, 'investor digest must require admin/cron');
assert.match(investorLead, /content-length/, 'public lead form must bound request size');
assert.match(investorLead, /Valid name and email are required/, 'public lead form must validate input');
assert.match(auth, /constantTimeEqual/, 'cron secret comparison must be constant-time');
assert.match(auth, /WAVERADAR_DIGEST_CRON_SECRET|secretName/, 'cron secret must be server-side configured');

console.log('WaveRadar backend authorization and marketing safety tests: PASS');
