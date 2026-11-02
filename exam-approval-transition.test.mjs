import test from 'node:test';
import assert from 'node:assert/strict';
import {assertApprovalReady,submitExamApproval} from './exam-approval-transition.mjs';
const base={id:'exam-anon',revision:2,confirmed:true,dirty:false,busy:false,allowed:true,saving:false,pending:false,blocked:false};
const approved={id:'exam-anon',revision:2,status:'approved'};
test('v2.54 only explicitly confirmed clean saved revisions may be approved',()=>{
 assert.deepEqual(assertApprovalReady(base),{id:'exam-anon',revision:2});
 for(const [field,value] of [['confirmed',false],['allowed',false],['dirty',true],['busy',true],['saving',true],['pending',true],['blocked',true],['id',''],['revision',0],['revision',2.5]]){
  assert.throws(()=>assertApprovalReady({...base,[field]:value}),undefined,`${field} not rejected`);
 }
});
test('v2.54 server rejection never commits or refreshes approval',async()=>{
 const calls=[];
 await assert.rejects(submitExamApproval({...base,request:async()=>{throw Error('revision_conflict');},onAccepted:()=>calls.push('commit'),refreshList:()=>calls.push('list'),refreshHistory:()=>calls.push('history')}),/revision_conflict/);
 assert.deepEqual(calls,[]);
});
test('v2.54 mismatched server exam ID, revision or status is rejected without commit',async()=>{
 for(const invalid of [{...approved,id:'wrong'}, {...approved,revision:3},{...approved,status:'draft'},null]){
  let commit=0;
  await assert.rejects(submitExamApproval({...base,request:async()=>invalid,onAccepted:()=>commit++,refreshList:async()=>{},refreshHistory:async()=>{}}),/eşleşmiyor/);
  assert.equal(commit,0);
 }
});
test('v2.54 onAccepted commits exact revision and refreshes both read-only views',async()=>{
 const calls=[];
 const result=await submitExamApproval({...base,request:async(id,revision)=>{calls.push(`request:${id}:${revision}`);return approved;},onAccepted:record=>calls.push(`commit:${record.id}`),refreshList:async()=>calls.push('list'),refreshHistory:async()=>calls.push('history')});
 assert.deepEqual(calls,['request:exam-anon:2','commit:exam-anon','list','history']);
 assert.deepEqual(result,{approved,refreshFailed:[]});
});
test('v2.54 failed refresh never changes successful server approval into failure',async()=>{
 const calls=[];
 const result=await submitExamApproval({...base,request:async()=>approved,onAccepted:()=>calls.push('committed'),refreshList:async()=>{throw Error('network');},refreshHistory:async()=>calls.push('history')});
 assert.deepEqual(calls,['committed','history']);assert.deepEqual(result.refreshFailed,['liste']);
});
test('v2.54 both refresh failures are signalled without rejecting accepted approval',async()=>{
 const result=await submitExamApproval({...base,request:async()=>approved,onAccepted:()=>{},refreshList:async()=>{throw Error('list');},refreshHistory:async()=>{throw Error('history');}});
 assert.deepEqual(result.refreshFailed,['liste','geçmiş']);
});
test('v2.54 rejects missing dependencies before submitting any request',async()=>{
 await assert.rejects(submitExamApproval({id:'exam-anon',revision:2}),/bağımlılıkları/);
});
