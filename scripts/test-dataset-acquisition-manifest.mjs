import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildDatasetManifest, verifyDatasetManifest } from './dataset-acquisition-manifest.mjs';

const temp=await fs.mkdtemp(path.join(os.tmpdir(),'waveradar-manifest-test-'));
try{
 const root=path.join(temp,'dataset');await fs.mkdir(path.join(root,'nested'),{recursive:true});
 await fs.writeFile(path.join(root,'a.bin'),Buffer.from([0,1,2,3]));
 await fs.writeFile(path.join(root,'nested','b.txt'),'WaveRadar evidence fixture\n');
 const options={rootDir:root,datasetId:'fixture-dataset',sourceUrl:'https://example.org/dataset',datasetVersion:'fixture-v1',licenseName:'Test-only fixture license',licenseStatus:'UNVERIFIED',commercialUse:'UNKNOWN',reviewedOn:'2026-11-13',retrievedAt:'2026-11-13T12:00:00.000Z'};
 const manifest=await buildDatasetManifest(options);
 assert.equal(manifest.file_count,2);
 assert.equal(manifest.files.length,2);
 assert.ok(manifest.files.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
 assert.deepEqual(await verifyDatasetManifest(root,manifest),[]);
 assert.equal((await fs.readFile(path.join(root,'a.bin'))).toString('hex'),'00010203','manifest creation must not modify source files');
 await fs.writeFile(path.join(root,'a.bin'),Buffer.from([9,8,7,6]));
 assert.ok((await verifyDatasetManifest(root,manifest)).some(x=>x.includes('SHA-256 mismatch')),'same-size modified source bytes must fail digest verification');
 await fs.writeFile(path.join(root,'extra.txt'),'not in manifest');
 assert.ok((await verifyDatasetManifest(root,manifest)).some(x=>x.includes('unmanifested file')),'new files must fail verification');
 await fs.rm(path.join(root,'nested','b.txt'));
 assert.ok((await verifyDatasetManifest(root,manifest)).some(x=>x.includes('missing file')),'missing source files must fail verification');
 const tampered=JSON.parse(JSON.stringify(manifest));tampered.license_snapshot.commercial_use='PERMITTED_BY_VERIFIED_LICENSE';
 assert.ok((await verifyDatasetManifest(root,tampered)).some(x=>x.includes('manifest digest mismatch')),'manifest metadata changes must fail integrity check');
 await assert.rejects(()=>buildDatasetManifest({...options,sourceUrl:'http://example.org/data'}),/HTTPS/);
 await assert.rejects(()=>buildDatasetManifest({...options,reviewedOn:'2026-02-31'}),/YYYY-MM-DD/);
 await assert.rejects(()=>buildDatasetManifest({...options,commercialUse:'PERMITTED_BY_VERIFIED_LICENSE'}),/unverified or restricted licenses/);
 console.log('Dataset acquisition manifest regression tests: PASS');
}finally{await fs.rm(temp,{recursive:true,force:true});}
