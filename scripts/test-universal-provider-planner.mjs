import assert from 'node:assert/strict';
import {PROVIDERS,planProviders} from '../src/lib/fusion/universalProviderPlanner.js';
const ready={supported:true,permission:'GRANTED',available:true,authorized:true};
const full=Object.fromEntries(PROVIDERS.flatMap(p=>p.inputs).map(id=>[id,{...ready}]));
const test=(name,fn)=>{fn();console.log('PASS '+name);};
test('all 21 methods represented',()=>assert.equal(new Set(PROVIDERS.map(p=>p.id)).size,21));
test('empty inventory blocks all',()=>assert.equal(planProviders().blocked.length,21));
test('camera only never manufactures ARCore or pose',()=>{
 const p=planProviders({camera:ready},{budget:7});
 assert.deepEqual(p.selected.map(x=>x.id),['visual-odometry','visual-slam']);
 assert.equal(p.absolutePositionEstablished,false);
});
test('camera and IMU coexist without ARCore',()=>{
 const p=planProviders({camera:ready,accelerometer:ready,gyroscope:ready},{budget:100});
 assert.ok(p.selected.some(x=>x.id==='visual-inertial'));
 assert.ok(p.selected.some(x=>x.id==='inertial'));
 assert.ok(!p.selected.some(x=>x.id==='arcore'));
});
test('missing permission blocks provider',()=>assert.equal(planProviders({camera:{...ready,permission:'DENIED'}}).selected.length,0));
test('unknown authorization blocks provider',()=>assert.equal(planProviders({camera:{...ready,authorized:undefined}}).selected.length,0));
test('unavailable provider blocked',()=>assert.equal(planProviders({camera:{...ready,available:false}}).selected.length,0));
test('range requires surveyed anchors',()=>assert.ok(planProviders({'wifi-rtt':ready}).blocked.some(x=>x.id==='wifi-rtt')));
test('range remains range',()=>assert.equal(planProviders({'wifi-rtt':ready,'surveyed-radio-anchors':ready}).selected[0].output,'RANGE'));
test('signal strength remains signal strength',()=>assert.equal(planProviders({ble:ready}).selected[0].output,'SIGNAL_STRENGTH'));
test('all capabilities can be selected under sufficient budget',()=>assert.equal(planProviders(full,{budget:100}).selected.length,21));
test('bounded resource allocation',()=>{
 const p=planProviders(full,{budget:5});
 assert.ok(p.selected.reduce((s,x)=>s+x.cost,0)<=5);
 assert.equal(p.selected.length+p.deferred.length+p.blocked.length,21);
});
test('rotation gives each eligible provider a chance',()=>{
 const picked=new Set();
 for(let i=0;i<21;i++)for(const x of planProviders(full,{budget:4,rotation:i}).selected)picked.add(x.id);
 assert.equal(picked.size,21);
});
test('zero budget never selects',()=>assert.equal(planProviders(full,{budget:0}).selected.length,0));
test('invalid budget and rotation rejected',()=>{
 for(const v of [-1,NaN,101,1.5])assert.throws(()=>planProviders(full,{budget:v}));
 assert.throws(()=>planProviders(full,{rotation:-1}));
});
test('no safety or independence promotion',()=>{
 const p=planProviders(full,{budget:100});
 assert.equal(p.operationalUseAllowed,false);
 assert.equal(p.independentCorroborationEstablished,false);
 assert.equal(p.absolutePositionEstablished,false);
});
