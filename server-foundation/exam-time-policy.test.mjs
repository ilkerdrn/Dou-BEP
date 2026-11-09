import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateExamWindow,beginExamBreak,endExamBreak,MINUTE_MS} from './exam-time-policy.mjs';

const m=MINUTE_MS;
const base={startedAt:100*m,totalMinutes:85,pauses:[],breaksAllowed:true};
test('approved duration is used without adjusting the anonymous pilot',()=>{
 const r=calculateExamWindow({...base,now:110*m});
 assert.equal(r.phase,'running');
 assert.equal(r.plannedEnd,185*m);
 assert.equal(r.remainingMs,75*m);
});
test('an authorized active break freezes working time and preserves exact remaining time',()=>{
 const paused=beginExamBreak(base,110*m);
 const first=calculateExamWindow({...base,pauses:paused,now:110*m});
 const later=calculateExamWindow({...base,pauses:paused,now:115*m});
 assert.equal(first.phase,'paused');
 assert.equal(first.remainingMs,later.remainingMs);
 assert.equal(later.remainingMs,75*m);
 const completed=endExamBreak({...base,pauses:paused},115*m);
 const after=calculateExamWindow({...base,pauses:completed,now:120*m});
 assert.equal(after.phase,'running');
 assert.equal(after.plannedEnd,190*m);
 assert.equal(after.remainingMs,70*m);
 assert.equal(after.pausedMs,5*m);
});
test('no break permission, expired sessions and double starts are rejected',()=>{
 const noBreak={...base,breaksAllowed:false};
 assert.throws(()=>beginExamBreak(noBreak,110*m),/mola başlatılamaz/);
 assert.throws(()=>calculateExamWindow({...noBreak,pauses:[{startedAt:110*m,endedAt:111*m}],now:112*m}),/Mola yetkisi/);
 assert.throws(()=>beginExamBreak(base,186*m),/mola başlatılamaz/);
 const paused=beginExamBreak(base,110*m);
 assert.throws(()=>beginExamBreak({...base,pauses:paused},111*m),/mola başlatılamaz/);
});
test('overlapping, future, backwards, excessive and post-expiry breaks are rejected',()=>{
 const inputs=[
  {pauses:[{startedAt:110*m,endedAt:109*m}],now:115*m},
  {pauses:[{startedAt:120*m,endedAt:121*m}],now:115*m},
  {pauses:[{startedAt:110*m,endedAt:112*m},{startedAt:111*m,endedAt:113*m}],now:120*m},
  {pauses:[{startedAt:110*m,endedAt:141*m}],now:145*m},
  {pauses:[{startedAt:185*m,endedAt:186*m}],now:188*m},
  {pauses:[{startedAt:110*m,endedAt:null},{startedAt:115*m,endedAt:116*m}],now:118*m}
 ];
 for(const input of inputs)assert.throws(()=>calculateExamWindow({...base,...input}));
});
test('closed break cannot be ended twice; no negative remaining',()=>{
 const pauses=beginExamBreak(base,110*m);
 const closed=endExamBreak({...base,pauses},112*m);
 assert.throws(()=>endExamBreak({...base,pauses:closed},113*m),/Açık mola/);
 const expired=calculateExamWindow({...base,pauses:closed,now:190*m});
 assert.equal(expired.phase,'expired');
 assert.equal(expired.remainingMs,0);
});
