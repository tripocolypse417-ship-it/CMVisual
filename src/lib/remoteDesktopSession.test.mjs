import assert from 'node:assert/strict';
import test from 'node:test';
import { createRemoteDesktopSession, advanceRemoteDesktopSession, authorizeRemoteDesktopCommand, authorizeAndReserveRemoteDesktopCommand } from './remoteDesktopSession.js';

const now = 1_800_000_000_000;
const fresh = () => createRemoteDesktopSession({ id: 'session-1', deviceId: 'moto-g', operatorId: 'owner', now });
const paired = () => advanceRemoteDesktopSession(fresh(), {type:'pair-confirmed', localOwnerApproved:true,operatorAuthenticated:true,deviceId:'moto-g',operatorId:'owner'}, now + 100);
const viewing = () => advanceRemoteDesktopSession(paired(), {type:'screen-consent-confirmed',androidProjectionApproved:true,localOwnerApproved:true,visibleIndicator:true},now+200);
const controlling = () => advanceRemoteDesktopSession(viewing(), {type:'input-consent-confirmed',localOwnerApproved:true,androidInputServiceEnabled:true,visibleIndicator:true},now+300);
const ctx = (time=now+400) => ({now:time, authenticated:true,deviceId:'moto-g',operatorId:'owner',previouslySeenIds:new Set()});
const req=(action,payload={}) => ({id:'nonce-1',sessionId:'session-1',action,payload});

test('pairing requires phone-side approval and authenticated operator', () => {
  assert.equal(advanceRemoteDesktopSession(fresh(),{type:'pair-confirmed',operatorAuthenticated:true,deviceId:'moto-g',operatorId:'owner'},now+100).status,'awaiting-pairing');
  assert.equal(paired().status,'paired');
});
test('projection requires Android consent and visible indicator', () => {
  assert.equal(advanceRemoteDesktopSession(paired(),{type:'screen-consent-confirmed',androidProjectionApproved:true,localOwnerApproved:true},now+200).status,'paired');
  assert.equal(viewing().status,'viewing');
});
test('viewing does not grant remote input', () => {
  assert.equal(authorizeRemoteDesktopCommand(viewing(),req('input.tap',{x:0.5,y:0.5}),ctx()).allowed,false);
  assert.equal(authorizeRemoteDesktopCommand(viewing(),req('screen.frame.request'),ctx()).allowed,true);
});
test('control must be separately approved on the device', () => {
  assert.equal(advanceRemoteDesktopSession(viewing(),{type:'input-consent-confirmed',localOwnerApproved:true,visibleIndicator:true},now+300).status,'viewing');
  assert.equal(controlling().status,'controlling');
});
test('bounded tap and swipe allowed only in active control', () => {
  assert.equal(authorizeRemoteDesktopCommand(controlling(),req('input.tap',{x:0,y:1}),ctx()).allowed,true);
  assert.equal(authorizeRemoteDesktopCommand(controlling(),req('input.swipe',{x1:0,y1:0,x2:1,y2:1,durationMs:450}),ctx()).allowed,true);
  assert.equal(authorizeRemoteDesktopCommand(controlling(),req('input.tap',{x:-2,y:1}),ctx()).allowed,false);
  assert.equal(authorizeRemoteDesktopCommand(controlling(),req('input.swipe',{x1:0,y1:0,x2:1,y2:1,durationMs:9000}),ctx()).allowed,false);
});
test('rejects shell, text injection, and unknown control requests', () => {
  for(const action of ['shell.execute','input.type','input.keylogger','file.read']) assert.equal(authorizeRemoteDesktopCommand(controlling(),req(action),ctx()).allowed,false);
});
test('mismatched operator or session and reused command ids are rejected', () => {
  assert.equal(authorizeRemoteDesktopCommand(controlling(),req('input.tap',{x:0.5,y:0.5}),{...ctx(),operatorId:'attacker'}).allowed,false);
  assert.equal(authorizeRemoteDesktopCommand(controlling(),{...req('input.tap',{x:0.5,y:0.5}),sessionId:'other'},ctx()).allowed,false);
  assert.equal(authorizeRemoteDesktopCommand(controlling(),req('input.tap',{x:0.5,y:0.5}),{...ctx(),previouslySeenIds:new Set(['nonce-1'])}).allowed,false);
});
test('revoke, disconnect and projection stop terminate control irrevocably', () => {
  for(const type of ['stop','disconnect','permission-revoked','screen-capture-stopped']) {
    const ended=advanceRemoteDesktopSession(controlling(),{type},now+400);
    assert.equal(ended.status,'stopped');
    assert.equal(ended.screenApproved,false);
    assert.equal(ended.inputApproved,false);
    assert.equal(advanceRemoteDesktopSession(ended,{type:'pair-confirmed',localOwnerApproved:true,operatorAuthenticated:true},now+450),ended);
    assert.equal(authorizeRemoteDesktopCommand(ended,req('input.tap',{x:0.5,y:0.5}),ctx()).allowed,false);
  }
});
test('absolute expiration, inactivity, and clock rollback fail closed', () => {
  assert.equal(authorizeRemoteDesktopCommand(controlling(),req('input.tap',{x:0.5,y:0.5}),ctx(now+5*60_000)).allowed,false);
  assert.equal(authorizeRemoteDesktopCommand(controlling(),req('input.tap',{x:0.5,y:0.5}),ctx(now+91_000)).allowed,false);
  assert.equal(advanceRemoteDesktopSession(controlling(),{type:'heartbeat',deviceAuthenticated:true},now+100).status,'stopped');
});


test('production command admission fails closed without a durable reservation store', async () => {
  assert.deepEqual(await authorizeAndReserveRemoteDesktopCommand(controlling(), req('input.tap', {x:0.5,y:0.5}), ctx()), {allowed:false,reason:'durable-replay-store-unavailable'});
});

test('production admission atomically reserves before permitting dispatch, including concurrent duplicates', async () => {
  const ids=new Set();
  let attempts=0;
  const replayStore={async reserve(sessionId, commandId) {
    attempts++;
    await Promise.resolve(); // makes concurrent callers compete for the same reservation
    const key=sessionId + ':' + commandId;
    if(ids.has(key)) return false;
    ids.add(key);
    return true;
  }};
  const context={...ctx(),previouslySeenIds:undefined,replayStore};
  const results=await Promise.all(Array.from({length:8},()=>authorizeAndReserveRemoteDesktopCommand(controlling(),req('input.tap',{x:0.5,y:0.5}),context)));
  assert.equal(results.filter(r=>r.allowed).length,1);
  assert.equal(results.filter(r=>r.reason==='replay-detected').length,7);
  assert.equal(attempts,8);
});

test('production command admission denies storage failures and unconfirmed writes', async () => {
  const good=controlling();
  const command=req('input.tap',{x:0.5,y:0.5});
  for (const outcome of [undefined, null, 1]) {
    const actual=await authorizeAndReserveRemoteDesktopCommand(good,command,{...ctx(),replayStore:{reserve:async()=>outcome}});
    assert.equal(actual.allowed,false);
    assert.equal(actual.reason,'replay-reservation-unconfirmed');
  }
  const failed=await authorizeAndReserveRemoteDesktopCommand(good,command,{...ctx(),replayStore:{reserve:async()=>{throw Error('disk failure')}}});
  assert.deepEqual(failed,{allowed:false,reason:'replay-reservation-failed'});
});

test('production admission never reserves revoked, unpaired, or invalid commands', async () => {
  let count=0;
  const replayStore={reserve:async()=>{count++;return true;}};
  const valid={...ctx(),replayStore};
  const stopped=advanceRemoteDesktopSession(controlling(),{type:'stop'},now+400);
  assert.equal((await authorizeAndReserveRemoteDesktopCommand(stopped,req('input.tap',{x:0.5,y:0.5}),valid)).allowed,false);
  assert.equal((await authorizeAndReserveRemoteDesktopCommand(fresh(),req('input.tap',{x:0.5,y:0.5}),valid)).allowed,false);
  assert.equal((await authorizeAndReserveRemoteDesktopCommand(controlling(),req('shell.execute'),valid)).allowed,false);
  assert.equal(count,0);
});
