import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {createApiHandler} from './institutional-api.mjs';
const secret='Yalnizca-Test-2026-Pilot-Surum!';
function setup(){
 const dir=mkdtempSync(join(tmpdir(),'bep-v16-'));const s=openStore(join(dir,'db.sqlite'));
 for(const id of ['ilk-kurum','ikinci-kurum'])s.createTenantAdmin({tenantId:id,tenantName:'Kurum '+id,email:'admin@'+id+'.test',password:secret});
 const login=(id,email='admin@'+id+'.test')=>s.signIn({tenantId:id,email,password:secret});
 const aLogin=login('ilk-kurum'),bLogin=login('ikinci-kurum');const a=s.requireActor(aLogin.token),b=s.requireActor(bLogin.token);
 const exam=createDemo();exam.profile='';exam.questions=exam.questions.filter(q=>q.type!=='short').map(q=>({...q,teacherNote:''}));
 const draft=s.createExam(a,{exam});s.approveExam(a,draft.id,{revision:1,confirmed:true});
 const pilot=s.pilotIssue(a,draft.id),ticket=s.pilotRedeem(pilot.code);s.pilotSubmit(ticket.token,{q1:'A',q2:'B'});
 return {dir,s,a,b,draft,pilot,aLogin,bLogin,cleanup(){s.db.close();rmSync(dir,{force:true,recursive:true});}};
}
test('manual review: missing score remains null, zero is distinct, revision increments',()=>{
 const f=setup();try{
  const first=f.s.pilotReviewGet(f.a,f.pilot.id);
  assert.equal(first.reviewVersion,0);assert.equal(first.reviewedQuestions,0);assert.ok(first.questions.length>=3);
  assert.ok(first.questions.every(q=>q.score===null));
  const q=first.questions[0];const added=f.s.pilotReviewSave(f.a,f.pilot.id,{reviewVersion:0,entries:{[q.id]:{score:0,note:'Destek kullanımı gözlendi.'}}});
  assert.equal(added.reviewVersion,1);assert.equal(added.questions[0].score,0);assert.equal(added.reviewedQuestions,1);
  assert.equal(added.complete,false);assert.equal(added.assessedPoints,0);assert.equal(added.assessedMaximum,q.maxPoints);
  const next=f.s.pilotReviewSave(f.a,f.pilot.id,{reviewVersion:1,entries:{[q.id]:{score:q.maxPoints,note:''}}});
  assert.equal(next.reviewVersion,2);assert.equal(next.assessedPoints,q.maxPoints);
  assert.throws(()=>f.s.pilotReviewSave(f.a,f.pilot.id,{reviewVersion:1,entries:{}}),{code:'review_conflict'});
 }finally{f.cleanup();}
});
test('reject invalid score, unrecognized question, unexpected fields and long notes',()=>{
 const f=setup();try{
  const q=f.s.pilotReviewGet(f.a,f.pilot.id).questions[0];
  const bad=[{[q.id]:{score:q.maxPoints+1,note:''}},
   {[q.id]:{score:-1,note:''}}, {[q.id]:{score:'5',note:''}},
   {[q.id]:{score:0.123,note:''}}, {[q.id]:{score:null,note:'a'.repeat(301)}},
   {[q.id]:{score:null,note:'a\u0000b'}},{not_real:{score:0,note:''}},
   {[q.id]:{score:null,note:'ok',studentName:'private'}}];
  for(let i=0;i<bad.length;i++)assert.throws(()=>f.s.pilotReviewSave(f.a,f.pilot.id,{reviewVersion:0,entries:bad[i]}),{code:'invalid_review'},'case '+i);
  assert.equal(f.s.pilotReviewGet(f.a,f.pilot.id).reviewVersion,0);
 }finally{f.cleanup();}
});
test('review does not leak across tenants or observer roles',()=>{
 const f=setup();try{
  assert.throws(()=>f.s.pilotReviewGet(f.b,f.pilot.id),{code:'not_found'});
  assert.throws(()=>f.s.pilotReviewSave(f.b,f.pilot.id,{reviewVersion:0,entries:{}}),{code:'not_found'});
  f.s.addMember(f.a,{email:'observer@ilk.test',role:'observer',password:secret});
  const observer=f.s.requireActor(f.s.signIn({tenantId:'ilk-kurum',email:'observer@ilk.test',password:secret}).token);
  assert.throws(()=>f.s.pilotReviewGet(observer,f.pilot.id),{code:'forbidden'});
 }finally{f.cleanup();}
});
test('review requires submitted, unchanged approved exam and is removed with pilot',()=>{
 const f=setup();try{
  const notSubmitted=f.s.pilotIssue(f.a,f.draft.id);
  assert.throws(()=>f.s.pilotReviewGet(f.a,notSubmitted.id),{code:'not_submitted'});
  const current=f.s.pilotReviewGet(f.a,f.pilot.id);
  f.s.pilotReviewSave(f.a,f.pilot.id,{reviewVersion:0,entries:{[current.questions[0].id]:{score:0,note:''}}});
  assert.equal(f.s.db.prepare('SELECT COUNT(*) AS n FROM pilot_reviews').get().n,1);
  f.s.pilotDelete(f.a,f.pilot.id);
  assert.equal(f.s.db.prepare('SELECT COUNT(*) AS n FROM pilot_reviews').get().n,0);
  assert.throws(()=>f.s.pilotReviewGet(f.a,f.pilot.id),{code:'not_found'});
 }finally{f.cleanup();}
});
test('CSV export escapes formulas, omits answers, and is restricted',()=>{
 const f=setup();try{
  const q=f.s.pilotReviewGet(f.a,f.pilot.id).questions[0];
  f.s.pilotReviewSave(f.a,f.pilot.id,{reviewVersion:0,entries:{[q.id]:{score:0,note:'=HYPERLINK("http://test")'}}});
  const csv=f.s.pilotReviewCsv(f.a,f.pilot.id);
  assert.match(csv,/^\ufeff/);assert.match(csv,/'=HYPERLINK/);
  assert.doesNotMatch(csv,/teacherNote|admin@|csrf|claim_hash/);
  assert.throws(()=>f.s.pilotReviewCsv(f.b,f.pilot.id),{code:'not_found'});
 }finally{f.cleanup();}
});
test('HTTP review requires teacher cookie + CSRF, disallows cross tenant and exports CSV safely',async()=>{
 const f=setup();const port=41976,api=createApiHandler(f.s,{port});
 const srv=http.createServer((req,res)=>api(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>srv.listen(port,'127.0.0.1',resolve));
 async function call(path,method='GET',body,headers={}){
  const r=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
  return {status:r.status,type:r.headers.get('content-type'),text:await r.text()};
 }
 const base='/pilot/'+f.pilot.id+'/review';const teacher={Cookie:'bep_session='+f.aLogin.token,'X-CSRF-Token':f.aLogin.csrf};
 try{
  assert.equal((await call(base)).status,401);
  assert.equal((await call(base,'PUT',{reviewVersion:0,entries:{}},{Cookie:teacher.Cookie})).status,403);
  assert.equal((await call(base,'GET',null,{Cookie:'bep_session='+f.bLogin.token})).status,404);
  const q=f.s.pilotReviewGet(f.a,f.pilot.id).questions[0];
  const saved=await call(base,'PUT',{reviewVersion:0,entries:{[q.id]:{score:0,note:'not'}}},teacher);
  assert.equal(saved.status,200);assert.equal(JSON.parse(saved.text).review.reviewVersion,1);
  const csv=await call(base+'.csv','GET',null,{Cookie:teacher.Cookie});
  assert.equal(csv.status,200);assert.match(csv.type,/text\/csv/);assert.match(csv.text,/Öğretmen puanı/);
  assert.equal((await call(base+'.csv','GET',null,{Cookie:'bep_session='+f.bLogin.token})).status,404);
 }finally{await new Promise(resolve=>srv.close(resolve));f.cleanup();}
});
