import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const defaultPath=path.resolve(here,'../research/open-evidence/registry.v1.json');
const ACCESS=new Set(['PUBLIC_DOWNLOAD','PUBLIC_PORTAL','PUBLICATION_LINKED','PUBLIC_REQUEST','CREDENTIAL_REQUIRED','RESTRICTED','STANDARD_ONLY','UNKNOWN']);
const LICENSE=new Set(['VERIFIED','UNVERIFIED','RESTRICTED_TERMS','MIXED_COMPONENTS_REVIEW_REQUIRED','NOT_APPLICABLE']);
const COMMERCIAL=new Set(['PERMITTED_BY_VERIFIED_LICENSE','PERMITTED_WITH_ATTRIBUTION_AND_SHAREALIKE_REVIEW','ELIGIBLE_SUBJECT_TO_ATTRIBUTION_AND_COMPONENT_REVIEW','ELIGIBLE_SUBJECT_TO_ODBL_COMPLIANCE_REVIEW','UNKNOWN','NONCOMMERCIAL_ONLY','NONPROFIT_ONLY','NOT_APPLICABLE']);
const ACQUISITION=new Set(['NOT_ACQUIRED','ACQUIRED_PENDING_INTEGRITY_CHECK','ACQUIRED_HASHED','QUARANTINED','NOT_APPLICABLE']);
const INGESTION=new Set(['NOT_INGESTED','PARSER_PENDING','SCHEMA_VALIDATED','PROVENANCE_VALIDATED','QUARANTINED','NOT_APPLICABLE']);
const BENCHMARK=new Set(['NOT_BENCHMARKED','PROTOCOL_DRAFT','PREREGISTERED','RUN_COMPLETE_INTERNAL','INDEPENDENTLY_REVIEWED','NOT_APPLICABLE']);
const INDEPENDENT=new Set(['NOT_EVALUATED','NOT_APPLICABLE','COMPLETED']);
const TRAINING=new Set(['BLOCKED_PENDING_LICENSE_REVIEW','BLOCKED_PENDING_COMPONENT_LICENSE_REVIEW','BLOCKED_FOR_COMMERCIAL_USE_UNDER_CURRENT_TERMS','BLOCKED_PENDING_ACCESS_AND_LICENSE_REVIEW','ELIGIBLE_SUBJECT_TO_ATTRIBUTION_AND_COMPONENT_REVIEW','ELIGIBLE_SUBJECT_TO_VERSION_PINNING','ELIGIBLE_SUBJECT_TO_ODBL_COMPLIANCE_REVIEW','NOT_A_DATASET']);
export function validateRegistry(registry){
 const errors=[];
 if(!registry||typeof registry!=='object'||Array.isArray(registry))return ['registry must be a JSON object'];
 if(registry.registry_id!=='waveradar-open-evidence-registry')errors.push('registry_id must identify the canonical WaveRadar registry');
 if(registry.schema_version!=='waveradar-open-evidence-registry-v1')errors.push('unsupported schema_version');
 if(registry.status!=='RESEARCH_CANDIDATES_ONLY')errors.push('registry status must remain RESEARCH_CANDIDATES_ONLY');
 if(!/^\d+\.\d+\.\d+$/.test(String(registry.registry_version||'')))errors.push('registry_version must be semantic version');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(registry.reviewed_on||''))||Number.isNaN(Date.parse(registry.reviewed_on))||new Date(registry.reviewed_on).toISOString().slice(0,10)!==registry.reviewed_on)errors.push('reviewed_on must be a valid YYYY-MM-DD date');
 const policy=registry.policy||{};
 for(const key of ['no_dataset_is_preapproved_for_commercial_training','acquisition_requires_license_and_privacy_review','raw_dataset_files_must_not_be_committed_to_repository','benchmark_results_do_not_establish_field_or_life_safety_performance'])if(policy[key]!==true)errors.push('policy.'+key+' must be true');
 if(!Array.isArray(registry.records)||registry.records.length===0)return [...errors,'records must be a non-empty array'];
 const seen=new Set();
 registry.records.forEach((r,i)=>{
  const at='records['+i+']';
  if(!r||typeof r!=='object'||Array.isArray(r)){errors.push(at+' must be an object');return;}
  for(const key of ['dataset_id','name','domain','source_url','last_primary_source_check','access_status','license_status','commercial_use','modalities','annotations','ground_truth','limitations','training_eligibility','acquisition_status','ingestion_status','benchmark_status','independent_validation_status'])if(r[key]===undefined||r[key]===null||r[key]==='')errors.push(at+'.'+key+' is required');
  if(typeof r.dataset_id==='string'){if(!/^[a-z0-9][a-z0-9-]+$/.test(r.dataset_id))errors.push(at+'.dataset_id must be a stable lowercase slug');if(seen.has(r.dataset_id))errors.push('duplicate dataset_id: '+r.dataset_id);seen.add(r.dataset_id);}
  try{const u=new URL(r.source_url);if(u.protocol!=='https:')errors.push(at+'.source_url must use HTTPS');}catch{errors.push(at+'.source_url must be a valid absolute URL');}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(r.last_primary_source_check||''))||Number.isNaN(Date.parse(r.last_primary_source_check))||new Date(r.last_primary_source_check).toISOString().slice(0,10)!==r.last_primary_source_check)errors.push(at+'.last_primary_source_check must be a valid YYYY-MM-DD date');
  if(!INDEPENDENT.has(r.independent_validation_status))errors.push(at+'.independent_validation_status is not recognized');
  if(!ACCESS.has(r.access_status))errors.push(at+'.access_status is not recognized');if(!LICENSE.has(r.license_status))errors.push(at+'.license_status is not recognized');if(!COMMERCIAL.has(r.commercial_use))errors.push(at+'.commercial_use is not recognized');if(!TRAINING.has(r.training_eligibility))errors.push(at+'.training_eligibility is not recognized');if(!ACQUISITION.has(r.acquisition_status))errors.push(at+'.acquisition_status is not recognized');if(!INGESTION.has(r.ingestion_status))errors.push(at+'.ingestion_status is not recognized');if(!BENCHMARK.has(r.benchmark_status))errors.push(at+'.benchmark_status is not recognized');
  if(!Array.isArray(r.modalities)||r.modalities.length===0)errors.push(at+'.modalities must be a non-empty array');if(!Array.isArray(r.annotations))errors.push(at+'.annotations must be an array');if(!Array.isArray(r.limitations)||r.limitations.length===0)errors.push(at+'.limitations must document at least one limitation');
  if(r.license_status!=='VERIFIED'&&r.commercial_use==='PERMITTED_BY_VERIFIED_LICENSE')errors.push(at+' cannot claim verified commercial permission when license_status is not VERIFIED');
  if(r.license_status==='UNVERIFIED'&&!['UNKNOWN','NOT_APPLICABLE'].includes(r.commercial_use))errors.push(at+' with UNVERIFIED license must keep commercial_use UNKNOWN or NOT_APPLICABLE');
  if(r.access_status==='STANDARD_ONLY'&&r.training_eligibility!=='NOT_A_DATASET')errors.push(at+' standard-only sources cannot be treated as training datasets');
  if(['NONCOMMERCIAL_ONLY','NONPROFIT_ONLY'].includes(r.commercial_use)&&!String(r.training_eligibility).includes('BLOCKED_FOR_COMMERCIAL_USE'))errors.push(at+' restricted source must be blocked for commercial training');
  if(r.acquisition_status==='NOT_ACQUIRED'&&r.ingestion_status!=='NOT_INGESTED')errors.push(at+' cannot be ingested before acquisition');
  if(r.benchmark_status==='INDEPENDENTLY_REVIEWED'&&r.independent_validation_status!=='COMPLETED')errors.push(at+' cannot be marked independently reviewed without completed independent review');
 });return errors;
}
const file=process.argv[2]?path.resolve(process.cwd(),process.argv[2]):defaultPath;
try{const data=JSON.parse(fs.readFileSync(file,'utf8'));const errors=validateRegistry(data);if(errors.length){console.error('Open Evidence Registry validation FAILED');errors.forEach(e=>console.error(' - '+e));process.exit(1);}console.log('Open Evidence Registry validation PASS · '+data.records.length+' records · '+data.registry_version+' · '+data.status);}catch(error){console.error('Open Evidence Registry validation FAILED · '+error.message);process.exit(1);}
