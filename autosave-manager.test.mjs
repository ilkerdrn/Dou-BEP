import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutosaveManager} from './autosave-manager.mjs';
function fixture(persist=async x=>x){const jobs=new Map(),states=[];let id=0;
 const clock={set(fn){const k=++id;jobs.set(k,fn);return k;},clear(k){jobs.delete(k);}};
 const mgr=createAutosaveManager({getDraft:()=>({value:'anonim'}),persist,onEvent:(s,d)=>states.push(s),clock});
 const tick=async()=>{const list=[...jobs.values()];jobs.clear();for(const run of list)run();await new Promise(r=>setImmediate(r));};
 return {mgr,jobs,states,tick};}
test('only changes schedule server autosave; no browser storage dependency',async()=>{let n=0;const f=fixture(async()=>{n++;return {revision:n};});assert.equal(f.jobs.size,0);f.mgr.changed();f.mgr.changed();assert.equal(f.jobs.size,1);await f.tick();assert.equal(n,1);assert.equal(f.mgr.hasChanges(),false);assert.ok(f.states.includes('saved'));});
test('manual force saves brand-new draft without change notification',async()=>{let n=0;const f=fixture(async()=>{n++;return {revision:n};});await f.mgr.flush({force:true});assert.equal(n,1);});
test('changes during in-flight persistence stay pending and re-save with newest revision',async()=>{let resolve;let saves=0;const f=fixture(async()=>{saves++;if(saves===1)return await new Promise(r=>resolve=r);return {revision:2};});f.mgr.changed();const first=f.mgr.flush();f.mgr.changed();resolve({revision:1});await first;assert.equal(f.mgr.hasChanges(),true);await f.tick();assert.equal(saves,2);assert.equal(f.mgr.hasChanges(),false);});
test('HTTP revision conflict blocks further automatic writes',async()=>{let n=0;const f=fixture(async()=>{n++;throw Object.assign(Error('other tab'),{status:409,code:'revision_conflict'});});f.mgr.changed();await assert.rejects(f.mgr.flush(),/other tab/);assert.equal(f.mgr.isBlocked(),true);f.mgr.changed();assert.equal(f.jobs.size,0);await assert.rejects(f.mgr.flush(),/çakışmayı/);assert.equal(n,1);});
test('transient failure does not silently report saved; edit permits retry',async()=>{let n=0;const f=fixture(async()=>{n++;if(n===1)throw Error('network');return {revision:3};});f.mgr.changed();await assert.rejects(f.mgr.flush(),/network/);assert.equal(f.mgr.hasChanges(),true);assert.equal(f.mgr.hasFailure(),true);f.mgr.changed();await f.mgr.flush();assert.equal(f.mgr.hasChanges(),false);assert.equal(n,2);});
test('reset cancels a scheduled save and clears conflict',async()=>{const f=fixture();f.mgr.changed();assert.equal(f.jobs.size,1);f.mgr.reset();assert.equal(f.jobs.size,0);assert.equal(f.mgr.hasChanges(),false);});
test('stop cancels timers before navigation and cannot persist',async()=>{const f=fixture();f.mgr.changed();f.mgr.stop();assert.equal(f.jobs.size,0);await assert.rejects(f.mgr.flush(),/kapalı/);});

test('quota 409 is an error, not a conflicting revision',async()=>{const f=fixture(async()=>{throw Object.assign(Error('quota'),{status:409,code:'quota'});});f.mgr.changed();await assert.rejects(f.mgr.flush(),/quota/);assert.equal(f.mgr.isBlocked(),false);assert.equal(f.mgr.hasFailure(),true);});

// v2.52: delayed network results cannot re-attach to a newly selected exam.
test('v2.52 reset detaches an older network save and permits a new draft immediately',async()=>{
 let finishOld;const mutations=[];let requests=0;
 const f=fixture(async (_snapshot,{isCurrent})=>{
  requests++;
  if(requests===1){const response=await new Promise(resolve=>{finishOld=resolve;});if(isCurrent())mutations.push('old');return response;}
  if(isCurrent())mutations.push('new');return {revision:2};
 });
 f.mgr.changed();const old=f.mgr.flush();assert.equal(f.mgr.isSaving(),true);
 f.mgr.reset();assert.equal(f.mgr.isSaving(),false);
 f.mgr.changed();assert.deepEqual(await f.mgr.flush(),{revision:2});
 assert.equal(f.mgr.hasChanges(),false);assert.deepEqual(mutations,['new']);
 finishOld({revision:1});assert.equal(await old,null);
 assert.deepEqual(mutations,['new']);assert.equal(f.mgr.hasChanges(),false);
 assert.equal(f.states.filter(s=>s==='saved').length,1);
});
test('v2.52 stale failure after reset does not flag current draft as an error',async()=>{
 let failOld;let requests=0;
 const f=fixture(async (_snapshot,{isCurrent})=>{
  requests++;
  if(requests===1)return await new Promise((_resolve,reject)=>{failOld=reject;});
  assert.equal(isCurrent(),true);return {revision:3};
 });
 f.mgr.changed();const old=f.mgr.flush();f.mgr.reset();f.mgr.changed();
 await f.mgr.flush();const errorsBefore=f.states.filter(x=>x==='error').length;
 failOld(Error('old network'));assert.equal(await old,null);
 assert.equal(f.states.filter(x=>x==='error').length,errorsBefore);
 assert.equal(f.mgr.hasFailure(),false);assert.equal(f.mgr.hasChanges(),false);
});
test('v2.52 stop invalidates in-flight callback state',async()=>{
 let finish;let valid;
 const f=fixture(async(_snapshot,{isCurrent})=>{
  valid=isCurrent;return await new Promise(resolve=>{finish=resolve;});
 });
 f.mgr.changed();const call=f.mgr.flush();assert.equal(valid(),true);
 f.mgr.stop();assert.equal(valid(),false);assert.equal(f.mgr.isSaving(),false);
 finish({revision:2});assert.equal(await call,null);
});
