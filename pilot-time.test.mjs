import test from 'node:test';
import assert from 'node:assert/strict';
import {pilotTimeState} from './pilot-time.mjs';

test('student timer starts from server expiry, not client-created duration',()=>{
 const now=1_700_000_000_000;
 const state=pilotTimeState(now+6*60*1000,now);
 assert.equal(state.phase,'active');
 assert.equal(state.seconds,360);
 assert.match(state.label,/6 dakika 00 saniye/);
});
test('warning is emitted only during last five minutes',()=>{
 const now=1_700_000_000_000;
 assert.equal(pilotTimeState(now+300000,now).phase,'warning');
 assert.equal(pilotTimeState(now+300001,now).phase,'active');
 assert.equal(pilotTimeState(now+1000,now).seconds,1);
});
test('expired or unknown deadlines never become a new entitlement',()=>{
 const now=1_700_000_000_000;
 assert.deepEqual(pilotTimeState(now-1,now),{phase:'expired',seconds:0,label:'Oturum süresi doldu. Yanıtlar artık kaydedilemez veya teslim edilemez.'});
 assert.equal(pilotTimeState(null,now).phase,'unknown');
 assert.equal(pilotTimeState(NaN,now).phase,'unknown');
});
