import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {createDemo} from '../core.mjs';
const pass='PilotAdmin-GuvenliParola-2026!';
const sample=()=>{const exam=createDemo();exam.profile='';exam.questions=exam.questions.map(q=>({...q,teacherNote:''}));return exam;};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'bep-history-v21-')),s=openStore(join(dir,'db.sqlite'));s.createTenantAdmin({tenantId:'school-1',tenantName:'Kurum Bir',email:'owner@school1.test',password:pass});s.createTenantAdmin({tenantId:'school-2',tenantName:'Kurum İki',email:'owner@school2.test',password:pass});const a=id=>s.requireActor(s.signIn({tenantId:id,email:id==='school-1'?'owner@school1.test':'owner@school2.test',password:pass}).token);return {dir,s,a,close(){s.db.close();rmSync(dir,{recursive:true,force:true});}};}

test('approval ledger retains revision and SHA-256 digest after updates; does not duplicate',()=>{
 const f=fixture();try{
  const a=f.a('school-1');const x=f.s.createExam(a,{exam:sample()});
  assert.deepEqual(f.s.approvalHistory(a,x.id).records,[]);
  f.s.approveExam(a,x.id,{revision:1,confirmed:true});
  f.s.approveExam(a,x.id,{revision:1,confirmed:true});
  let h=f.s.approvalHistory(a,x.id);assert.equal(h.records.length,1);assert.equal(h.records[0].revision,1);assert.match(h.records[0].contentHash,/^[a-f0-9]{64}$/);assert.equal(h.records[0].current,true);
  const revised=sample();revised.title='Yeni bir anonim sınav';f.s.updateExam(a,x.id,{revision:1,exam:revised});
  h=f.s.approvalHistory(a,x.id);assert.equal(h.records.length,1);assert.equal(h.records[0].current,false);
  f.s.approveExam(a,x.id,{revision:2,confirmed:true});
  h=f.s.approvalHistory(a,x.id);assert.equal(h.records.length,2);assert.equal(h.records[0].revision,2);assert.equal(h.records[0].current,true);assert.notEqual(h.records[0].contentHash,h.records[1].contentHash);
  assert.equal(f.s.db.prepare('SELECT COUNT(*) n FROM audit WHERE event=?').get('exam.approved').n,2);
 }finally{f.close();}
});
test('approval history is tenant-scoped, cannot bypass visibility, observer sees approved only',()=>{
 const f=fixture();try{
  const a=f.a('school-1'),b=f.a('school-2');
  const x=f.s.createExam(a,{exam:sample()});assert.throws(()=>f.s.approvalHistory(b,x.id),{code:'missing'});
  f.s.addMember(a,{email:'observer@school1.test',role:'observer',password:pass});
  const viewer=f.s.requireActor(f.s.signIn({tenantId:'school-1',email:'observer@school1.test',password:pass}).token);
  assert.throws(()=>f.s.approvalHistory(viewer,x.id),{code:'forbidden'});
  f.s.approveExam(a,x.id,{revision:1,confirmed:true});assert.equal(f.s.approvalHistory(viewer,x.id).records.length,1);
 }finally{f.close();}
});
test('HTTP approval history requires same-tenant session and returns no question text',async()=>{
 const f=fixture(),port=41886,api=createApiHandler(f.s,{port});const server=http.createServer((req,res)=>api(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 try{
  const a=f.a('school-1'),x=f.s.createExam(a,{exam:sample()});f.s.approveExam(a,x.id,{revision:1,confirmed:true});
  const l=f.s.signIn({tenantId:'school-1',email:'owner@school1.test',password:pass});
  const url=`http://127.0.0.1:${port}/api/exams/${x.id}/approval-history`;
  const anon=await fetch(url);assert.equal(anon.status,401);
  const authorized=await fetch(url,{headers:{Cookie:`bep_session=${l.token}`}});assert.equal(authorized.status,200);
  const data=await authorized.json();assert.equal(data.history.records.length,1);assert.equal(data.history.records[0].current,true);
  assert.equal(JSON.stringify(data).includes('5 + 3'),false);
  const b=f.s.signIn({tenantId:'school-2',email:'owner@school2.test',password:pass});
  const denied=await fetch(url,{headers:{Cookie:`bep_session=${b.token}`}});assert.equal(denied.status,404);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});
