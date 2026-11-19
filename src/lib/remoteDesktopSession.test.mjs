import assert from 'node:assert/strict';
import test from 'node:test';
import { createRemoteDesktopSession, advanceRemoteDesktopSession, authorizeRemoteDesktopCommand } from './remoteDesktopSession.js';

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
