import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const FOLDER_NAME = 'WaveRadar Snapshots';

// Find the archive folder by name, or create it on first run.
async function getOrCreateFolder(accessToken) {
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.files && data.files.length) return data.files[0].id;
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const created = await createRes.json();
  return created.id;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const snapshotId = body.snapshot_id;
    if (!snapshotId) return Response.json({ error: 'snapshot_id required' }, { status: 400 });

    const snapshot = await base44.asServiceRole.entities.Snapshot.get(snapshotId);
    if (!snapshot) return Response.json({ error: 'Snapshot not found' }, { status: 404 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const folderId = await getOrCreateFolder(accessToken);

    let detections = [];
    try { detections = JSON.parse(snapshot.detections_json || '[]'); } catch {}

    const exportData = {
      exported_at: new Date().toISOString(),
      snapshot: {
        id: snapshot.id,
        label: snapshot.label,
        scan_mode: snapshot.scan_mode,
        detection_count: snapshot.detection_count,
        notes: snapshot.notes,
        created_date: snapshot.created_date,
        created_by_id: snapshot.created_by_id,
        detections,
      },
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const safeLabel = (snapshot.label || 'snapshot').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40);
    const fileName = `${safeLabel}_${snapshot.id.slice(-6)}.json`;

    const boundary = 'waveradar_' + Math.random().toString(36).slice(2);
    const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${jsonStr}\r\n` +
      `--${boundary}--`;

    const upRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    );
    const upData = await upRes.json();
    if (!upRes.ok) {
      return Response.json({ error: upData.error?.message || 'Drive upload failed' }, { status: 502 });
    }

    return Response.json({ ok: true, file_id: upData.id, file_name: upData.name, folder_id: folderId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}