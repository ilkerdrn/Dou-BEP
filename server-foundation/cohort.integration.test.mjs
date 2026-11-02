import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {createApiHandler} from './institutional-api.mjs';
const secret='Sadece-Pilot-Test-2026!';
function setup(){
 const folder=mkdtempSync(join(tmpdir(),'bep-v19-'));
 const store=openStore(join(folder,'local.sqlite'));
 for(const tenant of ['kurum-alfa','kurum-beta'])store.createTenantAdmin({tenantId:tenant,tenantName:tenant,email:'admin@'+tenant+'.test',password:secret});
 const adminLogin=store.signIn({tenantId:'kurum-alfa',email:'admin@kurum-alfa.test',password:secret});
 const otherLogin=store.signIn({tenantId:'kurum-beta',email:'admin@kurum-beta.test',password:secret});
 const a=store.requireActor(adminLogin.token),b=store.requireActor(otherLogin.token);
 const exam=createDemo();exam.profile='';exam.questions=exam.questions.filter(q=>q.type!=='short').map(q=>({...q,teacherNote:''}));
 const record=store.createExam(a,{exam});store.approveExam(a,record.id,{revision:1,confirmed:true});
 const makeReview=(score)=>{
  const session=store.pilotIssue(a,record.id);const ticket=store.pilotRedeem(session.code);
  store.pilotSubmit(ticket.token,{});
  if(score!==undefined){
   const context=store.pilotReviewGet(a,session.id);const q=context.questions[0];
   store.pilotReviewSave(a,session.id,{reviewVersion:0,entries:{[q.id]:{score,note:''}}});
  }
  return session;
 };
 return {store,folder,a,b,record,adminLogin,otherLogin,makeReview,cleanup(){store.db.close();rmSync(folder,{force:true,recursive:true});}};
}
test('cohort report requires at least 3 reviewed sessions, not only submitted sessions',()=>{
 const f=setup();try{
  f.makeReview(0);f.makeReview(5);f.makeReview();
  let summary=f.store.pilotObjectiveCohort(f.a,f.record.id);assert.equal(summary.available,false);
  assert.throws(()=>f.store.pilotObjectiveCsv(f.a,f.record.id),/En az üç/);
  f.makeReview(5);summary=f.store.pilotObjectiveCohort(f.a,f.record.id);
  assert.equal(summary.available,true);assert.equal(summary.reviewedSessions,3);
  assert.ok(summary.objectives.some(x=>x.available));
  assert.doesNotMatch(JSON.stringify(summary),/email|response|csrf|student|note:/);
 }finally{f.cleanup();}
});
test('tenant isolation, observer permission and exam revision invalidation',()=>{
 const f=setup();try{
  f.makeReview(0);f.makeReview(2);f.makeReview(5);
  assert.throws(()=>f.store.pilotObjectiveCohort(f.b,f.record.id),{code:'not_found'});
  f.store.addMember(f.a,{email:'observer@kurum-alfa.test',password:secret,role:'observer'});
  const observer=f.store.requireActor(f.store.signIn({tenantId:'kurum-alfa',email:'observer@kurum-alfa.test',password:secret}).token);
  assert.throws(()=>f.store.pilotObjectiveCohort(observer,f.record.id),{code:'forbidden'});
  assert.match(f.store.pilotObjectiveCsv(f.a,f.record.id),/BEP kazanımı/);
  const existing=f.store.getExam(f.a,f.record.id);
  const edited={...existing.exam,title:existing.exam.title+' değişti'};
  f.store.updateExam(f.a,f.record.id,{exam:edited,revision:existing.revision});
  assert.throws(()=>f.store.pilotObjectiveCohort(f.a,f.record.id),{code:'not_approved'});
 }finally{f.cleanup();}
});
test('HTTP endpoint checks cookie, excludes other tenant, redacts small cohort, and returns safe CSV',async()=>{
 const f=setup();const port=41979;
 const handler=createApiHandler(f.store,{port});const server=http.createServer((req,res)=>handler(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 try{
  f.makeReview(0);f.makeReview(2);
  const url=`http://127.0.0.1:${port}/api/pilot/objective-summary/${f.record.id}`;
  const get=(uri,token)=>fetch(uri,{headers:token?{Cookie:'bep_session='+token}:{}});
  assert.equal((await get(url)).status,401);
  assert.equal((await get(url,f.otherLogin.token)).status,404);
  const tiny=await get(url,f.adminLogin.token);assert.equal(tiny.status,200);
  assert.equal((await tiny.json()).summary.available,false);
  assert.equal((await get(url+'.csv',f.adminLogin.token)).status,409); // below-threshold export deliberately refuses
  f.makeReview(3);
  const enough=await get(url,f.adminLogin.token);assert.equal((await enough.json()).summary.available,true);
  const csv=await get(url+'.csv',f.adminLogin.token);assert.equal(csv.status,200);
  assert.match(csv.headers.get('content-type'),/text\/csv/);assert.doesNotMatch(await csv.text(),/admin@/);
 }finally{await new Promise(resolve=>server.close(resolve));f.cleanup();}
});
