import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateExamWindow,beginExamBreak,endExamBreak,inspectExamBreakLimits,MINUTE_MS} from './exam-time-policy.mjs';

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

test('cannot begin an eleventh break or exceed a cumulative hour',()=>{
 const pauses=Array.from({length:10},(_,i)=>({startedAt:(101+i*2)*m,endedAt:(102+i*2)*m}));
 assert.equal(calculateExamWindow({...base,pauses,now:122*m}).phase,'running');
 assert.throws(()=>beginExamBreak({...base,pauses},122*m),/10 mola kaydı/);
 const total=[{startedAt:101*m,endedAt:131*m},{startedAt:132*m,endedAt:162*m}];
 assert.equal(calculateExamWindow({...base,pauses:total,now:163*m}).pausedMs,60*m);
 assert.throws(()=>beginExamBreak({...base,pauses:total},163*m),/Toplam mola süresi/);
});
test('limit inspection reports overdue single and total pauses without granting time',()=>{
 const open=[{startedAt:110*m,endedAt:null}];
 assert.deepEqual(inspectExamBreakLimits({...base,pauses:open,now:141*m}),{reviewRequired:true,reason:'single_break_over_limit'});
 const within=inspectExamBreakLimits({...base,pauses:open,now:139*m});
 assert.equal(within.reviewRequired,false);
 assert.equal(within.remainingBreakMs,31*m);
 const cumulative=[{startedAt:101*m,endedAt:131*m},{startedAt:132*m,endedAt:162*m},{startedAt:163*m,endedAt:null}];
 assert.equal(inspectExamBreakLimits({...base,pauses:cumulative,now:164*m}).reason,'total_break_over_limit');
 assert.equal(inspectExamBreakLimits({...base,pauses:[{startedAt:140*m,endedAt:141*m},{startedAt:130*m,endedAt:null}],now:142*m}).reason,'invalid_break_history');
});
