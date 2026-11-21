import assert from "node:assert/strict";
import { forecastTrend } from "../src/lib/experimentalPredictionEngine.js";
const nowMs=100000;
const rows=[0,1000,2000].map((t,i)=>({id:"e"+i,sourceId:"s1",clockDomain:"normalized-clock",evidenceClass:"MEASURED",calibrated:true,unit:"C",variable:"temperature",timeMs:97000+t,value:20+i}));
const opts={nowMs,horizonMs:10000};
const result=forecastTrend(rows,opts);
assert.equal(result.status,"EXPERIMENTAL_FORECAST");
assert.equal(result.value,33);
assert.equal(result.operationallyValidated,false);
assert.deepEqual(result.sourceEventIds,["e0","e1","e2"]);
assert.deepEqual(forecastTrend([...rows].reverse(),opts),result);
const rejects=[
 [rows.slice(0,2),"INSUFFICIENT_INPUT"],
 [[...rows,rows[0]],"DUPLICATE_EVENT"],
 [rows.map((r,i)=>i===1?{...r,clockDomain:"other"}:r),"INCOMPATIBLE_EVIDENCE"],
 [rows.map((r,i)=>i===1?{...r,unit:"F"}:r),"INCOMPATIBLE_EVIDENCE"],
 [rows.map((r,i)=>i===1?{...r,value:NaN}:r),"INVALID_EVIDENCE"],
 [rows.map(r=>({...r,calibrated:false})),"UNCALIBRATED_SOURCE"],
 [rows.map(r=>({...r,timeMs:r.timeMs-70000})),"STALE_EVIDENCE"],
 [rows.map((r,i)=>i===1?{...r,timeMs:rows[0].timeMs}:r),"INVALID_TIMELINE"]
];
for(const [input,reason] of rejects) assert.equal(forecastTrend(input,opts).reason,reason);
assert.equal(forecastTrend(rows,{...opts,horizonMs:120000}).status,"UNAVAILABLE");
assert.equal(rows[0].value,20);
console.log("Experimental prediction engine contract: 10 assertions/groups passed");
