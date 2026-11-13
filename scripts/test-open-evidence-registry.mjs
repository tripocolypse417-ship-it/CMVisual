import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRegistry } from './validate-open-evidence-registry.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const registry=JSON.parse(fs.readFileSync(path.resolve(here,'../research/open-evidence/registry.v1.json'),'utf8'));
const schema=JSON.parse(fs.readFileSync(path.resolve(here,'../research/open-evidence/registry.schema.json'),'utf8'));
for(const [field,key] of [['access_status','access_status'],['license_status','license_status'],['commercial_use','commercial_use'],['training_eligibility','training_eligibility'],['acquisition_status','acquisition_status'],['ingestion_status','ingestion_status'],['benchmark_status','benchmark_status'],['independent_validation_status','independent_validation_status']]){
 const allowed=schema.properties.records.items.properties[key]?.enum;
 assert.ok(Array.isArray(allowed),schema enum missing for +key);
 for(const record of registry.records)assert.ok(allowed.includes(record[field]),'schema enum does not cover '+field+'='+record[field]);
}
assert.deepEqual(validateRegistry(registry),[],'seed registry must pass all gates');
const duplicate=structuredClone(registry);duplicate.records.push(structuredClone(duplicate.records[0]));assert.ok(validateRegistry(duplicate).some(x=>x.includes('duplicate dataset_id')),'duplicate IDs must fail');
const license=structuredClone(registry);license.records[0].commercial_use='PERMITTED_BY_VERIFIED_LICENSE';assert.ok(validateRegistry(license).some(x=>x.includes('cannot claim verified commercial permission')),'unverified license cannot be commercially cleared');
const standard=structuredClone(registry);standard.records.find(x=>x.access_status==='STANDARD_ONLY').training_eligibility='BLOCKED_PENDING_LICENSE_REVIEW';assert.ok(validateRegistry(standard).some(x=>x.includes('standard-only sources cannot be treated as training datasets')),'standards are not training datasets');
const premature=structuredClone(registry);premature.records[0].ingestion_status='SCHEMA_VALIDATED';assert.ok(validateRegistry(premature).some(x=>x.includes('cannot be ingested before acquisition')),'unacquired source cannot be ingested');
const noLimit=structuredClone(registry);noLimit.records[0].limitations=[];assert.ok(validateRegistry(noLimit).some(x=>x.includes('must document at least one limitation')),'limitations are mandatory');
const restricted=structuredClone(registry);restricted.records.find(x=>x.commercial_use==='NONCOMMERCIAL_ONLY').training_eligibility='ELIGIBLE_SUBJECT_TO_VERSION_PINNING';assert.ok(validateRegistry(restricted).some(x=>x.includes('restricted source must be blocked for commercial training')),'noncommercial sources cannot enter commercial training');
const missingCheckDate=structuredClone(registry);delete missingCheckDate.records[0].last_primary_source_check;assert.ok(validateRegistry(missingCheckDate).some(x=>x.includes('last_primary_source_check')),'source review date is mandatory');
const invalidReview=structuredClone(registry);invalidReview.records[0].independent_validation_status='PASSED';assert.ok(validateRegistry(invalidReview).some(x=>x.includes('independent_validation_status is not recognized')),'independent review status must use controlled vocabulary');
const invalidDate=JSON.parse(JSON.stringify(registry));invalidDate.records[0].last_primary_source_check='2026-02-31';assert.ok(validateRegistry(invalidDate).some(x=>x.includes('last_primary_source_check')),'invalid calendar date must fail');
const invalidUrl=JSON.parse(JSON.stringify(registry));invalidUrl.records[0].source_url='file:///etc/passwd';assert.ok(validateRegistry(invalidUrl).some(x=>x.includes('source_url')),'non-HTTPS source URL must fail');
const unknownAccess=JSON.parse(JSON.stringify(registry));unknownAccess.records[0].access_status='DOWNLOAD_ANYTHING';assert.ok(validateRegistry(unknownAccess).some(x=>x.includes('access_status is not recognized')),'unknown access state must fail');
console.log('Open Evidence Registry regression tests: PASS');
