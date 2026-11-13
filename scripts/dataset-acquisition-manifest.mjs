import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_VERSION='waveradar-dataset-acquisition-manifest-v1';
const HASH='sha256';

function digest(value){return crypto.createHash(HASH).update(value).digest('hex');}
async function hashFile(filePath){
 const hash=crypto.createHash(HASH);let sizeBytes=0;
 for await(const chunk of createReadStream(filePath)){hash.update(chunk);sizeBytes+=chunk.length;}
 return {sha256:hash.digest('hex'),size_bytes:sizeBytes};
}
function isValidDate(value){return typeof value==='string'&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString()===value;}
function safeRelativePath(value){
 const normalized=value.split(path.sep).join('/');
 return normalized&&!normalized.startsWith('/')&&!normalized.split('/').some(part=>part==='..'||part==='')?normalized:null;
}
async function collectFiles(rootDir,currentDir=rootDir,files=[]){
 const entries=await fs.readdir(currentDir,{withFileTypes:true});
 entries.sort((a,b)=>a.name.localeCompare(b.name));
 for(const entry of entries){
  const absolute=path.join(currentDir,entry.name),stat=await fs.lstat(absolute);
  if(stat.isSymbolicLink())throw new Error('symlinks are not permitted in dataset acquisition manifests: '+absolute);
  if(stat.isDirectory())await collectFiles(rootDir,absolute,files);
  else if(stat.isFile()){
   const relative=safeRelativePath(path.relative(rootDir,absolute));
   if(!relative)throw new Error('unsafe relative path: '+absolute);
   const hashed=await hashFile(absolute);
   files.push({path:relative,...hashed});
  }else throw new Error('unsupported filesystem entry: '+absolute);
 }
 return files;
}
function manifestDigest(manifest){
 const {manifest_sha256,...unsigned}=manifest;
 return digest(JSON.stringify(unsigned,null,2)+'\n');
}
async function collectPaths(rootDir,currentDir=rootDir,paths=[]){
 const entries=await fs.readdir(currentDir,{withFileTypes:true});
 entries.sort((a,b)=>a.name.localeCompare(b.name));
 for(const entry of entries){
  const absolute=path.join(currentDir,entry.name),stat=await fs.lstat(absolute);
  if(stat.isSymbolicLink())throw new Error('symlinks are not permitted in dataset acquisition manifests: '+absolute);
  if(stat.isDirectory())await collectPaths(rootDir,absolute,paths);
  else if(stat.isFile()){
   const relative=safeRelativePath(path.relative(rootDir,absolute));
   if(!relative)throw new Error('unsafe relative path: '+absolute);
   paths.push(relative);
  }else throw new Error('unsupported filesystem entry: '+absolute);
 }
 return paths;
}
export async function buildDatasetManifest(options={}){
 const rootDir=path.resolve(options.rootDir||'');
 const datasetId=String(options.datasetId||'');
 const sourceUrl=String(options.sourceUrl||'');
 const datasetVersion=String(options.datasetVersion||'');
 const licenseName=String(options.licenseName||'');
 const licenseStatus=String(options.licenseStatus||'');
 const commercialUse=String(options.commercialUse||'');
 const reviewedOn=String(options.reviewedOn||'');
 const retrievedAt=options.retrievedAt||new Date().toISOString();
 if(!options.rootDir)throw new Error('rootDir is required');
 if(!/^[a-z0-9][a-z0-9-]+$/.test(datasetId))throw new Error('datasetId must be a stable lowercase slug');
 let parsed;try{parsed=new URL(sourceUrl);}catch{throw new Error('sourceUrl must be a valid HTTPS URL');}
 if(parsed.protocol!=='https:')throw new Error('sourceUrl must be a valid HTTPS URL');
 if(!datasetVersion)throw new Error('datasetVersion is required; use an explicit source version or documented unknown value');
 if(!licenseName||!licenseStatus||!commercialUse)throw new Error('licenseName, licenseStatus and commercialUse are required');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn)||Number.isNaN(Date.parse(reviewedOn))||new Date(reviewedOn).toISOString().slice(0,10)!==reviewedOn)throw new Error('reviewedOn must be a valid YYYY-MM-DD date');
 if(!isValidDate(retrievedAt))throw new Error('retrievedAt must be a valid ISO-8601 timestamp');
 const rootStat=await fs.stat(rootDir);if(!rootStat.isDirectory())throw new Error('rootDir must be a directory');
 const files=await collectFiles(rootDir);
 if(files.length===0)throw new Error('dataset root contains no regular files');
 files.sort((a,b)=>a.path.localeCompare(b.path));
 const manifest={
  manifest_schema:MANIFEST_VERSION,
  hash_algorithm:HASH,
  dataset_id:datasetId,
  source_url:sourceUrl,
  dataset_version:datasetVersion,
  license_snapshot:{name:licenseName,status:licenseStatus,commercial_use:commercialUse,reviewed_on:reviewedOn},
  retrieved_at:retrievedAt,
  generated_at:new Date().toISOString(),
  file_count:files.length,
  total_size_bytes:files.reduce((sum,file)=>sum+file.size_bytes,0),
  files
 };
 manifest.manifest_sha256=manifestDigest(manifest);
 return manifest;
}
export async function verifyDatasetManifest(rootDir,manifest){
 const errors=[];
 if(!manifest||manifest.manifest_schema!==MANIFEST_VERSION) return ['unsupported manifest schema'];
 if(manifest.hash_algorithm!==HASH)errors.push('unsupported hash algorithm');
 if(manifest.manifest_sha256!==manifestDigest(manifest))errors.push('manifest digest mismatch');
 if(!Array.isArray(manifest.files)||manifest.files.length===0)return [...errors,'manifest has no files'];
 const seen=new Set();
 for(const file of manifest.files){
  if(!file||typeof file.path!=='string'||!safeRelativePath(file.path)){errors.push('invalid manifest file path');continue;}
  if(seen.has(file.path))errors.push('duplicate manifest path: '+file.path);seen.add(file.path);
  const absolute=path.resolve(rootDir,file.path),relative=path.relative(path.resolve(rootDir),absolute);
  if(relative.startsWith('..')||path.isAbsolute(relative)){errors.push('path escapes dataset root: '+file.path);continue;}
  try{
   const stat=await fs.lstat(absolute);
   if(!stat.isFile()||stat.isSymbolicLink()){errors.push('manifest entry is not a regular file: '+file.path);continue;}
   if(stat.size!==file.size_bytes){errors.push('size mismatch: '+file.path);continue;}
   const actual=await hashFile(absolute);
   if(actual.sha256!==file.sha256)errors.push('SHA-256 mismatch: '+file.path);
  }catch{errors.push('missing file: '+file.path);}
 }
 try{
  const actualPaths=await collectPaths(path.resolve(rootDir));
  for(const filePath of actualPaths)if(!seen.has(filePath))errors.push('unmanifested file: '+filePath);
 }catch(error){errors.push(error.message);}
 const total=manifest.files.reduce((sum,file)=>sum+(Number(file.size_bytes)||0),0);
 if(manifest.file_count!==manifest.files.length)errors.push('file_count does not match files array');
 if(manifest.total_size_bytes!==total)errors.push('total_size_bytes does not match files array');
 return errors;
}
function parseArgs(argv){
 const args={};
 for(let i=0;i<argv.length;i++){
  if(!argv[i].startsWith('--'))throw new Error('unexpected argument: '+argv[i]);
  const key=argv[i].slice(2),value=argv[i+1];
  if(!value||value.startsWith('--'))throw new Error('missing value for --'+key);
  args[key]=value;i++;
 }
 return args;
}
const invoked=process.argv[1]?path.resolve(process.argv[1]):null;
if(invoked===fileURLToPath(import.meta.url)){
 try{
  const args=parseArgs(process.argv.slice(2));
  if(args.verify){
   const manifest=JSON.parse(await fs.readFile(path.resolve(args.verify),'utf8'));
   const errors=await verifyDatasetManifest(path.resolve(args.root||''),manifest);
   if(errors.length){console.error('Dataset manifest verification FAILED');errors.forEach(e=>console.error(' - '+e));process.exit(1);}
   console.log('Dataset manifest verification PASS · '+manifest.dataset_id+' · '+manifest.file_count+' files');
  }else{
   const manifest=await buildDatasetManifest({rootDir:args.root,datasetId:args['dataset-id'],sourceUrl:args['source-url'],datasetVersion:args.version,licenseName:args['license-name'],licenseStatus:args['license-status'],commercialUse:args['commercial-use'],reviewedOn:args['reviewed-on'],retrievedAt:args['retrieved-at']});
   const output=path.resolve(args.output||'');
   if(!args.output)throw new Error('--output is required');
   const relative=path.relative(path.resolve(args.root),output);
   const outputIsInside=relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));\n   if(outputIsInside)throw new Error('manifest output must be outside dataset root so it is not included in its own hash inventory');
   await fs.mkdir(path.dirname(output),{recursive:true});
   await fs.writeFile(output,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
   console.log('Dataset manifest created · '+manifest.dataset_id+' · '+manifest.file_count+' files · '+manifest.manifest_sha256);
  }
 }catch(error){console.error('Dataset manifest operation FAILED · '+error.message);process.exit(1);}
}
