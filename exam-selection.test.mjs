import test from 'node:test';
import assert from 'node:assert/strict';
import {createExamSelection} from './exam-selection.mjs';
function deferred(){let resolve,reject;const promise=new Promise((ok,no)=>{resolve=ok;reject=no;});return {promise,resolve,reject};}
test('v2.53 rejects missing selection dependencies and blank IDs',async()=>{
 assert.throws(()=>createExamSelection({}),/bağımlılıkları/);
 const s=createExamSelection({fetchExam:async id=>id,applyExam:async()=>{}});
 await assert.rejects(s.open(''),/kimliği/);
});
test('v2.53 newest exam wins when older HTTP request finishes last',async()=>{
 const a=deferred(),b=deferred(),applied=[];
 const s=createExamSelection({fetchExam:id=>id==='A'?a.promise:b.promise,applyExam:async x=>applied.push(x)});
 const old=s.open('A'),latest=s.open('B');
 b.resolve({id:'B'});assert.equal(await latest,true);
 a.resolve({id:'A'});assert.equal(await old,false);
 assert.deepEqual(applied,[{id:'B'}]);
});
test('v2.53 new draft invalidates a pending exam load',async()=>{
 const slow=deferred(),applied=[];
 const s=createExamSelection({fetchExam:()=>slow.promise,applyExam:async x=>applied.push(x)});
 const loading=s.open('A');s.invalidate();slow.resolve({id:'A'});
 assert.equal(await loading,false);assert.deepEqual(applied,[]);
});
test('v2.53 local editor modification invalidates older response for the same exam',async()=>{
 const slow=deferred(),applied=[];
 const s=createExamSelection({fetchExam:()=>slow.promise,applyExam:async x=>applied.push(x)});
 const load=s.open('A');const beforeEdit=s.checkpoint();
 s.invalidate();assert.equal(beforeEdit.isCurrent(),false);
 slow.resolve({id:'A',revision:1});assert.equal(await load,false);assert.deepEqual(applied,[]);
});
test('v2.53 older HTTP rejection is silent after selecting another exam',async()=>{
 const a=deferred(),b=deferred(),applied=[];
 const s=createExamSelection({fetchExam:id=>id==='A'?a.promise:b.promise,applyExam:async x=>applied.push(x)});
 const old=s.open('A'),latest=s.open('B');b.resolve('B');assert.equal(await latest,true);
 a.reject(Error('outdated network failure'));assert.equal(await old,false);assert.deepEqual(applied,['B']);
});
test('v2.53 latest HTTP failure still reaches user; no stale data is applied',async()=>{
 const s=createExamSelection({fetchExam:async()=>{throw Error('network outage');},applyExam:async()=>assert.fail('unexpected application')});
 await assert.rejects(s.open('A'),/network outage/);
});
test('v2.53 checkpoint blocks old save completion notices after a draft switch',async()=>{
 const s=createExamSelection({fetchExam:async id=>id,applyExam:async()=>{}});
 const old=s.checkpoint();assert.equal(old.isCurrent(),true);
 await s.open('A');assert.equal(old.isCurrent(),false);
 const active=s.checkpoint();assert.equal(active.isCurrent(),true);
 s.invalidate();assert.equal(active.isCurrent(),false);
});
